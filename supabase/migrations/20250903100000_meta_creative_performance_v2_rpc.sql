-- Enhanced RPC function for Meta Ads creative performance with action status and trends
CREATE OR REPLACE FUNCTION marketing.get_meta_creative_performance_v2(
  start_date date,
  end_date date
)
RETURNS TABLE (
  -- Identity
  creative_id text,
  creative_name text,
  creative_type text,
  thumbnail_url text,
  image_url text,
  video_url text,
  title text,
  body text,
  call_to_action_type text,
  
  -- Campaign info
  campaign_id text,
  campaign_name text,
  campaign_objective text,
  
  -- Performance metrics (lifetime in date range)
  total_spend_cents bigint,
  total_impressions bigint,
  total_clicks bigint,
  total_conversions numeric,
  avg_ctr numeric,
  avg_cpc_cents bigint,
  avg_cpm_cents bigint,
  
  -- Period comparisons
  last_30d_spend_cents bigint,
  last_30d_impressions bigint,
  last_30d_clicks bigint,
  last_30d_conversions numeric,
  
  last_7d_spend_cents bigint,
  last_7d_impressions bigint,
  last_7d_clicks bigint,
  last_7d_conversions numeric,
  
  -- Trends (comparing 7d vs previous 7d)
  spend_trend_7d text,
  conversion_trend_7d text,
  ctr_trend_7d text,
  
  -- Action indicators
  frequency numeric,
  action_status text,
  action_reason text,
  cost_per_result_cents bigint,
  
  -- Time data
  launch_date date,
  days_active bigint,
  last_active_date date
)
LANGUAGE plpgsql
AS $$
DECLARE
  current_7d_start date := end_date - interval '6 days';
  previous_7d_start date := end_date - interval '13 days';
  previous_7d_end date := end_date - interval '7 days';
  last_30d_start date := end_date - interval '29 days';
