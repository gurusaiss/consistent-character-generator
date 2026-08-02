import { sanitizeUserText } from './promptEnhance.js';

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
  try {
    const charBlock = (Array.isArray(chars) ? chars : [])
      .filter(c => c?.visual_dna || c?.description)
      .map(c => `${sanitizeUserText(c.name, 80)} (${sanitizeUserText(c.visual_dna || c.description, 600)})`)
      .join(', ');

    // flux-realism produces significantly more photorealistic results than base flux
    const fullPrompt = [
      charBlock ? `Characters: ${charBlock}` : '',
      stylePrompt,
      sanitizeUserText(prompt),
      'masterpiece, best quality, highly detailed faces, sharp focus, photorealistic, 8k, cinematic, no text, no watermarks',
    ].filter(Boolean).join(', ')
      // Pollinations carries the prompt in the URL path — keep the encoded
      // request line well under common 8KB server limits
      .slice(0, 1800);

    const encoded = encodeURIComponent(fullPrompt);
    // No model param — Pollinations' available models change over time
    // (currently only "sana"); omitting it always uses their current default
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=576&nologo=true&nofeed=true&enhance=true`;

    const res = await fetch(url, { signal: AbortSignal.timeout(55000) });
    if (!res.ok) {
      console.warn(`[pollinations] generation failed: HTTP ${res.status}`);
      return null;
    }

    const buffer = await res.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('[pollinations] generation failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
