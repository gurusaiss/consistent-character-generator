-- Add LoRA fine-tuning fields to characters table
-- Run this in your Supabase SQL editor

ALTER TABLE characters ADD COLUMN IF NOT EXISTS lora_status   TEXT    DEFAULT 'none';
ALTER TABLE characters ADD COLUMN IF NOT EXISTS lora_url      TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS lora_trigger_word TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS lora_job_id   TEXT;
ALTER TABLE characters ADD COLUMN IF NOT EXISTS extra_image_urls JSONB DEFAULT '[]';

-- Index for fast lookup of training characters
CREATE INDEX IF NOT EXISTS idx_characters_lora_status ON characters(lora_status);
