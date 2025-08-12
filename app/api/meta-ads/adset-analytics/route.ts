import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const campaignId = searchParams.get('campaignId'); // Optional filter by campaign

    // Base query for adset performance with campaign information
    let query = supabase
      .schema('marketing')
      .from('meta_ads_adset_performance')
      .select(`
        *,
        meta_ads_ad_sets!inner(
          adset_name,
          campaign_id,
          adset_status,
          optimization_goal,
          daily_budget_cents,
          lifetime_budget_cents,
          meta_ads_campaigns!inner(
            campaign_name,
            campaign_type,
            objective
          )
        )
      `)
      .gte('date', startDate)
      .lte('date', endDate);

    // Add campaign filter if specified
    if (campaignId) {
      query = query.eq('meta_ads_ad_sets.campaign_id', campaignId);
    }

    const { data: adsetPerformanceData, error } = await query.order('date', { ascending: false });

    if (error) {
      console.error('Error fetching adset performance data:', error);
      return NextResponse.json({ error: "Failed to fetch adset performance data" }, { status: 500 });
    }

    // Process and aggregate the data by adset
    const adsetMap = new Map();

    adsetPerformanceData?.forEach(record => {
      const adsetId = record.adset_id;
      const adsetInfo = record.meta_ads_ad_sets;
      
      if (!adsetMap.has(adsetId)) {
        adsetMap.set(adsetId, {
          adset_id: adsetId,
          adset_name: adsetInfo?.adset_name || 'Unknown',
          adset_status: adsetInfo?.adset_status || 'unknown',
          optimization_goal: adsetInfo?.optimization_goal || 'unknown',
          daily_budget_cents: adsetInfo?.daily_budget_cents || 0,
          lifetime_budget_cents: adsetInfo?.lifetime_budget_cents || 0,
          campaign_id: adsetInfo?.campaign_id || 'unknown',
          campaign_name: adsetInfo?.meta_ads_campaigns?.campaign_name || 'Unknown Campaign',
          campaign_type: adsetInfo?.meta_ads_campaigns?.campaign_type || 'unknown',
          objective: adsetInfo?.meta_ads_campaigns?.objective || 'unknown',
          impressions: 0,
          clicks: 0,
          spend_cents: 0,
          conversions: 0,
          conversion_value_cents: 0,
          reach: 0,
          unique_clicks: 0,
          days_active: 0
        });
      }

      const adsetData = adsetMap.get(adsetId);
      adsetData.impressions += record.impressions || 0;
      adsetData.clicks += record.clicks || 0;
      adsetData.spend_cents += record.spend_cents || 0;
      adsetData.conversions += record.conversions || 0;
      adsetData.conversion_value_cents += record.conversion_value_cents || 0;
      adsetData.reach = Math.max(adsetData.reach, record.reach || 0); // Use max reach, not sum
      adsetData.unique_clicks += record.unique_clicks || 0;
      adsetData.days_active++;
    });

    // Convert aggregated data to array and calculate derived metrics
    const adsetAnalytics = Array.from(adsetMap.values()).map(adset => {
      const spend_thb = adset.spend_cents / 100;
      const ctr = adset.impressions > 0 ? ((adset.clicks / adset.impressions) * 100).toFixed(2) : '0.00';
      const cpc = adset.clicks > 0 ? (spend_thb / adset.clicks).toFixed(2) : '0.00';
      const cpm = adset.impressions > 0 ? ((spend_thb / adset.impressions) * 1000).toFixed(2) : '0.00';
      const conversion_rate = adset.clicks > 0 ? ((adset.conversions / adset.clicks) * 100).toFixed(2) : '0.00';
      const cost_per_conversion = adset.conversions > 0 ? (spend_thb / adset.conversions).toFixed(2) : '0.00';
      const cost_per_unique_click = adset.unique_clicks > 0 ? (spend_thb / adset.unique_clicks).toFixed(2) : '0.00';
      
      return {
        ...adset,
        spend_thb: parseFloat(spend_thb.toFixed(2)),
        conversion_value_thb: parseFloat((adset.conversion_value_cents / 100).toFixed(2)),
        ctr,
        cpc,
        cpm,
        conversion_rate,
        cost_per_conversion,
        cost_per_unique_click,
        daily_budget_thb: parseFloat((adset.daily_budget_cents / 100).toFixed(2)),
        lifetime_budget_thb: parseFloat((adset.lifetime_budget_cents / 100).toFixed(2))
      };
    });

    // Sort by spend descending
    adsetAnalytics.sort((a, b) => b.spend_thb - a.spend_thb);

    // Calculate summary statistics
    const summary = {
      total_adsets: adsetAnalytics.length,
      total_impressions: adsetAnalytics.reduce((sum, a) => sum + a.impressions, 0),
      total_clicks: adsetAnalytics.reduce((sum, a) => sum + a.clicks, 0),
      total_spend: parseFloat(adsetAnalytics.reduce((sum, a) => sum + a.spend_thb, 0).toFixed(2)),
      total_conversions: adsetAnalytics.reduce((sum, a) => sum + a.conversions, 0),
      average_ctr: adsetAnalytics.length > 0 ? 
        (adsetAnalytics.reduce((sum, a) => sum + parseFloat(a.ctr), 0) / adsetAnalytics.length).toFixed(2) : '0.00',
      average_conversion_rate: adsetAnalytics.length > 0 ? 
        (adsetAnalytics.reduce((sum, a) => sum + parseFloat(a.conversion_rate), 0) / adsetAnalytics.length).toFixed(2) : '0.00'
    };

    return NextResponse.json({
      success: true,
      type: "adset_analytics",
      period: { startDate, endDate },
      data: adsetAnalytics,
      summary,
      campaign_filter: campaignId || null
    });

  } catch (error) {
    console.error('Meta Ads adset analytics error:', error);
    return NextResponse.json({
      error: "Failed to fetch Meta Ads adset analytics",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}