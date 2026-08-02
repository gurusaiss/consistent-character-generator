-- Store the AI-enhanced prompt alongside each generated scene
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS enhanced_prompt TEXT;
