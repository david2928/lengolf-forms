import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface WeeklyPerformance {
  period: string;
  weekStart: string;
  weekEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleCpm: number;
  metaCpm: number;
  totalCpm: number;
  googleCpc: number;
  metaCpc: number;
  totalCpc: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  metaLeads: number;
  grossProfit: number;
  lengolfLineFollowers: number;
  fairwayLineFollowers: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange: number;
  weekOverWeekNewCustomersChange: number;
  // Traffic data
  totalSessions?: number;
  paidSessions?: number;
  paidSocialSessions?: number;
  paidSearchSessions?: number;
  organicSearchSessions?: number;
  directSessions?: number;
  emailSessions?: number;
  referralSessions?: number;
  otherSessions?: number;
}

interface Rolling7DayPerformance {
  period: string;
  periodStart: string;
  periodEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleCpm: number;
  metaCpm: number;
  totalCpm: number;
  googleCpc: number;
  metaCpc: number;
  totalCpc: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  metaLeads: number;
  grossProfit: number;
  lengolfLineFollowers: number;
  fairwayLineFollowers: number;
  cac: number;
  roas: number;
  periodOverPeriodSpendChange: number;
  periodOverPeriodNewCustomersChange: number;
  // Traffic data
  totalSessions?: number;
  paidSessions?: number;
  paidSocialSessions?: number;
  paidSearchSessions?: number;
  organicSearchSessions?: number;
  directSessions?: number;
  emailSessions?: number;
  referralSessions?: number;
  otherSessions?: number;
}

interface MonthlyPerformance {
  period: string;
  monthStart: string;
  monthEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleCpm: number;
  metaCpm: number;
  totalCpm: number;
  googleCpc: number;
  metaCpc: number;
  totalCpc: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  metaLeads: number;
  grossProfit: number;
  lengolfLineFollowers: number;
  fairwayLineFollowers: number;
  cac: number;
  roas: number;
  // Traffic data
  totalSessions?: number;
  paidSessions?: number;
  paidSocialSessions?: number;
  paidSearchSessions?: number;
  organicSearchSessions?: number;
  directSessions?: number;
  emailSessions?: number;
  referralSessions?: number;
  otherSessions?: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weeks = parseInt(searchParams.get('weeks') || '12');
    const format = searchParams.get('format') || 'weekly'; // weekly, monthly, rolling7day
    const includeMonthly = searchParams.get('includeMonthly') === 'true';
    const referenceDateParam = searchParams.get('referenceDate');
    const periods = parseInt(searchParams.get('periods') || '12'); // For rolling periods

    // Calculate date range relative to reference date (defaults to yesterday)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // For API calls, default end date to yesterday unless a specific reference date is provided
    const referenceDate = referenceDateParam ? 
      new Date(referenceDateParam + 'T00:00:00.000Z') : // Force UTC interpretation
      yesterday;
    const endDate = referenceDate;
    
    if (format === 'rolling7day') {
      return await getRolling7DayPerformance(endDate, periods);
    } else if (format === 'monthly' || includeMonthly) {
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (weeks * 7) + 1);
      return await getMonthlyPerformance(startDate, endDate);
    } else {
      const startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - (weeks * 7) + 1);
      return await getWeeklyPerformance(startDate, endDate, weeks);
    }

  } catch (error) {
    console.error('Marketing performance API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch marketing performance data" },
      { status: 500 }
    );
  }
}

// Helper functions for additional data fetching
const getMetaLeads = async (startDate: Date, endDate: Date): Promise<number> => {
  try {
    // Query the processed_leads table directly instead of making HTTP call
    const { data, error } = await supabase
      .from('processed_leads')
      .select('id')
      .in('form_type', ['B2C (New)', 'B2B (New)'])
      .eq('is_likely_spam', false)
      .not('email', 'like', '%tosomavertey%')
      .not('email', 'like', '%putheaggc%')
      .not('email', 'like', '%rothacr11%')
      .not('full_name', 'like', '%sdeg%')
      .not('full_name', 'like', '%GGG%')
      .gte('meta_submitted_at', startDate.toISOString().split('T')[0])
      .lte('meta_submitted_at', endDate.toISOString().split('T')[0]);

    if (error) {
      console.error('Error fetching Meta leads:', error);
      return 0;
    }

    return data?.length || 0;
  } catch (error) {
    console.error('Error fetching Meta leads:', error);
    return 0;
  }
};

const getGrossProfit = async (startDate: Date, endDate: Date): Promise<number> => {
  try {
    const { data, error } = await supabase.rpc('get_sales_report_summary', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    });
    if (error) {
      console.error('Error fetching gross profit:', error);
      return 0;
    }
    return Number(data?.grossProfit || 0);
  } catch (error) {
    console.error('Error fetching gross profit:', error);
    return 0;
  }
};

