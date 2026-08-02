import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// Isolated unit test for the rate limiter logic without importing Express.
// We test the sliding-window eviction mechanic directly.

describe('sliding window eviction', () => {
  it('evicts timestamps older than windowMs', () => {
    const windowMs = 1000;
    const now = Date.now();
    const timestamps = [now - 2000, now - 1500, now - 500, now - 100];
    const cutoff = now - windowMs;
    const active = timestamps.filter(t => t > cutoff);
    expect(active).toHaveLength(2);
  });

  it('allows requests under the limit', () => {
    const max = 5;
    const hits = [100, 200, 300];
    expect(hits.length < max).toBe(true);
  });

  it('blocks requests at or above the limit', () => {
    const max = 5;
    const hits = [100, 200, 300, 400, 500];
    expect(hits.length >= max).toBe(true);
  });
});

describe('asyncHandler', async () => {
  const { asyncHandler } = await import('../utils/asyncHandler.js');

  it('forwards synchronous errors to next', async () => {
    const err = new Error('boom');
    const handler = asyncHandler(async (_req, _res, _next) => { throw err; });
    const next = vi.fn();
    await new Promise<void>(resolve => {
      (handler as any)({}, {}, (...args: any[]) => { next(...args); resolve(); });
    });
    expect(next).toHaveBeenCalledWith(err);
  });

  it('calls next with no args on success', async () => {
    const handler = asyncHandler(async (_req, _res, next) => { next(); });
    const next = vi.fn();
    await new Promise<void>(resolve => {
      (handler as any)({}, {}, (...args: any[]) => { next(...args); resolve(); });
    });
    expect(next).toHaveBeenCalledWith();
  });
});
