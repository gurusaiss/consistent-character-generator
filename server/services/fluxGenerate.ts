/**
 * Together AI — FLUX.1-schnell-Free image generation.
 * Used as a second generation model when TOGETHER_API_KEY is set.
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

  // Build enriched prompt — inject DNA as structured text since FLUX is text-only
  const charBlock = chars
    .filter(c => c.visual_dna || c.description)
    .map(c => `${c.name}: ${c.visual_dna || c.description}`)
    .join('. ');

  const fullPrompt = [
    charBlock,
    `Art direction: ${stylePrompt}`,
    `Scene: ${prompt}`,
    'Single storyboard panel, no text, no watermarks, no borders, cinematic framing, professional composition, ultra high quality',
  ].filter(Boolean).join('. ');

  try {
    const res = await fetch('https://api.together.xyz/v1/images/generations', {
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

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`FLUX API error ${res.status}:`, body.slice(0, 200));
      return null;
    }

    const data = await res.json();
    const imageUrl: string | undefined = data.data?.[0]?.url;
    if (!imageUrl) {
      // Some Together AI plans return b64_json instead
      const b64: string | undefined = data.data?.[0]?.b64_json;
      if (b64) return { imageData: b64, mimeType: 'image/jpeg' };
      return null;
    }

    // Fetch the URL and convert to base64
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('FLUX generation error:', err instanceof Error ? err.message : err);
    return null;
  }
}
