import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/profile/usage
router.get('/profile/usage', requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  const { data, error } = await supabase
    .from('profiles')
    .select('total_generations, generations_limit')
    .eq('id', userId)
    .single();

  if (error || !data) {
    logger.error('Profile fetch failed', { userId, error: error?.message });
    return res.status(404).json({ error: 'Profile not found' });
  }

  res.json({
    used: data.total_generations ?? 0,
    limit: data.generations_limit ?? 30,
    remaining: Math.max(0, (data.generations_limit ?? 30) - (data.total_generations ?? 0)),
  });
}));

export default router;
