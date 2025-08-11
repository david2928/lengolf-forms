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
  
  // Google Ads Metrics
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  avgCTR: number;
  avgCPC: number;
  qualityScore: number;
  
  // Booking Metrics
  googleBookings: number;
  totalBookings: number;
  bookingShare: number;
  costPerBooking: number;
  clickToBookingRate: number;
  
  // Campaign Breakdown
  campaignBreakdown: Array<{
    campaignName: string;
    campaignType: string;
    spend: number;
    clicks: number;
    ctr: number;
    cpc: number;
    bookingContribution: number; // estimated based on performance
  }>;
}

interface ComparisonAnalysis {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  changes: {
    totalSpend: { value: number; percent: number };
    totalClicks: { value: number; percent: number };
    avgCTR: { value: number; percent: number };
    avgCPC: { value: number; percent: number };
    googleBookings: { value: number; percent: number };
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
    const currentMetrics = await getPeriodMetrics(currentStartDate, currentEndDate, `Current ${periodDays} Days`);
    const previousMetrics = await getPeriodMetrics(previousStartDate, previousEndDate, `Previous ${periodDays} Days`);

    // Calculate changes
    const changes = calculateChanges(currentMetrics, previousMetrics);
    
    // Generate alerts
    const alerts = generateAlerts(changes, currentMetrics, previousMetrics);

    const comparison: ComparisonAnalysis = {
      current: currentMetrics,
      previous: previousMetrics,
      changes,
      alerts
    };

    return NextResponse.json(comparison);

  } catch (error) {
    console.error('Performance comparison error:', error);
    return NextResponse.json(
      { error: "Failed to generate performance comparison" },
      { status: 500 }
    );
  }
}

async function getPeriodMetrics(startDate: string, endDate: string, periodLabel: string): Promise<PeriodMetrics> {
  // Get Google Ads data
  const { data: adsData } = await supabase
    .schema('marketing')
    .from('campaign_performance_summary')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate);

  // Use the same POS-based referral data function as the referral analytics dashboard
  const { data: referralData } = await supabase
    .rpc('get_pos_combined_referral_data', {
      start_date: startDate,
      end_date: endDate
    });

  // Calculate Google and total bookings from the POS-based data
  const googleBookingCount = referralData
    ?.filter((row: any) => row.source === 'Google')
    ?.reduce((sum: number, row: any) => sum + (row.count || 0), 0) || 0;
  
  const totalBookingCount = referralData
    ?.reduce((sum: number, row: any) => sum + (row.count || 0), 0) || 0;

  // Calculate aggregated Google Ads metrics
  const totalSpend = adsData?.reduce((sum, row) => sum + (row.cost_thb || 0), 0) || 0;
  const totalClicks = adsData?.reduce((sum, row) => sum + (row.clicks || 0), 0) || 0;
  const totalImpressions = adsData?.reduce((sum, row) => sum + (row.impressions || 0), 0) || 0;
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // Calculate booking metrics (counts already calculated above with hybrid approach)
  const bookingShare = totalBookingCount > 0 ? (googleBookingCount / totalBookingCount) * 100 : 0;
  const costPerBooking = googleBookingCount > 0 ? totalSpend / googleBookingCount : 0;
  const clickToBookingRate = totalClicks > 0 ? (googleBookingCount / totalClicks) * 100 : 0;

  // Campaign breakdown
  const campaignMap = new Map();
  adsData?.forEach(row => {
    const key = `${row.campaign_name}_${row.campaign_type}`;
    if (!campaignMap.has(key)) {
      campaignMap.set(key, {
        campaignName: row.campaign_name,
        campaignType: getCampaignTypeLabel(row.campaign_type),
        spend: 0,
        clicks: 0,
        impressions: 0
      });
    }
    const campaign = campaignMap.get(key);
    campaign.spend += row.cost_thb || 0;
    campaign.clicks += row.clicks || 0;
    campaign.impressions += row.impressions || 0;
  });

  const campaignBreakdown = Array.from(campaignMap.values())
    .map(campaign => ({
      ...campaign,
      ctr: campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0,
      cpc: campaign.clicks > 0 ? campaign.spend / campaign.clicks : 0,
      bookingContribution: totalSpend > 0 ? (campaign.spend / totalSpend) * googleBookingCount : 0
    }))
    .sort((a, b) => b.spend - a.spend);

  return {
    period: periodLabel,
    startDate,
    endDate,
    totalSpend: Math.round(totalSpend),
    totalClicks,
    totalImpressions,
    avgCTR: Math.round(avgCTR * 100) / 100,
    avgCPC: Math.round(avgCPC * 100) / 100,
    qualityScore: 6.8, // Placeholder - would calculate from actual QS data
    googleBookings: googleBookingCount,
    totalBookings: totalBookingCount,
    bookingShare: Math.round(bookingShare * 10) / 10,
    costPerBooking: Math.round(costPerBooking),
    clickToBookingRate: Math.round(clickToBookingRate * 100) / 100,
    campaignBreakdown
  };
}

