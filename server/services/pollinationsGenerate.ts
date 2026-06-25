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
    .map(c => `${c.name} (${c.visual_dna || c.description})`)
    .join(', ');

  // flux-realism produces significantly more photorealistic results than base flux
  const fullPrompt = [
    charBlock ? `Characters: ${charBlock}` : '',
    stylePrompt,
    prompt,
    'masterpiece, best quality, highly detailed faces, sharp focus, photorealistic, 8k, cinematic, no text, no watermarks',
  ].filter(Boolean).join(', ');

  try {
    const encoded = encodeURIComponent(fullPrompt);
    // Use flux-realism for higher quality photorealistic output
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&model=flux-realism&nologo=true&nofeed=true&enhance=true`;

    const res = await fetch(url, { signal: AbortSignal.timeout(55000) });
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
