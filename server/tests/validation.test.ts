import { describe, expect, it } from 'vitest';
import {
  characterCreateSchema,
  characterUpdateSchema,
  generateSchema,
  idParamSchema,
  paginationQuerySchema,
  projectCreateSchema,
  projectUpdateSchema,
  scenesBulkSchema,
  sceneUpdateSchema,
  uuidSchema,
} from '../utils/validation.js';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('uuidSchema', () => {
  it('accepts a valid UUID', () => {
    expect(uuidSchema.safeParse(UUID).success).toBe(true);
  });
  it('rejects non-UUID strings', () => {
    expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    expect(uuidSchema.safeParse('').success).toBe(false);
  });
});

describe('idParamSchema', () => {
  it('accepts { id: uuid }', () => {
    expect(idParamSchema.safeParse({ id: UUID }).success).toBe(true);
  });
  it('rejects missing id', () => {
    expect(idParamSchema.safeParse({}).success).toBe(false);
  });
});

describe('paginationQuerySchema', () => {
  it('coerces strings to numbers', () => {
    const r = paginationQuerySchema.safeParse({ limit: '10', offset: '5' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(10);
      expect(r.data.offset).toBe(5);
    }
  });
  it('applies defaults when params are absent', () => {
    const r = paginationQuerySchema.safeParse({});
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.limit).toBe(20);
      expect(r.data.offset).toBe(0);
    }
  });
  it('rejects limit > 100', () => {
    expect(paginationQuerySchema.safeParse({ limit: '101' }).success).toBe(false);
  });
});

describe('projectCreateSchema', () => {
  it('accepts minimal valid project', () => {
    expect(projectCreateSchema.safeParse({ name: 'My Project' }).success).toBe(true);
  });
  it('rejects empty name', () => {
    expect(projectCreateSchema.safeParse({ name: '' }).success).toBe(false);
  });
  it('rejects invalid style_preset', () => {
    expect(projectCreateSchema.safeParse({ name: 'X', style_preset: 'oil-painting' }).success).toBe(false);
  });
  it('accepts known style_presets', () => {
    for (const preset of ['cinematic', 'anime', 'comic', 'watercolor', 'sketch', 'pixel']) {
      expect(projectCreateSchema.safeParse({ name: 'X', style_preset: preset }).success).toBe(true);
    }
  });
});

describe('projectUpdateSchema', () => {
  it('accepts partial updates', () => {
    expect(projectUpdateSchema.safeParse({ is_public: true }).success).toBe(true);
    expect(projectUpdateSchema.safeParse({}).success).toBe(true);
  });
  it('rejects empty name in an update', () => {
    expect(projectUpdateSchema.safeParse({ name: '' }).success).toBe(false);
  });
});

describe('characterCreateSchema', () => {
  it('accepts name-only character', () => {
    expect(characterCreateSchema.safeParse({ name: 'Alice' }).success).toBe(true);
  });
  it('rejects missing name', () => {
    expect(characterCreateSchema.safeParse({}).success).toBe(false);
  });
  it('rejects non-image mime type', () => {
    expect(characterCreateSchema.safeParse({ name: 'Alice', mime_type: 'application/pdf' }).success).toBe(false);
  });
  it('accepts valid mime type', () => {
    expect(characterCreateSchema.safeParse({ name: 'Alice', mime_type: 'image/jpeg' }).success).toBe(true);
  });
  it('rejects extra_images array longer than 20', () => {
    const imgs = Array.from({ length: 21 }, () => ({ base64: 'abc', mime_type: 'image/jpeg' }));
    expect(characterCreateSchema.safeParse({ name: 'Alice', extra_images: imgs }).success).toBe(false);
  });
});

describe('characterUpdateSchema', () => {
  it('accepts empty update', () => {
    expect(characterUpdateSchema.safeParse({}).success).toBe(true);
  });
});

describe('scenesBulkSchema', () => {
  it('accepts a list of scenes', () => {
    const r = scenesBulkSchema.safeParse({ scenes: [{ prompt: 'A hero walks in' }] });
    expect(r.success).toBe(true);
  });
  it('accepts an empty list', () => {
    expect(scenesBulkSchema.safeParse({ scenes: [] }).success).toBe(true);
  });
  it('rejects scenes missing prompt', () => {
    expect(scenesBulkSchema.safeParse({ scenes: [{}] }).success).toBe(false);
  });
  it('rejects non-array scenes', () => {
    expect(scenesBulkSchema.safeParse({ scenes: 'oops' }).success).toBe(false);
  });
});

describe('sceneUpdateSchema', () => {
  it('accepts partial update', () => {
    expect(sceneUpdateSchema.safeParse({ status: 'success' }).success).toBe(true);
  });
  it('rejects invalid status', () => {
    expect(sceneUpdateSchema.safeParse({ status: 'unknown' }).success).toBe(false);
  });
  it('rejects invalid generated_image_url scheme', () => {
    expect(sceneUpdateSchema.safeParse({ generated_image_url: 'file:///etc/passwd' }).success).toBe(false);
  });
  it('accepts empty string for generated_image_url', () => {
    expect(sceneUpdateSchema.safeParse({ generated_image_url: '' }).success).toBe(true);
  });
});

describe('generateSchema', () => {
  it('accepts minimal prompt', () => {
    expect(generateSchema.safeParse({ prompt: 'A sunset' }).success).toBe(true);
  });
  it('rejects empty prompt', () => {
    expect(generateSchema.safeParse({ prompt: '' }).success).toBe(false);
  });
  it('rejects malformed projectId', () => {
    expect(generateSchema.safeParse({ prompt: 'X', projectId: 'not-a-uuid' }).success).toBe(false);
  });
  it('accepts valid projectId', () => {
    expect(generateSchema.safeParse({ prompt: 'X', projectId: UUID }).success).toBe(true);
  });
  it('rejects lora_url with file scheme', () => {
    const char = { name: 'Bob', lora_url: 'file:///etc/passwd' };
    expect(generateSchema.safeParse({ prompt: 'X', characters: [char] }).success).toBe(false);
  });
});
