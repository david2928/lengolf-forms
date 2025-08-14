import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

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
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange: number;
  weekOverWeekNewCustomersChange: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const weeks = parseInt(searchParams.get('weeks') || '12');
    const format = searchParams.get('format') || 'weekly'; // weekly, monthly

    // Calculate date ranges for the specified number of weeks (exclude today)
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() - 1); // Yesterday
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (weeks * 7) + 1);

    // Get Google Ads performance data
    const { data: googleData } = await supabase
      .schema('marketing')
      .from('google_ads_campaign_performance')
      .select(`
        date,
        impressions,
        clicks,
        cost_micros,
        conversions,
        ctr
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Get Meta Ads performance data
    const { data: metaData } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select(`
        date,
        impressions,
        clicks,
        spend_cents,
        conversions,
        ctr
      `)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    // Get referral analytics data for conversions
    const { data: referralAnalytics } = await supabase
      .rpc('get_pos_weekly_referral_analytics', { weeks_back: weeks + 2 });

    // Function to get week number and year
    const getWeekInfo = (date: Date) => {
      const startOfYear = new Date(date.getFullYear(), 0, 1);
      const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
      const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
      return { year: date.getFullYear(), week: weekNumber };
    };

    // Function to get Monday of the week
    const getMonday = (date: Date) => {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(date.setDate(diff));
    };

    // Function to get Sunday of the week
    const getSunday = (date: Date) => {
      const monday = getMonday(new Date(date));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return sunday;
    };

    // Group data by week
    const weeklyData = new Map<string, {
      weekStart: Date;
      weekEnd: Date;
      google: any[];
      meta: any[];
    }>();

    // Process Google data
    googleData?.forEach(row => {
      const date = new Date(row.date);
      const weekInfo = getWeekInfo(date);
      const weekKey = `${weekInfo.year}-W${weekInfo.week.toString().padStart(2, '0')}`;
      
      if (!weeklyData.has(weekKey)) {
        const monday = getMonday(new Date(date));
        const sunday = getSunday(new Date(date));
        weeklyData.set(weekKey, {
          weekStart: monday,
          weekEnd: sunday,
          google: [],
          meta: []
        });
      }
      
      weeklyData.get(weekKey)!.google.push(row);
    });

    // Process Meta data
    metaData?.forEach(row => {
      const date = new Date(row.date);
      const weekInfo = getWeekInfo(date);
      const weekKey = `${weekInfo.year}-W${weekInfo.week.toString().padStart(2, '0')}`;
      
      if (!weeklyData.has(weekKey)) {
        const monday = getMonday(new Date(date));
        const sunday = getSunday(new Date(date));
        weeklyData.set(weekKey, {
          weekStart: monday,
          weekEnd: sunday,
          google: [],
          meta: []
        });
      }
      
      weeklyData.get(weekKey)!.meta.push(row);
    });

    // Calculate weekly performance
    const performance: WeeklyPerformance[] = [];
    const sortedWeeks = Array.from(weeklyData.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // Sort by week descending
      .slice(0, weeks);

    // Pre-fetch all weekly revenue data
    const weeklyRevenues = new Map<string, number>();
    for (const [weekKey, data] of sortedWeeks) {
      const { data: weekRevenue } = await supabase
        .rpc('get_marketing_total_revenue', {
          p_start_date: data.weekStart.toISOString().split('T')[0],
          p_end_date: data.weekEnd.toISOString().split('T')[0]
        });
      weeklyRevenues.set(weekKey, Number(weekRevenue?.[0]?.total_revenue || 0));
    }

    sortedWeeks.forEach(([weekKey, data], index) => {
      // Calculate Google totals
      const googleTotals = data.google.reduce((acc, curr) => ({
        impressions: acc.impressions + (curr.impressions || 0),
        clicks: acc.clicks + (curr.clicks || 0),
        spend: acc.spend + (Number(curr.cost_micros) / 1000000 || 0),
        conversions: acc.conversions + (Number(curr.conversions) || 0),
        ctr: acc.ctr.concat(curr.ctr || 0)
      }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] });

      // Calculate Meta totals
      const metaTotals = data.meta.reduce((acc, curr) => ({
        impressions: acc.impressions + (curr.impressions || 0),
        clicks: acc.clicks + (curr.clicks || 0),
        spend: acc.spend + (Number(curr.spend_cents) / 100 || 0),
        conversions: acc.conversions + (Number(curr.conversions) || 0),
        ctr: acc.ctr.concat(curr.ctr || 0)
      }), { impressions: 0, clicks: 0, spend: 0, conversions: 0, ctr: [] as number[] });

      // Get referral new customers for this week
      const weekReferrals = referralAnalytics?.filter((r: any) => r.week_start === data.weekStart.toISOString().split('T')[0]) || [];
      const googleNewCustomers = weekReferrals.filter((r: any) => r.referral_source === 'Google').reduce((sum: number, r: any) => sum + (r.customer_count || 0), 0);
      const metaNewCustomers = weekReferrals.filter((r: any) => ['Facebook', 'Instagram'].includes(r.referral_source)).reduce((sum: number, r: any) => sum + (r.customer_count || 0), 0);

      // Calculate averages and totals
      const totalSpend = googleTotals.spend + metaTotals.spend;
      const totalImpressions = googleTotals.impressions + metaTotals.impressions;
      const totalClicks = googleTotals.clicks + metaTotals.clicks;
      const totalNewCustomers = googleNewCustomers + metaNewCustomers;

      const googleCtr = googleTotals.ctr.length > 0 ? 
        googleTotals.ctr.filter((c: number) => c > 0).reduce((a: number, b: number) => a + b, 0) / googleTotals.ctr.filter((c: number) => c > 0).length : 0;
      const metaCtr = metaTotals.ctr.length > 0 ? 
        metaTotals.ctr.filter((c: number) => c > 0).reduce((a: number, b: number) => a + b, 0) / metaTotals.ctr.filter((c: number) => c > 0).length : 0;
      const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

      const cac = totalNewCustomers > 0 ? totalSpend / totalNewCustomers : 0;
      
      // Get revenue for this week for ROAS calculation
      const weekRevenueTotal = weeklyRevenues.get(weekKey) || 0;
      const roas = totalSpend > 0 ? weekRevenueTotal / totalSpend : 0;

      // Calculate week-over-week changes
      let weekOverWeekSpendChange = 0;
      let weekOverWeekNewCustomersChange = 0;
      
      if (index < sortedWeeks.length - 1) {
        const prevWeekData = performance[index - 1];
        if (prevWeekData) {
          weekOverWeekSpendChange = prevWeekData.totalSpend > 0 ? 
            ((totalSpend - prevWeekData.totalSpend) / prevWeekData.totalSpend) * 100 : 0;
          weekOverWeekNewCustomersChange = prevWeekData.totalNewCustomers > 0 ? 
            ((totalNewCustomers - prevWeekData.totalNewCustomers) / prevWeekData.totalNewCustomers) * 100 : 0;
        }
      }

      const weekPerformance: WeeklyPerformance = {
        period: weekKey,
        weekStart: data.weekStart.toISOString().split('T')[0],
        weekEnd: data.weekEnd.toISOString().split('T')[0],
        googleSpend: googleTotals.spend,
        metaSpend: metaTotals.spend,
        totalSpend,
        googleImpressions: googleTotals.impressions,
        metaImpressions: metaTotals.impressions,
        totalImpressions,
        googleClicks: googleTotals.clicks,
        metaClicks: metaTotals.clicks,
        totalClicks,
        googleCtr,
        metaCtr,
        averageCtr,
        googleNewCustomers: googleNewCustomers,
        metaNewCustomers: metaNewCustomers,
        totalNewCustomers,
        cac,
        roas,
        weekOverWeekSpendChange,
        weekOverWeekNewCustomersChange
      };

      performance.push(weekPerformance);
    });

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

  } catch (error) {
    console.error('Marketing performance API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch marketing performance data" },
      { status: 500 }
    );
  }
}