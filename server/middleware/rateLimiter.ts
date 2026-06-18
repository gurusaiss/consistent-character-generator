// In-memory sliding-window rate limiter (per user ID or IP)
const windows = new Map<string, number[]>();

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;       // 5 generations per minute

export function generateRateLimiter(req: any, res: any, next: any) {
  const key: string = req.user?.id || req.ip || 'unknown';
  const now = Date.now();

  const timestamps = (windows.get(key) || []).filter(t => now - t < WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS) {
    return res.status(429).json({
      error: `Rate limit: max ${MAX_REQUESTS} generations per minute. Please wait before trying again.`,
    });
  }
  timestamps.push(now);
  windows.set(key, timestamps);
  next();
}
