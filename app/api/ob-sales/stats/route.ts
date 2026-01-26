import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET() {
  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Calculate 7 days ago for trailing average
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // 1. Get OB calls count (from ob_sales_notes table)
    // Today's calls
    const { count: todayCalls, error: todayCallsError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('*', { count: 'exact', head: true })
      .gte('call_date', todayStr)
      .lt('call_date', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (todayCallsError) {
      console.error('Error fetching today calls:', todayCallsError);
    }

    // Last 7 days calls (for average)
    const { count: weekCalls, error: weekCallsError } = await refacSupabaseAdmin
      .schema('marketing')
      .from('ob_sales_notes')
      .select('*', { count: 'exact', head: true })
      .gte('call_date', sevenDaysAgoStr)
      .lt('call_date', todayStr);

    if (weekCallsError) {
      console.error('Error fetching week calls:', weekCallsError);
    }

    // 2. Get OB Sales bookings (bookings with referral_source = 'OB Sales')
    // Today's bookings
    const { count: todayBookings, error: todayBookingsError } = await refacSupabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('referral_source', 'OB Sales')
      .gte('created_at', `${todayStr}T00:00:00`)
      .lt('created_at', `${todayStr}T23:59:59`);

    if (todayBookingsError) {
      console.error('Error fetching today bookings:', todayBookingsError);
    }

    // Last 7 days bookings (for average)
    const { count: weekBookings, error: weekBookingsError } = await refacSupabaseAdmin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('referral_source', 'OB Sales')
      .gte('created_at', `${sevenDaysAgoStr}T00:00:00`)
      .lt('created_at', `${todayStr}T00:00:00`);

    if (weekBookingsError) {
      console.error('Error fetching week bookings:', weekBookingsError);
    }

    // 3. Get sales value from OB Sales bookings
    // We need to calculate based on duration and bay rate
    // Standard bay rate is approximately 700 THB/hour (excluding VAT)
    const BAY_RATE_PER_HOUR = 700; // THB excluding VAT

    // Today's sales - get booking durations
    const { data: todaySalesData, error: todaySalesError } = await refacSupabaseAdmin
      .from('bookings')
      .select('duration')
      .eq('referral_source', 'OB Sales')
      .eq('status', 'confirmed')
      .gte('created_at', `${todayStr}T00:00:00`)
      .lt('created_at', `${todayStr}T23:59:59`);

    if (todaySalesError) {
      console.error('Error fetching today sales:', todaySalesError);
    }

    const todaySalesValue = (todaySalesData || []).reduce((sum: number, booking: { duration: number | null }) => {
      return sum + (booking.duration || 0) * BAY_RATE_PER_HOUR;
    }, 0);

    // Last 7 days sales
    const { data: weekSalesData, error: weekSalesError } = await refacSupabaseAdmin
      .from('bookings')
      .select('duration')
      .eq('referral_source', 'OB Sales')
      .eq('status', 'confirmed')
      .gte('created_at', `${sevenDaysAgoStr}T00:00:00`)
      .lt('created_at', `${todayStr}T00:00:00`);

    if (weekSalesError) {
      console.error('Error fetching week sales:', weekSalesError);
    }

    const weekSalesValue = (weekSalesData || []).reduce((sum: number, booking: { duration: number | null }) => {
      return sum + (booking.duration || 0) * BAY_RATE_PER_HOUR;
    }, 0);

    // Calculate 7-day daily averages
    const weekCallsAvg = Math.round(((weekCalls || 0) / 7) * 10) / 10;
    const weekBookingsAvg = Math.round(((weekBookings || 0) / 7) * 10) / 10;
    const weekSalesAvg = Math.round((weekSalesValue / 7) * 100) / 100;

    return NextResponse.json({
      success: true,
      stats: {
        calls: {
          today: todayCalls || 0,
          weekAvg: weekCallsAvg,
        },
        bookings: {
          today: todayBookings || 0,
          weekAvg: weekBookingsAvg,
        },
        sales: {
          today: todaySalesValue,
          weekAvg: weekSalesAvg,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching OB sales stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch OB sales stats' },
      { status: 500 }
    );
  }
}
