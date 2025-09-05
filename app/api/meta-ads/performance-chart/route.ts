import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface PerformanceChartData {
  dates: string[];
  spend: number[];
  bookings: number[];
  impressions: number[];
  clicks: number[];
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const referenceDateParam = searchParams.get('referenceDate');
    const metricsParam = searchParams.get('metrics') || 'spend,bookings,impressions,clicks';
    const requestedMetrics = metricsParam.split(',');

    // Get reference date (exclude today unless specific date provided)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const referenceDate = referenceDateParam ? new Date(referenceDateParam) : yesterday;
    const endDate = referenceDate;
    
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days + 1);

    console.log('Meta Ads Performance Chart API - Date ranges:', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      days,
      requestedMetrics
    });

    // Get Meta Ads daily performance data
    const { data: metaDaily, error: metaDailyError } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('date, impressions, clicks, spend_cents')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (metaDailyError) {
      console.error('Meta Ads daily data query error:', metaDailyError);
    }

    // Get Meta bookings daily data
    const { data: bookingsDaily, error: bookingsDailyError } = await supabase
      .from('bookings')
      .select('date')
      .in('referral_source', ['Facebook', 'Instagram'])
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .eq('status', 'confirmed')
      .order('date', { ascending: true });

    if (bookingsDailyError) {
      console.error('Meta bookings daily data query error:', bookingsDailyError);
    }

    // Create daily aggregates
    const dailyData: { [date: string]: { spend: number; bookings: number; impressions: number; clicks: number } } = {};

    // Initialize all dates in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      dailyData[dateStr] = { spend: 0, bookings: 0, impressions: 0, clicks: 0 };
    }

    // Aggregate Meta Ads data by date
    metaDaily?.forEach(row => {
      const date = row.date;
      if (!dailyData[date]) {
        dailyData[date] = { spend: 0, bookings: 0, impressions: 0, clicks: 0 };
      }
      
      dailyData[date].spend += Number(row.spend_cents) / 100 || 0;
      dailyData[date].impressions += row.impressions || 0;
      dailyData[date].clicks += row.clicks || 0;
    });

    // Aggregate bookings data by date
    bookingsDaily?.forEach(booking => {
      const date = booking.date;
      if (dailyData[date]) {
        dailyData[date].bookings += 1;
      }
    });

    // Convert to chart format
    const sortedDates = Object.keys(dailyData).sort();
    
    const chartData: PerformanceChartData = {
      dates: sortedDates,
      spend: sortedDates.map(date => dailyData[date].spend),
      bookings: sortedDates.map(date => dailyData[date].bookings),
      impressions: sortedDates.map(date => dailyData[date].impressions),
      clicks: sortedDates.map(date => dailyData[date].clicks)
    };

    // Filter to only requested metrics to reduce response size
    const filteredData: Partial<PerformanceChartData> = { dates: chartData.dates };
    if (requestedMetrics.includes('spend')) filteredData.spend = chartData.spend;
    if (requestedMetrics.includes('bookings')) filteredData.bookings = chartData.bookings;
    if (requestedMetrics.includes('impressions')) filteredData.impressions = chartData.impressions;
    if (requestedMetrics.includes('clicks')) filteredData.clicks = chartData.clicks;

    console.log('Meta Ads Performance Chart - Data points:', {
      totalDays: chartData.dates.length,
      totalSpend: chartData.spend.reduce((a, b) => a + b, 0),
      totalBookings: chartData.bookings.reduce((a, b) => a + b, 0),
      totalImpressions: chartData.impressions.reduce((a, b) => a + b, 0),
      totalClicks: chartData.clicks.reduce((a, b) => a + b, 0)
    });

    return NextResponse.json(filteredData);

  } catch (error) {
    console.error('Meta Ads performance chart API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch Meta Ads performance chart data" },
      { status: 500 }
    );
  }
}