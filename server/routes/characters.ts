import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { startLoRATraining, getTrainingStatus } from '../services/loraTrainService.js';
import { userOwnsProject, userOwnsCharacter } from '../utils/ownership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import {
  characterCreateSchema,
  characterUpdateSchema,
  idParamSchema,
  validate,
  validateParams,
} from '../utils/validation.js';

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

async function uploadExtraImage(base64: string, mimeType: string, charId: string, index: number): Promise<string> {
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `characters/${charId}/extra_${index}.${ext}`;
  const buffer = Buffer.from(base64, 'base64');

  const { error } = await supabase.storage
    .from('character-references')
    .upload(path, buffer, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Extra image upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('character-references')
    .getPublicUrl(path);

  return publicUrl;
}

// GET /api/projects/:id/characters
router.get('/projects/:id/characters', requireAuth, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  if (!(await userOwnsProject(req.params.id, userId))) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('project_id', req.params.id)
    .order('created_at');

  if (error) {
    logger.error('Character list failed', { projectId: req.params.id, error: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
}));

// POST /api/projects/:id/characters
router.post('/projects/:id/characters', requireAuth, validateParams(idParamSchema), validate(characterCreateSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  if (!(await userOwnsProject(req.params.id, userId))) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const { name, description = '', base_image = '', mime_type = 'image/jpeg', extra_images = [] } = req.body;

  const charId = uuidv4();
  let reference_image_url = '';
  let visual_dna = '';
  let extra_image_urls: string[] = [];

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

  // Upload extra training images if provided
  if (Array.isArray(extra_images) && extra_images.length > 0) {
    try {
      extra_image_urls = await Promise.all(
        extra_images.map((img: { base64: string; mime_type: string }, i: number) =>
          uploadExtraImage(img.base64, img.mime_type || 'image/jpeg', charId, i)
        )
      );
    } catch (err: any) {
      logger.warn('Extra image upload failed', { characterId: charId, error: err.message });
    }
  }

  const { data, error } = await supabase
    .from('characters')
    .insert({
      id: charId,
      project_id: req.params.id,
      name,
      description,
      reference_image_url,
      mime_type,
      visual_dna,
      extra_image_urls,
      lora_status: 'none',
    })
    .select()
    .single();

  if (error) {
    logger.error('Character create failed', { projectId: req.params.id, error: error.message });
    return res.status(500).json({ error: error.message });
  }

  await supabase.from('projects').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id);

  res.status(201).json(data);
}));

// PUT /api/characters/:id
router.put('/characters/:id', requireAuth, validateParams(idParamSchema), validate(characterUpdateSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  if (!(await userOwnsCharacter(req.params.id, userId))) {
    return res.status(404).json({ error: 'Character not found' });
  }

  const { name, description, base_image, mime_type, extra_images } = req.body;

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
    if (existing.reference_image_url) {
      const oldPath = extractPath(existing.reference_image_url, 'character-references');
      if (oldPath) await supabase.storage.from('character-references').remove([oldPath]);
    }
    try {
      const mimeStr = String(mime_type || 'image/jpeg');
      const charName = name || existing.name;
      [updates.reference_image_url, updates.visual_dna] = await Promise.all([
        uploadCharacterImage(String(base_image), mimeStr, String(req.params.id)),
        extractCharacterDNA(String(base_image), mimeStr, charName),
      ]);
      updates.mime_type = mimeStr;
      // New primary image invalidates existing LoRA
      updates.lora_status = 'none';
      updates.lora_url = null;
      updates.lora_job_id = null;
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  // Append extra training images
  if (Array.isArray(extra_images) && extra_images.length > 0) {
    try {
      const existingExtra: string[] = existing.extra_image_urls || [];
      const newExtra = await Promise.all(
        extra_images.map((img: { base64: string; mime_type: string }, i: number) =>
          uploadExtraImage(img.base64, img.mime_type || 'image/jpeg', String(req.params.id), existingExtra.length + i)
        )
      );
      updates.extra_image_urls = [...existingExtra, ...newExtra];
    } catch (err: any) {
      logger.warn('Extra image upload failed', { characterId: req.params.id, error: err.message });
    }
  }

  const { data, error } = await supabase
    .from('characters')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    logger.error('Character update failed', { characterId: req.params.id, error: error.message });
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
}));

