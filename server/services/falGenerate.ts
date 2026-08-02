/**
 * fal.ai FLUX-PuLID — face identity conditioning.
 * Uses the character's reference image to condition generation on their actual face/appearance.
 * No training required — instant, but still produces consistent identity.
 *
 * Requires FAL_KEY env var.
 */

import { sanitizeUserText } from './promptEnhance.js';

const FAL_GENERATE_TIMEOUT_MS = 90000;
const FAL_DOWNLOAD_TIMEOUT_MS = 20000;

interface FalResult {
  imageData: string;
  mimeType: string;
}

interface CharSpec {
  name: string;
  visual_dna: string;
  description: string;
  reference_image_url?: string;
}

function buildCharBlock(chars: CharSpec[]): string {
  return (Array.isArray(chars) ? chars : [])
    .filter(c => c?.visual_dna || c?.description)
    .map(c => `${sanitizeUserText(c.name, 80)} (${sanitizeUserText(c.visual_dna || c.description, 600)})`)
    .join(', ');
}

export async function generateWithFalPuLID(
  prompt: string,
  stylePrompt: string,
  chars: CharSpec[],
): Promise<FalResult | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  try {
    // PuLID requires exactly one reference face image (reference_image_url is a
    // required single string in the API) — use the first character that has one
    const refChar = (Array.isArray(chars) ? chars : []).find(c => c?.reference_image_url);
    if (!refChar) return null;

    const fullPrompt = [
      buildCharBlock(chars),
      stylePrompt,
      sanitizeUserText(prompt),
      'masterpiece, best quality, highly detailed faces, sharp focus, 8k uhd, photorealistic skin texture, cinematic lighting, single panel, no text, no watermarks',
    ].filter(Boolean).join(', ');

    const body: Record<string, any> = {
      prompt: fullPrompt,
      reference_image_url: refChar.reference_image_url,
      image_size: 'landscape_16_9',
      num_inference_steps: 20,
      guidance_scale: 4.0,
      id_weight: 1,
      negative_prompt: 'deformed, ugly, bad anatomy, blurry, low quality, text, watermark, disfigured face',
    };

    const res = await fetch('https://fal.run/fal-ai/flux-pulid', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FAL_GENERATE_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[fal-pulid] generation failed: HTTP ${res.status}`, errText.slice(0, 300));
      return null;
    }

    const data: any = await res.json();
    const imageUrl: string | undefined = data.images?.[0]?.url;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(FAL_DOWNLOAD_TIMEOUT_MS) });
    if (!imgRes.ok) {
      console.warn(`[fal-pulid] image download failed: HTTP ${imgRes.status}`);
      return null;
    }
    const buffer = await imgRes.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('[fal-pulid] generation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * fal.ai FLUX-LoRA inference — uses a trained LoRA for maximum character consistency.
 * Should be called when a character has a trained lora_url.
 */
export async function generateWithFalLoRA(
  loraUrl: string,
  triggerWord: string,
  prompt: string,
  stylePrompt: string,
  chars: CharSpec[],
): Promise<FalResult | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  try {
    // Inject the trigger word so the LoRA activates
    const fullPrompt = [
      triggerWord, // trigger word MUST be in prompt for LoRA to activate
      buildCharBlock(chars),
      stylePrompt,
      sanitizeUserText(prompt),
      'masterpiece, best quality, highly detailed faces, sharp focus, 8k uhd, photorealistic, cinematic, no text, no watermarks',
    ].filter(Boolean).join(', ');

    const res = await fetch('https://fal.run/fal-ai/flux-lora', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        loras: [{ path: loraUrl, scale: 1.0 }],
        image_size: 'landscape_16_9',
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
      }),
      signal: AbortSignal.timeout(FAL_GENERATE_TIMEOUT_MS),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[fal-lora] inference failed: HTTP ${res.status}`, errText.slice(0, 300));
      return null;
    }

    const data: any = await res.json();
    const imageUrl: string | undefined = data.images?.[0]?.url;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(FAL_DOWNLOAD_TIMEOUT_MS) });
    if (!imgRes.ok) {
      console.warn(`[fal-lora] image download failed: HTTP ${imgRes.status}`);
      return null;
    }
    const buffer = await imgRes.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('[fal-lora] inference failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
