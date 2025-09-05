-- Create RPC function to get Meta Ads performance with platform breakdown
CREATE OR REPLACE FUNCTION marketing.get_meta_ads_performance(
  start_date date,
  end_date date
)
RETURNS TABLE (
  impressions bigint,
  clicks bigint,
  spend_cents bigint,
  ctr numeric,
  platform text,
  platform_split numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.impressions::bigint,
    cp.clicks::bigint,
    cp.spend_cents::bigint,
    cp.ctr,
    CASE 
      -- If targeting has publisher_platforms array, extract platforms
      WHEN jsonb_typeof(adsets.targeting->'publisher_platforms') = 'array' THEN
        CASE 
          WHEN adsets.targeting->'publisher_platforms' ? 'facebook' AND adsets.targeting->'publisher_platforms' ? 'instagram' THEN 'both'
          WHEN adsets.targeting->'publisher_platforms' ? 'facebook' THEN 'facebook'
          WHEN adsets.targeting->'publisher_platforms' ? 'instagram' THEN 'instagram'
          ELSE 'facebook' -- Default fallback
        END
      -- If no platform targeting data, default to facebook
      ELSE 'facebook'
    END as platform,
    CASE 
      -- If both platforms, split 50/50
      WHEN jsonb_typeof(adsets.targeting->'publisher_platforms') = 'array' 
           AND adsets.targeting->'publisher_platforms' ? 'facebook' 
           AND adsets.targeting->'publisher_platforms' ? 'instagram' THEN 0.5
      -- If single platform or default, give full attribution
      ELSE 1.0
    END as platform_split
  FROM marketing.meta_ads_ad_performance cp
  JOIN marketing.meta_ads_ads ads ON cp.ad_id = ads.ad_id
  JOIN marketing.meta_ads_ad_sets adsets ON ads.ad_set_id = adsets.ad_set_id
  WHERE cp.date >= start_date 
    AND cp.date <= end_date
    AND cp.impressions > 0; -- Only include ads that actually ran
END;
$$;