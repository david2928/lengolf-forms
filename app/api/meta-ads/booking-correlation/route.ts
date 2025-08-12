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
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const granularity = searchParams.get('granularity') || 'daily';

    // Get Meta Ads spend data
    const { data: metaAdsData } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('date, spend_cents, impressions, clicks, conversions')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    // Get Meta/Facebook booking data from referral analytics
    const { data: bookingData } = await supabase
      .from('bookings')
      .select('date, referral_source')
      .gte('date', startDate)
      .lte('date', endDate)
      .in('referral_source', ['Facebook', 'Instagram'])
      .eq('status', 'confirmed')
      .order('date');

    // Process Meta Ads data by date
    const spendByDate = new Map();
    const clicksByDate = new Map();
    const impressionsByDate = new Map();
    
    metaAdsData?.forEach(record => {
      const date = record.date;
      const spend = (record.spend_cents || 0) / 100; // Convert cents to THB
      
      spendByDate.set(date, (spendByDate.get(date) || 0) + spend);
      clicksByDate.set(date, (clicksByDate.get(date) || 0) + (record.clicks || 0));
      impressionsByDate.set(date, (impressionsByDate.get(date) || 0) + (record.impressions || 0));
    });

    // Process booking data by date and platform
    const bookingsByDate = new Map();
    const facebookBookingsByDate = new Map();
    const instagramBookingsByDate = new Map();
    
    bookingData?.forEach(booking => {
      const date = booking.date;
      bookingsByDate.set(date, (bookingsByDate.get(date) || 0) + 1);
      
      if (booking.referral_source === 'Facebook') {
        facebookBookingsByDate.set(date, (facebookBookingsByDate.get(date) || 0) + 1);
      } else if (booking.referral_source === 'Instagram') {
        instagramBookingsByDate.set(date, (instagramBookingsByDate.get(date) || 0) + 1);
      }
    });

    // Create combined dataset for correlation analysis
    const correlationData = [];
    const allDates = new Set([...Array.from(spendByDate.keys()), ...Array.from(bookingsByDate.keys())]);
    
    for (const date of Array.from(allDates).sort()) {
      const spend = spendByDate.get(date) || 0;
      const clicks = clicksByDate.get(date) || 0;
      const impressions = impressionsByDate.get(date) || 0;
      const bookings = bookingsByDate.get(date) || 0;
      const facebookBookings = facebookBookingsByDate.get(date) || 0;
      const instagramBookings = instagramBookingsByDate.get(date) || 0;
      
      correlationData.push({
        date,
        spend,
        clicks,
        impressions,
        bookings,
        facebook_bookings: facebookBookings,
        instagram_bookings: instagramBookings,
        cost_per_booking: bookings > 0 ? spend / bookings : 0,
        click_to_booking_rate: clicks > 0 ? (bookings / clicks * 100) : 0
      });
    }

    // Calculate correlation coefficient between spend and bookings
    const correlation = calculateCorrelation(
      correlationData.map(d => d.spend),
      correlationData.map(d => d.bookings)
    );

    // Calculate summary statistics
    const totalSpend = correlationData.reduce((sum, d) => sum + d.spend, 0);
    const totalBookings = correlationData.reduce((sum, d) => sum + d.bookings, 0);
    const totalFacebookBookings = correlationData.reduce((sum, d) => sum + d.facebook_bookings, 0);
    const totalInstagramBookings = correlationData.reduce((sum, d) => sum + d.instagram_bookings, 0);
    const totalClicks = correlationData.reduce((sum, d) => sum + d.clicks, 0);
    const totalImpressions = correlationData.reduce((sum, d) => sum + d.impressions, 0);

    // Calculate platform-specific correlations
    const facebookCorrelation = calculateCorrelation(
      correlationData.map(d => d.spend),
      correlationData.map(d => d.facebook_bookings)
    );
    
    const instagramCorrelation = calculateCorrelation(
      correlationData.map(d => d.spend),
      correlationData.map(d => d.instagram_bookings)
    );

    // Get previous period for comparison (same number of days before start date)
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    const prevStartDate = new Date(new Date(startDate).getTime() - daysDiff * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const prevEndDate = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get previous period data for comparison
    const { data: prevMetaAdsData } = await supabase
      .schema('marketing')
      .from('meta_ads_campaign_performance')
      .select('spend_cents, clicks, impressions')
      .gte('date', prevStartDate)
      .lte('date', prevEndDate);

    const { data: prevBookingData } = await supabase
      .from('bookings')
      .select('date, referral_source')
      .gte('date', prevStartDate)
      .lte('date', prevEndDate)
      .in('referral_source', ['Facebook', 'Instagram'])
      .eq('status', 'confirmed');

    const prevTotalSpend = (prevMetaAdsData?.reduce((sum, d) => sum + (d.spend_cents || 0), 0) || 0) / 100;
    const prevTotalBookings = prevBookingData?.length || 0;
    const prevTotalClicks = prevMetaAdsData?.reduce((sum, d) => sum + (d.clicks || 0), 0) || 0;

    // Calculate efficiency metrics
    const efficiency = {
      cost_per_booking: totalBookings > 0 ? totalSpend / totalBookings : 0,
      previous_cost_per_booking: prevTotalBookings > 0 ? prevTotalSpend / prevTotalBookings : 0,
      booking_share: 0, // Would need total bookings to calculate this
      click_to_booking_rate: totalClicks > 0 ? (totalBookings / totalClicks * 100) : 0,
      spend_change: prevTotalSpend > 0 ? ((totalSpend - prevTotalSpend) / prevTotalSpend * 100) : 0,
      bookings_change: prevTotalBookings > 0 ? ((totalBookings - prevTotalBookings) / prevTotalBookings * 100) : 0
    };

    // Determine trend
    const trend = efficiency.bookings_change > 5 ? 'up' : 
                  efficiency.bookings_change < -5 ? 'down' : 'stable';

    return NextResponse.json({
      success: true,
      data: {
        correlation: Number(correlation.toFixed(4)),
        facebook_correlation: Number(facebookCorrelation.toFixed(4)),
        instagram_correlation: Number(instagramCorrelation.toFixed(4)),
        period: { startDate, endDate },
        spendData: correlationData.map(d => ({ date: d.date, spend: d.spend })),
        bookingData: correlationData.map(d => ({ 
          date: d.date, 
          bookings: d.bookings,
          facebook_bookings: d.facebook_bookings,
          instagram_bookings: d.instagram_bookings
        })),
        platform_analysis: {
          facebook: {
            total_bookings: totalFacebookBookings,
            correlation_strength: Number(facebookCorrelation.toFixed(4)),
            cost_per_booking: totalFacebookBookings > 0 ? totalSpend * 0.5 / totalFacebookBookings : 0, // Assuming 50/50 spend split
            booking_share: totalBookings > 0 ? (totalFacebookBookings / totalBookings * 100) : 0
          },
          instagram: {
            total_bookings: totalInstagramBookings,
            correlation_strength: Number(instagramCorrelation.toFixed(4)),
            cost_per_booking: totalInstagramBookings > 0 ? totalSpend * 0.5 / totalInstagramBookings : 0, // Assuming 50/50 spend split
            booking_share: totalBookings > 0 ? (totalInstagramBookings / totalBookings * 100) : 0
          }
        },
        efficiency: {
          ...efficiency,
          trend
        },
        summary: {
          total_spend: totalSpend,
          total_bookings: totalBookings,
          total_facebook_bookings: totalFacebookBookings,
          total_instagram_bookings: totalInstagramBookings,
          total_clicks: totalClicks,
          total_impressions: totalImpressions,
          average_cost_per_booking: totalBookings > 0 ? totalSpend / totalBookings : 0,
          average_click_to_booking_rate: totalClicks > 0 ? (totalBookings / totalClicks * 100) : 0
        },
        daily_data: correlationData
      }
    });

  } catch (error) {
    console.error('Meta Ads booking correlation error:', error);
    return NextResponse.json({
      error: "Failed to analyze Meta Ads booking correlation",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
  const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}