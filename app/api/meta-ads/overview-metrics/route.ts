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

    // Get current period Meta Ads data
    const { data: metaAdsData } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('spend_cents, impressions, clicks, conversions')
      .gte('date', startDate)
      .lte('date', endDate);

    // Get current period Meta bookings (referral source)
    const { data: metaBookings } = await supabase
      .from('bookings')
      .select('id')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('referral_source', ['Facebook', 'Instagram'])
      .eq('status', 'confirmed');

    // Calculate previous period dates (same length)
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const prevEndDate = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevStartDate = new Date(new Date(prevEndDate).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get previous period data for comparison
    const { data: prevMetaAdsData } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('spend_cents, impressions, clicks, conversions')
      .gte('date', prevStartDate)
      .lte('date', prevEndDate);

    const { data: prevMetaBookings } = await supabase
      .from('bookings')
      .select('id')
      .gte('date', prevStartDate)
      .lte('date', prevEndDate)
      .in('referral_source', ['Facebook', 'Instagram'])
      .eq('status', 'confirmed');

    // Calculate current period metrics
    const totalSpend = (metaAdsData?.reduce((sum, d) => sum + (d.spend_cents || 0), 0) || 0) / 100;
    const totalImpressions = metaAdsData?.reduce((sum, d) => sum + (d.impressions || 0), 0) || 0;
    const totalClicks = metaAdsData?.reduce((sum, d) => sum + (d.clicks || 0), 0) || 0;
    const totalConversions = metaAdsData?.reduce((sum, d) => sum + (d.conversions || 0), 0) || 0;
    const totalMetaBookings = metaBookings?.length || 0;

    // Calculate previous period metrics
    const prevTotalSpend = (prevMetaAdsData?.reduce((sum, d) => sum + (d.spend_cents || 0), 0) || 0) / 100;
    const prevTotalImpressions = prevMetaAdsData?.reduce((sum, d) => sum + (d.impressions || 0), 0) || 0;
    const prevTotalClicks = prevMetaAdsData?.reduce((sum, d) => sum + (d.clicks || 0), 0) || 0;
    const prevTotalConversions = prevMetaAdsData?.reduce((sum, d) => sum + (d.conversions || 0), 0) || 0;
    const prevTotalMetaBookings = prevMetaBookings?.length || 0;

    // Calculate derived metrics
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions * 100) : 0;
    const costPerBooking = totalMetaBookings > 0 ? (totalSpend / totalMetaBookings) : 0;
    const costPerConversion = totalConversions > 0 ? (totalSpend / totalConversions) : 0;

    const prevCtr = prevTotalImpressions > 0 ? (prevTotalClicks / prevTotalImpressions * 100) : 0;
    const prevCostPerBooking = prevTotalMetaBookings > 0 ? (prevTotalSpend / prevTotalMetaBookings) : 0;
    const prevCostPerConversion = prevTotalConversions > 0 ? (prevTotalSpend / prevTotalConversions) : 0;

    // Calculate percentage changes
    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100);
    };

    const metrics = {
      totalSpend: {
        value: Math.round(totalSpend),
        change: calculateChange(totalSpend, prevTotalSpend),
        trend: totalSpend > prevTotalSpend ? 'up' : totalSpend < prevTotalSpend ? 'down' : 'stable'
      },
      metaBookings: {
        value: totalMetaBookings,
        change: calculateChange(totalMetaBookings, prevTotalMetaBookings),
        trend: totalMetaBookings > prevTotalMetaBookings ? 'up' : totalMetaBookings < prevTotalMetaBookings ? 'down' : 'stable'
      },
      impressions: {
        value: totalImpressions,
        change: calculateChange(totalImpressions, prevTotalImpressions),
        trend: totalImpressions > prevTotalImpressions ? 'up' : totalImpressions < prevTotalImpressions ? 'down' : 'stable'
      },
      clicks: {
        value: totalClicks,
        change: calculateChange(totalClicks, prevTotalClicks),
        trend: totalClicks > prevTotalClicks ? 'up' : totalClicks < prevTotalClicks ? 'down' : 'stable'
      },
      ctr: {
        value: Number(ctr.toFixed(2)),
        change: calculateChange(ctr, prevCtr),
        trend: ctr > prevCtr ? 'up' : ctr < prevCtr ? 'down' : 'stable'
      },
      conversions: {
        value: totalConversions,
        change: calculateChange(totalConversions, prevTotalConversions),
        trend: totalConversions > prevTotalConversions ? 'up' : totalConversions < prevTotalConversions ? 'down' : 'stable'
      },
      costPerBooking: {
        value: Math.round(costPerBooking),
        change: calculateChange(costPerBooking, prevCostPerBooking),
        trend: costPerBooking < prevCostPerBooking ? 'up' : costPerBooking > prevCostPerBooking ? 'down' : 'stable' // Lower cost is better
      },
      costPerConversion: {
        value: Math.round(costPerConversion),
        change: calculateChange(costPerConversion, prevCostPerConversion),
        trend: costPerConversion < prevCostPerConversion ? 'up' : costPerConversion > prevCostPerConversion ? 'down' : 'stable' // Lower cost is better
      }
    };

    return NextResponse.json({
      success: true,
      period: { startDate, endDate },
      previousPeriod: { startDate: prevStartDate, endDate: prevEndDate },
      metrics
    });

  } catch (error) {
    console.error('Meta Ads overview metrics error:', error);
    return NextResponse.json({
      error: "Failed to fetch Meta Ads overview metrics",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}