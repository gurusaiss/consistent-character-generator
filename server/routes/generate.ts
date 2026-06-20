import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { generateRateLimiter } from '../middleware/rateLimiter.js';
import { generateWithFlux } from '../services/fluxGenerate.js';

const router = Router();

const STYLE_PROMPTS: Record<string, string> = {
  cinematic:  'cinematic film still, photorealistic, movie production quality, dramatic lighting, widescreen composition',
  anime:      'anime style illustration, Japanese animation, vibrant colors, clean linework, expressive characters',
  comic:      'comic book art, bold ink outlines, halftone shading, dynamic superhero comic panel style',
  watercolor: 'watercolor painting, soft color washes, loose brushstrokes, artistic illustration',
  sketch:     'pencil sketch concept art, rough storyboard drawing, hand-drawn black and white illustration',
  pixel:      'pixel art, 16-bit retro game aesthetic, low resolution sprite style, vibrant limited palette',
};

async function fetchImageAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

interface CharInput {
  name: string;
  description: string;
  reference_image_url: string;
  mime_type: string;
  visual_dna: string;
}

interface CharData extends CharInput {
  fetchedBase64: string;
}

interface Candidate {
  imageData: string;
  mimeType: string;
  model: string;
  score: number;
}

function buildPromptParts(chars: CharData[], stylePrompt: string, scenePrompt: string): any[] {
  const parts: any[] = [];
  const withImages = chars.filter(c => c.fetchedBase64);

  // 1. Inject reference images first
  for (const char of withImages) {
    parts.push({ inlineData: { mimeType: char.mime_type || 'image/jpeg', data: char.fetchedBase64 } });
    parts.push({ text: `↑ Visual reference for "${char.name}" — match this character's appearance exactly.` });
  }

  // 2. Character DNA specs
  if (chars.length > 0) {
    const charSpecs = chars.map(c => {
      const lines = [`CHARACTER: ${c.name}`];
      if (c.description) lines.push(`Description: ${c.description}`);
      if (c.visual_dna) lines.push(`Visual DNA (authoritative specification): ${c.visual_dna}`);
      if (c.fetchedBase64) lines.push(`(Reference image provided above — replicate exactly)`);
      return lines.join('\n');
    }).join('\n\n');
    parts.push({ text: `=== CHARACTER SPECIFICATIONS ===\n${charSpecs}\n=== END SPECIFICATIONS ===` });
  }

  // 3. Main generation instruction
  const hasRefs = withImages.length > 0;
  const hasDNA = chars.some(c => c.visual_dna);

  const instructions = [
    'You are a master storyboard artist for a major film production.',
    '',
    hasRefs
      ? 'CRITICAL — CHARACTER CONSISTENCY RULES:\n' +
        '• The reference images above ARE the characters. Replicate their faces, hair, skin tones, and clothing EXACTLY.\n' +
        '• Character DNA specifications above provide authoritative visual detail — follow them precisely.\n' +
        '• Consistency failure is unacceptable. Every physical feature must match the reference.'
      : hasDNA
        ? 'CHARACTER CONSISTENCY RULES:\n' +
          '• Follow the Visual DNA specifications above precisely for each character.\n' +
          '• Maintain consistent facial features, hair, and clothing throughout.'
        : '',
    '',
    `ART DIRECTION: ${stylePrompt}`,
    '',
    `SCENE TO ILLUSTRATE:\n${scenePrompt}`,
    '',
    'OUTPUT REQUIREMENTS:\n' +
    '• Single high-quality storyboard panel\n' +
    '• No text overlays, watermarks, speech bubbles, or borders\n' +
    '• Cinematic framing and professional composition\n' +
    '• All characters must match their specifications above',
  ].filter(s => s !== null).join('\n');

  parts.push({ text: instructions });
  return parts;
}

async function runGeminiGeneration(ai: GoogleGenAI, parts: any[]): Promise<{ imageData: string; mimeType: string }> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-preview-image-generation',
    contents: [{ parts }],
    config: { responseModalities: ['IMAGE', 'TEXT'] },
  });

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
  return { imageData, mimeType };
}