const getLineFollowers = async (startDate: Date, endDate: Date): Promise<{lengolf: number, fairway: number}> => {
  try {
    // Get the latest follower counts for each competitor (regardless of exact date range)
    // as LINE followers are updated periodically and we want the most recent available data
    const { data, error } = await supabase
      .schema('marketing')
      .from('competitor_latest_metrics')
      .select('competitor_name, line_friends_count')
      .eq('platform', 'line')
      .in('competitor_name', ['LENGOLF', 'FAIRWAY GOLF AND CITY CLUB'])
      .order('recorded_at', { ascending: false })
      .limit(10); // Get recent records to ensure we have both competitors

    if (error) {
      console.error('Error fetching LINE followers:', error);
      return { lengolf: 0, fairway: 0 };
    }

    // Get the most recent data for each competitor
    const lengolfData = data?.find(d => d.competitor_name === 'LENGOLF');
    const fairwayData = data?.find(d => d.competitor_name === 'FAIRWAY GOLF AND CITY CLUB');

    return {
      lengolf: Number(lengolfData?.line_friends_count || 0),
      fairway: Number(fairwayData?.line_friends_count || 0)
    };
  } catch (error) {
    console.error('Error fetching LINE followers:', error);
    return { lengolf: 0, fairway: 0 };
  }
};

async function getTrafficDataForPeriod(startDate: Date, endDate: Date) {
  try {
    const { data: trafficData } = await supabase
      .schema('marketing')
      .from('google_analytics_traffic')
      .select('*')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    if (!trafficData || trafficData.length === 0) {
      return {
        totalSessions: 0,
        paidSessions: 0,
        paidSocialSessions: 0,
        paidSearchSessions: 0,
        organicSearchSessions: 0,
        directSessions: 0,
        emailSessions: 0,
        referralSessions: 0,
        otherSessions: 0
      };
    }

    // Aggregate sessions by channel
    const channelTotals = trafficData.reduce((acc, row) => {
      const sessions = row.sessions || 0;
      acc.total += sessions;

      switch (row.channel_grouping) {
        case 'Paid Social':
          acc.paidSocial += sessions;
          break;
        case 'Paid Search':
          acc.paidSearch += sessions;
          break;
        case 'Organic Search':
          acc.organicSearch += sessions;
          break;
        case 'Direct':
          acc.direct += sessions;
          break;
        case 'Email':
          acc.email += sessions;
          break;
        case 'Referral':
          acc.referral += sessions;
          break;
        default:
          acc.other += sessions;
          break;
      }

      return acc;
    }, {
      total: 0,
      paidSocial: 0,
      paidSearch: 0,
      organicSearch: 0,
      direct: 0,
      email: 0,
      referral: 0,
      other: 0
    });

    const paidTotal = channelTotals.paidSocial + channelTotals.paidSearch;

    return {
      totalSessions: channelTotals.total,
      paidSessions: paidTotal,
      paidSocialSessions: channelTotals.paidSocial,
      paidSearchSessions: channelTotals.paidSearch,
      organicSearchSessions: channelTotals.organicSearch,
      directSessions: channelTotals.direct,
      emailSessions: channelTotals.email,
      referralSessions: channelTotals.referral,
      otherSessions: channelTotals.other
    };
  } catch (error) {
    console.error('Error fetching traffic data for period:', error);
    return {
      totalSessions: 0,
      paidSessions: 0,
      paidSocialSessions: 0,
      paidSearchSessions: 0,
      organicSearchSessions: 0,
      directSessions: 0,
      emailSessions: 0,
      referralSessions: 0,
      otherSessions: 0
    };
  }
}

