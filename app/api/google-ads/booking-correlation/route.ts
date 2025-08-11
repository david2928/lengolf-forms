import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

interface CorrelationData {
  strength: number;
  period: { startDate: string; endDate: string };
  spendData: Array<{ date: string; spend: number }>;
  bookingData: Array<{ date: string; bookings: number }>;
  efficiency: {
    costPerBooking: number;
    previousCostPerBooking: number;
    change: number;
    bookingShare: number;
  };
  summary: {
    totalSpend: number;
    totalBookings: number;
    averageSpendPerDay: number;
    averageBookingsPerDay: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    // Default to 14-day periods for proper local business analysis
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    const startDate = searchParams.get('startDate') || new Date(new Date(endDate).getTime() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const analysisType = searchParams.get('analysisType') || '14-day'; // '14-day' or 'custom'

    // Get Google Ads spend data
    const { data: spendData, error: spendError } = await supabase
      .schema('marketing')
      .from('campaign_performance_summary')
      .select('date, cost_thb')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (spendError) {
      console.error('Error fetching spend data:', spendError);
      throw new Error('Failed to fetch spend data');
    }

    // Aggregate spend by date
    const spendByDate = new Map<string, number>();
    spendData?.forEach(row => {
      const date = row.date;
      const currentSpend = spendByDate.get(date) || 0;
      spendByDate.set(date, currentSpend + (row.cost_thb || 0));
    });

    // Get Google bookings data from referral analytics
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .select('date, referral_source')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('referral_source', 'Google')
      .eq('status', 'confirmed')
      .order('date', { ascending: true });

    if (bookingError) {
      console.error('Error fetching booking data:', bookingError);
      throw new Error('Failed to fetch booking data');
    }

    // Aggregate bookings by date
    const bookingsByDate = new Map<string, number>();
    bookingData?.forEach(row => {
      const date = row.date;
      const currentBookings = bookingsByDate.get(date) || 0;
      bookingsByDate.set(date, currentBookings + 1);
    });

    // Get total bookings for booking share calculation
    const { data: totalBookingsData } = await supabase
      .from('bookings')
      .select('date')
      .gte('date', startDate)
      .lte('date', endDate)
      .eq('status', 'confirmed');

    const totalBookingsByDate = new Map<string, number>();
    totalBookingsData?.forEach(row => {
      const date = row.date;
      const currentTotal = totalBookingsByDate.get(date) || 0;
      totalBookingsByDate.set(date, currentTotal + 1);
    });

    // Create aligned data arrays for correlation calculation
    const alignedData: Array<{ date: string; spend: number; bookings: number; totalBookings: number }> = [];
    
    // Get all unique dates
    const allDates = new Set([...Array.from(spendByDate.keys()), ...Array.from(bookingsByDate.keys())]);
    
    for (const date of Array.from(allDates).sort()) {
      alignedData.push({
        date,
        spend: spendByDate.get(date) || 0,
        bookings: bookingsByDate.get(date) || 0,
        totalBookings: totalBookingsByDate.get(date) || 0
      });
    }

    // Calculate correlation coefficient
    const correlation = calculateCorrelation(
      alignedData.map(d => d.spend),
      alignedData.map(d => d.bookings)
    );

    // Calculate efficiency metrics
    const totalSpend = alignedData.reduce((sum, d) => sum + d.spend, 0);
    const totalBookings = alignedData.reduce((sum, d) => sum + d.bookings, 0);
    const totalAllBookings = alignedData.reduce((sum, d) => sum + d.totalBookings, 0);
    
    const costPerBooking = totalBookings > 0 ? totalSpend / totalBookings : 0;
    const bookingShare = totalAllBookings > 0 ? (totalBookings / totalAllBookings) * 100 : 0;

    // Calculate previous period for comparison
    const periodLength = alignedData.length;
    const previousStartDate = new Date(new Date(startDate).getTime() - periodLength * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const previousEndDate = new Date(new Date(startDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get previous period data for comparison
    const { data: previousSpendData } = await supabase
      .schema('marketing')
      .from('campaign_performance_summary')
      .select('date, cost_thb')
      .gte('date', previousStartDate)
      .lte('date', previousEndDate);

    const { data: previousBookingData } = await supabase
      .from('bookings')
      .select('date')
      .gte('date', previousStartDate)
      .lte('date', previousEndDate)
      .eq('referral_source', 'Google')
      .eq('status', 'confirmed');

    const previousTotalSpend = previousSpendData?.reduce((sum, row) => sum + (row.cost_thb || 0), 0) || 0;
    const previousTotalBookings = previousBookingData?.length || 0;
    const previousCostPerBooking = previousTotalBookings > 0 ? previousTotalSpend / previousTotalBookings : 0;

    const costPerBookingChange = previousCostPerBooking > 0 
      ? ((costPerBooking - previousCostPerBooking) / previousCostPerBooking) * 100 
      : 0;

    const correlationData: CorrelationData = {
      strength: correlation,
      period: { startDate, endDate },
      spendData: alignedData.map(d => ({ date: d.date, spend: d.spend })),
      bookingData: alignedData.map(d => ({ date: d.date, bookings: d.bookings })),
      efficiency: {
        costPerBooking: Math.round(costPerBooking),
        previousCostPerBooking: Math.round(previousCostPerBooking),
        change: Math.round(costPerBookingChange * 10) / 10,
        bookingShare: Math.round(bookingShare * 10) / 10
      },
      summary: {
        totalSpend: Math.round(totalSpend),
        totalBookings,
        averageSpendPerDay: Math.round(totalSpend / periodLength),
        averageBookingsPerDay: Math.round((totalBookings / periodLength) * 10) / 10
      }
    };

    return NextResponse.json(correlationData);

  } catch (error) {
    console.error('Booking correlation error:', error);
    return NextResponse.json(
      { error: "Failed to calculate booking correlation" },
      { status: 500 }
    );
  }
}

// Calculate Pearson correlation coefficient
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;
  
  const n = x.length;
  const sumX = x.reduce((sum, val) => sum + val, 0);
  const sumY = y.reduce((sum, val) => sum + val, 0);
  const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
  const sumXX = x.reduce((sum, val) => sum + val * val, 0);
  const sumYY = y.reduce((sum, val) => sum + val * val, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
  
  if (denominator === 0) return 0;
  
  const correlation = numerator / denominator;
  
  // Return rounded to 4 decimal places
  return Math.round(correlation * 10000) / 10000;
}