async function scoreConsistencyOnce(
  ai: GoogleGenAI,
  charsWithRefs: CharData[],
  generatedBase64: string,
): Promise<number | null> {
  const parts: any[] = [];
  for (const char of charsWithRefs) {
    parts.push({ inlineData: { mimeType: char.mime_type || 'image/jpeg', data: char.fetchedBase64 } });
    parts.push({ text: `Reference for "${char.name}"` });
  }
  parts.push({ inlineData: { mimeType: 'image/png', data: generatedBase64 } });
  parts.push({
    text: `This is the generated storyboard panel. Compare each character's appearance against their reference images above.\n\nAssess visual consistency: face shape, skin tone, hair color/style, and distinctive clothing/accessories.\n\nOutput a single integer 0-100 representing overall character consistency:\n100 = perfect match\n80-99 = minor acceptable deviations\n60-79 = noticeable differences but recognizable\n<60 = characters do not match references\n\nRespond with ONLY the integer number, nothing else.`,
  });

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: [{ parts }],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  // Use first digit group only — avoids "85/100" parsing to 85100
  const match = text.match(/\d+/)?.[0];
  if (!match) return null;
  const score = parseInt(match);
  return isNaN(score) ? null : Math.min(100, Math.max(0, score));
}

/**
 * Median-of-3 consistency scoring. A single LLM vote is noisy and can pick the
 * wrong model or wrongly skip the retry. Three parallel votes + median gives a
 * far more reliable score for winner selection. Falls back gracefully if votes fail.
 */
async function checkConsistency(
  ai: GoogleGenAI,
  chars: CharData[],
  generatedBase64: string,
): Promise<number> {
  const charsWithRefs = chars.filter(c => c.fetchedBase64);
  if (charsWithRefs.length === 0) return 100;

  try {
    const votes = await Promise.allSettled([
      scoreConsistencyOnce(ai, charsWithRefs, generatedBase64),
      scoreConsistencyOnce(ai, charsWithRefs, generatedBase64),
      scoreConsistencyOnce(ai, charsWithRefs, generatedBase64),
    ]);

    const scores = votes
      .filter((v): v is PromiseFulfilledResult<number | null> => v.status === 'fulfilled')
      .map(v => v.value)
      .filter((s): s is number => s !== null)
      .sort((a, b) => a - b);

    if (scores.length === 0) return 75; // neutral fallback
    // Median — robust to a single outlier vote
    return scores[Math.floor(scores.length / 2)];
  } catch {
    return 75;
  }
}

