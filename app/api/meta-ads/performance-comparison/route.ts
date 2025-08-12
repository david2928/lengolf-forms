import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface PeriodMetrics {
  period: string;
  startDate: string;
  endDate: string;
  
  // Meta Ads Metrics
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalReach: number;
  avgCTR: number;
  avgCPC: number;
  avgCPM: number;
  avgFrequency: number;
  
  // Booking Metrics
  metaBookings: number;
  totalBookings: number;
  bookingShare: number;
  costPerBooking: number;
  clickToBookingRate: number;
  
  // Campaign Breakdown
  campaignBreakdown: Array<{
    campaignName: string;
    campaignType: string;
    objective: string;
    spend: number;
    clicks: number;
    impressions: number;
    reach: number;
    ctr: number;
    cpc: number;
    cpm: number;
    bookingContribution: number; // estimated based on performance
  }>;
}

interface ComparisonAnalysis {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  changes: {
    totalSpend: { value: number; percent: number };
    totalClicks: { value: number; percent: number };
    totalImpressions: { value: number; percent: number };
    totalReach: { value: number; percent: number };
    avgCTR: { value: number; percent: number };
    avgCPC: { value: number; percent: number };
    avgCPM: { value: number; percent: number };
    avgFrequency: { value: number; percent: number };
    metaBookings: { value: number; percent: number };
    costPerBooking: { value: number; percent: number };
    bookingShare: { value: number; percent: number };
    clickToBookingRate: { value: number; percent: number };
  };
  alerts: Array<{
    type: 'warning' | 'critical' | 'positive';
    metric: string;
    message: string;
    impact: string;
  }>;
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

    // Get metrics for both periods
    const currentMetrics = await getPeriodMetrics(currentStartDate, currentEndDate, 'current');
    const previousMetrics = await getPeriodMetrics(previousStartDate, previousEndDate, 'previous');

    // Calculate changes and generate alerts
    const changes = calculateChanges(currentMetrics, previousMetrics);
    const alerts = generateAlerts(currentMetrics, previousMetrics, changes);

    const analysis: ComparisonAnalysis = {
      current: currentMetrics,
      previous: previousMetrics,
      changes,
      alerts
    };

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Meta Ads performance comparison error:', error);
    return NextResponse.json(
      { error: "Failed to generate Meta Ads performance comparison" },
      { status: 500 }
    );
  }
}

async function getPeriodMetrics(startDate: string, endDate: string, period: string): Promise<PeriodMetrics> {
  // Get Meta Ads performance data
  const { data: performanceData } = await supabase
    .schema('marketing')
    .from('meta_ads_campaign_performance')
    .select(`
      *,
      campaign:meta_ads_campaigns(campaign_name, campaign_type, objective)
    `)
    .gte('date', startDate)
    .lte('date', endDate);

  // Get booking data using POS-based referral data
  const { data: referralData } = await supabase
    .rpc('get_pos_combined_referral_data', {
      start_date: startDate,
      end_date: endDate
    });

  const { data: totalBookingsData } = await supabase
    .rpc('get_pos_combined_referral_data', {
      start_date: startDate,
      end_date: endDate
    });

  // Calculate totals
  let totalSpend = 0;
  let totalClicks = 0;
  let totalImpressions = 0;
  let totalReach = 0;
  let totalFrequencyWeighted = 0;

  performanceData?.forEach(row => {
    totalSpend += (row.spend_cents || 0) / 100;
    totalClicks += row.clicks || 0;
    totalImpressions += row.impressions || 0;
    totalReach += row.reach || 0;
    totalFrequencyWeighted += (row.frequency || 0) * (row.impressions || 0);
  });

  // Calculate averages
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
  const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
  const avgFrequency = totalImpressions > 0 ? totalFrequencyWeighted / totalImpressions : 0;

  // Get booking data (Meta/Facebook/Instagram sources)
  const metaBookings = referralData
    ?.filter((row: any) => ['Meta', 'Facebook', 'Instagram', 'meta', 'facebook', 'instagram'].includes(row.source))
    ?.reduce((sum: number, row: any) => sum + (row.count || 0), 0) || 0;

  const totalBookings = totalBookingsData?.reduce((sum: number, row: any) => sum + (row.count || 0), 0) || 0;
  const bookingShare = totalBookings > 0 ? (metaBookings / totalBookings) * 100 : 0;
  const costPerBooking = metaBookings > 0 ? totalSpend / metaBookings : 0;
  const clickToBookingRate = totalClicks > 0 ? (metaBookings / totalClicks) * 100 : 0;

  // Build campaign breakdown
  const campaignMap = new Map();
  performanceData?.forEach(row => {
    const campaignName = row.campaign?.campaign_name || 'Unknown Campaign';
    const campaignType = row.campaign?.campaign_type || 'unknown';
    const objective = row.campaign?.objective || 'unknown';
    const key = `${campaignName}_${campaignType}`;
    
    if (!campaignMap.has(key)) {
      campaignMap.set(key, {
        campaignName,
        campaignType: getCampaignTypeLabel(campaignType),
        objective: getObjectiveLabel(objective),
        spend: 0,
        clicks: 0,
        impressions: 0,
        reach: 0
      });
    }
    const campaign = campaignMap.get(key);
    campaign.spend += (row.spend_cents || 0) / 100;
    campaign.clicks += row.clicks || 0;
    campaign.impressions += row.impressions || 0;
    campaign.reach += row.reach || 0;
  });

  const campaignBreakdown = Array.from(campaignMap.values()).map((campaign: any) => ({
    ...campaign,
    ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
    cpc: campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0,
    cpm: campaign.impressions > 0 ? (campaign.spend / campaign.impressions) * 1000 : 0,
    bookingContribution: totalSpend > 0 ? (campaign.spend / totalSpend) * metaBookings : 0
  })).sort((a, b) => b.spend - a.spend);

  return {
    period,
    startDate,
    endDate,
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalClicks,
    totalImpressions,
    totalReach,
    avgCTR: Math.round(avgCTR * 100) / 100,
    avgCPC: Math.round(avgCPC * 100) / 100,
    avgCPM: Math.round(avgCPM * 100) / 100,
    avgFrequency: Math.round(avgFrequency * 100) / 100,
    metaBookings,
    totalBookings,
    bookingShare: Math.round(bookingShare * 100) / 100,
    costPerBooking: Math.round(costPerBooking * 100) / 100,
    clickToBookingRate: Math.round(clickToBookingRate * 100) / 100,
    campaignBreakdown
  };
}

