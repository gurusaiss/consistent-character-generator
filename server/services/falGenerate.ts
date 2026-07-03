/**
 * fal.ai FLUX-PuLID — face identity conditioning.
 * Uses the character's reference image to condition generation on their actual face/appearance.
 * No training required — instant, but still produces consistent identity.
 *
 * Requires FAL_KEY env var.
 */

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

export async function generateWithFalPuLID(
  prompt: string,
  stylePrompt: string,
  chars: CharSpec[],
): Promise<FalResult | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  // PuLID requires exactly one reference face image (reference_image_url is a
  // required single string in the API) — use the first character that has one
  const refChar = chars.find(c => c.reference_image_url);
  if (!refChar) return null;

  const charBlock = chars
    .filter(c => c.visual_dna || c.description)
    .map(c => `${c.name} (${c.visual_dna || c.description})`)
    .join(', ');

  const fullPrompt = [
    charBlock,
    stylePrompt,
    prompt,
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

  try {
    const res = await fetch('https://fal.run/fal-ai/flux-pulid', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`fal.ai PuLID error ${res.status}:`, errText.slice(0, 300));
      return null;
    }

    const data: any = await res.json();
    const imageUrl: string | undefined = data.images?.[0]?.url;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('fal.ai PuLID error:', err instanceof Error ? err.message : err);
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

  const charBlock = chars
    .filter(c => c.visual_dna || c.description)
    .map(c => `${c.name} (${c.visual_dna || c.description})`)
    .join(', ');

  // Inject the trigger word so the LoRA activates
  const fullPrompt = [
    triggerWord, // trigger word MUST be in prompt for LoRA to activate
    charBlock,
    stylePrompt,
    prompt,
    'masterpiece, best quality, highly detailed faces, sharp focus, 8k uhd, photorealistic, cinematic, no text, no watermarks',
  ].filter(Boolean).join(', ');

  try {
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
      signal: AbortSignal.timeout(90000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`fal.ai LoRA inference error ${res.status}:`, errText.slice(0, 300));
      return null;
    }

    const data: any = await res.json();
    const imageUrl: string | undefined = data.images?.[0]?.url;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
    if (!imgRes.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('fal.ai LoRA inference error:', err instanceof Error ? err.message : err);
    return null;
  }
}
