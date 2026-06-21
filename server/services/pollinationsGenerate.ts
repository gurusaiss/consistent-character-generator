interface PollinationsResult {
  imageData: string;
  mimeType: string;
}

interface CharSpec {
  name: string;
  visual_dna: string;
  description: string;
}

export async function generateWithPollinations(
  prompt: string,
  stylePrompt: string,
  chars: CharSpec[],
): Promise<PollinationsResult | null> {
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
    const encoded = encodeURIComponent(fullPrompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&model=flux&nologo=true&nofeed=true`;

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Pollinations error ${res.status}`);
      return null;
    }

    const buffer = await res.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('Pollinations generation error:', err instanceof Error ? err.message : err);
    return null;
  }
}