async function getWeeklyPerformance(startDate: Date, endDate: Date, weeks: number) {
  // Get daily data from our new view
  const { data: dailyData, error } = await supabase
    .schema('marketing')
    .from('daily_marketing_metrics')
    .select('*')
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily metrics:', error);
    throw new Error('Failed to fetch daily metrics');
  }

  // Helper functions for week calculations - using ISO week boundaries (Monday-Sunday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
  };

  const getWeekEnd = (date: Date) => {
    const weekStart = getWeekStart(new Date(date));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  };

  // Helper function to get new customer revenue by referral source
  const getNewCustomerRevenue = async (startDate: Date, endDate: Date, referralSources: string | string[]): Promise<number> => {
    const sources = Array.isArray(referralSources) ? referralSources : [referralSources];
    
    const { data, error } = await supabase.rpc('get_new_customer_revenue', {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      referral_sources: sources
    });

    if (error) {
      console.error('Error fetching new customer revenue:', error);
      return 0;
    }

    return Number(data || 0);
  };

  // Helper function to get Meta leads for a period
  const getMetaLeads = async (startDate: Date, endDate: Date): Promise<number> => {
    const { data, error } = await supabase
      .from('processed_leads')
      .select('id')
      .gte('meta_submitted_at', startDate.toISOString())
      .lte('meta_submitted_at', endDate.toISOString())
      .eq('is_likely_spam', false)
      .in('form_type', ['B2C (New)', 'B2B (New)']);

    if (error) {
      console.error('Error fetching Meta leads:', error);
      return 0;
    }

    return data?.length || 0;
  };

  // Helper function to get gross profit for a period
  const getGrossProfit = async (startDate: Date, endDate: Date): Promise<number> => {
    const { data, error } = await supabase.rpc('get_sales_report_summary', {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    });

    if (error) {
      console.error('Error fetching gross profit:', error);
      return 0;
    }

    return Number(data?.grossProfit || 0);
  };

  // Helper function to get LINE followers for competitors during a period
  const getLineFollowers = async (startDate: Date, endDate: Date): Promise<{lengolf: number, fairway: number}> => {
    // First try to get data within the specific period
    const { data, error } = await supabase
      .schema('marketing')
      .from('competitor_metrics')
      .select(`
        line_friends_count,
        recorded_at,
        competitors!inner(name)
      `)
      .eq('platform', 'line')
      .in('competitors.name', ['LENGOLF', 'FAIRWAY GOLF AND CITY CLUB'])
      .lte('recorded_at', endDate.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(50); // Get more records to find data close to the period

    if (error) {
      console.error('Error fetching LINE followers:', error);
      return { lengolf: 0, fairway: 0 };
    }

    // Find the most recent data for each competitor at or before the end date
    const lengolfData = data?.find((metric: any) => metric.competitors.name === 'LENGOLF');
    const fairwayData = data?.find((metric: any) => metric.competitors.name === 'FAIRWAY GOLF AND CITY CLUB');

    return {
      lengolf: Number(lengolfData?.line_friends_count || 0),
      fairway: Number(fairwayData?.line_friends_count || 0)
    };
  };

  // Group daily data by week using Monday-Sunday boundaries
  const weeklyData = new Map<string, any[]>();
  dailyData?.forEach(day => {
    const date = new Date(day.date);
    const weekStart = getWeekStart(date);
    const weekKey = weekStart.toISOString().split('T')[0]; // Use week start date as key
    
    if (!weeklyData.has(weekKey)) {
      weeklyData.set(weekKey, []);
    }
    weeklyData.get(weekKey)!.push(day);
  });

  // Calculate weekly aggregates
  const performance: WeeklyPerformance[] = [];
  const sortedWeeks = Array.from(weeklyData.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // Sort by week descending
    .slice(0, weeks);

  // Pre-calculate all additional data to avoid async in forEach
  const additionalData = await Promise.all(
    sortedWeeks.map(async ([weekKey, days]) => {
      const firstDay = new Date(Math.min(...days.map(d => new Date(d.date).getTime())));
      const weekStart = getWeekStart(new Date(firstDay));
      const weekEnd = getWeekEnd(new Date(firstDay));
      
      const [
        googleRevenue,
        metaRevenue,
        metaLeads,
        grossProfit,
        lineFollowers
      ] = await Promise.all([
        getNewCustomerRevenue(weekStart, weekEnd, 'Google'),
        getNewCustomerRevenue(weekStart, weekEnd, ['Facebook', 'Instagram']),
        getMetaLeads(weekStart, weekEnd),
        getGrossProfit(weekStart, weekEnd),
        getLineFollowers(weekStart, weekEnd)
      ]);
      
      return { 
        weekKey, 
        googleRevenue, 
        metaRevenue, 
        totalRevenue: googleRevenue + metaRevenue,
        metaLeads,
        grossProfit,
        lengolfLineFollowers: lineFollowers.lengolf,
        fairwayLineFollowers: lineFollowers.fairway
      };
    })
  );

  for (let index = 0; index < sortedWeeks.length; index++) {
    const [weekKey, days] = sortedWeeks[index];
    const currentAdditionalData = additionalData.find(r => r.weekKey === weekKey);
    // Aggregate the daily data for this week
    const weekTotals = days.reduce((acc, day) => ({
      googleSpend: acc.googleSpend + Number(day.google_spend),
      metaSpend: acc.metaSpend + Number(day.meta_spend),
      totalSpend: acc.totalSpend + Number(day.total_spend),
      googleImpressions: acc.googleImpressions + Number(day.google_impressions),
      metaImpressions: acc.metaImpressions + Number(day.meta_impressions),
      totalImpressions: acc.totalImpressions + Number(day.total_impressions),
      googleClicks: acc.googleClicks + Number(day.google_clicks),
      metaClicks: acc.metaClicks + Number(day.meta_clicks),
      totalClicks: acc.totalClicks + Number(day.total_clicks),
      googleNewCustomers: acc.googleNewCustomers + Number(day.google_new_customers),
      metaNewCustomers: acc.metaNewCustomers + Number(day.meta_new_customers),
      totalNewCustomers: acc.totalNewCustomers + Number(day.total_new_customers),
      totalConversionValue: acc.totalConversionValue + Number(day.total_conversion_value),
      totalRevenue: acc.totalRevenue + Number(day.daily_revenue),
      daysWithData: acc.daysWithData + (Number(day.total_spend) > 0 ? 1 : 0)
    }), {
      googleSpend: 0, metaSpend: 0, totalSpend: 0,
      googleImpressions: 0, metaImpressions: 0, totalImpressions: 0,
      googleClicks: 0, metaClicks: 0, totalClicks: 0,
      googleNewCustomers: 0, metaNewCustomers: 0, totalNewCustomers: 0,
      totalConversionValue: 0, totalRevenue: 0, daysWithData: 0
    });

    // Calculate derived metrics
    const googleCtr = weekTotals.googleImpressions > 0 ? 
      (weekTotals.googleClicks / weekTotals.googleImpressions) * 100 : 0;
    const metaCtr = weekTotals.metaImpressions > 0 ? 
      (weekTotals.metaClicks / weekTotals.metaImpressions) * 100 : 0;
    const averageCtr = weekTotals.totalImpressions > 0 ? 
      (weekTotals.totalClicks / weekTotals.totalImpressions) * 100 : 0;

    // Calculate CPM (Cost Per Mille - per 1000 impressions)
    const googleCpm = weekTotals.googleImpressions > 0 ? 
      (weekTotals.googleSpend / weekTotals.googleImpressions) * 1000 : 0;
    const metaCpm = weekTotals.metaImpressions > 0 ? 
      (weekTotals.metaSpend / weekTotals.metaImpressions) * 1000 : 0;
    const totalCpm = weekTotals.totalImpressions > 0 ? 
      (weekTotals.totalSpend / weekTotals.totalImpressions) * 1000 : 0;

    // Calculate CPC (Cost Per Click)
    const googleCpc = weekTotals.googleClicks > 0 ? 
      weekTotals.googleSpend / weekTotals.googleClicks : 0;
    const metaCpc = weekTotals.metaClicks > 0 ? 
      weekTotals.metaSpend / weekTotals.metaClicks : 0;
    const totalCpc = weekTotals.totalClicks > 0 ? 
      weekTotals.totalSpend / weekTotals.totalClicks : 0;

    const cac = weekTotals.totalNewCustomers > 0 ? 
      weekTotals.totalSpend / weekTotals.totalNewCustomers : 0;
    
    // Use pre-calculated ROAS from actual new customer revenue
    const roas = weekTotals.totalSpend > 0 ? 
      (currentAdditionalData?.totalRevenue || 0) / weekTotals.totalSpend : 0;

    // Calculate week-over-week changes
    let weekOverWeekSpendChange = 0;
    let weekOverWeekNewCustomersChange = 0;
    
    if (index > 0) {
      const prevWeek = performance[index - 1];
      if (prevWeek) {
        weekOverWeekSpendChange = prevWeek.totalSpend > 0 ? 
          ((weekTotals.totalSpend - prevWeek.totalSpend) / prevWeek.totalSpend) * 100 : 0;
        weekOverWeekNewCustomersChange = prevWeek.totalNewCustomers > 0 ? 
          ((weekTotals.totalNewCustomers - prevWeek.totalNewCustomers) / prevWeek.totalNewCustomers) * 100 : 0;
      }
    }

    // Get week start and end dates using our helper functions
    const firstDay = new Date(Math.min(...days.map(d => new Date(d.date).getTime())));
    const weekStart = getWeekStart(new Date(firstDay));
    const weekEnd = getWeekEnd(new Date(firstDay));

    // Get traffic data for this week
    const trafficData = await getTrafficDataForPeriod(weekStart, weekEnd);

    const weekPerformance: WeeklyPerformance = {
      period: weekKey,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0],
      googleSpend: weekTotals.googleSpend,
      metaSpend: weekTotals.metaSpend,
      totalSpend: weekTotals.totalSpend,
      googleImpressions: weekTotals.googleImpressions,
      metaImpressions: weekTotals.metaImpressions,
      totalImpressions: weekTotals.totalImpressions,
      googleClicks: weekTotals.googleClicks,
      metaClicks: weekTotals.metaClicks,
      totalClicks: weekTotals.totalClicks,
      googleCtr,
      metaCtr,
      averageCtr,
      googleCpm,
      metaCpm,
      totalCpm,
      googleCpc,
      metaCpc,
      totalCpc,
      googleNewCustomers: weekTotals.googleNewCustomers,
      metaNewCustomers: weekTotals.metaNewCustomers,
      totalNewCustomers: weekTotals.totalNewCustomers,
      metaLeads: currentAdditionalData?.metaLeads || 0,
      grossProfit: currentAdditionalData?.grossProfit || 0,
      lengolfLineFollowers: currentAdditionalData?.lengolfLineFollowers || 0,
      fairwayLineFollowers: currentAdditionalData?.fairwayLineFollowers || 0,
      cac,
      roas,
      weekOverWeekSpendChange,
      weekOverWeekNewCustomersChange,
      // Traffic data
      totalSessions: trafficData.totalSessions,
      paidSessions: trafficData.paidSessions,
      paidSocialSessions: trafficData.paidSocialSessions,
      paidSearchSessions: trafficData.paidSearchSessions,
      organicSearchSessions: trafficData.organicSearchSessions,
      directSessions: trafficData.directSessions,
      emailSessions: trafficData.emailSessions,
      referralSessions: trafficData.referralSessions,
      otherSessions: trafficData.otherSessions
    };

    performance.push(weekPerformance);
  }

  return NextResponse.json({
    data: performance,
    summary: {
      totalWeeks: performance.length,
      avgWeeklySpend: performance.reduce((sum, week) => sum + week.totalSpend, 0) / performance.length,
      avgWeeklyNewCustomers: performance.reduce((sum, week) => sum + week.totalNewCustomers, 0) / performance.length,
      avgCac: performance.reduce((sum, week) => sum + week.cac, 0) / performance.length,
      avgRoas: performance.reduce((sum, week) => sum + week.roas, 0) / performance.length
    }
  });
}

