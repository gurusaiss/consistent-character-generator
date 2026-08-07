import { Router } from 'express';
import { supabase } from '../supabase.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { projectIdParamSchema, validateParams } from '../utils/validation.js';

const router = Router();

// GET /api/share/:projectId — public, no auth required
router.get('/share/:projectId', validateParams(projectIdParamSchema), asyncHandler(async (req, res) => {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, description, thumbnail_url, style_preset, scene_count, created_at')
    .eq('id', req.params.projectId)
    .eq('is_public', true)
    .single();

  if (error || !project) {
    return res.status(404).json({ error: 'Project not found or is private' });
  }

  const { data: scenes, error: scenesErr } = await supabase
    .from('scenes')
    .select('id, scene_number, prompt, generated_image_url, consistency_score, status')
    .eq('project_id', req.params.projectId)
    .eq('status', 'success')
    .order('scene_number');

  if (scenesErr) {
    logger.error('Share scenes fetch failed', { projectId: req.params.projectId, error: scenesErr.message });
  }

  res.json({ ...project, scenes: scenes || [] });
}));

export default router;
