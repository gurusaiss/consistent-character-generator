/**
 * LoRA training pipeline via fal.ai.
 * Trains a FLUX LoRA on character reference images, stores weights in Supabase.
 *
 * Flow:
 * 1. Fetch all character images (reference + extra_image_urls)
 * 2. Zip them up and upload to Supabase storage
 * 3. Submit training job to fal-ai/flux-lora-fast-training
 * 4. Store job ID → poll via /api/characters/:id/lora-status
 * 5. When complete, store lora_url in characters table
 *
 * Requires FAL_KEY env var.
 */

import JSZip from 'jszip';
import { supabase } from '../supabase.js';

const FAL_TRAIN_MODEL = 'fal-ai/flux-lora-fast-training';
const FAL_QUEUE_BASE = 'https://queue.fal.run';

export interface TrainingStatus {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  loraUrl?: string;
  error?: string;
}

async function fetchImageBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Failed to fetch image: ${url} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Creates a zip of all character images and uploads it to Supabase storage.
 * Returns the public URL of the uploaded zip.
 */
async function buildAndUploadImageZip(charId: string, imageUrls: string[]): Promise<string> {
  const zip = new JSZip();
  const folder = zip.folder('images')!;

  await Promise.all(imageUrls.map(async (url, i) => {
    try {
      const buf = await fetchImageBuffer(url);
      const ext = url.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
      folder.file(`image_${String(i + 1).padStart(3, '0')}.${ext}`, buf);
    } catch (err) {
      console.warn(`Skipping image ${i + 1} for LoRA training:`, err instanceof Error ? err.message : err);
    }
  }));

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'STORE' });

  const zipPath = `lora-training/${charId}/images.zip`;
  const { error } = await supabase.storage
    .from('character-references')
    .upload(zipPath, zipBuffer, { contentType: 'application/zip', upsert: true });

  if (error) throw new Error(`Zip upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage
    .from('character-references')
    .getPublicUrl(zipPath);

  return publicUrl;
}

/**
 * Starts a LoRA training job for a character.
 * Returns the fal.ai request_id to poll for status.
 */
export async function startLoRATraining(
  charId: string,
  imageUrls: string[],
  triggerWord: string,
): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) throw new Error('FAL_KEY is not configured.');
  if (imageUrls.length < 3) throw new Error('At least 3 reference images are required for LoRA training.');

  const zipUrl = await buildAndUploadImageZip(charId, imageUrls);

  const res = await fetch(`${FAL_QUEUE_BASE}/${FAL_TRAIN_MODEL}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${falKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // Only documented params — rank/learning_rate are not part of this API
      images_data_url: zipUrl,
      trigger_word: triggerWord,
      steps: 500,          // ~3-5 min, good quality
      create_masks: true,  // segmentation masks improve subject-focused training
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`fal.ai training submission failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data: any = await res.json();
  const requestId: string = data.request_id;
  if (!requestId) throw new Error('fal.ai did not return a request_id');
  return requestId;
}

/**
 * Polls the status of a fal.ai training job.
 */
export async function getTrainingStatus(jobId: string): Promise<TrainingStatus> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) return { status: 'FAILED', error: 'FAL_KEY not configured' };

  try {
    // Check status
    const statusRes = await fetch(
      `${FAL_QUEUE_BASE}/${FAL_TRAIN_MODEL}/requests/${jobId}/status`,
      { headers: { Authorization: `Key ${falKey}` } }
    );

    if (!statusRes.ok) {
      return { status: 'FAILED', error: `Status check failed: ${statusRes.status}` };
    }

    const statusData: any = await statusRes.json();
    const status = statusData.status as TrainingStatus['status'];

    if (status !== 'COMPLETED') {
      return { status };
    }

    // Fetch result when completed
    const resultRes = await fetch(
      `${FAL_QUEUE_BASE}/${FAL_TRAIN_MODEL}/requests/${jobId}`,
      { headers: { Authorization: `Key ${falKey}` } }
    );

    if (!resultRes.ok) {
      return { status: 'FAILED', error: `Result fetch failed: ${resultRes.status}` };
    }

    const result: any = await resultRes.json();
    const loraUrl: string | undefined = result.diffusers_lora_file?.url;

    if (!loraUrl) {
      return { status: 'FAILED', error: 'Training completed but no LoRA URL returned' };
    }

    return { status: 'COMPLETED', loraUrl };
  } catch (err) {
    return { status: 'FAILED', error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
