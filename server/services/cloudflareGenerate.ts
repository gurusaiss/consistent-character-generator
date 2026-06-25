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

  const charBlock = chars
    .filter(c => c.visual_dna || c.description)
    .map(c => `${c.name} (${c.visual_dna || c.description})`)
    .join(', ');

  const fullPrompt = [
    charBlock ? `Characters: ${charBlock}` : '',
    stylePrompt,
    prompt,
    'masterpiece, best quality, highly detailed, sharp focus, 8k, cinematic, no text, no watermarks',
  ].filter(Boolean).join(', ');

  const negativePrompt = 'deformed, ugly, bad anatomy, blurry, low quality, text, watermark, disfigured';

  // Try models in order of quality for face/character fidelity
  const models = [
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    '@cf/lykon/dreamshaper-8-lcm',
    '@cf/black-forest-labs/flux-1-schnell',
  ];

  for (const model of models) {
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
        }
      );

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        console.warn(`Cloudflare AI error ${res.status} (${model}):`, errBody.slice(0, 200));
        continue;
      }

      const buffer = await res.arrayBuffer();
      return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
    } catch (err) {
      console.warn(`Cloudflare ${model} error:`, err instanceof Error ? err.message : err);
    }
  }

  return null;
}
