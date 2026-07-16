/**
 * Face swap post-processing via fal-ai/face-swap.
 *
 * After the best image is generated and uploaded, this replaces each
 * character's face in the scene with their exact reference photo —
 * preserving 100% facial identity (same eyes, nose, lips, skin tone,
 * hairline) regardless of what the generative model produced.
 *
 * For N characters: applied sequentially, face_index 0..N-1.
 * Falls back gracefully — if any swap fails the previous image is kept.
 *
 * Requires FAL_KEY.
 */

interface SwapResult {
  imageData: string;
  mimeType: string;
}

interface CharRef {
  name: string;
  reference_image_url: string;
}

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Fetch failed: ${url} (${res.status})`);
  return Buffer.from(await res.arrayBuffer()).toString('base64');
}

/**
 * Apply face swaps for all characters with reference images.
 * baseImageUrl must be a publicly accessible URL (Supabase storage).
 */
export async function applyFaceSwaps(
  baseImageUrl: string,
  chars: CharRef[],
): Promise<SwapResult | null> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return null;

  const charsWithRefs = chars.filter(c => c.reference_image_url);
  if (charsWithRefs.length === 0) return null;

  let currentUrl = baseImageUrl;
  let lastImageData: string | null = null;
  let swappedAny = false;

  for (let i = 0; i < charsWithRefs.length; i++) {
    const char = charsWithRefs[i];
    try {
      const res = await fetch('https://fal.run/fal-ai/face-swap', {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          base_image_url: currentUrl,
          swap_image_url: char.reference_image_url,
          det_thresh: 0.1,
          det_maxnum: charsWithRefs.length, // detect as many faces as we have chars
          face_index: i,                    // i-th face = i-th character
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        console.warn(`Face swap failed for "${char.name}" (${res.status}):`, errText.slice(0, 200));
        continue;
      }

      const data: any = await res.json();
      const resultUrl: string | undefined = data.image?.url;
      if (!resultUrl) {
        console.warn(`Face swap for "${char.name}" returned no image URL`);
        continue;
      }

      // Fetch the swapped result so it can be passed as URL in next iteration
      // and returned as base64 at the end
      const swappedBase64 = await fetchBase64(resultUrl);
      lastImageData = swappedBase64;

      // For the next character, use the already-swapped result
      // We re-upload to Supabase to keep a stable URL
      currentUrl = `data:image/jpeg;base64,${swappedBase64}`;
      swappedAny = true;

      console.log(`Face swap applied for "${char.name}" (face_index=${i})`);
    } catch (err) {
      console.warn(`Face swap error for "${char.name}":`, err instanceof Error ? err.message : err);
    }
  }

  if (!swappedAny || !lastImageData) return null;
  return { imageData: lastImageData, mimeType: 'image/jpeg' };
}