function calculateChanges(current: PeriodMetrics, previous: PeriodMetrics) {
  const calculateChange = (currentVal: number, previousVal: number) => ({
    value: Math.round((currentVal - previousVal) * 100) / 100,
    percent: previousVal !== 0 ? Math.round(((currentVal - previousVal) / previousVal) * 100 * 10) / 10 : currentVal !== 0 ? 100 : 0
  });

  return {
    totalSpend: calculateChange(current.totalSpend, previous.totalSpend),
    totalClicks: calculateChange(current.totalClicks, previous.totalClicks),
    totalImpressions: calculateChange(current.totalImpressions, previous.totalImpressions),
    totalReach: calculateChange(current.totalReach, previous.totalReach),
    avgCTR: calculateChange(current.avgCTR, previous.avgCTR),
    avgCPC: calculateChange(current.avgCPC, previous.avgCPC),
    avgCPM: calculateChange(current.avgCPM, previous.avgCPM),
    avgFrequency: calculateChange(current.avgFrequency, previous.avgFrequency),
    metaBookings: calculateChange(current.metaBookings, previous.metaBookings),
    costPerBooking: calculateChange(current.costPerBooking, previous.costPerBooking),
    bookingShare: calculateChange(current.bookingShare, previous.bookingShare),
    clickToBookingRate: calculateChange(current.clickToBookingRate, previous.clickToBookingRate)
  };
}

function generateAlerts(current: PeriodMetrics, previous: PeriodMetrics, changes: any) {
  const alerts: any[] = [];

  // Cost efficiency alerts
  if (changes.costPerBooking.percent > 25) {
    alerts.push({
      type: 'warning',
      metric: 'Cost per Booking',
      message: `Cost per booking increased by ${changes.costPerBooking.percent}%`,
      impact: 'Budget efficiency declining'
    });
  }

  // Performance alerts
  if (changes.avgCTR.percent < -15) {
    alerts.push({
      type: 'critical',
      metric: 'Click-Through Rate',
      message: `CTR decreased by ${Math.abs(changes.avgCTR.percent)}%`,
      impact: 'Ad relevance may be declining'
    });
  }

  // Spend alerts  
  if (changes.totalSpend.percent > 50) {
    alerts.push({
      type: 'warning',
      metric: 'Total Spend',
      message: `Spend increased by ${changes.totalSpend.percent}%`,
      impact: 'Monitor budget allocation'
    });
  }

  // Positive alerts
  if (changes.metaBookings.percent > 20) {
    alerts.push({
      type: 'positive',
      metric: 'Meta Bookings',
      message: `Meta bookings increased by ${changes.metaBookings.percent}%`,
      impact: 'Strong performance improvement'
    });
  }

  if (changes.clickToBookingRate.percent > 15) {
    alerts.push({
      type: 'positive',
      metric: 'Conversion Rate', 
      message: `Click-to-booking rate improved by ${changes.clickToBookingRate.percent}%`,
      impact: 'Better audience targeting'
    });
  }

  return alerts;
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