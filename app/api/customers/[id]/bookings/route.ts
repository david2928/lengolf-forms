/**
 * Customer Bookings API
 * Fetches booking history for a specific customer
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const customerId = id;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'upcoming', 'past', or null for all
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = refacSupabaseAdmin
      .from('bookings')
      .select(`
        id,
        date,
        start_time,
        booking_type,
        status,
        package_id,
        package_name,
        bay,
        duration,
        number_of_people,
        created_at
      `, { count: 'exact' })
      .eq('customer_id', customerId)
      .order('date', { ascending: false })
      .order('start_time', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter
    const today = new Date().toISOString().split('T')[0];
    if (status === 'upcoming') {
      query = query.gte('date', today);
    } else if (status === 'past') {
      query = query.lt('date', today);
    }

    const { data: bookings, error, count } = await query;

    if (error) throw error;

    // Format bookings
    const formattedBookings = (bookings || []).map((booking: any) => ({
      id: booking.id,
      date: booking.date,
      time: booking.start_time,
      type: booking.booking_type || 'Golf',
      status: booking.status || 'confirmed',
      package_used: booking.package_name || null,
      bay: booking.bay,
      duration: booking.duration,
      number_of_people: booking.number_of_people,
      created_at: booking.created_at,
      is_upcoming: booking.date >= today
    }));

    // Calculate summary
    const upcomingBookings = formattedBookings.filter((b: any) => b.is_upcoming).length;
    const pastBookings = formattedBookings.filter((b: any) => !b.is_upcoming).length;
    const confirmedBookings = formattedBookings.filter((b: any) => b.status === 'confirmed').length;
    const cancelledBookings = formattedBookings.filter((b: any) => b.status === 'cancelled').length;

    return NextResponse.json({
      bookings: formattedBookings,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      },
      summary: {
        total: count || 0,
        upcoming: upcomingBookings,
        past: pastBookings,
        confirmed: confirmedBookings,
        cancelled: cancelledBookings
      }
    });

  } catch (error: any) {
    console.error('Error fetching customer bookings:', error);
    return NextResponse.json(
      { error: "Failed to fetch bookings", details: error.message },
      { status: 500 }
    );
  }
}