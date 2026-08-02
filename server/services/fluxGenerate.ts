/**
 * Together AI — FLUX.1-dev image generation (higher quality than schnell).
 * Falls back gracefully (returns null) on any failure.
 */

import { sanitizeUserText } from './promptEnhance.js';

const TOGETHER_ENDPOINT = 'https://api.together.xyz/v1/images/generations';
// dev -> schnell -> CDN download run sequentially, so they share one budget
const TOGETHER_TOTAL_BUDGET_MS = 90000;
const TOGETHER_ATTEMPT_TIMEOUT_MS = 60000;
const IMAGE_DOWNLOAD_TIMEOUT_MS = 20000;

interface FluxResult {
  imageData: string; // base64
  mimeType: string;
}

interface CharSpec {
  name: string;
  visual_dna: string;
  description: string;
}

export async function generateWithFlux(
  prompt: string,
  stylePrompt: string,
  chars: CharSpec[],
): Promise<FluxResult | null> {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) return null;

  try {
    const charBlock = (Array.isArray(chars) ? chars : [])
      .filter(c => c?.visual_dna || c?.description)
      .map(c => `${sanitizeUserText(c.name, 80)} (${sanitizeUserText(c.visual_dna || c.description, 600)})`)
      .join(', ');

    const fullPrompt = [
      charBlock ? `Characters: ${charBlock}` : '',
      stylePrompt,
      sanitizeUserText(prompt),
      'masterpiece, best quality, highly detailed faces, sharp focus, 8k uhd, photorealistic skin texture, cinematic lighting, single panel, no text, no watermarks, no borders',
    ].filter(Boolean).join(', ');

    const deadline = Date.now() + TOGETHER_TOTAL_BUDGET_MS;
    const budget = (max: number) => AbortSignal.timeout(Math.max(1000, Math.min(max, deadline - Date.now())));

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    const download = async (url: string): Promise<FluxResult | null> => {
      const imgRes = await fetch(url, { signal: budget(IMAGE_DOWNLOAD_TIMEOUT_MS) });
      if (!imgRes.ok) {
        console.warn(`[together] image download failed: HTTP ${imgRes.status}`);
        return null;
      }
      const buf = await imgRes.arrayBuffer();
      return { imageData: Buffer.from(buf).toString('base64'), mimeType: 'image/jpeg' };
    };

    // FLUX.1-dev: significantly higher quality than schnell, better character fidelity
    const res = await fetch(TOGETHER_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-dev',
        prompt: fullPrompt,
        width: 1024,
        height: 576,
        steps: 25,
        n: 1,
      }),
      signal: budget(TOGETHER_ATTEMPT_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Fallback to schnell-Free if dev is unavailable
      const fallback = await fetch(TOGETHER_ENDPOINT, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'black-forest-labs/FLUX.1-schnell-Free',
          prompt: fullPrompt,
          width: 1024,
          height: 576,
          steps: 4,
          n: 1,
        }),
        signal: budget(TOGETHER_ATTEMPT_TIMEOUT_MS),
      });
      if (!fallback.ok) {
        const body = await fallback.text().catch(() => '');
        console.warn(`[together] schnell fallback failed: HTTP ${fallback.status}`, body.slice(0, 200));
        return null;
      }
      const fallbackData: any = await fallback.json();
      const url: string | undefined = fallbackData.data?.[0]?.url;
      if (!url) {
        const b64: string | undefined = fallbackData.data?.[0]?.b64_json;
        return b64 ? { imageData: b64, mimeType: 'image/jpeg' } : null;
      }
      return await download(url);
    }

    const data: any = await res.json();
    const imageUrl: string | undefined = data.data?.[0]?.url;
    if (!imageUrl) {
      const b64: string | undefined = data.data?.[0]?.b64_json;
      return b64 ? { imageData: b64, mimeType: 'image/jpeg' } : null;
    }

    return await download(imageUrl);
  } catch (err) {
    console.warn('[together] generation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
