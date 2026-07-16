/**
 * Gemini-powered prompt enhancement.
 * Rewrites a raw user prompt into a precise, image-generation-optimized prompt.
 * Prioritises face clarity, character placement, and cinematic quality.
 * Falls back to original prompt on any failure.
 */

import { GoogleGenAI } from '@google/genai';

export async function enhanceScenePrompt(
  ai: GoogleGenAI,
  scenePrompt: string,
  stylePrompt: string,
  characterNames: string[] = [],
): Promise<string> {
  try {
    const charContext = characterNames.length > 0
      ? `Characters in this scene: ${characterNames.join(', ')}. `
      : '';

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        parts: [{
          text: `You are a world-class cinematographer and AI image prompt engineer.

${charContext}Rewrite this scene into a single dense, precise image-generation prompt that maximises output quality and character accuracy.

REQUIRED additions:
- LIGHTING: type, direction, color temperature — must illuminate faces clearly (no harsh shadows on faces)
- CAMERA: shot type (e.g. medium shot, close-up), lens (50mm/85mm), angle
- COMPOSITION: where each character is placed (left/center/right), eye-level or above/below
- FACE CLARITY: faces must be fully visible, front-facing or 3/4 view — never obscured by hair, shadows, hats, or angle
- ATMOSPHERE: environment detail, time of day, mood, color grade
- STYLE: ${stylePrompt}

STRICT RULES:
- Preserve every story action and character name exactly — do not change what happens
- Do NOT add new characters
- Faces must be unobstructed and clearly visible — this is critical
- Output ONE paragraph only, no headers, no bullets, no quotes
- Max 130 words

SCENE: ${scenePrompt}`,
        }],
      }],
    });

    const enhanced = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!enhanced || enhanced.length < 30 || enhanced.length > 1800) return scenePrompt;
    return enhanced;
  } catch {
    return scenePrompt;
  }
}
