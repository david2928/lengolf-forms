import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface CalendarCreative {
  creative_id: string;
  creative_name: string;
  creative_type: string;
  thumbnail_url?: string;
  spend: number;
  impressions: number;
  clicks: number;
  bookings: number;
}

interface CalendarDayData {
  creatives: CalendarCreative[];
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_bookings: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    console.log('Meta Ads Calendar API - Date range:', {
      startDate,
      endDate
    });

    // Get creative performance data by date using direct query with join
    const { data: creativePerformance, error: creativeError } = await supabase
      .schema('marketing')
      .from('meta_ads_creative_performance')
      .select(`
        date,
        creative_id,
        impressions,
        clicks,
        spend_cents
      `)
      .gte('date', startDate)
      .lte('date', endDate)
      .gt('impressions', 0);

    // Get creative details separately
    const { data: creativeDetails, error: creativeDetailsError } = await supabase
      .schema('marketing')
      .from('meta_ads_ad_creatives')
      .select('creative_id, creative_name, creative_type, thumbnail_url');

    if (creativeError) {
      console.error('Creative performance calendar query error:', creativeError);
    }
    
    if (creativeDetailsError) {
      console.error('Creative details query error:', creativeDetailsError);
    }

    // Create lookup map for creative details
    const creativeDetailsMap = new Map();
    creativeDetails?.forEach(creative => {
      creativeDetailsMap.set(creative.creative_id, creative);
    });

    // Get Meta bookings by date for booking attribution
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('date')
      .in('referral_source', ['Facebook', 'Instagram'])
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('Meta bookings calendar query error:', bookingsError);
    }

    // Group bookings by date
    const bookingsByDate: { [date: string]: number } = {};
    bookingsData?.forEach(booking => {
      const date = booking.date;
      bookingsByDate[date] = (bookingsByDate[date] || 0) + 1;
    });

    // Process data into calendar format
    const calendarData: { [date: string]: CalendarDayData } = {};
    
    // Calculate total spend for booking attribution
    const totalSpend = creativePerformance?.reduce((sum, row) => 
      sum + (Number(row.spend_cents) / 100), 0) || 0;

    creativePerformance?.forEach((row: any) => {
      const date = row.date;
      const spend = Number(row.spend_cents) / 100 || 0;
      const impressions = Number(row.impressions) || 0;
      const clicks = Number(row.clicks) || 0;
      
      // Estimate bookings based on spend proportion for this creative on this date
      const spendProportion = totalSpend > 0 ? spend / totalSpend : 0;
      const totalBookingsOnDate = bookingsByDate[date] || 0;
      const estimatedBookings = Math.round(totalBookingsOnDate * spendProportion);

      if (!calendarData[date]) {
        calendarData[date] = {
          creatives: [],
          total_spend: 0,
          total_impressions: 0,
          total_clicks: 0,
          total_bookings: 0
        };
      }

      // Get creative details from lookup map
      const creativeInfo = creativeDetailsMap.get(row.creative_id);
      
      // Add creative to this date
      const creative: CalendarCreative = {
        creative_id: row.creative_id,
        creative_name: creativeInfo?.creative_name || `Creative ${row.creative_id.slice(-4)}`,
        creative_type: creativeInfo?.creative_type || 'UNKNOWN',
        thumbnail_url: creativeInfo?.thumbnail_url,
        spend,
        impressions,
        clicks,
        bookings: estimatedBookings
      };

      calendarData[date].creatives.push(creative);
      calendarData[date].total_spend += spend;
      calendarData[date].total_impressions += impressions;
      calendarData[date].total_clicks += clicks;
      calendarData[date].total_bookings += estimatedBookings;
    });

    // Sort creatives within each date by spend (descending)
    Object.values(calendarData).forEach(dayData => {
      dayData.creatives.sort((a, b) => b.spend - a.spend);
    });

    console.log('Meta Ads Calendar processed:', {
      totalDates: Object.keys(calendarData).length,
      totalCreatives: Object.values(calendarData).reduce((sum, day) => sum + day.creatives.length, 0),
      totalSpend: Object.values(calendarData).reduce((sum, day) => sum + day.total_spend, 0),
      totalBookings: Object.values(calendarData).reduce((sum, day) => sum + day.total_bookings, 0),
      dateRange: { startDate, endDate }
    });

    return NextResponse.json(calendarData);

  } catch (error) {
    console.error('Meta Ads calendar API error:', error);
    return NextResponse.json(
      { error: "Failed to fetch Meta Ads calendar data" },
      { status: 500 }
    );
  }
}