BEGIN
  RETURN QUERY
  WITH creative_base AS (
    -- Get all creatives with campaign info
    SELECT DISTINCT
      cp.creative_id,
      aca.text_content as creative_name,
      aca.asset_type as creative_type,
      aca.thumbnail_url,
      aca.image_url,
      aca.preview_url as video_url,
      aca.text_content as title,
      aca.text_content as body,
      aca.call_to_action_type,
      -- Use the campaign with highest spend for this creative
      (array_agg(cam.campaign_id ORDER BY camp_spend.total_spend DESC))[1] as primary_campaign_id,
      (array_agg(cam.campaign_name ORDER BY camp_spend.total_spend DESC))[1] as primary_campaign_name,
      (array_agg(cam.objective ORDER BY camp_spend.total_spend DESC))[1] as primary_campaign_objective
    FROM marketing.meta_ads_creative_performance cp
    LEFT JOIN marketing.ad_creative_assets aca ON cp.ad_id = aca.ad_id
    LEFT JOIN marketing.meta_ads_campaigns cam ON cp.campaign_id = cam.campaign_id
    LEFT JOIN (
      -- Calculate spend per campaign for this creative
      SELECT 
        creative_id, 
        campaign_id, 
        SUM(spend_cents) as total_spend
      FROM marketing.meta_ads_creative_performance
      WHERE date >= start_date AND date <= end_date
      GROUP BY creative_id, campaign_id
    ) camp_spend ON cp.creative_id = camp_spend.creative_id AND cp.campaign_id = camp_spend.campaign_id
    WHERE cp.date >= start_date 
      AND cp.date <= end_date
      AND cp.impressions > 0
    GROUP BY cp.creative_id, aca.text_content, aca.asset_type, aca.thumbnail_url, 
             aca.image_url, aca.preview_url, aca.call_to_action_type
  ),
  
  creative_performance AS (
    -- Aggregate performance metrics
    SELECT 
      cb.creative_id,
      cb.creative_name,
      cb.creative_type,
      cb.thumbnail_url,
      cb.image_url,
      cb.video_url,
      cb.title,
      cb.body,
      cb.call_to_action_type,
      cb.primary_campaign_id,
      cb.primary_campaign_name,
      cb.primary_campaign_objective,
      
      -- Total performance
      SUM(cp.spend_cents) as total_spend_cents,
      SUM(cp.impressions) as total_impressions,
      SUM(cp.clicks) as total_clicks,
      SUM(cp.conversions) as total_conversions,
      CASE WHEN SUM(cp.impressions) > 0 
           THEN SUM(cp.clicks)::numeric / SUM(cp.impressions)::numeric 
           ELSE 0 END as avg_ctr,
      CASE WHEN SUM(cp.clicks) > 0 
           THEN SUM(cp.spend_cents) / SUM(cp.clicks) 
           ELSE 0 END as avg_cpc_cents,
      CASE WHEN SUM(cp.impressions) > 0 
           THEN (SUM(cp.spend_cents) * 1000) / SUM(cp.impressions) 
           ELSE 0 END as avg_cpm_cents,
           
      -- Last 30 days
      SUM(CASE WHEN cp.date >= last_30d_start THEN cp.spend_cents ELSE 0 END) as last_30d_spend_cents,
      SUM(CASE WHEN cp.date >= last_30d_start THEN cp.impressions ELSE 0 END) as last_30d_impressions,
      SUM(CASE WHEN cp.date >= last_30d_start THEN cp.clicks ELSE 0 END) as last_30d_clicks,
      SUM(CASE WHEN cp.date >= last_30d_start THEN cp.conversions ELSE 0 END) as last_30d_conversions,
      
      -- Last 7 days
      SUM(CASE WHEN cp.date >= current_7d_start THEN cp.spend_cents ELSE 0 END) as last_7d_spend_cents,
      SUM(CASE WHEN cp.date >= current_7d_start THEN cp.impressions ELSE 0 END) as last_7d_impressions,
      SUM(CASE WHEN cp.date >= current_7d_start THEN cp.clicks ELSE 0 END) as last_7d_clicks,
      SUM(CASE WHEN cp.date >= current_7d_start THEN cp.conversions ELSE 0 END) as last_7d_conversions,
      
      -- Previous 7 days for trend comparison
      SUM(CASE WHEN cp.date >= previous_7d_start AND cp.date <= previous_7d_end THEN cp.spend_cents ELSE 0 END) as prev_7d_spend_cents,
      SUM(CASE WHEN cp.date >= previous_7d_start AND cp.date <= previous_7d_end THEN cp.conversions ELSE 0 END) as prev_7d_conversions,
      SUM(CASE WHEN cp.date >= previous_7d_start AND cp.date <= previous_7d_end THEN cp.clicks ELSE 0 END) as prev_7d_clicks,
      SUM(CASE WHEN cp.date >= previous_7d_start AND cp.date <= previous_7d_end THEN cp.impressions ELSE 0 END) as prev_7d_impressions,
      
      -- Time data
      MIN(cp.date) as launch_date,
      COUNT(DISTINCT cp.date) as days_active,
      MAX(cp.date) as last_active_date,
      
      -- Frequency calculation (approximate from impressions/reach if available)
      CASE WHEN SUM(cp.reach) > 0 
           THEN SUM(cp.impressions)::numeric / SUM(cp.reach)::numeric 
           ELSE NULL END as frequency
           
    FROM creative_base cb
    LEFT JOIN marketing.meta_ads_creative_performance cp ON cb.creative_id = cp.creative_id
    WHERE cp.date >= start_date AND cp.date <= end_date
    GROUP BY 
      cb.creative_id, cb.creative_name, cb.creative_type, cb.thumbnail_url,
      cb.image_url, cb.video_url, cb.title, cb.body, cb.call_to_action_type,
      cb.primary_campaign_id, cb.primary_campaign_name, cb.primary_campaign_objective
  )
  
  SELECT 
    cperf.creative_id::text,
    COALESCE(cperf.creative_name, 'Creative ' || RIGHT(cperf.creative_id::text, 4))::text as creative_name,
    COALESCE(cperf.creative_type, 'UNKNOWN')::text as creative_type,
    cperf.thumbnail_url::text,
    cperf.image_url::text,
    cperf.video_url::text,
    cperf.title::text,
    cperf.body::text,
    cperf.call_to_action_type::text,
    
    -- Campaign info
    cperf.primary_campaign_id::text as campaign_id,
    cperf.primary_campaign_name::text as campaign_name,
    cperf.primary_campaign_objective::text as campaign_objective,
    
    -- Performance metrics
    cperf.total_spend_cents::bigint,
    cperf.total_impressions::bigint,
    cperf.total_clicks::bigint,
    cperf.total_conversions::numeric,
    cperf.avg_ctr::numeric,
    cperf.avg_cpc_cents::bigint,
    cperf.avg_cpm_cents::bigint,
    
    -- Period comparisons
    cperf.last_30d_spend_cents::bigint,
    cperf.last_30d_impressions::bigint,
    cperf.last_30d_clicks::bigint,
    cperf.last_30d_conversions::numeric,
    
    cperf.last_7d_spend_cents::bigint,
    cperf.last_7d_impressions::bigint,
    cperf.last_7d_clicks::bigint,
    cperf.last_7d_conversions::numeric,
    
    -- Trends
    CASE 
      WHEN cperf.prev_7d_spend_cents = 0 AND cperf.last_7d_spend_cents > 0 THEN 'up'
      WHEN cperf.prev_7d_spend_cents > 0 AND cperf.last_7d_spend_cents = 0 THEN 'down'
      WHEN cperf.prev_7d_spend_cents > 0 AND cperf.last_7d_spend_cents > cperf.prev_7d_spend_cents * 1.1 THEN 'up'
      WHEN cperf.prev_7d_spend_cents > 0 AND cperf.last_7d_spend_cents < cperf.prev_7d_spend_cents * 0.9 THEN 'down'
      ELSE 'stable'
    END::text as spend_trend_7d,
    
    CASE 
      WHEN cperf.prev_7d_conversions = 0 AND cperf.last_7d_conversions > 0 THEN 'up'
      WHEN cperf.prev_7d_conversions > 0 AND cperf.last_7d_conversions = 0 THEN 'down'  
      WHEN cperf.prev_7d_conversions > 0 AND cperf.last_7d_conversions > cperf.prev_7d_conversions * 1.2 THEN 'up'
      WHEN cperf.prev_7d_conversions > 0 AND cperf.last_7d_conversions < cperf.prev_7d_conversions * 0.8 THEN 'down'
      ELSE 'stable'
    END::text as conversion_trend_7d,
    
    CASE 
      WHEN cperf.prev_7d_impressions > 0 AND cperf.last_7d_impressions > 0 THEN
        CASE 
          WHEN (cperf.last_7d_clicks::numeric / cperf.last_7d_impressions) > (cperf.prev_7d_clicks::numeric / cperf.prev_7d_impressions) * 1.1 THEN 'up'
          WHEN (cperf.last_7d_clicks::numeric / cperf.last_7d_impressions) < (cperf.prev_7d_clicks::numeric / cperf.prev_7d_impressions) * 0.9 THEN 'down'
          ELSE 'stable'
        END
      ELSE 'stable'
    END::text as ctr_trend_7d,
    
    -- Action status and cost per result
    COALESCE(cperf.frequency, 0)::numeric as frequency,
    
    -- Cost per result based on objective
    CASE 
      WHEN cperf.total_conversions > 0 THEN cperf.total_spend_cents / cperf.total_conversions
      WHEN cperf.total_clicks > 0 THEN cperf.total_spend_cents / cperf.total_clicks  
      ELSE 0
    END::bigint as cost_per_result_cents,
    
    -- Action status calculation
    CASE
      -- High frequency = refresh needed
      WHEN COALESCE(cperf.frequency, 0) > 2.5 THEN 'refresh'
      
      -- High spend with no results = pause
      WHEN cperf.total_spend_cents > 100000 AND cperf.total_conversions = 0 THEN 'pause'
      
      -- For LEADS objective
      WHEN cperf.primary_campaign_objective IN ('OUTCOME_LEADS', 'OUTCOME_SALES') AND cperf.total_conversions > 0 THEN
        CASE 
          WHEN cperf.total_spend_cents / cperf.total_conversions < 20000 THEN 'scale'  -- < ฿200
          WHEN cperf.total_spend_cents / cperf.total_conversions < 35000 THEN 'keep'   -- < ฿350  
          WHEN cperf.total_spend_cents / cperf.total_conversions < 50000 THEN 'monitor' -- < ฿500
          ELSE 'pause'
        END
      
      -- For TRAFFIC objective  
      WHEN cperf.primary_campaign_objective = 'OUTCOME_TRAFFIC' AND cperf.total_clicks > 0 THEN
        CASE
          WHEN cperf.total_spend_cents / cperf.total_clicks < 4000 THEN 'scale'    -- < ฿40 CPC
          WHEN cperf.total_spend_cents / cperf.total_clicks < 6000 THEN 'keep'     -- < ฿60 CPC
          WHEN cperf.total_spend_cents / cperf.total_clicks < 8000 THEN 'monitor'  -- < ฿80 CPC
          ELSE 'pause'
        END
      
      -- For ENGAGEMENT objective
      WHEN cperf.primary_campaign_objective = 'OUTCOME_ENGAGEMENT' AND cperf.total_impressions > 0 THEN
        CASE
          WHEN cperf.avg_ctr > 0.015 THEN 'scale'    -- > 1.5% CTR
          WHEN cperf.avg_ctr > 0.009 THEN 'keep'     -- > 0.9% CTR
          WHEN cperf.avg_ctr > 0.005 THEN 'monitor'  -- > 0.5% CTR
          ELSE 'pause'
        END
      
      -- Default for low activity
      WHEN cperf.total_impressions < 100 THEN 'monitor'
      ELSE 'keep'
    END::text as action_status,
    
    -- Action reason
    CASE
      WHEN COALESCE(cperf.frequency, 0) > 2.5 THEN 'High frequency - creative fatigue'
      WHEN cperf.total_spend_cents > 100000 AND cperf.total_conversions = 0 THEN 'High spend with no results'
      WHEN cperf.primary_campaign_objective IN ('OUTCOME_LEADS', 'OUTCOME_SALES') AND cperf.total_conversions > 0 AND cperf.total_spend_cents / cperf.total_conversions >= 50000 THEN 'Cost per lead too high'
      WHEN cperf.primary_campaign_objective = 'OUTCOME_TRAFFIC' AND cperf.total_clicks > 0 AND cperf.total_spend_cents / cperf.total_clicks >= 8000 THEN 'Cost per click too high'  
      WHEN cperf.primary_campaign_objective = 'OUTCOME_ENGAGEMENT' AND cperf.avg_ctr <= 0.005 THEN 'Low click-through rate'
      WHEN cperf.total_impressions < 100 THEN 'Still learning - low volume'
      ELSE 'Performing within benchmarks'
    END::text as action_reason,
    
    -- Time data
    cperf.launch_date::date,
    cperf.days_active::bigint,
    cperf.last_active_date::date
    
  FROM creative_performance cperf
  WHERE cperf.total_impressions > 0  -- Only return creatives that actually ran
  ORDER BY cperf.total_spend_cents DESC;
END;
$$;