
import { GoogleGenAI, Modality, GenerateContentResponse } from '@google/genai';
import type { Character } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// Helper function to escape special characters for regex
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
};

export const generateSceneImage = async (
  scenePrompt: string,
  allCharacters: Character[]
): Promise<string> => {
  const relevantCharacters = allCharacters.filter(
    (c) => c.name && new RegExp(`\\b${escapeRegExp(c.name)}\\b`, 'i').test(scenePrompt)
  );

  if (relevantCharacters.length === 0 || relevantCharacters.every(c => !c.baseImage.base64)) {
    // If no character with a base image is explicitly mentioned, we can't generate a consistent image.
    // This could be changed to a general image generation call if desired, but it would lack consistency.
    throw new Error(`Scene prompt "${scenePrompt}" must mention at least one defined character with a base image.`);
  }

  const baseDescriptions = relevantCharacters
    .map((c) => c.description)
    .filter(Boolean)
    .join('. ');
    
  const fullTextPrompt = `${baseDescriptions} Scene: ${scenePrompt}. photorealistic, cinematic, high detail.`;

  const parts: any[] = [];
  relevantCharacters.forEach((c) => {
    if (c.baseImage.base64 && c.baseImage.mimeType) {
      parts.push({
        inlineData: {
          data: c.baseImage.base64,
          mimeType: c.baseImage.mimeType,
        },
      });
    }
  });
  parts.push({ text: fullTextPrompt });

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData
    );

    if (imagePart?.inlineData) {
      const base64ImageBytes = imagePart.inlineData.data;
      const mimeType = imagePart.inlineData.mimeType;
      return `data:${mimeType};base64,${base64ImageBytes}`;
    } else {
      const textResponse = response.text?.trim();
      throw new Error(
        textResponse
          ? `API did not return an image. Response: "${textResponse}"`
          : 'API did not return an image or text error.'
      );
    }
  } catch (e: any) {
    console.error('Gemini API call failed:', e);
    throw new Error(e.message || 'An unknown error occurred with the API.');
  }
};
