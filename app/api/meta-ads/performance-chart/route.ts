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
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get Meta Ads performance data by date
    const { data: metaAdsData } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('date, spend_cents, impressions, clicks, conversions')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    // Get Meta bookings by date
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('date, referral_source')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('referral_source', ['Facebook', 'Instagram'])
      .eq('status', 'confirmed')
      .order('date');

    // Process Meta Ads data by date
    const dataByDate = new Map();
    
    metaAdsData?.forEach(record => {
      const date = record.date;
      const existing = dataByDate.get(date) || {
        date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        metaBookings: 0,
        facebookBookings: 0,
        instagramBookings: 0
      };

      existing.spend += (record.spend_cents || 0) / 100;
      existing.impressions += record.impressions || 0;
      existing.clicks += record.clicks || 0;
      existing.conversions += record.conversions || 0;

      dataByDate.set(date, existing);
    });

    // Process booking data by date
    bookingData?.forEach(booking => {
      const date = booking.date;
      const existing = dataByDate.get(date) || {
        date,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        metaBookings: 0,
        facebookBookings: 0,
        instagramBookings: 0
      };

      existing.metaBookings += 1;
      
      if (booking.referral_source === 'Facebook') {
        existing.facebookBookings += 1;
      } else if (booking.referral_source === 'Instagram') {
        existing.instagramBookings += 1;
      }

      dataByDate.set(date, existing);
    });

    // Create complete date range (fill missing dates with zero values)
    const chartData = [];
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dataByDate.get(dateStr) || {
        date: dateStr,
        spend: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        metaBookings: 0,
        facebookBookings: 0,
        instagramBookings: 0
      };

      // Calculate derived metrics
      dayData.ctr = dayData.impressions > 0 ? (dayData.clicks / dayData.impressions * 100) : 0;
      dayData.costPerBooking = dayData.metaBookings > 0 ? (dayData.spend / dayData.metaBookings) : 0;
      dayData.costPerConversion = dayData.conversions > 0 ? (dayData.spend / dayData.conversions) : 0;

      chartData.push({
        ...dayData,
        // Round numbers for cleaner display
        spend: Math.round(dayData.spend * 100) / 100,
        ctr: Math.round(dayData.ctr * 100) / 100,
        costPerBooking: Math.round(dayData.costPerBooking),
        costPerConversion: Math.round(dayData.costPerConversion)
      });
    }

    // Calculate summary statistics for the period
    const totals = chartData.reduce((acc, day) => ({
      totalSpend: acc.totalSpend + day.spend,
      totalImpressions: acc.totalImpressions + day.impressions,
      totalClicks: acc.totalClicks + day.clicks,
      totalConversions: acc.totalConversions + day.conversions,
      totalMetaBookings: acc.totalMetaBookings + day.metaBookings,
      totalFacebookBookings: acc.totalFacebookBookings + day.facebookBookings,
      totalInstagramBookings: acc.totalInstagramBookings + day.instagramBookings
    }), {
      totalSpend: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalConversions: 0,
      totalMetaBookings: 0,
      totalFacebookBookings: 0,
      totalInstagramBookings: 0
    });

    // Calculate overall metrics
    const overallMetrics = {
      ctr: totals.totalImpressions > 0 ? (totals.totalClicks / totals.totalImpressions * 100) : 0,
      costPerBooking: totals.totalMetaBookings > 0 ? (totals.totalSpend / totals.totalMetaBookings) : 0,
      costPerConversion: totals.totalConversions > 0 ? (totals.totalSpend / totals.totalConversions) : 0,
      conversionRate: totals.totalClicks > 0 ? (totals.totalConversions / totals.totalClicks * 100) : 0,
      bookingRate: totals.totalClicks > 0 ? (totals.totalMetaBookings / totals.totalClicks * 100) : 0
    };

    return NextResponse.json({
      success: true,
      period: { startDate, endDate },
      chartData,
      totals: {
        ...totals,
        totalSpend: Math.round(totals.totalSpend)
      },
      overallMetrics: {
        ctr: Math.round(overallMetrics.ctr * 100) / 100,
        costPerBooking: Math.round(overallMetrics.costPerBooking),
        costPerConversion: Math.round(overallMetrics.costPerConversion),
        conversionRate: Math.round(overallMetrics.conversionRate * 100) / 100,
        bookingRate: Math.round(overallMetrics.bookingRate * 100) / 100
      }
    });

  } catch (error) {
    console.error('Meta Ads performance chart error:', error);
    return NextResponse.json({
      error: "Failed to fetch Meta Ads performance chart data",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}