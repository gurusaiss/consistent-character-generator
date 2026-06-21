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
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: fullPrompt }),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`Cloudflare AI error ${res.status}:`, body.slice(0, 200));
      return null;
    }

    const buffer = await res.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/jpeg' };
  } catch (err) {
    console.warn('Cloudflare generation error:', err instanceof Error ? err.message : err);
    return null;
  }
}
