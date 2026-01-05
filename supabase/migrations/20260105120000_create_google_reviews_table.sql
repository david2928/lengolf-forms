-- Create table for storing Google Business Profile reviews
CREATE TABLE IF NOT EXISTS backoffice.google_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_review_name TEXT UNIQUE NOT NULL,  -- Full Google resource path
  reviewer_name TEXT NOT NULL,
  star_rating TEXT NOT NULL CHECK (star_rating IN ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE')),
  comment TEXT,
  language TEXT CHECK (language IN ('EN', 'TH', 'OTHER')),
  review_created_at TIMESTAMPTZ NOT NULL,
  review_updated_at TIMESTAMPTZ NOT NULL,
  -- Reply info (existing replies from Google, not our new replies)
  has_reply BOOLEAN DEFAULT FALSE NOT NULL,
  reply_text TEXT,
  reply_updated_at TIMESTAMPTZ,
  -- Sync metadata
  synced_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient filtering and sorting
CREATE INDEX IF NOT EXISTS idx_google_reviews_has_reply
  ON backoffice.google_reviews(has_reply);

CREATE INDEX IF NOT EXISTS idx_google_reviews_created
  ON backoffice.google_reviews(review_created_at DESC);

CREATE INDEX IF NOT EXISTS idx_google_reviews_rating
  ON backoffice.google_reviews(star_rating);

CREATE INDEX IF NOT EXISTS idx_google_reviews_language
  ON backoffice.google_reviews(language);

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION backoffice.update_google_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_google_reviews_updated_at
  BEFORE UPDATE ON backoffice.google_reviews
  FOR EACH ROW
  EXECUTE FUNCTION backoffice.update_google_reviews_updated_at();

-- Comment on table
COMMENT ON TABLE backoffice.google_reviews IS 'Stores synced Google Business Profile reviews for LENGOLF';
COMMENT ON COLUMN backoffice.google_reviews.google_review_name IS 'Full Google resource path (e.g., accounts/X/locations/Y/reviews/Z)';
COMMENT ON COLUMN backoffice.google_reviews.has_reply IS 'Whether the review already has a reply from the business';
