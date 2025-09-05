-- Create RPC function to get Meta Ads creative performance
CREATE OR REPLACE FUNCTION marketing.get_meta_creative_performance(
  start_date date,
  end_date date
)
RETURNS TABLE (
  creative_id text,
  creative_name text,
  creative_type text,
  thumbnail_url text,
  image_url text,
  video_url text,
  title text,
  body text,
  call_to_action_type text,
  total_spend_cents bigint,
  total_impressions bigint,
  total_clicks bigint,
  avg_ctr numeric,
  first_seen date,
  last_seen date,
  days_active bigint,
  campaign_name text,
  campaign_id text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.creative_id::text,
    c.creative_name::text,
    c.creative_type::text,
    c.thumbnail_url::text,
    c.image_url::text,
    c.video_url::text,
    c.title::text,
    c.body::text,
    c.call_to_action_type::text,
    SUM(cp.spend_cents)::bigint as total_spend_cents,
    SUM(cp.impressions)::bigint as total_impressions,
    SUM(cp.clicks)::bigint as total_clicks,
    AVG(cp.ctr) as avg_ctr,
    MIN(cp.date) as first_seen,
    MAX(cp.date) as last_seen,
    COUNT(DISTINCT cp.date)::bigint as days_active,
    campaigns.campaign_name::text,
    campaigns.campaign_id::text
  FROM marketing.meta_ads_ad_creatives c
  LEFT JOIN marketing.meta_ads_creative_performance cp ON c.creative_id = cp.creative_id
  LEFT JOIN marketing.meta_ads_ads ads ON c.creative_id = ads.creative_id
  LEFT JOIN marketing.meta_ads_campaigns campaigns ON ads.campaign_id = campaigns.campaign_id
  WHERE cp.date >= start_date 
    AND cp.date <= end_date
    AND cp.impressions > 0 -- Only include creatives that actually ran
  GROUP BY c.creative_id, c.creative_name, c.creative_type, c.thumbnail_url, 
           c.image_url, c.video_url, c.title, c.body, c.call_to_action_type,
           campaigns.campaign_name, campaigns.campaign_id
  ORDER BY total_spend_cents DESC;
END;
$$;