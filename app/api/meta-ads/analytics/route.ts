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
    const groupBy = searchParams.get('groupBy') || 'date'; // date, campaign, adset

    let analyticsData;

    switch (groupBy) {
      case 'campaign':
        analyticsData = await getCampaignAnalytics(startDate, endDate);
        break;
      case 'adset':
        analyticsData = await getAdSetAnalytics(startDate, endDate);
        break;
      case 'date':
      default:
        analyticsData = await getDateAnalytics(startDate, endDate);
        break;
    }

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Meta Ads analytics error:', error);
    return NextResponse.json(
      { error: "Failed to fetch Meta Ads analytics" },
      { status: 500 }
    );
  }
}

async function getDateAnalytics(startDate: string, endDate: string) {
  const { data: dailyStats } = await supabase
    .schema('marketing')
    .from('meta_ads_campaign_performance_summary')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true });

  // Aggregate by date
  const dateMap = new Map();
  dailyStats?.forEach(stat => {
    const date = stat.date;
    if (!dateMap.has(date)) {
      dateMap.set(date, {
        date,
        impressions: 0,
        clicks: 0,
        spend_thb: 0,
        conversions: 0,
        conversion_value_thb: 0,
        reach: 0,
        unique_clicks: 0
      });
    }
    const current = dateMap.get(date);
    current.impressions += stat.impressions || 0;
    current.clicks += stat.clicks || 0;
    current.spend_thb += stat.spend_thb || 0;
    current.conversions += stat.conversions || 0;
    current.conversion_value_thb += stat.conversion_value_thb || 0;
    current.reach += stat.reach || 0;
    current.unique_clicks += stat.unique_clicks || 0;
  });

  const dateAnalytics = Array.from(dateMap.values()).map(stat => ({
    ...stat,
    ctr: stat.impressions > 0 ? (stat.clicks / stat.impressions * 100).toFixed(2) : '0.00',
    cpc: stat.clicks > 0 ? (stat.spend_thb / stat.clicks).toFixed(2) : '0.00',
    cpm: stat.impressions > 0 ? (stat.spend_thb / stat.impressions * 1000).toFixed(2) : '0.00',
    roas: stat.spend_thb > 0 ? (stat.conversion_value_thb / stat.spend_thb).toFixed(2) : '0.00',
    cost_per_unique_click: stat.unique_clicks > 0 ? (stat.spend_thb / stat.unique_clicks).toFixed(2) : '0.00'
  }));

  return {
    type: 'date_analytics',
    period: { startDate, endDate },
    data: dateAnalytics,
    summary: {
      total_impressions: dateAnalytics.reduce((sum, d) => sum + d.impressions, 0),
      total_clicks: dateAnalytics.reduce((sum, d) => sum + d.clicks, 0),
      total_spend: dateAnalytics.reduce((sum, d) => sum + d.spend_thb, 0),
      total_conversions: dateAnalytics.reduce((sum, d) => sum + d.conversions, 0),
      total_conversion_value: dateAnalytics.reduce((sum, d) => sum + d.conversion_value_thb, 0),
      total_reach: dateAnalytics.reduce((sum, d) => sum + d.reach, 0),
      total_unique_clicks: dateAnalytics.reduce((sum, d) => sum + d.unique_clicks, 0)
    }
  };
}

