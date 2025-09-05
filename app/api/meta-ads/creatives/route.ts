import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

// Enhanced interface for new RPC function
interface CreativePerformanceV2 {
  creative_id: string;
  creative_name: string;
  creative_type: string;
  thumbnail_url?: string;
  image_url?: string;
  video_url?: string;
  title?: string;
  body?: string;
  call_to_action?: string;
  
  // Campaign info
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  adset_id: string;
  adset_name: string;
  adset_status: string;
  ad_status: string;
  
  // Performance metrics
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_leads: number; // Changed from conversions to leads
  average_ctr: number;
  average_cpc: number;
  average_cpm: number;
  
  // Period comparisons
  last_30d_spend: number;
  last_30d_impressions: number;
  last_30d_clicks: number;
  last_30d_leads: number; // Changed from conversions to leads
  
  last_7d_spend: number;
  last_7d_impressions: number;
  last_7d_clicks: number;
  last_7d_leads: number; // Changed from conversions to leads
  
  // Trends
  spend_trend_7d: string;
  lead_trend_7d: string; // Changed from conversion_trend_7d to lead_trend_7d
  ctr_trend_7d: string;
  
  // Action indicators
  frequency: number;
  action_status: string;
  action_reason: string;
  cost_per_result: number;
  
  // Time data
  launch_date: string;
  days_active: number;
  last_active_date: string;
}

// Legacy interface for backwards compatibility
interface CreativePerformance {
  creative_id: string;
  creative_name: string;
  creative_type: string;
  thumbnail_url?: string;
  image_url?: string;
  video_url?: string;
  title?: string;
  body?: string;
  call_to_action?: string;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  average_ctr: number;
  average_cpm: number;
  average_cpc: number;
  total_reach: number;
  average_frequency: number;
  total_conversions: number;
  conversion_rate: number;
  cost_per_conversion: number;
  first_seen: string;
  last_seen: string;
  days_active: number;
  campaign_info?: {
    campaign_name: string;
    campaign_id: string;
    campaign_objective: string;
  };
  // Smart performance metrics
  performance_score: number;
  efficiency_rating: string;
  objective_kpi_value: number;
  objective_kpi_label: string;
}

interface AdsetGroup {
  adset_id: string;
  adset_name: string;
  adset_status: string;
  total_spend: number;
  active_ads: number;
  creatives: CreativePerformanceV2[];
}

interface CampaignGroup {
  campaign_id: string;
  campaign_name: string;
  campaign_objective: string;
  total_spend: number;
  active_ads: number;
  adsets: AdsetGroup[];
  creatives: CreativePerformanceV2[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const referenceDateParam = searchParams.get('referenceDate');
    const view = searchParams.get('view') || 'gallery'; // 'action', 'table', 'gallery'
    const groupBy = searchParams.get('groupBy') || 'none'; // 'action', 'campaign', 'none'
    const sortBy = searchParams.get('sortBy') || 'total_spend';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const creativeType = searchParams.get('creativeType') || 'all';
    const adsetFilter = searchParams.get('adsetFilter') || 'all';
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Get reference date (exclude today unless specific date provided)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const referenceDate = referenceDateParam ? new Date(referenceDateParam) : yesterday;
    const endDate = referenceDate;
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days + 1);

