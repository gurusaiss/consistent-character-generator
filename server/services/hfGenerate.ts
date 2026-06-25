interface HFResult {
  imageData: string;
  mimeType: string;
}

interface CharSpec {
  name: string;
  visual_dna: string;
  description: string;
}

function buildDetailedCharacterBlock(chars: CharSpec[]): string {
  return chars
    .filter(c => c.visual_dna || c.description)
    .map(c => {
      const spec = c.visual_dna || c.description;
      return `${c.name} (${spec})`;
    })
    .join(', ');
}

export async function generateWithHF(
  prompt: string,
  stylePrompt: string,
  chars: CharSpec[],
): Promise<HFResult | null> {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) return null;

  const charBlock = buildDetailedCharacterBlock(chars);

  // FLUX.1-dev produces significantly higher quality than schnell
  // More detailed prompt structure for better character adherence
  const fullPrompt = [
    charBlock ? `Featuring these specific characters: ${charBlock}` : '',
    stylePrompt,
    prompt,
    'masterpiece, best quality, highly detailed faces, sharp focus, 8k uhd, photorealistic skin texture, professional photography, cinematic lighting, single panel, no text, no watermarks, no borders',
  ].filter(Boolean).join(', ');

  const negativePrompt = 'deformed, ugly, bad anatomy, bad proportions, blurry, low quality, text, watermark, signature, border, multiple panels, disfigured face, mutated, extra limbs';

  try {
    // Try FLUX.1-dev first (much higher quality, better at following detailed descriptions)
    const res = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-dev',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: {
            num_inference_steps: 28,
            guidance_scale: 3.5,
            width: 1024,
            height: 576,
          },
        }),
      }
    );

    if (res.ok) {
      const buffer = await res.arrayBuffer();
      return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
    }

    // Fallback to FLUX.1-schnell if dev fails
    const fallback = await fetch(
      'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: fullPrompt,
          parameters: { num_inference_steps: 8, width: 1024, height: 576 },
        }),
      }
    );

    if (!fallback.ok) {
      const body = await fallback.text().catch(() => '');
      console.warn(`HF API error ${fallback.status}:`, body.slice(0, 200));
      return null;
    }

    const buffer = await fallback.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('HF generation error:', err instanceof Error ? err.message : err);
    return null;
  }
}
