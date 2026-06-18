-- Character DNA: AI-extracted visual specification for consistency
ALTER TABLE public.characters
  ADD COLUMN IF NOT EXISTS visual_dna TEXT NOT NULL DEFAULT '';

-- Per-scene consistency score (0-100) from AI verification pass
ALTER TABLE public.scenes
  ADD COLUMN IF NOT EXISTS consistency_score INTEGER DEFAULT NULL;
