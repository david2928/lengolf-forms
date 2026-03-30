-- Add follow_up_message column for multi-message AI suggestions
-- (e.g., coaching schedule sent as a second message after the main reply)
ALTER TABLE ai_suggestions ADD COLUMN IF NOT EXISTS follow_up_message text;
