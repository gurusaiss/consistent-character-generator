import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import {
  formatZodError,
  idParamSchema,
  paginationQuerySchema,
  projectCreateSchema,
  projectUpdateSchema,
  validate,
  validateParams,
} from '../utils/validation.js';

const router = Router();

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

// GET /api/projects
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  // Pagination is opt-in: with neither param present the response must stay a
  // plain array of ALL the user's projects, which is what the Dashboard reads.
  const paginated = req.query.limit !== undefined || req.query.offset !== undefined;

  let query = supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (paginated) {
    const parsed = paginationQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json(formatZodError(parsed.error));
    const { limit, offset } = parsed.data;
    query = query.range(offset, offset + limit - 1);
  }

  const { data, error } = await query;

  if (error) {
    logger.error('Project list failed', { userId, error: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
}));

// POST /api/projects
router.post('/', requireAuth, validate(projectCreateSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { name, description = '', style_preset = 'cinematic' } = req.body;

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, name, description, style_preset })
    .select()
    .single();

  if (error) {
    logger.error('Project create failed', { userId, error: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.status(201).json(data);
}));

// GET /api/projects/:id
router.get('/:id', requireAuth, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .single();

  if (error || !project) return res.status(404).json({ error: 'Project not found' });

  const [{ data: characters }, { data: scenes }] = await Promise.all([
    supabase.from('characters').select('*').eq('project_id', req.params.id).order('created_at'),
    supabase.from('scenes').select('*').eq('project_id', req.params.id).order('scene_number'),
  ]);

  res.json({ ...project, characters: characters || [], scenes: scenes || [] });
}));

// PUT /api/projects/:id
router.put('/:id', requireAuth, validateParams(idParamSchema), validate(projectUpdateSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { name, description, style_preset, is_public } = req.body;

  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (style_preset !== undefined) updates.style_preset = style_preset;
  if (is_public !== undefined) updates.is_public = is_public;

  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Project not found' });
  res.json(data);
}));

// DELETE /api/projects/:id
router.delete('/:id', requireAuth, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;

  // Collect storage URLs before deletion
  const [{ data: scenes }, { data: characters }] = await Promise.all([
    supabase.from('scenes').select('generated_image_url').eq('project_id', req.params.id),
    supabase.from('characters').select('reference_image_url').eq('project_id', req.params.id),
  ]);

  const scenePaths = (scenes || []).map(s => extractPath(s.generated_image_url, 'generated-scenes')).filter(Boolean) as string[];
  const charPaths = (characters || []).map(c => extractPath(c.reference_image_url, 'character-references')).filter(Boolean) as string[];

  const cleanup = await Promise.allSettled([
    scenePaths.length > 0 && supabase.storage.from('generated-scenes').remove(scenePaths),
    charPaths.length > 0 && supabase.storage.from('character-references').remove(charPaths),
  ]);

  // Orphaned storage objects are invisible otherwise — the row disappears but
  // the bytes keep billing.
  for (const result of cleanup) {
    if (result.status === 'rejected') {
      logger.warn('Project storage cleanup failed', { projectId: req.params.id, error: result.reason });
    }
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', userId);

  if (error) {
    logger.error('Project delete failed', { userId, projectId: req.params.id, error: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
}));

export default router;
