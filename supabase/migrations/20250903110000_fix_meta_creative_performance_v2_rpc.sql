-- Fixed RPC function for Meta Ads creative performance with proper column aliasing
DROP FUNCTION IF EXISTS marketing.get_meta_creative_performance_v2(date, date);

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
  WITH creative_metrics AS (
    -- First get all creative performance data with proper aggregation
    SELECT 
      cp.creative_id as perf_creative_id,
      cp.campaign_id as perf_campaign_id,
      
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
           
    FROM marketing.meta_ads_creative_performance cp
    WHERE cp.date >= start_date 
      AND cp.date <= end_date
      AND cp.impressions > 0
    GROUP BY cp.creative_id, cp.campaign_id
  ),
  
  creative_with_campaign AS (
    -- Join with campaign data and creative assets
    SELECT 
      cm.*,
      -- Campaign info (using first campaign if creative spans multiple)
      cam.campaign_name,
      cam.objective as campaign_objective,
      -- Creative assets
      COALESCE(aca.text_content, 'Creative ' || RIGHT(cm.perf_creative_id::text, 4)) as creative_name,
      COALESCE(aca.asset_type, 'UNKNOWN') as creative_type,
      aca.thumbnail_url,
      aca.asset_url as image_url,
      aca.preview_url as video_url,
      aca.text_content as title,
      aca.text_content as body,
      aca.call_to_action_type
      
    FROM creative_metrics cm
    LEFT JOIN marketing.meta_ads_campaigns cam ON cm.perf_campaign_id = cam.campaign_id
    LEFT JOIN marketing.ad_creative_assets aca ON cm.perf_creative_id = aca.creative_id
  ),
  
  final_results AS (
    -- Final calculations and action status
    SELECT 
      cwc.*,
      
      -- Cost per result based on objective
      CASE 
        WHEN cwc.total_conversions > 0 THEN cwc.total_spend_cents / cwc.total_conversions
        WHEN cwc.total_clicks > 0 THEN cwc.total_spend_cents / cwc.total_clicks  
        ELSE 0
      END as cost_per_result_cents,
      
      -- Trends
      CASE 
        WHEN cwc.prev_7d_spend_cents = 0 AND cwc.last_7d_spend_cents > 0 THEN 'up'
        WHEN cwc.prev_7d_spend_cents > 0 AND cwc.last_7d_spend_cents = 0 THEN 'down'
        WHEN cwc.prev_7d_spend_cents > 0 AND cwc.last_7d_spend_cents > cwc.prev_7d_spend_cents * 1.1 THEN 'up'
        WHEN cwc.prev_7d_spend_cents > 0 AND cwc.last_7d_spend_cents < cwc.prev_7d_spend_cents * 0.9 THEN 'down'
        ELSE 'stable'
      END as spend_trend_7d,
      
      CASE 
        WHEN cwc.prev_7d_conversions = 0 AND cwc.last_7d_conversions > 0 THEN 'up'
        WHEN cwc.prev_7d_conversions > 0 AND cwc.last_7d_conversions = 0 THEN 'down'  
        WHEN cwc.prev_7d_conversions > 0 AND cwc.last_7d_conversions > cwc.prev_7d_conversions * 1.2 THEN 'up'
        WHEN cwc.prev_7d_conversions > 0 AND cwc.last_7d_conversions < cwc.prev_7d_conversions * 0.8 THEN 'down'
        ELSE 'stable'
      END as conversion_trend_7d,
      
      CASE 
        WHEN cwc.prev_7d_impressions > 0 AND cwc.last_7d_impressions > 0 THEN
          CASE 
            WHEN (cwc.last_7d_clicks::numeric / cwc.last_7d_impressions) > (cwc.prev_7d_clicks::numeric / cwc.prev_7d_impressions) * 1.1 THEN 'up'
            WHEN (cwc.last_7d_clicks::numeric / cwc.last_7d_impressions) < (cwc.prev_7d_clicks::numeric / cwc.prev_7d_impressions) * 0.9 THEN 'down'
            ELSE 'stable'
          END
        ELSE 'stable'
      END as ctr_trend_7d,
      
      -- Action status calculation
      CASE
        -- High frequency = refresh needed
        WHEN COALESCE(cwc.frequency, 0) > 2.5 THEN 'refresh'
        
        -- High spend with no results = pause
        WHEN cwc.total_spend_cents > 100000 AND cwc.total_conversions = 0 THEN 'pause'
        
        -- For LEADS objective
        WHEN cwc.campaign_objective IN ('OUTCOME_LEADS', 'OUTCOME_SALES') AND cwc.total_conversions > 0 THEN
          CASE 
            WHEN cwc.total_spend_cents / cwc.total_conversions < 20000 THEN 'scale'  -- < ฿200
            WHEN cwc.total_spend_cents / cwc.total_conversions < 35000 THEN 'keep'   -- < ฿350  
            WHEN cwc.total_spend_cents / cwc.total_conversions < 50000 THEN 'monitor' -- < ฿500
            ELSE 'pause'
          END
        
        -- For TRAFFIC objective  
        WHEN cwc.campaign_objective = 'OUTCOME_TRAFFIC' AND cwc.total_clicks > 0 THEN
          CASE
            WHEN cwc.total_spend_cents / cwc.total_clicks < 4000 THEN 'scale'    -- < ฿40 CPC
            WHEN cwc.total_spend_cents / cwc.total_clicks < 6000 THEN 'keep'     -- < ฿60 CPC
            WHEN cwc.total_spend_cents / cwc.total_clicks < 8000 THEN 'monitor'  -- < ฿80 CPC
            ELSE 'pause'
          END
        
        -- For ENGAGEMENT objective
        WHEN cwc.campaign_objective = 'OUTCOME_ENGAGEMENT' AND cwc.total_impressions > 0 THEN
          CASE
            WHEN cwc.avg_ctr > 0.015 THEN 'scale'    -- > 1.5% CTR
            WHEN cwc.avg_ctr > 0.009 THEN 'keep'     -- > 0.9% CTR
            WHEN cwc.avg_ctr > 0.005 THEN 'monitor'  -- > 0.5% CTR
            ELSE 'pause'
          END
        
        -- Default for low activity
        WHEN cwc.total_impressions < 100 THEN 'monitor'
        ELSE 'keep'
      END as action_status,
      
      -- Action reason
      CASE
        WHEN COALESCE(cwc.frequency, 0) > 2.5 THEN 'High frequency - creative fatigue'
        WHEN cwc.total_spend_cents > 100000 AND cwc.total_conversions = 0 THEN 'High spend with no results'
        WHEN cwc.campaign_objective IN ('OUTCOME_LEADS', 'OUTCOME_SALES') AND cwc.total_conversions > 0 AND cwc.total_spend_cents / cwc.total_conversions >= 50000 THEN 'Cost per lead too high'
        WHEN cwc.campaign_objective = 'OUTCOME_TRAFFIC' AND cwc.total_clicks > 0 AND cwc.total_spend_cents / cwc.total_clicks >= 8000 THEN 'Cost per click too high'  
        WHEN cwc.campaign_objective = 'OUTCOME_ENGAGEMENT' AND cwc.avg_ctr <= 0.005 THEN 'Low click-through rate'
        WHEN cwc.total_impressions < 100 THEN 'Still learning - low volume'
        ELSE 'Performing within benchmarks'
      END as action_reason
      
    FROM creative_with_campaign cwc
  )
  
  SELECT 
    fr.perf_creative_id::text as creative_id,
    fr.creative_name::text,
    fr.creative_type::text,
    fr.thumbnail_url::text,
    fr.image_url::text,
    fr.video_url::text,
    fr.title::text,
    fr.body::text,
    fr.call_to_action_type::text,
    
    -- Campaign info
    fr.perf_campaign_id::text as campaign_id,
    fr.campaign_name::text,
    fr.campaign_objective::text,
    
    -- Performance metrics
    fr.total_spend_cents::bigint,
    fr.total_impressions::bigint,
    fr.total_clicks::bigint,
    fr.total_conversions::numeric,
    fr.avg_ctr::numeric,
    fr.avg_cpc_cents::bigint,
    fr.avg_cpm_cents::bigint,
    
    -- Period comparisons
    fr.last_30d_spend_cents::bigint,
    fr.last_30d_impressions::bigint,
    fr.last_30d_clicks::bigint,
    fr.last_30d_conversions::numeric,
    
    fr.last_7d_spend_cents::bigint,
    fr.last_7d_impressions::bigint,
    fr.last_7d_clicks::bigint,
    fr.last_7d_conversions::numeric,
    
    -- Trends
    fr.spend_trend_7d::text,
    fr.conversion_trend_7d::text,
    fr.ctr_trend_7d::text,
    
    -- Action indicators
    COALESCE(fr.frequency, 0)::numeric as frequency,
    fr.action_status::text,
    fr.action_reason::text,
    fr.cost_per_result_cents::bigint,
    
    -- Time data
    fr.launch_date::date,
    fr.days_active::bigint,
    fr.last_active_date::date
    
  FROM final_results fr
  WHERE fr.total_impressions > 0  -- Only return creatives that actually ran
  ORDER BY fr.total_spend_cents DESC;
END;
$$;