async function getMonthlyPerformance(startDate: Date, endDate: Date) {
  // Helper function to get new customer revenue by referral source for monthly periods
  const getNewCustomerRevenueForMonthly = async (startDate: Date, endDate: Date, referralSources: string | string[]): Promise<number> => {
    const sources = Array.isArray(referralSources) ? referralSources : [referralSources];
    
    const { data, error } = await supabase.rpc('get_new_customer_revenue', {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      referral_sources: sources
    });

    if (error) {
      console.error('Error fetching new customer revenue for monthly period:', error);
      return 0;
    }

    return Number(data || 0);
  };

  // Helper function to get LINE followers for competitors during a monthly period
  const getLineFollowersForMonthly = async (startDate: Date, endDate: Date): Promise<{lengolf: number, fairway: number}> => {
    // Get data at or before the end date for historical comparison
    const { data, error } = await supabase
      .schema('marketing')
      .from('competitor_metrics')
      .select(`
        line_friends_count,
        recorded_at,
        competitors!inner(name)
      `)
      .eq('platform', 'line')
      .in('competitors.name', ['LENGOLF', 'FAIRWAY GOLF AND CITY CLUB'])
      .lte('recorded_at', endDate.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(50); // Get more records to find data close to the period

    if (error) {
      console.error('Error fetching LINE followers for monthly:', error);
      return { lengolf: 0, fairway: 0 };
    }

    // Find the most recent data for each competitor at or before the end date
    const lengolfData = data?.find((metric: any) => metric.competitors.name === 'LENGOLF');
    const fairwayData = data?.find((metric: any) => metric.competitors.name === 'FAIRWAY GOLF AND CITY CLUB');

    return {
      lengolf: Number(lengolfData?.line_friends_count || 0),
      fairway: Number(fairwayData?.line_friends_count || 0)
    };
  };

  // For MTD calculation, get current month to date
  // Use UTC methods to ensure consistent date calculations
  const currentMonth = endDate.getUTCMonth();
  const currentYear = endDate.getUTCFullYear();
  const currentDay = endDate.getUTCDate();
  
  
  // Expand date range to include enough historical data for 3 months
  const expandedStartDate = new Date(currentYear, currentMonth - 2, 1);
  
  // Get daily data from our new view
  const { data: dailyData, error } = await supabase
    .schema('marketing')
    .from('daily_marketing_metrics')
    .select('*')
    .gte('date', expandedStartDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily metrics:', error);
    throw new Error('Failed to fetch daily metrics');
  }

  // Define the three periods we need using UTC dates
  const periods = [
    {
      key: 'MTD',
      label: 'Month-To-Date',
      startDate: new Date(Date.UTC(currentYear, currentMonth, 1)),
      endDate: new Date(Date.UTC(currentYear, currentMonth, currentDay)),
      isPartialMonth: true
    },
    {
      key: 'M-1', 
      label: 'Previous Month',
      startDate: new Date(Date.UTC(currentYear, currentMonth - 1, 1)),
      endDate: new Date(Date.UTC(currentYear, currentMonth, 0)), // Last day of previous month
      isPartialMonth: false
    },
    {
      key: 'M-2',
      label: 'Two Months Ago', 
      startDate: new Date(Date.UTC(currentYear, currentMonth - 2, 1)),
      endDate: new Date(Date.UTC(currentYear, currentMonth - 1, 0)), // Last day of M-2
      isPartialMonth: false
    }
  ];


  // Pre-calculate all revenue data and additional data for periods
  const revenueDataMonthly = await Promise.all(
    periods.map(async period => {
      const [googleRevenue, metaRevenue, metaLeads, grossProfit, lineFollowers] = await Promise.all([
        getNewCustomerRevenueForMonthly(period.startDate, period.endDate, 'Google'),
        getNewCustomerRevenueForMonthly(period.startDate, period.endDate, ['Facebook', 'Instagram']),
        getMetaLeads(period.startDate, period.endDate),
        getGrossProfit(period.startDate, period.endDate),
        getLineFollowersForMonthly(period.startDate, period.endDate)
      ]);
      
      return { 
        periodKey: period.key, 
        googleRevenue, 
        metaRevenue, 
        totalRevenue: googleRevenue + metaRevenue,
        metaLeads,
        grossProfit,
        lengolfLineFollowers: lineFollowers.lengolf,
        fairwayLineFollowers: lineFollowers.fairway
      };
    })
  );

  // Calculate performance for each period
  const performance: MonthlyPerformance[] = [];

  for (const period of periods) {
    const currentRevenueData = revenueDataMonthly.find(r => r.periodKey === period.key);
    // Filter daily data for this period
    const periodData = dailyData?.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= period.startDate && dayDate <= period.endDate;
    }) || [];

    // Aggregate the daily data for this period
    const periodTotals = periodData.reduce((acc, day) => ({
      googleSpend: acc.googleSpend + Number(day.google_spend),
      metaSpend: acc.metaSpend + Number(day.meta_spend),
      totalSpend: acc.totalSpend + Number(day.total_spend),
      googleImpressions: acc.googleImpressions + Number(day.google_impressions),
      metaImpressions: acc.metaImpressions + Number(day.meta_impressions),
      totalImpressions: acc.totalImpressions + Number(day.total_impressions),
      googleClicks: acc.googleClicks + Number(day.google_clicks),
      metaClicks: acc.metaClicks + Number(day.meta_clicks),
      totalClicks: acc.totalClicks + Number(day.total_clicks),
      googleNewCustomers: acc.googleNewCustomers + Number(day.google_new_customers),
      metaNewCustomers: acc.metaNewCustomers + Number(day.meta_new_customers),
      totalNewCustomers: acc.totalNewCustomers + Number(day.total_new_customers),
      totalConversionValue: acc.totalConversionValue + Number(day.total_conversion_value),
      totalRevenue: acc.totalRevenue + Number(day.daily_revenue),
    }), {
      googleSpend: 0, metaSpend: 0, totalSpend: 0,
      googleImpressions: 0, metaImpressions: 0, totalImpressions: 0,
      googleClicks: 0, metaClicks: 0, totalClicks: 0,
      googleNewCustomers: 0, metaNewCustomers: 0, totalNewCustomers: 0,
      totalConversionValue: 0, totalRevenue: 0
    });

    // Calculate derived metrics
    const googleCtr = periodTotals.googleImpressions > 0 ? 
      (periodTotals.googleClicks / periodTotals.googleImpressions) * 100 : 0;
    const metaCtr = periodTotals.metaImpressions > 0 ? 
      (periodTotals.metaClicks / periodTotals.metaImpressions) * 100 : 0;
    const averageCtr = periodTotals.totalImpressions > 0 ? 
      (periodTotals.totalClicks / periodTotals.totalImpressions) * 100 : 0;

    // Calculate CPM (Cost Per Mille - per 1000 impressions)
    const googleCpm = periodTotals.googleImpressions > 0 ? 
      (periodTotals.googleSpend / periodTotals.googleImpressions) * 1000 : 0;
    const metaCpm = periodTotals.metaImpressions > 0 ? 
      (periodTotals.metaSpend / periodTotals.metaImpressions) * 1000 : 0;
    const totalCpm = periodTotals.totalImpressions > 0 ? 
      (periodTotals.totalSpend / periodTotals.totalImpressions) * 1000 : 0;

    // Calculate CPC (Cost Per Click)
    const googleCpc = periodTotals.googleClicks > 0 ? 
      periodTotals.googleSpend / periodTotals.googleClicks : 0;
    const metaCpc = periodTotals.metaClicks > 0 ? 
      periodTotals.metaSpend / periodTotals.metaClicks : 0;
    const totalCpc = periodTotals.totalClicks > 0 ? 
      periodTotals.totalSpend / periodTotals.totalClicks : 0;

    const cac = periodTotals.totalNewCustomers > 0 ? 
      periodTotals.totalSpend / periodTotals.totalNewCustomers : 0;
      
    // Use pre-calculated ROAS from actual new customer revenue
    const roas = periodTotals.totalSpend > 0 ? 
      (currentRevenueData?.totalRevenue || 0) / periodTotals.totalSpend : 0;

    // Get traffic data for this period
    const trafficData = await getTrafficDataForPeriod(period.startDate, period.endDate);

    const periodPerformance: MonthlyPerformance = {
      period: period.key,
      monthStart: period.startDate.toISOString().split('T')[0],
      monthEnd: period.endDate.toISOString().split('T')[0],
      googleSpend: periodTotals.googleSpend,
      metaSpend: periodTotals.metaSpend,
      totalSpend: periodTotals.totalSpend,
      googleImpressions: periodTotals.googleImpressions,
      metaImpressions: periodTotals.metaImpressions,
      totalImpressions: periodTotals.totalImpressions,
      googleClicks: periodTotals.googleClicks,
      metaClicks: periodTotals.metaClicks,
      totalClicks: periodTotals.totalClicks,
      googleCtr,
      metaCtr,
      averageCtr,
      googleCpm,
      metaCpm,
      totalCpm,
      googleCpc,
      metaCpc,
      totalCpc,
      googleNewCustomers: periodTotals.googleNewCustomers,
      metaNewCustomers: periodTotals.metaNewCustomers,
      totalNewCustomers: periodTotals.totalNewCustomers,
      metaLeads: currentRevenueData?.metaLeads || 0,
      grossProfit: currentRevenueData?.grossProfit || 0,
      lengolfLineFollowers: currentRevenueData?.lengolfLineFollowers || 0,
      fairwayLineFollowers: currentRevenueData?.fairwayLineFollowers || 0,
      cac,
      roas,
      // Traffic data
      totalSessions: trafficData.totalSessions,
      paidSessions: trafficData.paidSessions,
      paidSocialSessions: trafficData.paidSocialSessions,
      paidSearchSessions: trafficData.paidSearchSessions,
      organicSearchSessions: trafficData.organicSearchSessions,
      directSessions: trafficData.directSessions,
      emailSessions: trafficData.emailSessions,
      referralSessions: trafficData.referralSessions,
      otherSessions: trafficData.otherSessions
    };

    performance.push(periodPerformance);
  }

  return NextResponse.json({
    data: performance,
    summary: {
      totalMonths: performance.length,
      avgMonthlySpend: performance.reduce((sum, month) => sum + month.totalSpend, 0) / performance.length,
      avgMonthlyNewCustomers: performance.reduce((sum, month) => sum + month.totalNewCustomers, 0) / performance.length,
      avgCac: performance.reduce((sum, month) => sum + month.cac, 0) / performance.length,
      avgRoas: performance.reduce((sum, month) => sum + month.roas, 0) / performance.length
    }
  });
}

