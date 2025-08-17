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
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
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
    const includeMonthly = searchParams.get('includeMonthly') === 'true';
    const referenceDateParam = searchParams.get('referenceDate');

    // Calculate date range relative to reference date (defaults to yesterday)
    const today = new Date();
    const referenceDate = referenceDateParam ? new Date(referenceDateParam) : new Date(today);
    
    // For API calls, default end date to yesterday unless a specific reference date is provided
    const endDate = referenceDateParam ? referenceDate : new Date(today.setDate(today.getDate() - 1));
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - (weeks * 7) + 1);

    if (format === 'monthly' || includeMonthly) {
      return await getMonthlyPerformance(startDate, endDate);
    } else {
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

  // Helper functions for week calculations
  const getWeekInfo = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return { year: date.getFullYear(), week: weekNumber };
  };

  const getMonday = (date: Date) => {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  const getSunday = (date: Date) => {
    const monday = getMonday(new Date(date));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return sunday;
  };

  // Group daily data by week
  const weeklyData = new Map<string, any[]>();
  dailyData?.forEach(day => {
    const date = new Date(day.date);
    const weekInfo = getWeekInfo(date);
    const weekKey = `${weekInfo.year}-W${weekInfo.week.toString().padStart(2, '0')}`;
    
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

  sortedWeeks.forEach(([weekKey, days], index) => {
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

    const cac = weekTotals.totalNewCustomers > 0 ? 
      weekTotals.totalSpend / weekTotals.totalNewCustomers : 0;
    const roas = weekTotals.totalSpend > 0 ? 
      weekTotals.totalRevenue / weekTotals.totalSpend : 0;

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

    // Get week start and end dates
    const firstDay = new Date(Math.min(...days.map(d => new Date(d.date).getTime())));
    const lastDay = new Date(Math.max(...days.map(d => new Date(d.date).getTime())));
    const weekStart = getMonday(new Date(firstDay));
    const weekEnd = getSunday(new Date(firstDay));

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
      googleNewCustomers: weekTotals.googleNewCustomers,
      metaNewCustomers: weekTotals.metaNewCustomers,
      totalNewCustomers: weekTotals.totalNewCustomers,
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
}

async function getMonthlyPerformance(startDate: Date, endDate: Date) {
  // For MTD calculation, get current month to date
  const currentMonth = endDate.getMonth();
  const currentYear = endDate.getFullYear();
  
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

  // Define the three periods we need
  const periods = [
    {
      key: 'MTD',
      label: 'Month-To-Date',
      startDate: new Date(currentYear, currentMonth, 1),
      endDate: endDate,
      isPartialMonth: true
    },
    {
      key: 'M-1', 
      label: 'Previous Month',
      startDate: new Date(currentYear, currentMonth - 1, 1),
      endDate: new Date(currentYear, currentMonth, 0), // Last day of previous month
      isPartialMonth: false
    },
    {
      key: 'M-2',
      label: 'Two Months Ago', 
      startDate: new Date(currentYear, currentMonth - 2, 1),
      endDate: new Date(currentYear, currentMonth - 1, 0), // Last day of M-2
      isPartialMonth: false
    }
  ];

  // Calculate performance for each period
  const performance: MonthlyPerformance[] = [];

  periods.forEach(period => {
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

    const cac = periodTotals.totalNewCustomers > 0 ? 
      periodTotals.totalSpend / periodTotals.totalNewCustomers : 0;
    const roas = periodTotals.totalSpend > 0 ? 
      periodTotals.totalRevenue / periodTotals.totalSpend : 0;

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
      googleNewCustomers: periodTotals.googleNewCustomers,
      metaNewCustomers: periodTotals.metaNewCustomers,
      totalNewCustomers: periodTotals.totalNewCustomers,
      cac,
      roas
    };

    performance.push(periodPerformance);
  });

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