-- Create RPC function to get Meta Ads campaign performance
CREATE OR REPLACE FUNCTION marketing.get_meta_campaign_performance(
  start_date date,
  end_date date
)
RETURNS TABLE (
  campaign_id text,
  campaign_name text,
  campaign_status text,
  objective text,
  total_spend_cents bigint,
  total_impressions bigint,
  total_clicks bigint,
  avg_ctr numeric,
  first_seen date,
  last_seen date,
  days_active bigint
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.campaign_id::text,
    c.campaign_name::text,
    c.campaign_status::text,
    c.objective::text,
    SUM(cp.spend_cents)::bigint as total_spend_cents,
    SUM(cp.impressions)::bigint as total_impressions,
    SUM(cp.clicks)::bigint as total_clicks,
    AVG(cp.ctr) as avg_ctr,
    MIN(cp.date) as first_seen,
    MAX(cp.date) as last_seen,
    COUNT(DISTINCT cp.date)::bigint as days_active
  FROM marketing.meta_ads_campaigns c
  LEFT JOIN marketing.meta_ads_campaign_performance cp ON c.campaign_id = cp.campaign_id
  WHERE cp.date >= start_date 
    AND cp.date <= end_date
    AND cp.impressions > 0 -- Only include campaigns that actually ran
  GROUP BY c.campaign_id, c.campaign_name, c.campaign_status, c.objective
  ORDER BY total_spend_cents DESC;
END;
$$;