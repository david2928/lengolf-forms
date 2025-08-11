import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { GoogleAdsApi } from 'google-ads-api';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface SyncRequest {
  syncType: 'campaigns' | 'keywords' | 'performance' | 'all';
  startDate?: string;
  endDate?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SyncRequest = await request.json();
    const { syncType, startDate, endDate } = body;

    // Initialize Google Ads API client
    const client = new GoogleAdsApi({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    });

    const customer = client.Customer({
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
    });

    // Log sync start
    const { data: syncLog, error: syncLogError } = await supabase
      .schema('marketing')
      .from('google_ads_sync_log')
      .insert({
        sync_type: syncType,
        sync_status: 'in_progress',
        start_date: startDate,
        end_date: endDate
      })
      .select()
      .single();

    if (syncLogError || !syncLog) {
      console.error('Failed to create sync log:', syncLogError);
      return NextResponse.json(
        { 
          error: "Failed to initialize sync log",
          details: syncLogError?.message || 'Unknown error creating sync log'
        },
        { status: 500 }
      );
    }

    let totalSynced = 0;

    try {
      if (syncType === 'campaigns' || syncType === 'all') {
        totalSynced += await syncCampaigns(customer, supabase);
      }

      if (syncType === 'keywords' || syncType === 'all') {
        totalSynced += await syncKeywords(customer, supabase);
      }

      if (syncType === 'performance' || syncType === 'all') {
        totalSynced += await syncPerformanceData(customer, supabase, startDate, endDate);
      }

      // Update sync log with success
      if (syncLog?.id) {
        await supabase
          .schema('marketing')
          .from('google_ads_sync_log')
          .update({
            sync_status: 'success',
            records_synced: totalSynced
          })
          .eq('id', syncLog.id);
      }

      return NextResponse.json({ 
        success: true, 
        message: `Successfully synced ${totalSynced} records`,
        syncType,
        recordsSynced: totalSynced
      });

    } catch (syncError) {
      // Update sync log with error
      if (syncLog?.id) {
        await supabase
          .schema('marketing')
          .from('google_ads_sync_log')
          .update({
            sync_status: 'error',
            error_message: syncError instanceof Error ? syncError.message : 'Unknown error'
          })
          .eq('id', syncLog.id);
      }

      throw syncError;
    }

  } catch (error) {
    console.error('Google Ads sync error:', error);
    return NextResponse.json(
      { 
        error: "Failed to sync Google Ads data",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function syncCampaigns(customer: any, supabase: any): Promise<number> {
  try {
    const campaigns = await customer.query(`
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.start_date,
        campaign.end_date,
        campaign.advertising_channel_type
      FROM campaign
      WHERE campaign.status != 'REMOVED'
    `);

    let syncCount = 0;
    for (const campaign of campaigns) {
      const { error } = await supabase
        .schema('marketing')
        .from('google_ads_campaigns')
        .upsert({
          campaign_id: campaign.campaign.id,
          campaign_name: campaign.campaign.name,
          campaign_status: campaign.campaign.status.toString(),
          campaign_type: campaign.campaign.advertising_channel_type.toString(),
          start_date: campaign.campaign.start_date,
          end_date: campaign.campaign.end_date,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Failed to upsert campaign:', campaign.campaign.id, error);
        throw new Error(`Campaign sync failed: ${error.message}`);
      }
      syncCount++;
    }

    return syncCount;
  } catch (error) {
    console.error('Error syncing campaigns:', error);
    throw error;
  }
}

async function syncKeywords(customer: any, supabase: any): Promise<number> {
  try {
    const keywords = await customer.query(`
      SELECT
        ad_group_criterion.criterion_id,
        campaign.id,
        ad_group.id,
        ad_group_criterion.keyword.text,
        ad_group_criterion.keyword.match_type,
        ad_group_criterion.status,
        ad_group_criterion.cpc_bid_micros
      FROM keyword_view
      WHERE ad_group_criterion.status != 'REMOVED'
    `);

    let syncCount = 0;
    for (const keyword of keywords) {
      const { error } = await supabase
        .schema('marketing')
        .from('google_ads_keywords')
        .upsert({
          keyword_id: keyword.ad_group_criterion.criterion_id,
          campaign_id: keyword.campaign.id,
          ad_group_id: keyword.ad_group.id,
          keyword_text: keyword.ad_group_criterion.keyword.text,
          keyword_match_type: keyword.ad_group_criterion.keyword.match_type,
          keyword_status: keyword.ad_group_criterion.status,
          max_cpc_micros: keyword.ad_group_criterion.cpc_bid_micros,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Failed to upsert keyword:', keyword.ad_group_criterion.criterion_id, error);
        throw new Error(`Keyword sync failed: ${error.message}`);
      }
      syncCount++;
    }

    return syncCount;
  } catch (error) {
    console.error('Error syncing keywords:', error);
    throw error;
  }
}

async function syncPerformanceData(customer: any, supabase: any, startDate?: string, endDate?: string): Promise<number> {
  try {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Sync campaign performance
    const campaignStats = await customer.query(`
      SELECT
        campaign.id,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm
      FROM campaign
      WHERE segments.date BETWEEN '${start}' AND '${end}'
        AND campaign.status != 'REMOVED'
    `);

    // Aggregate campaign stats by campaign_id and date
    const aggregatedStats = new Map();
    for (const stat of campaignStats) {
      const key = `${stat.campaign.id}_${stat.segments.date}`;
      if (!aggregatedStats.has(key)) {
        aggregatedStats.set(key, {
          campaign_id: stat.campaign.id,
          date: stat.segments.date,
          impressions: 0,
          clicks: 0,
          cost_micros: 0,
          conversions: 0,
          conversion_value_micros: 0,
          ctr_sum: 0,
          avg_cpc_sum: 0,
          avg_cpm_sum: 0,
          count: 0
        });
      }
      const existing = aggregatedStats.get(key);
      existing.impressions += Math.floor(stat.metrics.impressions || 0);
      existing.clicks += Math.floor(stat.metrics.clicks || 0);
      existing.cost_micros += Math.floor(stat.metrics.cost_micros || 0);
      existing.conversions += stat.metrics.conversions || 0;
      existing.conversion_value_micros += Math.floor(stat.metrics.conversions_value || 0);
      existing.ctr_sum += stat.metrics.ctr || 0;
      existing.avg_cpc_sum += stat.metrics.average_cpc || 0;
      existing.avg_cpm_sum += stat.metrics.average_cpm || 0;
      existing.count += 1;
    }

    let syncCount = 0;
    for (const [key, aggStat] of Array.from(aggregatedStats.entries())) {
      const { error } = await supabase
        .schema('marketing')
        .from('google_ads_campaign_performance')
        .upsert({
          campaign_id: aggStat.campaign_id,
          date: aggStat.date,
          impressions: aggStat.impressions,
          clicks: aggStat.clicks,
          cost_micros: aggStat.cost_micros,
          conversions: aggStat.conversions,
          conversion_value_micros: aggStat.conversion_value_micros,
          ctr: aggStat.count > 0 ? aggStat.ctr_sum / aggStat.count : null,
          avg_cpc_micros: Math.floor(aggStat.count > 0 ? aggStat.avg_cpc_sum / aggStat.count : 0),
          avg_cpm_micros: Math.floor(aggStat.count > 0 ? aggStat.avg_cpm_sum / aggStat.count : 0)
        }, { onConflict: 'campaign_id,date' });
      
      if (error) {
        console.error('Failed to upsert campaign performance:', aggStat.campaign_id, error);
        throw new Error(`Campaign performance sync failed: ${error.message}`);
      }
      syncCount++;
    }

    // Sync keyword performance
    const keywordStats = await customer.query(`
      SELECT
        ad_group_criterion.criterion_id,
        campaign.id,
        segments.date,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value,
        metrics.ctr,
        metrics.average_cpc
      FROM keyword_view
      WHERE segments.date BETWEEN '${start}' AND '${end}'
        AND ad_group_criterion.status != 'REMOVED'
    `);

    for (const stat of keywordStats) {
      const { error } = await supabase
        .schema('marketing')
        .from('google_ads_keyword_performance')
        .upsert({
          keyword_id: stat.ad_group_criterion.criterion_id,
          campaign_id: stat.campaign.id,
          date: stat.segments.date,
          impressions: Math.floor(stat.metrics.impressions || 0),
          clicks: Math.floor(stat.metrics.clicks || 0),
          cost_micros: Math.floor(stat.metrics.cost_micros || 0),
          conversions: stat.metrics.conversions || 0,
          conversion_value_micros: Math.floor(stat.metrics.conversions_value || 0),
          ctr: stat.metrics.ctr,
          avg_cpc_micros: Math.floor(stat.metrics.average_cpc || 0)
        }, { onConflict: 'keyword_id,date' });
      
      if (error) {
        console.error('Failed to upsert keyword performance:', stat.ad_group_criterion.criterion_id, error);
        throw new Error(`Keyword performance sync failed: ${error.message}`);
      }
      syncCount++;
    }

    return syncCount;
  } catch (error) {
    console.error('Error syncing performance data:', error);
    throw error;
  }
}