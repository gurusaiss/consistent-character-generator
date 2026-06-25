/**
 * Together AI — FLUX.1-dev image generation (higher quality than schnell).
 * Falls back gracefully (returns null) on any failure.
 */

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

  const charBlock = chars
    .filter(c => c.visual_dna || c.description)
    .map(c => `${c.name} (${c.visual_dna || c.description})`)
    .join(', ');

  const fullPrompt = [
    charBlock ? `Characters: ${charBlock}` : '',
    stylePrompt,
    prompt,
    'masterpiece, best quality, highly detailed faces, sharp focus, 8k uhd, photorealistic skin texture, cinematic lighting, single panel, no text, no watermarks, no borders',
  ].filter(Boolean).join(', ');

  try {
    // FLUX.1-dev: significantly higher quality than schnell, better character fidelity
    const res = await fetch('https://api.together.xyz/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-dev',
        prompt: fullPrompt,
        width: 1024,
        height: 576,
        steps: 25,
        n: 1,
      }),
    });

    if (!res.ok) {
      // Fallback to schnell-Free if dev is unavailable
      const fallback = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'black-forest-labs/FLUX.1-schnell-Free',
          prompt: fullPrompt,
          width: 1024,
          height: 576,
          steps: 4,
          n: 1,
        }),
      });
      if (!fallback.ok) {
        const body = await fallback.text().catch(() => '');
        console.warn(`Together AI fallback error ${fallback.status}:`, body.slice(0, 200));
        return null;
      }
      const fallbackData = await fallback.json();
      const url: string | undefined = fallbackData.data?.[0]?.url;
      if (!url) return null;
      const imgRes = await fetch(url);
      if (!imgRes.ok) return null;
      const buf = await imgRes.arrayBuffer();
      return { imageData: Buffer.from(buf).toString('base64'), mimeType: 'image/jpeg' };
    }

    const data = await res.json();
    const imageUrl: string | undefined = data.data?.[0]?.url;
    if (!imageUrl) {
      const b64: string | undefined = data.data?.[0]?.b64_json;
      if (b64) return { imageData: b64, mimeType: 'image/jpeg' };
      return null;
    }

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('Together AI generation error:', err instanceof Error ? err.message : err);
    return null;
  }
}
