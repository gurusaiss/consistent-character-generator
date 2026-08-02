import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Express 4 does not await route handlers, so a rejected promise inside an
 * `async` handler becomes an unhandled rejection and the request hangs until
 * the client times out — the global error handler never sees it. Wrapping the
 * handler funnels the rejection into next(err) so it does.
 *
 * This matters unevenly across the codebase: Supabase query builders resolve to
 * { data, error } and never reject, but fetch/JSON/Buffer/storage calls DO throw.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => unknown,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
