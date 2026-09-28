import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../supabase.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { userOwnsProject } from '../utils/ownership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { generateStoryScenes } from '../services/storyGenerate.js';
import { idParamSchema, storyGenerateSchema, validate, validateParams } from '../utils/validation.js';

const router = Router();

const STYLE_PROMPTS: Record<string, string> = {
  cinematic:  'cinematic film still, photorealistic, movie production quality, dramatic lighting, widescreen composition',
  anime:      'anime style illustration, Japanese animation, vibrant colors, clean linework, expressive characters',
  comic:      'comic book art, bold ink outlines, halftone shading, dynamic superhero comic panel style',
  watercolor: 'watercolor painting, soft color washes, loose brushstrokes, artistic illustration',
  sketch:     'pencil sketch concept art, rough storyboard drawing, hand-drawn black and white illustration',
  pixel:      'pixel art, 16-bit retro game aesthetic, low resolution sprite style, vibrant limited palette',
};

// POST /api/projects/:id/story — expand a one-line premise into a scene outline
router.post('/projects/:id/story', requireAuth, validateParams(idParamSchema), validate(storyGenerateSchema), asyncHandler(async (req, res) => {
  const userId = (req as AuthRequest).user.id;
  const projectId = req.params.id;

  if (!(await userOwnsProject(projectId, userId))) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured.' });
  }

  const { premise, sceneCount } = req.body;

  const [{ data: project }, { data: characters }] = await Promise.all([
    supabase.from('projects').select('style_preset').eq('id', projectId).single(),
    supabase.from('characters').select('name').eq('project_id', projectId).order('created_at'),
  ]);

  const stylePrompt = STYLE_PROMPTS[project?.style_preset || 'cinematic'] || STYLE_PROMPTS.cinematic;
  const characterNames = (characters || []).map(c => c.name).filter(Boolean);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { apiVersion: 'v1' } });

  try {
    const scenes = await generateStoryScenes(ai, premise, characterNames, sceneCount, stylePrompt);
    res.json({ scenes });
  } catch (err: any) {
    logger.error('Story generation failed', { projectId, error: err.message });
    res.status(500).json({ error: err.message || 'Story generation failed' });
  }
}));

export default router;
