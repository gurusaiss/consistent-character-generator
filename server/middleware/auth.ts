import type { Request, Response, NextFunction } from 'express';
import { supabase } from '../supabase.js';

export interface AuthRequest extends Request {
  user: { id: string; email?: string };
}

// Express does not await middleware, so a rejected promise here — e.g. a
// network error inside supabase.auth.getUser — would otherwise become an
// unhandled rejection and leave the request hanging until the client times
// out, never reaching the global error handler. Explicit try/catch funnels
// it into next(err) instead.
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    (req as AuthRequest).user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}
