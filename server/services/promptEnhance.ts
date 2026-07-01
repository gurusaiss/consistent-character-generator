/**
 * Gemini-powered prompt enhancement.
 * Rewrites a raw scene prompt into a rich, cinematic image-generation prompt
 * with explicit lighting, lens, composition, and mood direction.
 * Falls back to the original prompt on any failure.
 */

import { GoogleGenAI } from '@google/genai';

export async function enhanceScenePrompt(
  ai: GoogleGenAI,
  scenePrompt: string,
  stylePrompt: string,
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{
          text: `You are a world-class cinematographer and prompt engineer for AI image generation.

Rewrite this scene description into a single dense image-generation prompt. Add specific, concrete detail for:
- LIGHTING: source, direction, color temperature, mood (e.g. "golden hour rim lighting from camera left")
- CAMERA: shot type, lens, angle (e.g. "medium close-up, 85mm lens, shallow depth of field")
- COMPOSITION: framing, subject placement, background treatment
- ATMOSPHERE: weather, particles, color grade

STYLE TO MATCH: ${stylePrompt}

RULES:
- Keep every character action and story element from the original scene EXACTLY as written — do not change what happens
- Do NOT add new characters or change character appearances
- Output ONLY the rewritten prompt as one paragraph, no headers, no quotes, no explanations
- Maximum 120 words

SCENE: ${scenePrompt}`,
        }],
      }],
    });

    const enhanced = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    // Sanity check — reject garbage or overly short rewrites
    if (!enhanced || enhanced.length < 30 || enhanced.length > 1500) return scenePrompt;
    return enhanced;
  } catch {
    return scenePrompt;
  }
}
