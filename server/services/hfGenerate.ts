interface HFResult {
  imageData: string;
  mimeType: string;
}

interface CharSpec {
  name: string;
  visual_dna: string;
  description: string;
}

// The legacy router.huggingface.co/hf-inference serverless endpoint was fully
// decommissioned (returns 410 Gone for FLUX models). HF now requires routing
// through paid Inference Providers (Together/Fireworks/etc) instead — since
// this app already calls Together AI directly for free in fluxGenerate.ts,
// this generator is disabled rather than left to fail on every request.
export async function generateWithHF(
  _prompt: string,
  _stylePrompt: string,
  _chars: CharSpec[],
): Promise<HFResult | null> {
  return null;
}