// POST /api/generate
router.post('/generate', requireAuth, generateRateLimiter, async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const { projectId, sceneId, prompt, characters } = req.body;

  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
  }

  // Check credits
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_generations, generations_limit')
    .eq('id', userId)
    .single();

  const used = profile?.total_generations ?? 0;
  const limit = profile?.generations_limit ?? 30;
  if (used >= limit) {
    return res.status(403).json({
      error: `Generation limit reached (${used}/${limit}). You have used all your free generations.`,
      code: 'CREDITS_EXHAUSTED',
    });
  }

  if (sceneId) {
    await supabase.from('scenes').update({ status: 'loading', error_message: '' }).eq('id', sceneId);
  }

  try {
    // Fetch project style
    let stylePrompt = STYLE_PROMPTS.cinematic;
    if (projectId) {
      const { data: project } = await supabase.from('projects').select('style_preset').eq('id', projectId).single();
      if (project?.style_preset) stylePrompt = STYLE_PROMPTS[project.style_preset] || stylePrompt;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Pre-fetch all character reference images in parallel
    const charData: CharData[] = await Promise.all(
      (characters || []).map(async (char: CharInput) => {
        let fetchedBase64 = '';
        if (char.reference_image_url) {
          try { fetchedBase64 = await fetchImageAsBase64(char.reference_image_url); } catch { /* skip */ }
        }
        return { ...char, fetchedBase64 };
      })
    );

    const geminiParts = buildPromptParts(charData, stylePrompt, prompt);

    // ── Run Gemini + FLUX in parallel ──────────────────────────────────────
    const [geminiSettled, fluxSettled] = await Promise.allSettled([
      runGeminiGeneration(ai, geminiParts),
      generateWithFlux(prompt, stylePrompt, charData.map(c => ({
        name: c.name,
        visual_dna: c.visual_dna,
        description: c.description,
      }))),
    ]);

    // Score each successful result
    const candidates: Candidate[] = [];

    if (geminiSettled.status === 'fulfilled') {
      const { imageData, mimeType } = geminiSettled.value;
      const score = await checkConsistency(ai, charData, imageData);
      candidates.push({ imageData, mimeType, model: 'gemini', score });
    } else {
      console.error('Gemini generation failed:', geminiSettled.reason?.message);
    }

    if (fluxSettled.status === 'fulfilled' && fluxSettled.value) {
      const { imageData, mimeType } = fluxSettled.value;
      const score = await checkConsistency(ai, charData, imageData);
      candidates.push({ imageData, mimeType, model: 'flux', score });
    }

    if (candidates.length === 0) {
      throw new Error('All generation models failed. Please try again.');
    }

    // Pick the winner — highest consistency score
    let winner = candidates.reduce((best, c) => c.score > best.score ? c : best, candidates[0]);

    // Auto-retry with Gemini if winner score < 60 (stronger emphasis pass)
    if (winner.score < 60 && charData.some(c => c.fetchedBase64 || c.visual_dna)) {
      const retryParts = buildPromptParts(charData, stylePrompt,
        `[CONSISTENCY RETRY] ${prompt}`
      );
      retryParts.push({
        text: 'CRITICAL REMINDER: The characters in this panel MUST look identical to their reference images above. This is the absolute highest priority. Focus entirely on matching their exact face, hair color, skin tone, and clothing before anything else.',
      });

      try {
        const retry = await runGeminiGeneration(ai, retryParts);
        const retryScore = await checkConsistency(ai, charData, retry.imageData);
        if (retryScore > winner.score) {
          winner = { ...retry, model: 'gemini-retry', score: retryScore };
        }
      } catch { /* keep current winner */ }
    }

    const { imageData, mimeType, model: modelUsed, score: consistencyScore } = winner;

    // Upload winner to Storage
    const imagePath = `scenes/${sceneId || Date.now()}.png`;
    const imageBuffer = Buffer.from(imageData, 'base64');

    const { error: uploadErr } = await supabase.storage
      .from('generated-scenes')
      .upload(imagePath, imageBuffer, { contentType: mimeType, upsert: true });

    if (uploadErr) throw new Error(`Storage upload failed: ${uploadErr.message}`);

    const { data: { publicUrl } } = supabase.storage
      .from('generated-scenes')
      .getPublicUrl(imagePath);

    // Persist scene + consistency + model
    if (sceneId) {
      const { error: sceneUpdateErr } = await supabase.from('scenes').update({
        status: 'success',
        generated_image_url: publicUrl,
        error_message: '',
        consistency_score: consistencyScore,
        model_used: modelUsed,
      }).eq('id', sceneId);
      if (sceneUpdateErr) console.error('Scene update failed:', sceneUpdateErr.message);
    }

    // Increment credits
    await supabase.from('profiles').update({ total_generations: used + 1 }).eq('id', userId);

    // Update project thumbnail
    if (projectId) {
      const { data: proj } = await supabase.from('projects').select('thumbnail_url').eq('id', projectId).single();
      const upd: any = { updated_at: new Date().toISOString() };
      if (!proj?.thumbnail_url) upd.thumbnail_url = publicUrl;
      await supabase.from('projects').update(upd).eq('id', projectId);
    }

    const modelsContested = candidates.length;
    res.json({
      imageUrl: publicUrl,
      success: true,
      consistencyScore,
      modelUsed,
      modelsContested,
      creditsRemaining: limit - used - 1,
    });

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