async function getRolling7DayPerformance(endDate: Date, periods: number) {
  // Helper function to get new customer revenue by referral source for rolling periods
  const getNewCustomerRevenueForRolling = async (startDate: Date, endDate: Date, referralSources: string | string[]): Promise<number> => {
    const sources = Array.isArray(referralSources) ? referralSources : [referralSources];
    
    const { data, error } = await supabase.rpc('get_new_customer_revenue', {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      referral_sources: sources
    });

    if (error) {
      console.error('Error fetching new customer revenue for rolling period:', error);
      return 0;
    }

    return Number(data || 0);
  };

  // Helper function to get LINE followers for competitors during a rolling period
  const getLineFollowersForRolling = async (startDate: Date, endDate: Date): Promise<{lengolf: number, fairway: number}> => {
    // Get data at or before the end date for historical comparison
    const { data, error } = await supabase
      .schema('marketing')
      .from('competitor_metrics')
      .select(`
        line_friends_count,
        recorded_at,
        competitors!inner(name)
      `)
      .eq('platform', 'line')
      .in('competitors.name', ['LENGOLF', 'FAIRWAY GOLF AND CITY CLUB'])
      .lte('recorded_at', endDate.toISOString())
      .order('recorded_at', { ascending: false })
      .limit(50); // Get more records to find data close to the period

    if (error) {
      console.error('Error fetching LINE followers for rolling:', error);
      return { lengolf: 0, fairway: 0 };
    }

    // Find the most recent data for each competitor at or before the end date
    const lengolfData = data?.find((metric: any) => metric.competitors.name === 'LENGOLF');
    const fairwayData = data?.find((metric: any) => metric.competitors.name === 'FAIRWAY GOLF AND CITY CLUB');

    return {
      lengolf: Number(lengolfData?.line_friends_count || 0),
      fairway: Number(fairwayData?.line_friends_count || 0)
    };
  };

  // Get daily data from our view
  const { data: dailyData, error } = await supabase
    .schema('marketing')
    .from('daily_marketing_metrics')
    .select('*')
    .gte('date', new Date(endDate.getTime() - (periods * 7 + 6) * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching daily metrics:', error);
    throw new Error('Failed to fetch daily metrics');
  }

  const performance: Rolling7DayPerformance[] = [];

  // Create rolling 7-day periods
  for (let i = 0; i < periods; i++) {
    const periodEnd = new Date(endDate.getTime() - (i * 7 * 24 * 60 * 60 * 1000));
    const periodStart = new Date(periodEnd.getTime() - (6 * 24 * 60 * 60 * 1000));

    // Filter daily data for this 7-day period
    const periodData = dailyData?.filter(day => {
      const dayDate = new Date(day.date);
      return dayDate >= periodStart && dayDate <= periodEnd;
    }) || [];

    // Aggregate the daily data for this period
    const periodTotals = periodData.reduce((acc, day) => ({
      googleSpend: acc.googleSpend + Number(day.google_spend),
      metaSpend: acc.metaSpend + Number(day.meta_spend),
      totalSpend: acc.totalSpend + Number(day.total_spend),
      googleImpressions: acc.googleImpressions + Number(day.google_impressions),
      metaImpressions: acc.metaImpressions + Number(day.meta_impressions),
      totalImpressions: acc.totalImpressions + Number(day.total_impressions),
      googleClicks: acc.googleClicks + Number(day.google_clicks),
      metaClicks: acc.metaClicks + Number(day.meta_clicks),
      totalClicks: acc.totalClicks + Number(day.total_clicks),
      googleNewCustomers: acc.googleNewCustomers + Number(day.google_new_customers),
      metaNewCustomers: acc.metaNewCustomers + Number(day.meta_new_customers),
      totalNewCustomers: acc.totalNewCustomers + Number(day.total_new_customers),
      totalRevenue: acc.totalRevenue + Number(day.daily_revenue),
    }), {
      googleSpend: 0, metaSpend: 0, totalSpend: 0,
      googleImpressions: 0, metaImpressions: 0, totalImpressions: 0,
      googleClicks: 0, metaClicks: 0, totalClicks: 0,
      googleNewCustomers: 0, metaNewCustomers: 0, totalNewCustomers: 0,
      totalRevenue: 0
    });

    // Calculate derived metrics
    const googleCtr = periodTotals.googleImpressions > 0 ? 
      (periodTotals.googleClicks / periodTotals.googleImpressions) * 100 : 0;
    const metaCtr = periodTotals.metaImpressions > 0 ? 
      (periodTotals.metaClicks / periodTotals.metaImpressions) * 100 : 0;
    const averageCtr = periodTotals.totalImpressions > 0 ? 
      (periodTotals.totalClicks / periodTotals.totalImpressions) * 100 : 0;

    // Calculate CPM (Cost Per Mille - per 1000 impressions)
    const googleCpm = periodTotals.googleImpressions > 0 ? 
      (periodTotals.googleSpend / periodTotals.googleImpressions) * 1000 : 0;
    const metaCpm = periodTotals.metaImpressions > 0 ? 
      (periodTotals.metaSpend / periodTotals.metaImpressions) * 1000 : 0;
    const totalCpm = periodTotals.totalImpressions > 0 ? 
      (periodTotals.totalSpend / periodTotals.totalImpressions) * 1000 : 0;

    // Calculate CPC (Cost Per Click)
    const googleCpc = periodTotals.googleClicks > 0 ? 
      periodTotals.googleSpend / periodTotals.googleClicks : 0;
    const metaCpc = periodTotals.metaClicks > 0 ? 
      periodTotals.metaSpend / periodTotals.metaClicks : 0;
    const totalCpc = periodTotals.totalClicks > 0 ? 
      periodTotals.totalSpend / periodTotals.totalClicks : 0;

    const cac = periodTotals.totalNewCustomers > 0 ? 
      periodTotals.totalSpend / periodTotals.totalNewCustomers : 0;
    
    // Calculate ROAS and fetch additional data in parallel
    const [googleNewCustomerRevenue, metaNewCustomerRevenue, metaLeads, grossProfit, lineFollowers] = await Promise.all([
      getNewCustomerRevenueForRolling(periodStart, periodEnd, 'Google'),
      getNewCustomerRevenueForRolling(periodStart, periodEnd, ['Facebook', 'Instagram']),
      getMetaLeads(periodStart, periodEnd),
      getGrossProfit(periodStart, periodEnd),
      getLineFollowersForRolling(periodStart, periodEnd)
    ]);
    
    const totalNewCustomerRevenue = googleNewCustomerRevenue + metaNewCustomerRevenue;
    
    const roas = periodTotals.totalSpend > 0 ? 
      totalNewCustomerRevenue / periodTotals.totalSpend : 0;

    // Calculate period-over-period changes
    let periodOverPeriodSpendChange = 0;
    let periodOverPeriodNewCustomersChange = 0;
    
    if (performance.length > 0) {
      const prevPeriod = performance[performance.length - 1];
      periodOverPeriodSpendChange = prevPeriod.totalSpend > 0 ? 
        ((periodTotals.totalSpend - prevPeriod.totalSpend) / prevPeriod.totalSpend) * 100 : 0;
      periodOverPeriodNewCustomersChange = prevPeriod.totalNewCustomers > 0 ? 
        ((periodTotals.totalNewCustomers - prevPeriod.totalNewCustomers) / prevPeriod.totalNewCustomers) * 100 : 0;
    }

    const periodKey = `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`;

    // Get traffic data for this period
    const trafficData = await getTrafficDataForPeriod(periodStart, periodEnd);

    const periodPerformance: Rolling7DayPerformance = {
      period: periodKey,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      googleSpend: periodTotals.googleSpend,
      metaSpend: periodTotals.metaSpend,
      totalSpend: periodTotals.totalSpend,
      googleImpressions: periodTotals.googleImpressions,
      metaImpressions: periodTotals.metaImpressions,
      totalImpressions: periodTotals.totalImpressions,
      googleClicks: periodTotals.googleClicks,
      metaClicks: periodTotals.metaClicks,
      totalClicks: periodTotals.totalClicks,
      googleCtr,
      metaCtr,
      averageCtr,
      googleCpm,
      metaCpm,
      totalCpm,
      googleCpc,
      metaCpc,
      totalCpc,
      googleNewCustomers: periodTotals.googleNewCustomers,
      metaNewCustomers: periodTotals.metaNewCustomers,
      totalNewCustomers: periodTotals.totalNewCustomers,
      metaLeads,
      grossProfit,
      lengolfLineFollowers: lineFollowers.lengolf,
      fairwayLineFollowers: lineFollowers.fairway,
      cac,
      roas,
      periodOverPeriodSpendChange,
      periodOverPeriodNewCustomersChange,
      // Traffic data
      totalSessions: trafficData.totalSessions,
      paidSessions: trafficData.paidSessions,
      paidSocialSessions: trafficData.paidSocialSessions,
      paidSearchSessions: trafficData.paidSearchSessions,
      organicSearchSessions: trafficData.organicSearchSessions,
      directSessions: trafficData.directSessions,
      emailSessions: trafficData.emailSessions,
      referralSessions: trafficData.referralSessions,
      otherSessions: trafficData.otherSessions
    };

    performance.push(periodPerformance);
  }

  // Reverse to have most recent first
  performance.reverse();

  return NextResponse.json({
    data: performance,
    summary: {
      totalPeriods: performance.length,
      avgPeriodSpend: performance.reduce((sum, period) => sum + period.totalSpend, 0) / performance.length,
      avgPeriodNewCustomers: performance.reduce((sum, period) => sum + period.totalNewCustomers, 0) / performance.length,
      avgCac: performance.reduce((sum, period) => sum + period.cac, 0) / performance.length,
      avgRoas: performance.reduce((sum, period) => sum + period.roas, 0) / performance.length
    }
  });
}