function calculateChanges(current: PeriodMetrics, previous: PeriodMetrics) {
  const calculateChange = (currentVal: number, previousVal: number) => {
    const value = Math.round((currentVal - previousVal) * 100) / 100;
    let percent = 0;
    
    if (previousVal === 0) {
      // Handle zero baseline cases
      if (currentVal > 0) {
        percent = 999; // Cap extreme increases to indicate "new/restored tracking"
      }
    } else {
      percent = Math.round(((currentVal - previousVal) / previousVal) * 100 * 10) / 10;
      // Cap extreme percentage changes to prevent misleading data
      if (Math.abs(percent) > 500) {
        percent = percent > 0 ? 500 : -500;
      }
    }
    
    return { value, percent };
  };

  return {
    totalSpend: calculateChange(current.totalSpend, previous.totalSpend),
    totalClicks: calculateChange(current.totalClicks, previous.totalClicks),
    avgCTR: calculateChange(current.avgCTR, previous.avgCTR),
    avgCPC: calculateChange(current.avgCPC, previous.avgCPC),
    googleBookings: calculateChange(current.googleBookings, previous.googleBookings),
    costPerBooking: calculateChange(current.costPerBooking, previous.costPerBooking),
    bookingShare: calculateChange(current.bookingShare, previous.bookingShare),
    clickToBookingRate: calculateChange(current.clickToBookingRate, previous.clickToBookingRate)
  };
}

function generateAlerts(changes: any, current: PeriodMetrics, previous: PeriodMetrics) {
  const alerts: Array<{
    type: 'warning' | 'critical' | 'positive';
    metric: string;
    message: string;
    impact: string;
  }> = [];

  // Data quality alerts
  if (previous.googleBookings === 0 && current.googleBookings > 0) {
    alerts.push({
      type: 'warning',
      metric: 'Data Quality',
      message: `Previous period had 0 Google bookings - tracking may have been inactive`,
      impact: 'Percentage comparisons may not be meaningful - review data quality'
    });
  }

  if (changes.googleBookings.percent >= 999) {
    alerts.push({
      type: 'warning',
      metric: 'Google Bookings',
      message: `Google bookings tracking appears to be newly active or restored`,
      impact: 'Verify attribution tracking is working correctly'
    });
  }

  // Critical alerts
  if (changes.googleBookings.percent < -25 && changes.googleBookings.percent > -999) {
    alerts.push({
      type: 'critical',
      metric: 'Google Bookings',
      message: `Google bookings dropped ${Math.abs(changes.googleBookings.percent)}%`,
      impact: 'Revenue impact - investigate campaign issues immediately'
    });
  }

  if (changes.costPerBooking.percent > 50) {
    alerts.push({
      type: 'critical',
      metric: 'Cost per Booking',
      message: `Cost per booking increased ${changes.costPerBooking.percent}%`,
      impact: 'Efficiency severely degraded - campaign optimization needed'
    });
  }

  // Warning alerts
  if (changes.avgCTR.percent < -15) {
    alerts.push({
      type: 'warning',
      metric: 'Click-Through Rate',
      message: `CTR declined ${Math.abs(changes.avgCTR.percent)}%`,
      impact: 'Ad relevance may be declining - refresh ad copy'
    });
  }

  if (changes.bookingShare.percent < -10) {
    alerts.push({
      type: 'warning',
      metric: 'Booking Share',
      message: `Google booking share dropped ${Math.abs(changes.bookingShare.percent)}pp`,
      impact: 'Losing market share - consider budget reallocation'
    });
  }

  // Positive alerts
  if (changes.costPerBooking.percent < -20) {
    alerts.push({
      type: 'positive',
      metric: 'Cost per Booking',
      message: `Cost per booking improved ${Math.abs(changes.costPerBooking.percent)}%`,
      impact: 'Excellent efficiency gain - consider scaling successful campaigns'
    });
  }

  if (changes.clickToBookingRate.percent > 25) {
    alerts.push({
      type: 'positive',
      metric: 'Conversion Rate',
      message: `Click-to-booking rate improved ${changes.clickToBookingRate.percent}%`,
      impact: 'Great conversion improvement - landing page or targeting optimization working'
    });
  }

  return alerts;
}

function getCampaignTypeLabel(type: string): string {
  const typeMap: { [key: string]: string } = {
    '2': 'Search',
    '9': 'Display',
    '10': 'Performance Max',
    '3': 'Shopping',
    '6': 'Video'
  };
  return typeMap[type] || `Type ${type}`;
}