async function getCampaignAnalytics(startDate: string, endDate: string) {
  const { data: campaignStats } = await supabase
    .schema('marketing')
    .from('meta_ads_campaign_performance_summary')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  // Aggregate by campaign
  const campaignMap = new Map();
  campaignStats?.forEach(stat => {
    const key = `${stat.campaign_name}_${stat.campaign_type}`;
    if (!campaignMap.has(key)) {
      campaignMap.set(key, {
        campaign_name: stat.campaign_name,
        campaign_type: stat.campaign_type,
        campaign_status: stat.campaign_status,
        objective: stat.objective,
        impressions: 0,
        clicks: 0,
        spend_thb: 0,
        conversions: 0,
        conversion_value_thb: 0,
        reach: 0,
        unique_clicks: 0
      });
    }
    const current = campaignMap.get(key);
    current.impressions += stat.impressions || 0;
    current.clicks += stat.clicks || 0;
    current.spend_thb += stat.spend_thb || 0;
    current.conversions += stat.conversions || 0;
    current.conversion_value_thb += stat.conversion_value_thb || 0;
    current.reach += stat.reach || 0;
    current.unique_clicks += stat.unique_clicks || 0;
  });

  const campaignAnalytics = Array.from(campaignMap.values())
    .map(stat => ({
      ...stat,
      ctr: stat.impressions > 0 ? (stat.clicks / stat.impressions * 100).toFixed(2) : '0.00',
      cpc: stat.clicks > 0 ? (stat.spend_thb / stat.clicks).toFixed(2) : '0.00',
      cpm: stat.impressions > 0 ? (stat.spend_thb / stat.impressions * 1000).toFixed(2) : '0.00',
      roas: stat.spend_thb > 0 ? (stat.conversion_value_thb / stat.spend_thb).toFixed(2) : '0.00',
      conversion_rate: stat.clicks > 0 ? (stat.conversions / stat.clicks * 100).toFixed(2) : '0.00',
      cost_per_unique_click: stat.unique_clicks > 0 ? (stat.spend_thb / stat.unique_clicks).toFixed(2) : '0.00'
    }))
    .sort((a, b) => b.spend_thb - a.spend_thb);

  return {
    type: 'campaign_analytics',
    period: { startDate, endDate },
    data: campaignAnalytics
  };
}

async function getAdSetAnalytics(startDate: string, endDate: string) {
  const { data: adsetStats } = await supabase
    .schema('marketing')
    .from('meta_ads_adset_performance')
    .select(`
      *,
      meta_ads_ad_sets (
        adset_name,
        optimization_goal
      ),
      meta_ads_campaigns (
        campaign_name,
        campaign_type
      )
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  // Aggregate by ad set
  const adsetMap = new Map();
  adsetStats?.forEach(stat => {
    const key = stat.adset_id;
    if (!adsetMap.has(key)) {
      adsetMap.set(key, {
        adset_id: stat.adset_id,
        adset_name: stat.meta_ads_ad_sets?.adset_name,
        campaign_name: stat.meta_ads_campaigns?.campaign_name,
        campaign_type: stat.meta_ads_campaigns?.campaign_type,
        optimization_goal: stat.meta_ads_ad_sets?.optimization_goal,
        impressions: 0,
        clicks: 0,
        spend_thb: 0,
        conversions: 0,
        conversion_value_thb: 0,
        reach: 0
      });
    }
    const current = adsetMap.get(key);
    current.impressions += stat.impressions || 0;
    current.clicks += stat.clicks || 0;
    current.spend_thb += (stat.spend_cents || 0) / 100;
    current.conversions += stat.conversions || 0;
    current.conversion_value_thb += (stat.conversion_value_cents || 0) / 100;
    current.reach += stat.reach || 0;
  });

  const adsetAnalytics = Array.from(adsetMap.values())
    .map(stat => ({
      ...stat,
      ctr: stat.impressions > 0 ? (stat.clicks / stat.impressions * 100).toFixed(2) : '0.00',
      cpc: stat.clicks > 0 ? (stat.spend_thb / stat.clicks).toFixed(2) : '0.00',
      cpm: stat.impressions > 0 ? (stat.spend_thb / stat.impressions * 1000).toFixed(2) : '0.00',
      roas: stat.spend_thb > 0 ? (stat.conversion_value_thb / stat.spend_thb).toFixed(2) : '0.00',
      conversion_rate: stat.clicks > 0 ? (stat.conversions / stat.clicks * 100).toFixed(2) : '0.00'
    }))
    .sort((a, b) => b.spend_thb - a.spend_thb);

  return {
    type: 'adset_analytics',
    period: { startDate, endDate },
    data: adsetAnalytics
  };
}