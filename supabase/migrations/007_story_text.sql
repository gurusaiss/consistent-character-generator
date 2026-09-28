-- Narrative caption text generated alongside each scene's image
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS story_text TEXT;
