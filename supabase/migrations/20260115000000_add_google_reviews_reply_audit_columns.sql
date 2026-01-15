-- Add audit columns for tracking who posted replies from our system
-- Phase 2: Manual Reply Posting feature

-- Add column to track which admin posted the reply
ALTER TABLE backoffice.google_reviews
  ADD COLUMN IF NOT EXISTS replied_by TEXT;

-- Add column to track when we posted the reply (our local timestamp)
ALTER TABLE backoffice.google_reviews
  ADD COLUMN IF NOT EXISTS replied_at_local TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN backoffice.google_reviews.replied_by IS 'First name of admin who posted the reply from our system';
COMMENT ON COLUMN backoffice.google_reviews.replied_at_local IS 'Timestamp when reply was posted from our system (local, not Google''s timestamp)';

-- Create index for filtering by who replied (useful for audit)
CREATE INDEX IF NOT EXISTS idx_google_reviews_replied_by
  ON backoffice.google_reviews(replied_by)
  WHERE replied_by IS NOT NULL;
