import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

async function extractCharacterDNA(base64: string, mimeType: string, name: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return '';
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64 } },
          {
            text: `You are a character designer building a visual DNA profile for consistent AI storyboard generation.

Analyze this reference image of character "${name}" and produce a precise visual specification covering:
FACE: face shape, skin tone (e.g. "warm olive", "deep brown", "pale ivory"), eye color+shape, nose, lips, eyebrows, marks
HAIR: exact color (e.g. "jet black", "golden blonde"), length, texture, style
BUILD: body type, shoulder width, posture
CLOTHING: every visible item with exact colors, patterns, fabrics
DISTINCTIVE: accessories, tattoos, scars, unique features

Output a single dense paragraph (no headers, no bullets) optimized for injection into AI image prompts. Be extremely specific about colors and proportions. This will be embedded verbatim into every scene generation prompt to guarantee visual consistency across all panels.`,
          },
        ],
      }],
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  } catch {
    return '';
  }
}

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
  let visual_dna = '';

  if (base_image) {
    try {
      [reference_image_url, visual_dna] = await Promise.all([
        uploadCharacterImage(base_image, mime_type, charId),
        extractCharacterDNA(base_image, mime_type, name),
      ]);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  const { data, error } = await supabase
    .from('characters')
    .insert({ id: charId, project_id: req.params.id, name, description, reference_image_url, mime_type, visual_dna })
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
      const charName = name || existing.name;
      [updates.reference_image_url, updates.visual_dna] = await Promise.all([
        uploadCharacterImage(String(base_image), mimeStr, String(req.params.id)),
        extractCharacterDNA(String(base_image), mimeStr, charName),
      ]);
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