    console.log('Meta Ads Creatives API - Parameters:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days,
      view,
      groupBy,
      sortBy,
      sortOrder,
      creativeType,
      adsetFilter,
      includeInactive,
      limit
    });

    // Use enhanced RPC function for all views (v2 supports all view types)
    const rpcFunction = 'get_meta_creative_performance_v2';

    console.log('Calling RPC function:', rpcFunction);

    const { data: creativeData, error: creativeError } = await supabase
      .schema('marketing')
      .rpc(rpcFunction, {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });

    if (creativeError) {
      console.error('Creative performance RPC error:', creativeError);
      return NextResponse.json(
        { error: "Failed to fetch creative performance data", details: creativeError.message },
        { status: 500 }
      );
    }

    console.log('RPC returned data count:', creativeData?.length || 0);

    // Process data using V2 enhanced function (supports all view types)
      // Process enhanced data for action/table views
      let creativesV2: CreativePerformanceV2[] = creativeData?.map((creative: any) => {
        return {
          creative_id: creative.creative_id,
          creative_name: creative.creative_name || `Creative ${creative.creative_id?.slice(-4) || 'Unknown'}`,
          creative_type: creative.creative_type || 'UNKNOWN',
          thumbnail_url: creative.thumbnail_url,
          image_url: creative.image_url,
          video_url: creative.video_url,
          title: creative.title,
          body: creative.body,
          call_to_action: creative.call_to_action_type,
          
          // Hierarchical info
          campaign_id: creative.campaign_id,
          campaign_name: creative.campaign_name,
          campaign_objective: creative.campaign_objective,
          adset_id: creative.adset_id,
          adset_name: creative.adset_name,
          adset_status: creative.adset_status,
          ad_status: creative.ad_status,
          
          // Performance metrics
          total_spend: Number(creative.total_spend_cents) / 100 || 0,
          total_impressions: Number(creative.total_impressions) || 0,
          total_clicks: Number(creative.total_clicks) || 0,
          total_leads: Number(creative.total_leads) || 0, // Changed from conversions to leads
          average_ctr: Number(creative.avg_ctr) || 0,
          average_cpc: Number(creative.avg_cpc_cents) / 100 || 0,
          average_cpm: Number(creative.avg_cpm_cents) / 100 || 0,
          
          // Period comparisons
          last_30d_spend: Number(creative.last_30d_spend_cents) / 100 || 0,
          last_30d_impressions: Number(creative.last_30d_impressions) || 0,
          last_30d_clicks: Number(creative.last_30d_clicks) || 0,
          last_30d_leads: Number(creative.last_30d_leads) || 0, // Changed from conversions to leads
          
          last_7d_spend: Number(creative.last_7d_spend_cents) / 100 || 0,
          last_7d_impressions: Number(creative.last_7d_impressions) || 0,
          last_7d_clicks: Number(creative.last_7d_clicks) || 0,
          last_7d_leads: Number(creative.last_7d_leads) || 0, // Changed from conversions to leads
          
          // Trends
          spend_trend_7d: creative.spend_trend_7d || 'stable',
          lead_trend_7d: creative.lead_trend_7d || 'stable', // Changed from conversion_trend_7d
          ctr_trend_7d: creative.ctr_trend_7d || 'stable',
          
          // Action indicators
          frequency: Number(creative.frequency) || 0,
          action_status: creative.action_status || 'keep',
          action_reason: creative.action_reason || 'No specific reason',
          cost_per_result: Number(creative.cost_per_result_cents) / 100 || 0,
          
          // Time data
          launch_date: creative.launch_date,
          days_active: Number(creative.days_active) || 0,
          last_active_date: creative.last_active_date,
          
          // KPI fields for frontend display
          objective_kpi_value: Number(creative.objective_kpi_value) || 0,
          objective_kpi_label: creative.objective_kpi_label || 'N/A',
          performance_score: Number(creative.performance_score) || 0,
          efficiency_rating: creative.efficiency_rating || 'Average'
        };
      }) || [];

      // Filter by creative type if specified
      if (creativeType !== 'all') {
        creativesV2 = creativesV2.filter(creative => 
          creative.creative_type.toLowerCase() === creativeType.toLowerCase()
        );
      }
      
      // Filter by adset if specified
      if (adsetFilter !== 'all') {
        creativesV2 = creativesV2.filter(creative => 
          creative.adset_id === adsetFilter
        );
      }

      // Sort creatives
      creativesV2.sort((a, b) => {
        const aVal = a[sortBy as keyof CreativePerformanceV2] as number;
        const bVal = b[sortBy as keyof CreativePerformanceV2] as number;
        return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
      });

      // Handle different response formats based on view
      if (view === 'table' && groupBy === 'campaign') {
        // Group by campaign → adset → creative for table view
        const campaignGroups = new Map<string, CampaignGroup>();
        
        creativesV2.forEach(creative => {
          const campaignId = creative.campaign_id;
          const adsetId = creative.adset_id;
          
          // Initialize campaign if not exists
          if (!campaignGroups.has(campaignId)) {
            campaignGroups.set(campaignId, {
              campaign_id: campaignId,
              campaign_name: creative.campaign_name,
              campaign_objective: creative.campaign_objective,
              total_spend: 0,
              active_ads: 0,
              adsets: [],
              creatives: [] // Legacy field for backward compatibility
            });
          }
          
          const campaign = campaignGroups.get(campaignId)!;
          
          // Find or create adset within campaign
          let adset = campaign.adsets.find(a => a.adset_id === adsetId);
          if (!adset) {
            adset = {
              adset_id: adsetId,
              adset_name: creative.adset_name,
              adset_status: creative.adset_status,
              total_spend: 0,
              active_ads: 0,
              creatives: []
            };
            campaign.adsets.push(adset);
          }
          
          // Add creative to adset and update stats
          adset.creatives.push(creative);
          adset.total_spend += creative.total_spend;
          adset.active_ads += 1;
          
          // Update campaign totals
          campaign.total_spend += creative.total_spend;
          campaign.active_ads += 1;
          campaign.creatives.push(creative); // Legacy field
        });

        // Sort campaigns and their adsets
        const sortedCampaigns = Array.from(campaignGroups.values())
          .sort((a, b) => b.total_spend - a.total_spend);
        
        // Sort adsets within each campaign
        sortedCampaigns.forEach(campaign => {
          campaign.adsets.sort((a, b) => b.total_spend - a.total_spend);
        });

        return NextResponse.json({
          view: 'table',
          campaigns: sortedCampaigns,
          total_campaigns: sortedCampaigns.length,
          total_creatives: creativesV2.length,
          summary: {
            total_active_ads: creativesV2.length,
            total_campaigns: sortedCampaigns.length,
            last_7d_spend: creativesV2.reduce((sum, c) => sum + c.last_7d_spend, 0),
            last_7d_results: creativesV2.reduce((sum, c) => sum + c.last_7d_leads, 0), // Changed from conversions to leads
            date_range: {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0],
              days
            }
          }
        });

      } else if (view === 'action' && groupBy === 'action') {
        // Group by action status for action view
        const actionGroups = {
          scale: creativesV2.filter(c => c.action_status === 'scale'),
          keep: creativesV2.filter(c => c.action_status === 'keep'),
          monitor: creativesV2.filter(c => c.action_status === 'monitor'),
          refresh: creativesV2.filter(c => c.action_status === 'refresh'),
          pause: creativesV2.filter(c => c.action_status === 'pause')
        };

        return NextResponse.json({
          view: 'action',
          action_groups: actionGroups,
          total: creativesV2.length,
          summary: {
            scale_count: actionGroups.scale.length,
            keep_count: actionGroups.keep.length,
            monitor_count: actionGroups.monitor.length,
            refresh_count: actionGroups.refresh.length,
            pause_count: actionGroups.pause.length,
            total_spend: creativesV2.reduce((sum, c) => sum + c.total_spend, 0),
            last_7d_spend: creativesV2.reduce((sum, c) => sum + c.last_7d_spend, 0),
            date_range: {
              start: startDate.toISOString().split('T')[0],
              end: endDate.toISOString().split('T')[0],
              days
            }
          }
        });
      }

      // Default flat list response for V2 data
      const limitedCreatives = creativesV2.slice(0, limit);
      
      return NextResponse.json({
        view: view,
        creatives: limitedCreatives,
        total: creativesV2.length,
        has_more: creativesV2.length > limit,
        summary: {
          total_creatives: creativesV2.length,
          total_spend: creativesV2.reduce((sum, c) => sum + c.total_spend, 0),
          last_7d_spend: creativesV2.reduce((sum, c) => sum + c.last_7d_spend, 0),
          last_7d_leads: creativesV2.reduce((sum, c) => sum + c.last_7d_leads, 0), // Changed from conversions to leads
          action_status_counts: {
            scale: creativesV2.filter(c => c.action_status === 'scale').length,
            keep: creativesV2.filter(c => c.action_status === 'keep').length,
            monitor: creativesV2.filter(c => c.action_status === 'monitor').length,
            refresh: creativesV2.filter(c => c.action_status === 'refresh').length,
            pause: creativesV2.filter(c => c.action_status === 'pause').length
          },
          date_range: {
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0],
            days
          }
        }
      });

  } catch (error) {
    console.error('Meta Ads creatives API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch Meta Ads creatives data" },
      { status: 500 }
    );
  }
}