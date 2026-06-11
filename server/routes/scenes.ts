import { Router } from 'express';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

// GET /api/projects/:id/scenes
router.get('/projects/:id/scenes', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('scenes')
    .select('*')
    .eq('project_id', req.params.id)
    .order('scene_number');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/projects/:id/scenes — bulk replace
router.post('/projects/:id/scenes', requireAuth, async (req, res) => {
  const { scenes } = req.body;
  if (!Array.isArray(scenes)) return res.status(400).json({ error: 'scenes must be array' });
  const projectId = req.params.id;

  // Get existing scenes to clean up their images
  const { data: existing } = await supabase
    .from('scenes')
    .select('generated_image_url')
    .eq('project_id', projectId);

  const imagePaths = (existing || [])
    .map(s => extractPath(s.generated_image_url, 'generated-scenes'))
    .filter(Boolean) as string[];

  if (imagePaths.length > 0) {
    await supabase.storage.from('generated-scenes').remove(imagePaths);
  }

  // Delete existing scenes
  await supabase.from('scenes').delete().eq('project_id', projectId);

  if (scenes.length === 0) {
    await supabase.from('projects').update({
      scene_count: 0,
      updated_at: new Date().toISOString(),
    }).eq('id', projectId);
    return res.status(201).json([]);
  }

  const rows = scenes.map((item: { prompt: string }, i: number) => ({
    project_id: projectId,
    scene_number: i + 1,
    prompt: item.prompt,
    status: 'pending',
  }));

  const { data, error } = await supabase.from('scenes').insert(rows).select();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from('projects').update({
    scene_count: scenes.length,
    updated_at: new Date().toISOString(),
  }).eq('id', projectId);

  res.status(201).json(data);
});

// PUT /api/scenes/:id
router.put('/scenes/:id', requireAuth, async (req, res) => {
  const { prompt, status, generated_image_url, error_message } = req.body;

  const updates: Record<string, any> = {};
  if (prompt !== undefined) updates.prompt = prompt;
  if (status !== undefined) updates.status = status;
  if (generated_image_url !== undefined) updates.generated_image_url = generated_image_url;
  if (error_message !== undefined) updates.error_message = error_message;

  const { data, error } = await supabase
    .from('scenes')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error || !data) return res.status(404).json({ error: 'Scene not found' });
  res.json(data);
});

// DELETE /api/scenes/:id
router.delete('/scenes/:id', requireAuth, async (req, res) => {
  const { data: scene } = await supabase
    .from('scenes')
    .select('generated_image_url, project_id')
    .eq('id', req.params.id)
    .single();

  if (scene?.generated_image_url) {
    const path = extractPath(scene.generated_image_url, 'generated-scenes');
    if (path) await supabase.storage.from('generated-scenes').remove([path]);
  }

  const { error } = await supabase.from('scenes').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