// POST /api/characters/:id/train — start LoRA training
router.post('/characters/:id/train', requireAuth, validateParams(idParamSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  if (!(await userOwnsCharacter(req.params.id, userId))) {
    return res.status(404).json({ error: 'Character not found' });
  }

  const { data: char, error: fetchErr } = await supabase
    .from('characters')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !char) return res.status(404).json({ error: 'Character not found' });

  if (!process.env.FAL_KEY) {
    return res.status(500).json({ error: 'FAL_KEY is not configured. Add it to your environment variables.' });
  }

  // Collect all available images (reference + extras)
  const imageUrls: string[] = [
    char.reference_image_url,
    ...(char.extra_image_urls || []),
  ].filter(Boolean);

  if (imageUrls.length < 3) {
    return res.status(400).json({
      error: `LoRA training needs at least 3 reference images. You have ${imageUrls.length}. Upload more images to enable training.`,
      imagesProvided: imageUrls.length,
      imagesRequired: 3,
    });
  }

  // Sanitize trigger word — alphanumeric only, no spaces
  const triggerWord = `${char.name.replace(/[^a-zA-Z0-9]/g, '')}lora`.toUpperCase().slice(0, 20);

  try {
    const jobId = await startLoRATraining(String(req.params.id), imageUrls, triggerWord);

    await supabase.from('characters').update({
      lora_status: 'training',
      lora_job_id: jobId,
      lora_trigger_word: triggerWord,
      lora_url: null,
    }).eq('id', req.params.id);

    res.json({ success: true, jobId, triggerWord, message: 'Training started. Check status in 3-5 minutes.' });
  } catch (err: any) {
    await supabase.from('characters').update({ lora_status: 'failed' }).eq('id', req.params.id);
    res.status(500).json({ error: err.message });
  }
}));

// GET /api/characters/:id/lora-status — poll training status
router.get('/characters/:id/lora-status', requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  if (!(await userOwnsCharacter(req.params.id, userId))) {
    return res.status(404).json({ error: 'Character not found' });
  }

  const { data: char, error: fetchErr } = await supabase
    .from('characters')
    .select('lora_status, lora_job_id, lora_url, lora_trigger_word, extra_image_urls, reference_image_url')
    .eq('id', req.params.id)
    .single();

  if (fetchErr || !char) return res.status(404).json({ error: 'Character not found' });

  const imageCount = [char.reference_image_url, ...(char.extra_image_urls || [])].filter(Boolean).length;

  // If currently training, check fal.ai for updates
  if (char.lora_status === 'training' && char.lora_job_id) {
    const status = await getTrainingStatus(char.lora_job_id);

    if (status.status === 'COMPLETED' && status.loraUrl) {
      await supabase.from('characters').update({
        lora_status: 'ready',
        lora_url: status.loraUrl,
      }).eq('id', req.params.id);

      return res.json({ lora_status: 'ready', lora_url: status.loraUrl, lora_trigger_word: char.lora_trigger_word, imageCount });
    }

    if (status.status === 'FAILED') {
      await supabase.from('characters').update({ lora_status: 'failed' }).eq('id', req.params.id);
      return res.json({ lora_status: 'failed', error: status.error, imageCount });
    }

    return res.json({ lora_status: status.status === 'IN_QUEUE' ? 'queued' : 'training', imageCount });
  }

  res.json({
    lora_status: char.lora_status || 'none',
    lora_url: char.lora_url,
    lora_trigger_word: char.lora_trigger_word,
    imageCount,
  });
});

// DELETE /api/characters/:id
router.delete('/characters/:id', requireAuth, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  if (!(await userOwnsCharacter(req.params.id, userId))) {
    return res.status(404).json({ error: 'Character not found' });
  }

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
