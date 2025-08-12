import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

// Meta Business SDK configuration
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
const META_API_VERSION = process.env.META_API_VERSION || 'v23.0';
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!META_ACCESS_TOKEN || !META_AD_ACCOUNT_ID) {
      return NextResponse.json({ 
        error: "Meta Ads API credentials not configured" 
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const syncType = searchParams.get('syncType') || 'performance'; // 'campaigns', 'performance', 'adsets', 'full'

    // Log sync start
    const { data: syncLog } = await supabase
      .schema('marketing')
      .from('meta_ads_sync_log')
      .insert({
        sync_type: syncType,
        sync_status: 'running',
        start_date: startDate,
        end_date: endDate
      })
      .select()
      .single();

    let result;
    try {
      switch (syncType) {
        case 'campaigns':
          result = await syncCampaigns();
          break;
        case 'performance':
          result = await syncPerformance(startDate, endDate);
          break;
        case 'adsets':
          result = await syncAdsetPerformance(startDate, endDate);
          break;
        case 'full':
          const campaignsResult = await syncCampaigns();
          const performanceResult = await syncPerformance(startDate, endDate);
          const adsetsResult = await syncAdsetPerformance(startDate, endDate);
          result = {
            campaigns: campaignsResult.recordsProcessed,
            performance: performanceResult.recordsProcessed,
            adsets: adsetsResult.recordsProcessed,
            totalRecords: campaignsResult.recordsProcessed + performanceResult.recordsProcessed + adsetsResult.recordsProcessed
          };
          break;
        default:
          throw new Error(`Unknown sync type: ${syncType}`);
      }

      // Update sync log with success
      await supabase
        .schema('marketing')
        .from('meta_ads_sync_log')
        .update({
          sync_status: 'success',
          records_synced: ('totalRecords' in result ? result.totalRecords : result.recordsProcessed) || 0
        })
        .eq('id', syncLog.id);

      return NextResponse.json({
        success: true,
        syncId: syncLog.id,
        ...result
      });

    } catch (error) {
      // Update sync log with error
      await supabase
        .schema('marketing')
        .from('meta_ads_sync_log')
        .update({
          sync_status: 'error',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', syncLog.id);

      throw error;
    }

  } catch (error) {
    console.error('Meta Ads sync error:', error);
    return NextResponse.json({
      error: "Failed to sync Meta Ads data",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function syncCampaigns() {
  try {
    // Fetch campaigns from Meta API
    const campaignsUrl = `${META_BASE_URL}/act_${META_AD_ACCOUNT_ID}/campaigns`;
    const campaignsParams = new URLSearchParams({
      access_token: META_ACCESS_TOKEN!,
      fields: 'id,name,status,objective,created_time,start_time,stop_time,daily_budget,lifetime_budget,budget_type,bid_strategy',
      limit: '500'
    });

    const campaignsResponse = await fetch(`${campaignsUrl}?${campaignsParams}`);
    const campaignsData = await campaignsResponse.json();

    if (campaignsData.error) {
      throw new Error(`Meta API Error: ${campaignsData.error.message}`);
    }

    const campaigns = campaignsData.data || [];
    let recordsProcessed = 0;

    // Process campaigns in batches
    for (const campaign of campaigns) {
      const campaignData = {
        campaign_id: campaign.id, // Keep as string to avoid parseInt precision issues
        campaign_name: campaign.name,
        campaign_status: campaign.status?.toLowerCase() || 'unknown',
        campaign_type: campaign.objective?.toLowerCase() || 'unknown',
        objective: campaign.objective,
        start_date: campaign.start_time ? new Date(campaign.start_time).toISOString().split('T')[0] : null,
        end_date: campaign.stop_time ? new Date(campaign.stop_time).toISOString().split('T')[0] : null,
        daily_budget_cents: campaign.daily_budget ? parseInt(campaign.daily_budget) : null,
        lifetime_budget_cents: campaign.lifetime_budget ? parseInt(campaign.lifetime_budget) : null,
        budget_type: campaign.budget_type || 'daily',
        bid_strategy: campaign.bid_strategy || 'auto',
        updated_at: new Date().toISOString()
      };

      // Upsert campaign
      await supabase
        .schema('marketing')
        .from('meta_ads_campaigns')
        .upsert(campaignData, { onConflict: 'campaign_id' });

      recordsProcessed++;
    }

    // Also sync ad sets for each campaign
    let adSetsProcessed = 0;
    for (const campaign of campaigns) {
      try {
        const adSetsUrl = `${META_BASE_URL}/${campaign.id}/adsets`;
        const adSetsParams = new URLSearchParams({
          access_token: META_ACCESS_TOKEN!,
          fields: 'id,name,status,daily_budget,lifetime_budget,optimization_goal,bid_amount,targeting',
          limit: '100'
        });

        const adSetsResponse = await fetch(`${adSetsUrl}?${adSetsParams}`);
        const adSetsData = await adSetsResponse.json();

        if (adSetsData.data) {
          for (const adSet of adSetsData.data) {
            const adSetData = {
              adset_id: adSet.id, // Keep as string
              campaign_id: campaign.id, // Keep as string
              adset_name: adSet.name,
              adset_status: adSet.status?.toLowerCase() || 'unknown',
              daily_budget_cents: adSet.daily_budget ? parseInt(adSet.daily_budget) : null,
              lifetime_budget_cents: adSet.lifetime_budget ? parseInt(adSet.lifetime_budget) : null,
              budget_type: adSet.daily_budget ? 'daily' : 'lifetime',
              optimization_goal: adSet.optimization_goal,
              bid_amount_cents: adSet.bid_amount ? parseInt(adSet.bid_amount) : null,
              targeting_json: adSet.targeting || {},
              updated_at: new Date().toISOString()
            };

            await supabase
              .schema('marketing')
              .from('meta_ads_ad_sets')
              .upsert(adSetData, { onConflict: 'adset_id' });

            adSetsProcessed++;
          }
        }
      } catch (error) {
        console.warn(`Failed to sync ad sets for campaign ${campaign.id}:`, error);
        // Continue processing other campaigns
      }
    }

    return { 
      recordsProcessed: recordsProcessed + adSetsProcessed,
      campaigns: recordsProcessed,
      adSets: adSetsProcessed
    };

  } catch (error) {
    console.error('Error syncing Meta Ads campaigns:', error);
    throw error;
  }
}

async function syncPerformance(startDate: string, endDate: string) {
  try {
    // First, get all campaign IDs from our database
    const { data: campaigns } = await supabase
      .schema('marketing')
      .from('meta_ads_campaigns')
      .select('campaign_id');

    if (!campaigns || campaigns.length === 0) {
      throw new Error('No campaigns found. Run campaign sync first.');
    }

    let recordsProcessed = 0;

    // Process performance data for each campaign
    for (const campaign of campaigns) {
      try {
        // Fetch campaign insights from Meta API
        const insightsUrl = `${META_BASE_URL}/${campaign.campaign_id}/insights`;
        const insightsParams = new URLSearchParams({
          access_token: META_ACCESS_TOKEN!,
          fields: 'impressions,clicks,spend,actions,action_values,ctr,cpc,cpm,reach,frequency,unique_clicks,cost_per_unique_click',
          time_range: JSON.stringify({
            since: startDate,
            until: endDate
          }),
          time_increment: '1', // Daily breakdown
          level: 'campaign'
        });

        const insightsResponse = await fetch(`${insightsUrl}?${insightsParams}`);
        const insightsData = await insightsResponse.json();

        if (insightsData.error) {
          console.warn(`Meta API Error for campaign ${campaign.campaign_id}:`, insightsData.error.message);
          continue;
        }

        const insights = insightsData.data || [];

        // Process each day's data
        for (const insight of insights) {
          // Extract conversions from actions array
          let conversions = 0;
          let conversionValue = 0;
          
          if (insight.actions && Array.isArray(insight.actions)) {
            // Count relevant conversion actions
            insight.actions.forEach((action: any) => {
              if (action.action_type && (
                action.action_type.includes('conversion') ||
                action.action_type.includes('purchase') ||
                action.action_type.includes('lead') ||
                action.action_type === 'offsite_conversion'
              )) {
                conversions += parseFloat(action.value || '0');
              }
            });
          }

          if (insight.action_values && Array.isArray(insight.action_values)) {
            // Sum up conversion values
            insight.action_values.forEach((actionValue: any) => {
              if (actionValue.action_type && actionValue.action_type.includes('conversion')) {
                conversionValue += parseFloat(actionValue.value || '0');
              }
            });
          }

          const performanceData = {
            campaign_id: campaign.campaign_id,
            date: insight.date_start,
            impressions: parseInt(insight.impressions || '0'),
            clicks: parseInt(insight.clicks || '0'),
            spend_cents: Math.round(parseFloat(insight.spend || '0') * 100), // Convert to cents
            conversions: conversions,
            conversion_value_cents: Math.round(conversionValue * 100),
            ctr: parseFloat(insight.ctr || '0'),
            cpc_cents: Math.round(parseFloat(insight.cpc || '0') * 100),
            cpm_cents: Math.round(parseFloat(insight.cpm || '0') * 100),
            reach: parseInt(insight.reach || '0'),
            frequency: parseFloat(insight.frequency || '0'),
            unique_clicks: parseInt(insight.unique_clicks || '0'),
            cost_per_unique_click_cents: Math.round(parseFloat(insight.cost_per_unique_click || '0') * 100),
            created_at: new Date().toISOString()
          };

          // Upsert performance data
          await supabase
            .schema('marketing')
            .from('meta_ads_campaign_performance')
            .upsert(performanceData, { 
              onConflict: 'campaign_id,date',
              ignoreDuplicates: false 
            });

          recordsProcessed++;
        }

        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(`Failed to sync performance for campaign ${campaign.campaign_id}:`, error);
        // Continue processing other campaigns
      }
    }

    return { recordsProcessed };

  } catch (error) {
    console.error('Error syncing Meta Ads performance:', error);
    throw error;
  }
}

async function syncAdsetPerformance(startDate: string, endDate: string) {
  try {
    // First, get all adset IDs from our database
    const { data: adsets } = await supabase
      .schema('marketing')
      .from('meta_ads_ad_sets')
      .select('adset_id, campaign_id');

    if (!adsets || adsets.length === 0) {
      throw new Error('No adsets found. Run campaign sync first.');
    }

    let recordsProcessed = 0;

    // Process performance data for each adset
    for (const adset of adsets) {
      try {
        // Fetch adset insights from Meta API
        const insightsUrl = `${META_BASE_URL}/${adset.adset_id}/insights`;
        const insightsParams = new URLSearchParams({
          access_token: META_ACCESS_TOKEN!,
          fields: 'impressions,clicks,spend,actions,action_values,ctr,cpc,cpm,reach,frequency,unique_clicks,cost_per_unique_click',
          time_range: JSON.stringify({
            since: startDate,
            until: endDate
          }),
          time_increment: '1', // Daily breakdown
          level: 'adset'
        });

        const insightsResponse = await fetch(`${insightsUrl}?${insightsParams}`);
        const insightsData = await insightsResponse.json();

        if (insightsData.error) {
          console.warn(`Meta API Error for adset ${adset.adset_id}:`, insightsData.error.message);
          continue;
        }

        const insights = insightsData.data || [];

        // Process each day's data
        for (const insight of insights) {
          // Extract conversions from actions array
          let conversions = 0;
          let conversionValue = 0;
          
          if (insight.actions && Array.isArray(insight.actions)) {
            // Count relevant conversion actions
            insight.actions.forEach((action: any) => {
              if (action.action_type && (
                action.action_type.includes('conversion') ||
                action.action_type.includes('purchase') ||
                action.action_type.includes('lead') ||
                action.action_type === 'offsite_conversion'
              )) {
                conversions += parseFloat(action.value || '0');
              }
            });
          }

          if (insight.action_values && Array.isArray(insight.action_values)) {
            // Sum up conversion values
            insight.action_values.forEach((actionValue: any) => {
              if (actionValue.action_type && actionValue.action_type.includes('conversion')) {
                conversionValue += parseFloat(actionValue.value || '0');
              }
            });
          }

          const performanceData = {
            adset_id: adset.adset_id,
            campaign_id: adset.campaign_id,
            date: insight.date_start,
            impressions: parseInt(insight.impressions || '0'),
            clicks: parseInt(insight.clicks || '0'),
            spend_cents: Math.round(parseFloat(insight.spend || '0') * 100), // Convert to cents
            conversions: conversions,
            conversion_value_cents: Math.round(conversionValue * 100),
            ctr: parseFloat(insight.ctr || '0'),
            cpc_cents: Math.round(parseFloat(insight.cpc || '0') * 100),
            cpm_cents: Math.round(parseFloat(insight.cpm || '0') * 100),
            reach: parseInt(insight.reach || '0'),
            frequency: parseFloat(insight.frequency || '0'),
            created_at: new Date().toISOString()
          };

          // Upsert adset performance data
          await supabase
            .schema('marketing')
            .from('meta_ads_adset_performance')
            .upsert(performanceData, { 
              onConflict: 'adset_id,date',
              ignoreDuplicates: false 
            });

          recordsProcessed++;
        }

        // Small delay to respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.warn(`Failed to sync adset performance for adset ${adset.adset_id}:`, error);
        // Continue processing other adsets
      }
    }

    return { recordsProcessed };

  } catch (error) {
    console.error('Error syncing Meta Ads adset performance:', error);
    throw error;
  }
}