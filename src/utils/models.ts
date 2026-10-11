const LABELS: Record<string, string> = {
  'gemini-image': 'Gemini',
  gemini: 'Gemini',
  'gemini-retry': 'Gemini',
  imagen: 'Imagen',
  together: 'FLUX',
  flux: 'FLUX',
  cloudflare: 'Cloudflare',
  pollinations: 'Pollinations',
  'fal-pulid': 'PuLID',
  'fal-lora': 'LoRA',
  huggingface: 'HF',
  retry: 'Retry',
};

export function modelLabel(model: string | null | undefined): string {
  if (!model) return '';
  return LABELS[model] ?? model;
}
