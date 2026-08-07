import type { RequestHandler } from 'express';
import { z } from 'zod';

/**
 * Request validation layer.
 *
 * Every schema here is deliberately no stricter than what src/services/api.ts
 * already sends — validation must reject abuse, not the existing client.
 */

// Postgres accepts any hex string in the 8-4-4-4-12 layout for a `uuid` column.
// z.uuid() additionally enforces the RFC 4122 version/variant nibbles and so
// would reject IDs the database itself considers valid (and has stored).
const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// ~15MB decoded — express.json() already caps the body at 50mb, this just
// turns an oversized image into a clear 400 instead of a storage failure.
const MAX_BASE64_CHARS = 20_000_000;

export const STYLE_PRESET_VALUES = ['cinematic', 'anime', 'comic', 'watercolor', 'sketch', 'pixel'] as const;

export const uuidSchema = z.string('must be a valid UUID').regex(UUID_PATTERN, 'must be a valid UUID');

const optionalText = (max: number) => z.string().max(max, `must be ${max} characters or fewer`).nullish();

// The uploaded mime type is echoed back as the stored object's Content-Type on
// a public URL, so a non-image value here would be a stored-XSS vector.
const imageMimeSchema = z.string().max(100).regex(/^image\/[a-zA-Z0-9.+-]+$/, 'must be an image mime type');

const base64ImageSchema = z.string().max(MAX_BASE64_CHARS, 'image is too large');

// Empty string is a legitimate "no image yet" value throughout the schema.
const httpUrlSchema = (max: number) =>
  z.union([
    z.literal(''),
    z.string().max(max, `must be ${max} characters or fewer`).regex(/^https?:\/\//i, 'must be an http(s) URL'),
  ]);

// ── Path params ───────────────────────────────────────────────────────────
export const idParamSchema = z.object({ id: uuidSchema });
export const projectIdParamSchema = z.object({ projectId: uuidSchema });

// ── Query ─────────────────────────────────────────────────────────────────
export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int('limit must be an integer').min(1, 'limit must be at least 1').max(100, 'limit must be 100 or less').default(20),
  offset: z.coerce.number().int('offset must be an integer').min(0, 'offset cannot be negative').default(0),
});

// ── Projects ──────────────────────────────────────────────────────────────
export const projectCreateSchema = z.object({
  name: z.string('Name is required').trim().min(1, 'Name is required').max(200, 'Name must be 200 characters or fewer'),
  description: optionalText(5000),
  style_preset: z.enum(STYLE_PRESET_VALUES).nullish(),
});

export const projectUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(200, 'Name must be 200 characters or fewer').optional(),
  description: optionalText(5000),
  style_preset: z.enum(STYLE_PRESET_VALUES).nullish(),
  is_public: z.boolean().optional(),
});

// ── Characters ────────────────────────────────────────────────────────────
const extraImageSchema = z.object({
  base64: base64ImageSchema.min(1, 'base64 is required'),
  mime_type: imageMimeSchema.nullish(),
});

export const characterCreateSchema = z.object({
  name: z.string('Name is required').trim().min(1, 'Name is required').max(200, 'Name must be 200 characters or fewer'),
  description: optionalText(5000),
  base_image: base64ImageSchema.nullish(),
  mime_type: imageMimeSchema.nullish(),
  extra_images: z.array(extraImageSchema).max(20, 'at most 20 extra images').nullish(),
});

export const characterUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').max(200, 'Name must be 200 characters or fewer').optional(),
  description: optionalText(5000),
  base_image: base64ImageSchema.nullish(),
  mime_type: imageMimeSchema.nullish(),
  extra_images: z.array(extraImageSchema).max(20, 'at most 20 extra images').nullish(),
});

// ── Scenes ────────────────────────────────────────────────────────────────
export const scenesBulkSchema = z.object({
  scenes: z.array(
    z.object({ prompt: z.string('prompt is required').min(1, 'prompt cannot be empty').max(5000, 'prompt must be 5000 characters or fewer') }),
    'scenes must be array',
  ).max(500, 'at most 500 scenes per project'),
});

export const sceneUpdateSchema = z.object({
  prompt: z.string().max(5000, 'prompt must be 5000 characters or fewer').optional(),
  status: z.enum(['pending', 'loading', 'success', 'error']).optional(),
  generated_image_url: httpUrlSchema(2000).nullish(),
  error_message: optionalText(5000),
  scene_number: z.number().int('scene_number must be an integer').min(1, 'scene_number must be at least 1').max(10_000).optional(),
});

// ── Generate ──────────────────────────────────────────────────────────────
// looseObject: the handler spreads each entry through to the image services, so
// unknown keys must survive validation rather than being silently stripped.
const generateCharacterSchema = z.looseObject({
  name: z.string().max(200, 'name must be 200 characters or fewer').nullish(),
  description: optionalText(5000),
  // Server-side fetched — restricting the scheme blocks file:/data: reads.
  // Does NOT stop an internal-IP target; a host allowlist would be needed.
  reference_image_url: httpUrlSchema(2000).nullish(),
  mime_type: imageMimeSchema.nullish(),
  visual_dna: optionalText(20_000),
  lora_url: httpUrlSchema(2000).nullish(),
  lora_trigger_word: z.string().max(100).nullish(),
  lora_status: z.string().max(50).nullish(),
});

export const generateSchema = z.object({
  projectId: uuidSchema.nullish(),
  sceneId: uuidSchema.nullish(),
  prompt: z.string('Prompt is required').min(1, 'Prompt is required').max(5000, 'Prompt must be 5000 characters or fewer'),
  characters: z.array(generateCharacterSchema).max(20, 'at most 20 characters per generation').nullish(),
});

// ── Middleware ────────────────────────────────────────────────────────────
export interface ValidationErrorBody {
  error: string;
  details: Array<{ field: string; message: string }>;
}

export function formatZodError(error: z.ZodError): ValidationErrorBody {
  const details = error.issues.map((issue) => ({
    field: issue.path.map(String).join('.'),
    message: issue.message,
  }));
  const summary = details
    .map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
    .join('; ');
  return { error: summary || 'Invalid request', details };
}

export function validate(schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    // express.json() leaves req.body undefined when the request carries no
    // JSON content-type at all, which must read as an empty object, not a crash.
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) return res.status(400).json(formatZodError(result.error));
    req.body = result.data;
    next();
  };
}

export function validateParams(schema: z.ZodType): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) return res.status(400).json(formatZodError(result.error));
    next();
  };
}
