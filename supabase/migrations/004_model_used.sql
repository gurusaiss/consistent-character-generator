-- Track which AI model produced each generated scene
ALTER TABLE public.scenes
  ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT NULL;
