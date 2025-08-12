import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface CampaignMetrics {
  campaignName: string;
  campaignType: string;
  objective: string;
  current: {
    period: string;
    spend: number;
    clicks: number;
    impressions: number;
    reach: number;
    ctr: number;
    cpc: number;
    cpm: number;
    bookingContribution: number;
  };
  previous: {
    period: string;
    spend: number;
    clicks: number;
    impressions: number;
    reach: number;
    ctr: number;
    cpc: number;
    cpm: number;
    bookingContribution: number;
  };
  changes: {
    spend: { value: number; percent: number };
    clicks: { value: number; percent: number };
    impressions: { value: number; percent: number };
    reach: { value: number; percent: number };
    ctr: { value: number; percent: number };
    cpc: { value: number; percent: number };
    cpm: { value: number; percent: number };
    bookingContribution: { value: number; percent: number };
  };
}

interface CampaignComparisonResponse {
  periodDays: number;
  campaigns: CampaignMetrics[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const analysisType = searchParams.get('analysisType') || '14-day';
    
    // Determine period length in days
    const periodDays = analysisType === '30-day' ? 30 : analysisType === '90-day' ? 90 : 14;
    
    // Calculate current period
    const currentEndDate = new Date().toISOString().split('T')[0];
    const currentStartDate = new Date(new Date(currentEndDate).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Calculate previous period (same length)
    const previousEndDate = new Date(new Date(currentStartDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const previousStartDate = new Date(new Date(previousEndDate).getTime() - periodDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get campaign data for both periods
    const campaigns = await getCampaignComparisons(
      currentStartDate, currentEndDate, previousStartDate, previousEndDate, periodDays
    );

    const response: CampaignComparisonResponse = {
      periodDays,
      campaigns
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Meta Ads campaign comparison error:', error);
    return NextResponse.json(
      { error: "Failed to generate Meta Ads campaign comparison" },
      { status: 500 }
    );
  }
}

async function getCampaignComparisons(
  currentStartDate: string,
  currentEndDate: string,
  previousStartDate: string,
  previousEndDate: string,
  periodDays: number
): Promise<CampaignMetrics[]> {
  
  // Get current period campaign data with campaign details
  const { data: currentData } = await supabase
    .schema('marketing')
    .from('meta_ads_campaign_performance')
    .select(`
      *,
      campaign:meta_ads_campaigns(campaign_name, campaign_type, objective)
    `)
    .gte('date', currentStartDate)
    .lte('date', currentEndDate);

  // Get previous period campaign data with campaign details
  const { data: previousData } = await supabase
    .schema('marketing')
    .from('meta_ads_campaign_performance')
    .select(`
      *,
      campaign:meta_ads_campaigns(campaign_name, campaign_type, objective)
    `)
    .gte('date', previousStartDate)
    .lte('date', previousEndDate);

  // Get Meta/Facebook booking data using POS-based referral data function
  const { data: currentReferralData } = await supabase
    .rpc('get_pos_combined_referral_data', {
      start_date: currentStartDate,
      end_date: currentEndDate
    });

  const { data: previousReferralData } = await supabase
    .rpc('get_pos_combined_referral_data', {
      start_date: previousStartDate,
      end_date: previousEndDate
    });

  // Aggregate current period by campaign
  const currentCampaignMap = new Map();
  currentData?.forEach(row => {
    const campaignName = row.campaign?.campaign_name || 'Unknown Campaign';
    const campaignType = row.campaign?.campaign_type || 'UNKNOWN';
    const objective = row.campaign?.objective || 'UNKNOWN';
    const key = `${campaignName}_${campaignType}`;
    
    if (!currentCampaignMap.has(key)) {
      currentCampaignMap.set(key, {
        campaignName,
        campaignType: getCampaignTypeLabel(campaignType),
        objective: getObjectiveLabel(objective),
        spend: 0,
        clicks: 0,
        impressions: 0,
        reach: 0
      });
    }
    const campaign = currentCampaignMap.get(key);
    // Convert cents to THB
    campaign.spend += (row.spend_cents || 0) / 100;
    campaign.clicks += row.clicks || 0;
    campaign.impressions += row.impressions || 0;
    campaign.reach += row.reach || 0;
  });

  // Aggregate previous period by campaign
  const previousCampaignMap = new Map();
  previousData?.forEach(row => {
    const campaignName = row.campaign?.campaign_name || 'Unknown Campaign';
    const campaignType = row.campaign?.campaign_type || 'UNKNOWN';
    const objective = row.campaign?.objective || 'UNKNOWN';
    const key = `${campaignName}_${campaignType}`;
    
    if (!previousCampaignMap.has(key)) {
      previousCampaignMap.set(key, {
        campaignName,
        campaignType: getCampaignTypeLabel(campaignType),
        objective: getObjectiveLabel(objective),
        spend: 0,
        clicks: 0,
        impressions: 0,
        reach: 0
      });
    }
    const campaign = previousCampaignMap.get(key);
    // Convert cents to THB
    campaign.spend += (row.spend_cents || 0) / 100;
    campaign.clicks += row.clicks || 0;
    campaign.impressions += row.impressions || 0;
    campaign.reach += row.reach || 0;
  });

  // Calculate total spend and booking counts for proportional attribution
  const currentTotalSpend = Array.from(currentCampaignMap.values()).reduce((sum, c) => sum + c.spend, 0);
  const previousTotalSpend = Array.from(previousCampaignMap.values()).reduce((sum, c) => sum + c.spend, 0);
  
  // Get Meta/Facebook bookings (check various referral source names)
  const currentBookingCount = currentReferralData
    ?.filter((row: any) => ['Meta', 'Facebook', 'Instagram', 'meta', 'facebook', 'instagram'].includes(row.source))
    ?.reduce((sum: number, row: any) => sum + (row.count || 0), 0) || 0;
  const previousBookingCount = previousReferralData
    ?.filter((row: any) => ['Meta', 'Facebook', 'Instagram', 'meta', 'facebook', 'instagram'].includes(row.source))
    ?.reduce((sum: number, row: any) => sum + (row.count || 0), 0) || 0;

  // Build comparison for each campaign
  const comparisons: CampaignMetrics[] = [];
  
  // Get all unique campaign keys
  const allCampaignKeys = new Set([
    ...Array.from(currentCampaignMap.keys()),
    ...Array.from(previousCampaignMap.keys())
  ]);

  for (const campaignKey of Array.from(allCampaignKeys)) {
    const currentCampaign = currentCampaignMap.get(campaignKey);
    const previousCampaign = previousCampaignMap.get(campaignKey);

    // Calculate current period metrics
    const currentSpend = currentCampaign?.spend || 0;
    const currentClicks = currentCampaign?.clicks || 0;
    const currentImpressions = currentCampaign?.impressions || 0;
    const currentReach = currentCampaign?.reach || 0;
    const currentCtr = currentImpressions > 0 ? (currentClicks / currentImpressions) * 100 : 0;
    const currentCpc = currentClicks > 0 ? currentSpend / currentClicks : 0;
    const currentCpm = currentImpressions > 0 ? (currentSpend / currentImpressions) * 1000 : 0;
    const currentBookingContribution = currentTotalSpend > 0 ? (currentSpend / currentTotalSpend) * currentBookingCount : 0;

    // Calculate previous period metrics
    const previousSpend = previousCampaign?.spend || 0;
    const previousClicks = previousCampaign?.clicks || 0;
    const previousImpressions = previousCampaign?.impressions || 0;
    const previousReach = previousCampaign?.reach || 0;
    const previousCtr = previousImpressions > 0 ? (previousClicks / previousImpressions) * 100 : 0;
    const previousCpc = previousClicks > 0 ? previousSpend / previousClicks : 0;
    const previousCpm = previousImpressions > 0 ? (previousSpend / previousImpressions) * 1000 : 0;
    const previousBookingContribution = previousTotalSpend > 0 ? (previousSpend / previousTotalSpend) * previousBookingCount : 0;

    // Skip campaigns with no data in either period
    if (currentSpend === 0 && previousSpend === 0) continue;

    // Calculate changes
    const calculateChange = (current: number, previous: number) => ({
      value: Math.round((current - previous) * 100) / 100,
      percent: previous !== 0 ? Math.round(((current - previous) / previous) * 100 * 10) / 10 : current !== 0 ? 100 : 0
    });

    comparisons.push({
      campaignName: currentCampaign?.campaignName || previousCampaign?.campaignName || 'Unknown',
      campaignType: currentCampaign?.campaignType || previousCampaign?.campaignType || 'Unknown',
      objective: currentCampaign?.objective || previousCampaign?.objective || 'Unknown',
      current: {
        period: `${currentStartDate} to ${currentEndDate}`,
        spend: Math.round(currentSpend),
        clicks: currentClicks,
        impressions: currentImpressions,
        reach: currentReach,
        ctr: Math.round(currentCtr * 100) / 100,
        cpc: Math.round(currentCpc * 100) / 100,
        cpm: Math.round(currentCpm * 100) / 100,
        bookingContribution: Math.round(currentBookingContribution * 10) / 10
      },
      previous: {
        period: `${previousStartDate} to ${previousEndDate}`,
        spend: Math.round(previousSpend),
        clicks: previousClicks,
        impressions: previousImpressions,
        reach: previousReach,
        ctr: Math.round(previousCtr * 100) / 100,
        cpc: Math.round(previousCpc * 100) / 100,
        cpm: Math.round(previousCpm * 100) / 100,
        bookingContribution: Math.round(previousBookingContribution * 10) / 10
      },
      changes: {
        spend: calculateChange(currentSpend, previousSpend),
        clicks: calculateChange(currentClicks, previousClicks),
        impressions: calculateChange(currentImpressions, previousImpressions),
        reach: calculateChange(currentReach, previousReach),
        ctr: calculateChange(currentCtr, previousCtr),
        cpc: calculateChange(currentCpc, previousCpc),
        cpm: calculateChange(currentCpm, previousCpm),
        bookingContribution: calculateChange(currentBookingContribution, previousBookingContribution)
      }
    });
  }

  // Sort by current period spend descending
  return comparisons.sort((a, b) => b.current.spend - a.current.spend);
}

function getCampaignTypeLabel(type: string): string {
  const typeMap: { [key: string]: string } = {
    'awareness': 'Brand Awareness',
    'traffic': 'Traffic',
    'engagement': 'Engagement', 
    'leads': 'Lead Generation',
    'app_promotion': 'App Promotion',
    'sales': 'Conversions',
    'store_traffic': 'Store Traffic'
  };
  return typeMap[type] || type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

function getObjectiveLabel(objective: string): string {
  const objectiveMap: { [key: string]: string } = {
    'BRAND_AWARENESS': 'Brand Awareness',
    'REACH': 'Reach',
    'TRAFFIC': 'Traffic',
    'ENGAGEMENT': 'Engagement',
    'APP_INSTALLS': 'App Installs',
    'VIDEO_VIEWS': 'Video Views', 
    'LEAD_GENERATION': 'Lead Generation',
    'MESSAGES': 'Messages',
    'CONVERSIONS': 'Conversions',
    'CATALOG_SALES': 'Catalog Sales',
    'STORE_TRAFFIC': 'Store Traffic'
  };
  return objectiveMap[objective] || objective.charAt(0).toUpperCase() + objective.slice(1).toLowerCase().replace(/_/g, ' ');
}