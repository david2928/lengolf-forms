-- Add meta_message_id column to ai_suggestions for Meta platform messages
-- (facebook, instagram, whatsapp) which are stored in meta_messages, not web_chat_messages

ALTER TABLE ai_suggestions
  ADD COLUMN meta_message_id uuid REFERENCES meta_messages(id);

-- Update CHECK constraint to allow exactly one of the three message ID fields
ALTER TABLE ai_suggestions
  DROP CONSTRAINT check_single_trigger_msg_ref;

ALTER TABLE ai_suggestions
  ADD CONSTRAINT check_single_trigger_msg_ref CHECK (
    (
      (line_message_id IS NOT NULL)::int +
      (web_message_id IS NOT NULL)::int +
      (meta_message_id IS NOT NULL)::int
    ) = 1
  );

-- Index for dedup lookups
CREATE INDEX idx_ai_suggestions_meta_message_id ON ai_suggestions(meta_message_id)
  WHERE meta_message_id IS NOT NULL;
