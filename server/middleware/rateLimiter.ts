import type { Request, Response, NextFunction } from 'express';

/**
 * In-memory sliding-window rate limiter (keyed by user ID, falling back to IP).
 *
 * PER-PROCESS ONLY: counters live in this process's heap, so N instances behind
 * a load balancer allow N x the configured limit, and a restart wipes all
 * counters. That is a known, accepted limitation of the current single-instance
 * Render deploy. Enforcing a global limit would require shared storage (Redis,
 * or a Postgres counter table) behind the same read-filter-write step below.
 */

const DEFAULT_MAX = 5;
const DEFAULT_WINDOW_MS = 60 * 1000;
const SWEEP_INTERVAL_MS = 60 * 1000;

interface WindowStore {
  windows: Map<string, number[]>;
  windowMs: () => number;
}

interface LimiterState {
  stores: Set<WindowStore>;
  timer: any;
}

// Parked on globalThis so that a tsx/vitest hot reload re-evaluating this module
// reuses the existing sweeper and store registry instead of stacking a second
// interval that would sweep only the now-orphaned previous registry.
const GLOBAL_KEY = Symbol.for('consistent-character-generator.rateLimiter');

const state: LimiterState = (globalThis as any)[GLOBAL_KEY]
  || ((globalThis as any)[GLOBAL_KEY] = { stores: new Set<WindowStore>(), timer: null });

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// Without this, a key created for a user who never comes back is retained
// forever — the map only ever shrank on a subsequent request from the same key.
function sweep() {
  const now = Date.now();
  for (const store of state.stores) {
    const windowMs = store.windowMs();
    for (const [key, timestamps] of store.windows) {
      const fresh = timestamps.filter(t => now - t < windowMs);
      if (fresh.length === 0) {
        store.windows.delete(key);
      } else if (fresh.length !== timestamps.length) {
        store.windows.set(key, fresh);
      }
    }
  }
}

function ensureSweeper() {
  if (state.timer) return;
  const timer = setInterval(sweep, SWEEP_INTERVAL_MS);
  // unref so the sweeper never keeps the Node process alive on its own —
  // otherwise tests and graceful shutdowns would hang waiting on it.
  timer.unref?.();
  state.timer = timer;
}

export interface RateLimiterOptions {
  max?: number;
  windowMs?: number;
}

export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windows = new Map<string, number[]>();
  let max = options.max;
  let windowMs = options.windowMs;

  // Resolved on first request rather than at import time: server/index.ts calls
  // dotenv.config() *after* the ESM import graph has already been evaluated, so
  // .env.local values are not in process.env while this module body runs.
  function resolveConfig() {
    if (max === undefined) max = envInt('RATE_LIMIT_MAX', DEFAULT_MAX);
    if (windowMs === undefined) windowMs = envInt('RATE_LIMIT_WINDOW_MS', DEFAULT_WINDOW_MS);
  }

  state.stores.add({ windows, windowMs: () => windowMs ?? DEFAULT_WINDOW_MS });
  ensureSweeper();

  return function rateLimiter(req: Request, res: Response, next: NextFunction) {
    resolveConfig();

    const key: string = (req as Request & { user?: { id: string } }).user?.id || req.ip || 'unknown';
    const now = Date.now();

    const timestamps = (windows.get(key) || []).filter(t => now - t < windowMs);
    // Reset is measured from the oldest surviving request: that is the moment a
    // slot frees up in a sliding window, not the moment a fixed bucket rolls over.
    const oldest = timestamps.length > 0 ? timestamps[0] : now;
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Reset', String(resetSeconds));

    if (timestamps.length >= max) {
      windows.set(key, timestamps);
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('Retry-After', String(resetSeconds));
      const seconds = Math.round(windowMs / 1000);
      const per = seconds === 60 ? 'minute' : `${seconds} seconds`;
      return res.status(429).json({
        error: `Rate limit: max ${max} generations per ${per}. Please wait before trying again.`,
      });
    }

    timestamps.push(now);
    windows.set(key, timestamps);
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - timestamps.length)));
    next();
  };
}

// Named export consumed by server/routes/generate.ts — keep this name and shape.
export const generateRateLimiter = createRateLimiter();
