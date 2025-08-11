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
    const groupBy = searchParams.get('groupBy') || 'date'; // date, campaign, keyword

    let analyticsData;

    switch (groupBy) {
      case 'campaign':
        analyticsData = await getCampaignAnalytics(startDate, endDate);
        break;
      case 'keyword':
        analyticsData = await getKeywordAnalytics(startDate, endDate);
        break;
      case 'date':
      default:
        analyticsData = await getDateAnalytics(startDate, endDate);
        break;
    }

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Google Ads analytics error:', error);
    return NextResponse.json(
      { error: "Failed to fetch Google Ads analytics" },
      { status: 500 }
    );
  }
}

async function getDateAnalytics(startDate: string, endDate: string) {
  const { data: dailyStats } = await supabase
    .schema('marketing')
    .from('campaign_performance_summary')
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
        cost_thb: 0,
        conversions: 0,
        conversion_value_thb: 0
      });
    }
    const current = dateMap.get(date);
    current.impressions += stat.impressions || 0;
    current.clicks += stat.clicks || 0;
    current.cost_thb += stat.cost_thb || 0;
    current.conversions += stat.conversions || 0;
    current.conversion_value_thb += stat.conversion_value_thb || 0;
  });

  const dateAnalytics = Array.from(dateMap.values()).map(stat => ({
    ...stat,
    ctr: stat.impressions > 0 ? (stat.clicks / stat.impressions * 100).toFixed(2) : '0.00',
    avg_cpc: stat.clicks > 0 ? (stat.cost_thb / stat.clicks).toFixed(2) : '0.00',
    roas: stat.cost_thb > 0 ? (stat.conversion_value_thb / stat.cost_thb).toFixed(2) : '0.00'
  }));

  return {
    type: 'date_analytics',
    period: { startDate, endDate },
    data: dateAnalytics,
    summary: {
      total_impressions: dateAnalytics.reduce((sum, d) => sum + d.impressions, 0),
      total_clicks: dateAnalytics.reduce((sum, d) => sum + d.clicks, 0),
      total_cost: dateAnalytics.reduce((sum, d) => sum + d.cost_thb, 0),
      total_conversions: dateAnalytics.reduce((sum, d) => sum + d.conversions, 0),
      total_conversion_value: dateAnalytics.reduce((sum, d) => sum + d.conversion_value_thb, 0)
    }
  };
}

async function getCampaignAnalytics(startDate: string, endDate: string) {
  const { data: campaignStats } = await supabase
    .schema('marketing')
    .from('campaign_performance_summary')
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
        impressions: 0,
        clicks: 0,
        cost_thb: 0,
        conversions: 0,
        conversion_value_thb: 0
      });
    }
    const current = campaignMap.get(key);
    current.impressions += stat.impressions || 0;
    current.clicks += stat.clicks || 0;
    current.cost_thb += stat.cost_thb || 0;
    current.conversions += stat.conversions || 0;
    current.conversion_value_thb += stat.conversion_value_thb || 0;
  });

  const campaignAnalytics = Array.from(campaignMap.values())
    .map(stat => ({
      ...stat,
      ctr: stat.impressions > 0 ? (stat.clicks / stat.impressions * 100).toFixed(2) : '0.00',
      avg_cpc: stat.clicks > 0 ? (stat.cost_thb / stat.clicks).toFixed(2) : '0.00',
      roas: stat.cost_thb > 0 ? (stat.conversion_value_thb / stat.cost_thb).toFixed(2) : '0.00',
      conversion_rate: stat.clicks > 0 ? (stat.conversions / stat.clicks * 100).toFixed(2) : '0.00'
    }))
    .sort((a, b) => b.cost_thb - a.cost_thb);

  return {
    type: 'campaign_analytics',
    period: { startDate, endDate },
    data: campaignAnalytics
  };
}

async function getKeywordAnalytics(startDate: string, endDate: string) {
  const { data: keywordStats, error } = await supabase
    .schema('marketing')
    .rpc('get_keyword_performance_summary', {
      p_start_date: startDate,
      p_end_date: endDate
    });

  if (error) {
    console.error('Error fetching keyword analytics:', error);
  }

  return {
    type: 'keyword_analytics',
    period: { startDate, endDate },
    data: keywordStats || []
  };
}

