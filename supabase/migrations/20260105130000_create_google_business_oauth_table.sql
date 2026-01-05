-- Create table for storing Google Business Profile OAuth tokens
-- This is separate from user authentication and only stores tokens for the
-- dedicated Google Business account (info@len.golf)

CREATE TABLE IF NOT EXISTS backoffice.google_business_oauth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,  -- Should be info@len.golf
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scope TEXT NOT NULL,  -- Should include business.manage
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_used_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_google_business_oauth_email
  ON backoffice.google_business_oauth(email);

-- Update trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION backoffice.update_google_business_oauth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_google_business_oauth_updated_at
  BEFORE UPDATE ON backoffice.google_business_oauth
  FOR EACH ROW
  EXECUTE FUNCTION backoffice.update_google_business_oauth_updated_at();

-- Comments
COMMENT ON TABLE backoffice.google_business_oauth IS 'Stores OAuth tokens for Google Business Profile API access (separate from user auth)';
COMMENT ON COLUMN backoffice.google_business_oauth.email IS 'Email of the Google Business account (info@len.golf)';
COMMENT ON COLUMN backoffice.google_business_oauth.refresh_token IS 'Long-lived refresh token for obtaining new access tokens';
COMMENT ON COLUMN backoffice.google_business_oauth.token_expires_at IS 'When the current access token expires';
