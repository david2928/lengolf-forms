import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface MarketingKPIs {
  // Existing ad metrics
  totalSpend: number;
  totalSpendChange: number;
  totalImpressions: number;
  totalImpressionsChange: number;
  totalClicks: number;
  totalClicksChange: number;
  averageCtr: number;
  averageCtrChange: number;
  totalNewCustomers: number;
  totalNewCustomersChange: number;
  cac: number;
  cacChange: number;
  roas: number;
  roasChange: number;
  customerLifetimeValue: number; // Actually gross profit
  customerLifetimeValueChange: number;
  googleSpend: number;
  metaSpend: number;
  googleNewCustomers: number;
  metaNewCustomers: number;

  // New GA traffic metrics
  totalSessions: number;
  totalSessionsChange: number;
  totalUsers: number;
  totalUsersChange: number;
  totalPageViews: number;
  totalPageViewsChange: number;
  avgPagesPerSession: number;
  avgPagesPerSessionChange: number;
  avgBounceRate: number;
  avgBounceRateChange: number;
  avgSessionDuration: number; // in seconds
  avgSessionDurationChange: number;
  
  // Golf booking conversions from GA
  bookingConversions: number;
  bookingConversionsChange: number;
  bookingConversionRate: number;
  bookingConversionRateChange: number;
  
  // Channel distribution
  organicTrafficShare: number; // percentage
  paidTrafficShare: number; // percentage
  directTrafficShare: number; // percentage
  
  // Cross-channel efficiency
  costPerSession: number;
  costPerSessionChange: number;
  trafficToAdRatio: number; // total sessions vs ad clicks
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const comparisonDays = parseInt(searchParams.get('comparisonDays') || '30');
    const referenceDateParam = searchParams.get('referenceDate');

    // Get current period data (exclude today unless specific reference date provided)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const referenceDate = referenceDateParam ? new Date(referenceDateParam) : yesterday;
    const endDate = referenceDate;
    
    const currentPeriodStart = new Date(endDate);
    currentPeriodStart.setDate(endDate.getDate() - days + 1);
    
    // Get comparison period data
    const comparisonPeriodEnd = new Date(currentPeriodStart);
    comparisonPeriodEnd.setDate(currentPeriodStart.getDate() - 1);
    
    const comparisonPeriodStart = new Date(comparisonPeriodEnd);
    comparisonPeriodStart.setDate(comparisonPeriodEnd.getDate() - comparisonDays + 1);

    // Get Google Ads current period data
    const { data: googleCurrent } = await supabase
      .schema('marketing')
      .from('google_ads_campaign_performance')
      .select('impressions, clicks, cost_micros, conversions, ctr')
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    // Get Google Ads comparison period data
    const { data: googleComparison } = await supabase
      .schema('marketing')
      .from('google_ads_campaign_performance')
      .select('impressions, clicks, cost_micros, conversions, ctr')
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Get Meta Ads current period data
    const { data: metaCurrent } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('impressions, clicks, spend_cents, conversions, ctr')
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    // Get Meta Ads comparison period data
    const { data: metaComparison } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('impressions, clicks, spend_cents, conversions, ctr')
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Get referral analytics data for new customers (use updated referral_data view)
    const { data: currentPeriodNewCustomers } = await supabase
      .from('referral_data')
      .select('*')
      .in('referral_source', ['Google', 'Facebook', 'Instagram'])
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    const { data: comparisonPeriodNewCustomers } = await supabase
      .from('referral_data')
      .select('*')
      .in('referral_source', ['Google', 'Facebook', 'Instagram'])
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Get new customer revenue data for ROAS calculations
    const { data: currentGoogleRevenue } = await supabase.rpc('get_new_customer_revenue', {
      start_date: currentPeriodStart.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      referral_sources: ['Google']
    });

    const { data: currentMetaRevenue } = await supabase.rpc('get_new_customer_revenue', {
      start_date: currentPeriodStart.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      referral_sources: ['Facebook', 'Instagram']
    });

    const { data: comparisonGoogleRevenue } = await supabase.rpc('get_new_customer_revenue', {
      start_date: comparisonPeriodStart.toISOString().split('T')[0],
      end_date: comparisonPeriodEnd.toISOString().split('T')[0],
      referral_sources: ['Google']
    });

    const { data: comparisonMetaRevenue } = await supabase.rpc('get_new_customer_revenue', {
      start_date: comparisonPeriodStart.toISOString().split('T')[0],
      end_date: comparisonPeriodEnd.toISOString().split('T')[0],
      referral_sources: ['Facebook', 'Instagram']
    });

    // Calculate current period totals
    const googleCurrentTotals = googleCurrent?.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (Number(curr.cost_micros) / 1000000 || 0),
      conversions: acc.conversions + (Number(curr.conversions) || 0),
      ctr: [...acc.ctr, curr.ctr || 0]
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] }) || 
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] };

    const metaCurrentTotals = metaCurrent?.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (Number(curr.spend_cents) / 100 || 0),
      conversions: acc.conversions + (Number(curr.conversions) || 0),
      ctr: [...acc.ctr, curr.ctr || 0]
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] }) || 
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] };

    // Calculate comparison period totals
    const googleComparisonTotals = googleComparison?.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (Number(curr.cost_micros) / 1000000 || 0),
      conversions: acc.conversions + (Number(curr.conversions) || 0),
      ctr: [...acc.ctr, curr.ctr || 0]
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] }) || 
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] };

    const metaComparisonTotals = metaComparison?.reduce((acc, curr) => ({
      impressions: acc.impressions + (curr.impressions || 0),
      clicks: acc.clicks + (curr.clicks || 0),
      spend: acc.spend + (Number(curr.spend_cents) / 100 || 0),
      conversions: acc.conversions + (Number(curr.conversions) || 0),
      ctr: [...acc.ctr, curr.ctr || 0]
    }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] }) || 
    { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] };

    // Calculate new customers from referral_data view (current period)
    const googleNewCustomersCurrent = currentPeriodNewCustomers?.filter((r: any) => r.referral_source === 'Google').reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    const metaNewCustomersCurrent = currentPeriodNewCustomers?.filter((r: any) => ['Facebook', 'Instagram'].includes(r.referral_source)).reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    
    // Calculate new customers from referral_data view (comparison period)
    const googleNewCustomersComparison = comparisonPeriodNewCustomers?.filter((r: any) => r.referral_source === 'Google').reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
    const metaNewCustomersComparison = comparisonPeriodNewCustomers?.filter((r: any) => ['Facebook', 'Instagram'].includes(r.referral_source)).reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;

    // Get Google Analytics traffic data (current period)
    const { data: gaCurrentData } = await supabase
      .schema('marketing')
      .from('google_analytics_traffic')
      .select('sessions, users, new_users, page_views, pages_per_session, avg_session_duration, bounce_rate, booking_conversions, conversion_rate, channel_grouping')
      .gte('date', currentPeriodStart.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    // Get Google Analytics traffic data (comparison period)
    const { data: gaComparisonData } = await supabase
      .schema('marketing')
      .from('google_analytics_traffic')
      .select('sessions, users, new_users, page_views, pages_per_session, avg_session_duration, bounce_rate, booking_conversions, conversion_rate, channel_grouping')
      .gte('date', comparisonPeriodStart.toISOString().split('T')[0])
      .lte('date', comparisonPeriodEnd.toISOString().split('T')[0]);

    // Calculate GA traffic totals (current period)
    const gaCurrentTotals = gaCurrentData?.reduce((acc, curr) => ({
      sessions: acc.sessions + (curr.sessions || 0),
      users: acc.users + (curr.users || 0),
      newUsers: acc.newUsers + (curr.new_users || 0),
      pageViews: acc.pageViews + (curr.page_views || 0),
      bookingConversions: acc.bookingConversions + (curr.booking_conversions || 0),
      sessionWeights: acc.sessionWeights + (curr.sessions || 0), // for weighted averages
      pagesPerSessionWeighted: acc.pagesPerSessionWeighted + ((curr.pages_per_session || 0) * (curr.sessions || 0)),
      sessionDurationWeighted: acc.sessionDurationWeighted + ((curr.avg_session_duration || 0) * (curr.sessions || 0)),
      bounceRateWeighted: acc.bounceRateWeighted + ((curr.bounce_rate || 0) * (curr.sessions || 0)),
      organicSessions: acc.organicSessions + (curr.channel_grouping === 'Organic Search' ? (curr.sessions || 0) : 0),
      paidSessions: acc.paidSessions + (['Paid Search', 'Paid Social'].includes(curr.channel_grouping) ? (curr.sessions || 0) : 0),
      directSessions: acc.directSessions + (curr.channel_grouping === 'Direct' ? (curr.sessions || 0) : 0)
    }), {
      sessions: 0, users: 0, newUsers: 0, pageViews: 0, bookingConversions: 0,
      sessionWeights: 0, pagesPerSessionWeighted: 0, sessionDurationWeighted: 0, bounceRateWeighted: 0,
      organicSessions: 0, paidSessions: 0, directSessions: 0
    }) || {
      sessions: 0, users: 0, newUsers: 0, pageViews: 0, bookingConversions: 0,
      sessionWeights: 0, pagesPerSessionWeighted: 0, sessionDurationWeighted: 0, bounceRateWeighted: 0,
      organicSessions: 0, paidSessions: 0, directSessions: 0
    };

    // Calculate GA traffic totals (comparison period)
    const gaComparisonTotals = gaComparisonData?.reduce((acc, curr) => ({
      sessions: acc.sessions + (curr.sessions || 0),
      users: acc.users + (curr.users || 0),
      newUsers: acc.newUsers + (curr.new_users || 0),
      pageViews: acc.pageViews + (curr.page_views || 0),
      bookingConversions: acc.bookingConversions + (curr.booking_conversions || 0),
      sessionWeights: acc.sessionWeights + (curr.sessions || 0),
      pagesPerSessionWeighted: acc.pagesPerSessionWeighted + ((curr.pages_per_session || 0) * (curr.sessions || 0)),
      sessionDurationWeighted: acc.sessionDurationWeighted + ((curr.avg_session_duration || 0) * (curr.sessions || 0)),
      bounceRateWeighted: acc.bounceRateWeighted + ((curr.bounce_rate || 0) * (curr.sessions || 0)),
      organicSessions: acc.organicSessions + (curr.channel_grouping === 'Organic Search' ? (curr.sessions || 0) : 0),
      paidSessions: acc.paidSessions + (['Paid Search', 'Paid Social'].includes(curr.channel_grouping) ? (curr.sessions || 0) : 0),
      directSessions: acc.directSessions + (curr.channel_grouping === 'Direct' ? (curr.sessions || 0) : 0)
    }), {
      sessions: 0, users: 0, newUsers: 0, pageViews: 0, bookingConversions: 0,
      sessionWeights: 0, pagesPerSessionWeighted: 0, sessionDurationWeighted: 0, bounceRateWeighted: 0,
      organicSessions: 0, paidSessions: 0, directSessions: 0
    }) || {
      sessions: 0, users: 0, newUsers: 0, pageViews: 0, bookingConversions: 0,
      sessionWeights: 0, pagesPerSessionWeighted: 0, sessionDurationWeighted: 0, bounceRateWeighted: 0,
      organicSessions: 0, paidSessions: 0, directSessions: 0
    };

    // Calculate weighted averages for GA metrics
    const avgPagesPerSessionCurrent = gaCurrentTotals.sessionWeights > 0 ? gaCurrentTotals.pagesPerSessionWeighted / gaCurrentTotals.sessionWeights : 0;
    const avgSessionDurationCurrent = gaCurrentTotals.sessionWeights > 0 ? gaCurrentTotals.sessionDurationWeighted / gaCurrentTotals.sessionWeights : 0;
    const avgBounceRateCurrent = gaCurrentTotals.sessionWeights > 0 ? gaCurrentTotals.bounceRateWeighted / gaCurrentTotals.sessionWeights : 0;

    const avgPagesPerSessionComparison = gaComparisonTotals.sessionWeights > 0 ? gaComparisonTotals.pagesPerSessionWeighted / gaComparisonTotals.sessionWeights : 0;
    const avgSessionDurationComparison = gaComparisonTotals.sessionWeights > 0 ? gaComparisonTotals.sessionDurationWeighted / gaComparisonTotals.sessionWeights : 0;
    const avgBounceRateComparison = gaComparisonTotals.sessionWeights > 0 ? gaComparisonTotals.bounceRateWeighted / gaComparisonTotals.sessionWeights : 0;

    // Calculate combined totals
    const totalSpendCurrent = googleCurrentTotals.spend + metaCurrentTotals.spend;
    const totalSpendComparison = googleComparisonTotals.spend + metaComparisonTotals.spend;
    
    const totalImpressionsCurrent = googleCurrentTotals.impressions + metaCurrentTotals.impressions;
    const totalImpressionsComparison = googleComparisonTotals.impressions + metaComparisonTotals.impressions;
    
    const totalClicksCurrent = googleCurrentTotals.clicks + metaCurrentTotals.clicks;
    const totalClicksComparison = googleComparisonTotals.clicks + metaComparisonTotals.clicks;
    
    const totalNewCustomersCurrent = googleNewCustomersCurrent + metaNewCustomersCurrent;
    const totalNewCustomersComparison = googleNewCustomersComparison + metaNewCustomersComparison;

    // Calculate average CTR
    const allCurrentCtr = [...googleCurrentTotals.ctr, ...metaCurrentTotals.ctr].filter(ctr => ctr > 0);
    const allComparisonCtr = [...googleComparisonTotals.ctr, ...metaComparisonTotals.ctr].filter(ctr => ctr > 0);
    
    const averageCtrCurrent = allCurrentCtr.length > 0 ? allCurrentCtr.reduce((a, b) => a + b, 0) / allCurrentCtr.length : 0;
    const averageCtrComparison = allComparisonCtr.length > 0 ? allComparisonCtr.reduce((a, b) => a + b, 0) / allComparisonCtr.length : 0;

    // Calculate CAC based on new customers acquired
    const cacCurrent = totalNewCustomersCurrent > 0 ? totalSpendCurrent / totalNewCustomersCurrent : 0;
    const cacComparison = totalNewCustomersComparison > 0 ? totalSpendComparison / totalNewCustomersComparison : 0;
    
    // Calculate ROAS using new customer revenue only
    const currentRevenueTotal = Number(currentGoogleRevenue || 0) + Number(currentMetaRevenue || 0);
    const comparisonRevenueTotal = Number(comparisonGoogleRevenue || 0) + Number(comparisonMetaRevenue || 0);
    
    const roasCurrent = totalSpendCurrent > 0 ? currentRevenueTotal / totalSpendCurrent : 0;
    const roasComparison = totalSpendComparison > 0 ? comparisonRevenueTotal / totalSpendComparison : 0;
    
    // Use new customer revenue as gross profit (since our function returns gross_profit)
    const grossProfitCurrent = currentRevenueTotal;
    const grossProfitComparison = comparisonRevenueTotal;

    // Calculate percentage changes
    const calculateChange = (current: number, comparison: number) => {
      if (comparison === 0) return current > 0 ? 100 : 0;
      return ((current - comparison) / comparison) * 100;
    };

    const kpis: MarketingKPIs = {
      totalSpend: totalSpendCurrent,
      totalSpendChange: calculateChange(totalSpendCurrent, totalSpendComparison),
      totalImpressions: totalImpressionsCurrent,
      totalImpressionsChange: calculateChange(totalImpressionsCurrent, totalImpressionsComparison),
      totalClicks: totalClicksCurrent,
      totalClicksChange: calculateChange(totalClicksCurrent, totalClicksComparison),
      averageCtr: averageCtrCurrent,
      averageCtrChange: calculateChange(averageCtrCurrent, averageCtrComparison),
      totalNewCustomers: totalNewCustomersCurrent,
      totalNewCustomersChange: calculateChange(totalNewCustomersCurrent, totalNewCustomersComparison),
      cac: cacCurrent,
      cacChange: calculateChange(cacCurrent, cacComparison),
      roas: roasCurrent,
      roasChange: calculateChange(roasCurrent, roasComparison),
      customerLifetimeValue: Number(grossProfitCurrent),
      customerLifetimeValueChange: calculateChange(Number(grossProfitCurrent), Number(grossProfitComparison)),
      googleSpend: googleCurrentTotals.spend,
      metaSpend: metaCurrentTotals.spend,
      googleNewCustomers: googleNewCustomersCurrent,
      metaNewCustomers: metaNewCustomersCurrent,

      // New GA traffic metrics
      totalSessions: gaCurrentTotals.sessions,
      totalSessionsChange: calculateChange(gaCurrentTotals.sessions, gaComparisonTotals.sessions),
      totalUsers: gaCurrentTotals.users,
      totalUsersChange: calculateChange(gaCurrentTotals.users, gaComparisonTotals.users),
      totalPageViews: gaCurrentTotals.pageViews,
      totalPageViewsChange: calculateChange(gaCurrentTotals.pageViews, gaComparisonTotals.pageViews),
      avgPagesPerSession: Number(avgPagesPerSessionCurrent.toFixed(2)),
      avgPagesPerSessionChange: calculateChange(avgPagesPerSessionCurrent, avgPagesPerSessionComparison),
      avgBounceRate: Number(avgBounceRateCurrent.toFixed(2)),
      avgBounceRateChange: calculateChange(avgBounceRateCurrent, avgBounceRateComparison) * -1, // Invert for bounce rate (lower is better)
      avgSessionDuration: Number(avgSessionDurationCurrent.toFixed(2)),
      avgSessionDurationChange: calculateChange(avgSessionDurationCurrent, avgSessionDurationComparison),
      
      // Golf booking conversions from GA
      bookingConversions: gaCurrentTotals.bookingConversions,
      bookingConversionsChange: calculateChange(gaCurrentTotals.bookingConversions, gaComparisonTotals.bookingConversions),
      bookingConversionRate: gaCurrentTotals.sessions > 0 ? Number((gaCurrentTotals.bookingConversions / gaCurrentTotals.sessions * 100).toFixed(2)) : 0,
      bookingConversionRateChange: calculateChange(
        gaCurrentTotals.sessions > 0 ? gaCurrentTotals.bookingConversions / gaCurrentTotals.sessions * 100 : 0,
        gaComparisonTotals.sessions > 0 ? gaComparisonTotals.bookingConversions / gaComparisonTotals.sessions * 100 : 0
      ),
      
      // Channel distribution
      organicTrafficShare: gaCurrentTotals.sessions > 0 ? Number((gaCurrentTotals.organicSessions / gaCurrentTotals.sessions * 100).toFixed(2)) : 0,
      paidTrafficShare: gaCurrentTotals.sessions > 0 ? Number((gaCurrentTotals.paidSessions / gaCurrentTotals.sessions * 100).toFixed(2)) : 0,
      directTrafficShare: gaCurrentTotals.sessions > 0 ? Number((gaCurrentTotals.directSessions / gaCurrentTotals.sessions * 100).toFixed(2)) : 0,
      
      // Cross-channel efficiency
      costPerSession: gaCurrentTotals.sessions > 0 ? Number((totalSpendCurrent / gaCurrentTotals.sessions).toFixed(2)) : 0,
      costPerSessionChange: calculateChange(
        gaCurrentTotals.sessions > 0 ? totalSpendCurrent / gaCurrentTotals.sessions : 0,
        gaComparisonTotals.sessions > 0 ? totalSpendComparison / gaComparisonTotals.sessions : 0
      ),
      trafficToAdRatio: totalClicksCurrent > 0 ? Number((gaCurrentTotals.sessions / totalClicksCurrent).toFixed(2)) : 0
    };

    return NextResponse.json(kpis);

  } catch (error) {
    console.error('Marketing overview API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch marketing overview data" },
      { status: 500 }
    );
  }
}