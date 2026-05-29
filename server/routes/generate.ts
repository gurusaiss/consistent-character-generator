import { Router } from 'express';
import { GoogleGenAI } from '@google/genai';
import { getDb, run, getRow } from '../db.js';

const router = Router();

// POST /api/generate
router.post('/generate', async (req, res) => {
  try {
    const { projectId, sceneId, prompt, characters } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Add it to .env file.' });
    }

    const db = await getDb();

    // Mark scene as loading
    if (sceneId) {
      run(db, "UPDATE scenes SET status = 'loading', error_message = '' WHERE id = ?", [sceneId]);
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Build content parts
    const parts: any[] = [];

    // Add character reference images and descriptions
    if (characters && characters.length > 0) {
      let characterContext = 'Characters in this scene:\n';
      for (const char of characters) {
        characterContext += `- ${char.name}: ${char.description}\n`;
        if (char.base_image) {
          parts.push({
            inlineData: {
              mimeType: char.mime_type || 'image/jpeg',
              data: char.base_image,
            },
          });
          parts.push({ text: `(Reference image for character: ${char.name})` });
        }
      }
      parts.push({ text: characterContext });
    }

    // Add the scene prompt
    parts.push({
      text: `Generate a storyboard illustration for this scene. Make it visually rich and maintain consistent character appearances based on any provided references.\n\nScene: ${prompt}`,
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ parts }],
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    });

    // Extract image from response
    let imageData = '';
    let mimeType = 'image/png';

    const candidates = response.candidates || [];
    for (const candidate of candidates) {
      const contentParts = candidate.content?.parts || [];
      for (const part of contentParts) {
        if (part.inlineData) {
          imageData = part.inlineData.data || '';
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
      if (imageData) break;
    }

    if (!imageData) {
      throw new Error('No image was generated. The model did not return image data.');
    }

    // Update scene in DB
    if (sceneId) {
      run(db, "UPDATE scenes SET status = 'success', image_data = ?, error_message = '' WHERE id = ?", [imageData, sceneId]);

      // Update project thumbnail if this is the first image
      if (projectId) {
        const project = getRow(db, 'SELECT thumbnail FROM projects WHERE id = ?', [projectId]) as any;
        if (!project?.thumbnail) {
          run(db, "UPDATE projects SET thumbnail = ?, updated_at = datetime('now') WHERE id = ?", [imageData, projectId]);
        } else {
          run(db, "UPDATE projects SET updated_at = datetime('now') WHERE id = ?", [projectId]);
        }
      }
    }

    res.json({ imageData, mimeType, success: true });
  } catch (err: any) {
    console.error('Generate error:', err);

    const { sceneId } = req.body;
    if (sceneId) {
      try {
        const db = await getDb();
        run(db, "UPDATE scenes SET status = 'error', error_message = ? WHERE id = ?", [err.message || 'Generation failed', sceneId]);
      } catch (_) { /* ignore */ }
    }

    res.status(500).json({ error: err.message || 'Generation failed' });
  }
});

export default router;
