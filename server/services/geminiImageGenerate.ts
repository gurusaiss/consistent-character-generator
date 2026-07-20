/**
 * Gemini 2.5 Flash Image ("Nano Banana") — Google's best model for character
 * consistency. Unlike the text-only FLUX generators, this model SEES the
 * character reference photos directly and generates the scene around them,
 * preserving facial identity natively.
 *
 * Uses the same GEMINI_API_KEY as everything else — no extra setup.
 */

import { GoogleGenAI } from '@google/genai';

interface GeminiImageResult {
  imageData: string;
  mimeType: string;
}

interface CharWithImage {
  name: string;
  visual_dna: string;
  description: string;
  fetchedBase64: string;
  mime_type: string;
}

export async function generateWithGeminiImage(
  apiKey: string,
  prompt: string,
  stylePrompt: string,
  chars: CharWithImage[],
): Promise<GeminiImageResult | null> {
  try {
    // Needs its own client without the v1 apiVersion pin — image output requires default API version
    const ai = new GoogleGenAI({ apiKey });

    const parts: any[] = [];

    // Reference images first — the model conditions generation on these faces
    const withImages = chars.filter(c => c.fetchedBase64);
    for (const char of withImages) {
      parts.push({ inlineData: { mimeType: char.mime_type || 'image/jpeg', data: char.fetchedBase64 } });
      parts.push({ text: `This is "${char.name}". Use this exact person — same face, eyes, eyebrows, nose, lips, skin tone, face shape, and hairline. Do not beautify, age-shift, or alter the face in any way.` });
    }

    const charSpecs = chars
      .filter(c => c.visual_dna || c.description)
      .map(c => `${c.name}: ${c.visual_dna || c.description}`)
      .join('\n');

    parts.push({
      text: [
        withImages.length > 0
          ? 'Generate a new scene image featuring the exact person(s) shown in the reference photo(s) above with 100% identity accuracy.'
          : 'Generate a scene image.',
        charSpecs ? `CHARACTER DETAILS:\n${charSpecs}` : '',
        `STYLE: ${stylePrompt}`,
        `SCENE: ${prompt}`,
        'Requirements: single image, no text or watermarks, faces clearly visible and unobstructed, cinematic composition, high detail.',
      ].filter(Boolean).join('\n\n'),
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [{ parts }],
    });

    // Find the image part in the response
    const respParts = response.candidates?.[0]?.content?.parts || [];
    for (const part of respParts) {
      const inline = (part as any).inlineData;
      if (inline?.data) {
        return { imageData: inline.data, mimeType: inline.mimeType || 'image/png' };
      }
    }
    return null;
  } catch (err) {
    console.warn('Gemini image generation error:', err instanceof Error ? err.message : err);
    return null;
  }
}
