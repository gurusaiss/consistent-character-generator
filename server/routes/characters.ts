import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

function extractPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  return idx === -1 ? null : url.slice(idx + marker.length);
}

async function uploadCharacterImage(base64: string, mimeType: string, charId: string): Promise<string> {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `characters/${charId}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from('character-references')
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('character-references')
    .getPublicUrl(path);

  return publicUrl;
}

// GET /api/projects/:id/characters
router.get('/projects/:id/characters', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('project_id', req.params.id)
    .order('created_at');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/projects/:id/characters
router.post('/projects/:id/characters', requireAuth, async (req, res) => {
  const { name, description = '', base_image = '', mime_type = 'image/jpeg' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const charId = uuidv4();
  let reference_image_url = '';

  if (base_image) {
    try {
      reference_image_url = await uploadCharacterImage(base_image, mime_type, charId);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  const { data, error } = await supabase
    .from('characters')
    .insert({ id: charId, project_id: req.params.id, name, description, reference_image_url, mime_type })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Update project timestamp
  await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id);

  res.status(201).json(data);
});

// PUT /api/characters/:id
router.put('/characters/:id', requireAuth, async (req, res) => {
  const { name, description, base_image, mime_type } = req.body;

  const { data: existing, error: fetchErr } = await supabase
    .from('characters')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !existing) return res.status(404).json({ error: 'Character not found' });

  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;

  if (base_image) {
    // Delete old image from storage
    if (existing.reference_image_url) {
      const oldPath = extractPath(existing.reference_image_url, 'character-references');
      if (oldPath) await supabase.storage.from('character-references').remove([oldPath]);
    }
    // Upload new image
    try {
      const mimeStr = String(mime_type || 'image/jpeg');
      updates.reference_image_url = await uploadCharacterImage(String(base_image), mimeStr, String(req.params.id));
      updates.mime_type = mimeStr;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/characters/:id
router.delete('/characters/:id', requireAuth, async (req, res) => {
  const { data: char } = await supabase
    .from('characters')
    .select('reference_image_url')
    .eq('id', req.params.id)
    .single();

  if (char?.reference_image_url) {
    const path = extractPath(char.reference_image_url, 'character-references');
    if (path) await supabase.storage.from('character-references').remove([path]);
  }

  const { error } = await supabase.from('characters').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
