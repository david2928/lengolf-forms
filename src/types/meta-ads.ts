// Shared types for Meta Ads components

export interface CreativePerformanceV2 {
  creative_id: string;
  creative_name: string;
  creative_type: string;
  thumbnail_url?: string;
  image_url?: string;
  video_url?: string;
  title?: string;
  body?: string;
  call_to_action_type?: string;
  
  // Hierarchical info
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  adset_id: string;
  adset_name: string;
  adset_status: string;
  ad_status: string;
  
  // Performance metrics (all from V2 RPC)
  total_spend_cents: number;
  total_impressions: number;
  total_clicks: number;
  total_leads: number; // Changed from conversions for better semantics
  avg_ctr: number;
  avg_cpc_cents: number;
  avg_cpm_cents: number;
  
  // Period comparisons
  last_30d_spend_cents: number;
  last_30d_impressions: number;
  last_30d_clicks: number;
  last_30d_leads: number; // Changed from conversions for better semantics
  
  last_7d_spend_cents: number;
  last_7d_impressions: number;
  last_7d_clicks: number;
  last_7d_leads: number; // Changed from conversions for better semantics
  
  // Trends (comparing 7d vs previous 7d)
  spend_trend_7d: string;
  lead_trend_7d: string; // Changed from conversion_trend_7d
  ctr_trend_7d: string;
  
  // Action indicators
  frequency: number;
  action_status: string;
  action_reason: string;
  cost_per_result_cents: number;
  
  // Time data
  launch_date: string;
  days_active: number;
  last_active_date: string;
}

// API response interface (data already converted by API)
export interface CreativePerformanceDisplay {
  creative_id: string;
  creative_name: string;
  creative_type: string;
  thumbnail_url?: string;
  image_url?: string;
  video_url?: string;
  title?: string;
  body?: string;
  call_to_action?: string;
  
  // Hierarchical info
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  adset_id: string;
  adset_name: string;
  adset_status: string;
  ad_status: string;
  
  // Performance metrics (API returns in dollars already)
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_leads: number; // Changed from conversions for better semantics
  average_ctr: number;
  average_cpc: number;
  average_cpm: number;
  
  // Period comparisons
  last_30d_spend: number;
  last_30d_impressions: number;
  last_30d_clicks: number;
  last_30d_leads: number; // Changed from conversions for better semantics
  
  last_7d_spend: number;
  last_7d_impressions: number;
  last_7d_clicks: number;
  last_7d_leads: number; // Changed from conversions for better semantics
  
  // Trends
  spend_trend_7d: string;
  lead_trend_7d: string; // Changed from conversion_trend_7d
  ctr_trend_7d?: string;
  
  // Action indicators
  frequency: number;
  action_status: string;
  action_reason: string;
  cost_per_result: number;
  
  // Time data
  launch_date: string;
  days_active: number;
  last_active_date?: string;
}

export interface ActionGroups {
  scale: CreativePerformanceDisplay[];
  keep: CreativePerformanceDisplay[];
  monitor: CreativePerformanceDisplay[];
  refresh: CreativePerformanceDisplay[];
  pause: CreativePerformanceDisplay[];
}

export interface AdsetGroup {
  adset_id: string;
  adset_name: string;
  adset_status: string;
  total_spend: number;
  active_ads: number;
  creatives: CreativePerformanceDisplay[];
}

export interface CampaignGroup {
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  total_spend: number;
  active_ads: number;
  adsets: AdsetGroup[];
  // Keep legacy creatives for backward compatibility
  creatives: CreativePerformanceDisplay[];
}

export interface ActionViewSummary {
  scale_count: number;
  keep_count: number;
  monitor_count: number;
  refresh_count: number;
  pause_count: number;
  total_spend: number;
  last_7d_spend: number;
}

export interface TableViewSummary {
  total_active_ads: number;
  total_campaigns: number;
  total_creatives: number;
  total_spend: number;
  total_results: number;
  last_7d_spend: number;
  last_7d_results: number;
}