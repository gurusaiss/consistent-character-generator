import { sanitizeUserText } from './promptEnhance.js';

// Models are tried sequentially, so the per-attempt timeout is bounded by a
// single overall budget — otherwise three slow models stall the race for 3x
const CF_TOTAL_BUDGET_MS = 75000;
const CF_ATTEMPT_TIMEOUT_MS = 45000;

interface CFResult {
  imageData: string;
  mimeType: string;
}

interface CharSpec {
  name: string;
  visual_dna: string;
  description: string;
}

export async function generateWithCloudflare(
  prompt: string,
  stylePrompt: string,
  chars: CharSpec[],
): Promise<CFResult | null> {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!apiToken || !accountId) return null;

  let fullPrompt: string;
  try {
    const charBlock = (Array.isArray(chars) ? chars : [])
      .filter(c => c?.visual_dna || c?.description)
      .map(c => `${sanitizeUserText(c.name, 80)} (${sanitizeUserText(c.visual_dna || c.description, 600)})`)
      .join(', ');

    fullPrompt = [
      charBlock ? `Characters: ${charBlock}` : '',
      stylePrompt,
      sanitizeUserText(prompt),
      'masterpiece, best quality, highly detailed, sharp focus, 8k, cinematic, no text, no watermarks',
    ].filter(Boolean).join(', ');
  } catch (err) {
    console.warn('[cloudflare] prompt assembly failed:', err instanceof Error ? err.message : err);
    return null;
  }

  const negativePrompt = 'deformed, ugly, bad anatomy, blurry, low quality, text, watermark, disfigured';

  // Try models in order of quality for face/character fidelity
  const models = [
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    '@cf/lykon/dreamshaper-8-lcm',
    '@cf/black-forest-labs/flux-1-schnell',
  ];

  const deadline = Date.now() + CF_TOTAL_BUDGET_MS;

  for (const model of models) {
    const remaining = deadline - Date.now();
    if (remaining < 5000) {
      console.warn('[cloudflare] time budget exhausted, skipping remaining models');
      break;
    }

    try {
      const body: Record<string, any> = { prompt: fullPrompt };
      if (model.includes('stable-diffusion') || model.includes('dreamshaper')) {
        body.negative_prompt = negativePrompt;
        body.num_steps = 20;
        body.width = 1024;
        body.height = 576;
      }

      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(Math.min(CF_ATTEMPT_TIMEOUT_MS, remaining)),
        }
      );

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn(`[cloudflare] ${model} failed: HTTP ${res.status}`, errBody.slice(0, 200));
        continue;
      }

      const buffer = await res.arrayBuffer();
      return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
    } catch (err) {
      console.warn(`[cloudflare] ${model} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}
