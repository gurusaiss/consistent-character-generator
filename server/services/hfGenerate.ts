interface HFResult {
  imageData: string;
  mimeType: string;
}

interface CharSpec {
  name: string;
  visual_dna: string;
  description: string;
}

export async function generateWithHF(
  prompt: string,
  stylePrompt: string,
  chars: CharSpec[],
): Promise<HFResult | null> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return null;

  const charBlock = chars
    .filter(c => c.visual_dna || c.description)
    .map(c => `${c.name}: ${c.visual_dna || c.description}`)
    .join('. ');

  const fullPrompt = [
    charBlock,
    `Art direction: ${stylePrompt}`,
    `Scene: ${prompt}`,
    'Single storyboard panel, no text, no watermarks, cinematic framing, ultra high quality',
  ].filter(Boolean).join('. ');

  try {
    const res = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: fullPrompt }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`HF API error ${res.status}:`, body.slice(0, 200));
      return null;
    }

    const buffer = await res.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('HF generation error:', err instanceof Error ? err.message : err);
    return null;
  }
}
