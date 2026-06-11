import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

const STYLE_PROMPTS: Record<string, string> = {
  cinematic: 'cinematic film still, photorealistic, movie production quality, dramatic lighting, widescreen composition',
  anime: 'anime style illustration, Japanese animation, vibrant colors, clean linework, expressive characters',
  comic: 'comic book art, bold ink outlines, halftone shading, dynamic superhero comic panel style',
  watercolor: 'watercolor painting, soft color washes, loose brushstrokes, artistic illustration',
  sketch: 'pencil sketch concept art, rough storyboard drawing, hand-drawn black and white illustration',
  pixel: 'pixel art, 16-bit retro game aesthetic, low resolution sprite style, vibrant limited palette',
};

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

// POST /api/generate
router.post('/generate', requireAuth, async (req, res) => {
  const { projectId, sceneId, prompt, characters } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured. Add it to .env file.' });
  }

  // Mark scene as loading
  if (sceneId) {
    await supabase.from('scenes').update({ status: 'loading', error_message: '' }).eq('id', sceneId);
  }

  try {
    // Fetch project for style preset
    let stylePrompt = STYLE_PROMPTS.cinematic;
    if (projectId) {
      const { data: project } = await supabase.from('projects').select('style_preset').eq('id', projectId).single();
      if (project?.style_preset) stylePrompt = STYLE_PROMPTS[project.style_preset] || stylePrompt;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const parts: any[] = [];

    // Inject character references
    if (characters?.length > 0) {
      let charContext = 'Characters in this scene:\n';
      for (const char of characters) {
        charContext += `- ${char.name}: ${char.description}\n`;
        if (char.reference_image_url) {
          try {
            const base64 = await fetchImageAsBase64(char.reference_image_url);
            parts.push({ inlineData: { mimeType: char.mime_type || 'image/jpeg', data: base64 } });
            parts.push({ text: `(Reference image for: ${char.name})` });
          } catch {
            // Skip image if fetch fails, still use text description
          }
        }
      }
      parts.push({ text: charContext });
    }

    parts.push({
      text: `Generate a storyboard illustration. Style: ${stylePrompt}. Maintain consistent character appearances based on any provided references.\n\nScene: ${prompt}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ parts }],
      config: { responseModalities: ['IMAGE', 'TEXT'] },
    });

    // Extract generated image
    let imageData = '';
    let mimeType = 'image/png';
    for (const candidate of response.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          imageData = part.inlineData.data || '';
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
      if (imageData) break;
    }

    if (!imageData) throw new Error('No image was generated. The model did not return image data.');

    // Upload to Supabase Storage
    const imagePath = `scenes/${sceneId || Date.now()}.png`;
    const imageBuffer = Buffer.from(imageData, 'base64');

    const { error: uploadErr } = await supabase.storage
      .from('generated-scenes')
      .upload(imagePath, imageBuffer, { contentType: mimeType, upsert: true });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('generated-scenes')
      .getPublicUrl(imagePath);

    // Update scene record
    if (sceneId) {
      await supabase.from('scenes').update({
        status: 'success',
        generated_image_url: publicUrl,
        error_message: '',
      }).eq('id', sceneId);
    }

    // Update project thumbnail if not set
    if (projectId) {
      const { data: project } = await supabase.from('projects').select('thumbnail_url').eq('id', projectId).single();
      const updateData: any = { updated_at: new Date().toISOString() };
      if (!project?.thumbnail_url) updateData.thumbnail_url = publicUrl;
      await supabase.from('projects').update(updateData).eq('id', projectId);
    }

    res.json({ imageUrl: publicUrl, success: true });
  } catch (err: any) {
    console.error('Generate error:', err);

    if (sceneId) {
      try {
        await supabase.from('scenes').update({
          status: 'error',
          error_message: err.message || 'Generation failed',
        }).eq('id', sceneId);
      } catch { /* ignore */ }
    }

    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

export default router;
