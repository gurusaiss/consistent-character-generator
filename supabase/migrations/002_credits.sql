-- Add per-user generation limit to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS generations_limit INTEGER NOT NULL DEFAULT 30;

-- Backfill existing rows
UPDATE public.profiles SET generations_limit = 30 WHERE generations_limit IS NULL;
