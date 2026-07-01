/**
 * fal.ai ESRGAN upscaling — sharpens and upscales the winning image 2x.
 * Falls back gracefully (returns null) so the original image is used on failure.
 * Requires FAL_KEY.
 */

interface UpscaleResult {
  imageData: string;
  mimeType: string;
}

export async function upscaleImage(base64: string, mimeType: string): Promise<UpscaleResult | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  try {
    const res = await fetch('https://fal.run/fal-ai/esrgan', {
      method: 'POST',
      headers: {
        Authorization: `Key ${falKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:${mimeType};base64,${base64}`,
        scale: 2,
        model: 'RealESRGAN_x4plus', // best general-purpose model, faces handled well
        face: true,                 // enable GFPGAN face enhancement
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(`Upscale error ${res.status}:`, body.slice(0, 200));
      return null;
    }

    const data: any = await res.json();
    const imageUrl: string | undefined = data.image?.url;
    if (!imageUrl) return null;

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) });
    if (!imgRes.ok) return null;
    const buffer = await imgRes.arrayBuffer();
    return { imageData: Buffer.from(buffer).toString('base64'), mimeType: 'image/png' };
  } catch (err) {
    console.warn('Upscale error:', err instanceof Error ? err.message : err);
    return null;
  }
}
