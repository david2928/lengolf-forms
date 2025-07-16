-- Create marketing schema for competitive intelligence
CREATE SCHEMA IF NOT EXISTS marketing;

-- Core competitor information
CREATE TABLE marketing.competitors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  business_type VARCHAR(100) DEFAULT 'golf_academy',
  location VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255)
);

-- Social media account mappings
CREATE TABLE marketing.competitor_social_accounts (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES marketing.competitors(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'line', 'google_reviews')),
  account_handle VARCHAR(255),
  account_url VARCHAR(500) NOT NULL,
  account_id VARCHAR(255), -- Platform-specific ID if available
  is_verified BOOLEAN DEFAULT false,
  last_scraped_at TIMESTAMP WITH TIME ZONE,
  scrape_status VARCHAR(50) DEFAULT 'pending', -- pending, success, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(competitor_id, platform)
);

-- Time-series metrics data
CREATE TABLE marketing.competitor_metrics (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES marketing.competitors(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  -- Common metrics
  followers_count INTEGER,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL(5,2),
  -- Platform-specific metrics
  page_likes INTEGER, -- Facebook
  check_ins INTEGER, -- Facebook
  google_rating DECIMAL(2,1), -- Google Reviews
  google_review_count INTEGER,
  line_friends_count INTEGER, -- LINE
  stories_count INTEGER, -- Instagram
  reels_count INTEGER, -- Instagram
  -- Metadata
  raw_data JSONB, -- Store complete scraped data
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scrape_duration_ms INTEGER,
  UNIQUE(competitor_id, platform, recorded_at)
);

-- Track significant changes
CREATE TABLE marketing.competitor_metric_changes (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES marketing.competitors(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_percentage DECIMAL(10,2),
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_competitor_metrics_lookup ON marketing.competitor_metrics(competitor_id, platform, recorded_at DESC);
CREATE INDEX idx_competitor_metrics_date ON marketing.competitor_metrics(recorded_at);
CREATE INDEX idx_competitor_changes_date ON marketing.competitor_metric_changes(detected_at);

-- View for latest metrics
CREATE OR REPLACE VIEW marketing.competitor_latest_metrics AS
SELECT DISTINCT ON (competitor_id, platform)
  cm.*,
  c.name as competitor_name,
  csa.account_handle,
  csa.account_url
FROM marketing.competitor_metrics cm
JOIN marketing.competitors c ON c.id = cm.competitor_id
JOIN marketing.competitor_social_accounts csa ON csa.competitor_id = cm.competitor_id AND csa.platform = cm.platform
WHERE c.is_active = true
ORDER BY competitor_id, platform, recorded_at DESC;

-- Add update trigger for updated_at
CREATE OR REPLACE FUNCTION marketing.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_competitors_updated_at BEFORE UPDATE ON marketing.competitors
    FOR EACH ROW EXECUTE FUNCTION marketing.update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA marketing TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA marketing TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA marketing TO authenticated;