import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { DateTime } from 'luxon';

/**
 * GET /api/bookings/unconfirmed
 *
 * Returns bookings that need phone confirmation:
 * - status = 'confirmed'
 * - phone_confirmed = false (or null)
 * - start_time >= now + 15 minutes (in Asia/Bangkok timezone)
 *
 * Query params:
 * - date: YYYY-MM-DD (optional, defaults to today in Bangkok timezone)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  // Use provided date or default to today in Bangkok timezone
  const bangkokNow = DateTime.now().setZone('Asia/Bangkok');
  const targetDate = dateParam || bangkokNow.toISODate();

  if (!targetDate || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    return NextResponse.json(
      { error: 'Invalid date format. Please use YYYY-MM-DD.' },
      { status: 400 }
    );
  }

  try {
    // Calculate cutoff time: now + 15 minutes (only for today's bookings)
    const isToday = targetDate === bangkokNow.toISODate();
    const cutoffTime = bangkokNow.plus({ minutes: 15 }).toFormat('HH:mm');

    // Build query for unconfirmed bookings
    let query = refacSupabaseAdmin
      .from('bookings')
      .select(`
        id, name, email, phone_number, date, start_time, duration, bay, status,
        number_of_people, customer_notes, booking_type, package_name,
        phone_confirmed, phone_confirmed_at, phone_confirmed_by,
        customer_id, customer_code,
        customers(customer_code, customer_name)
      `)
      .eq('date', targetDate)
      .eq('status', 'confirmed')
      .or('phone_confirmed.is.null,phone_confirmed.eq.false')
      .order('start_time', { ascending: true });

    // For today, only include bookings starting >= 15 minutes from now
    if (isToday) {
      query = query.gte('start_time', cutoffTime);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching unconfirmed bookings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch unconfirmed bookings', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match Booking type
    const bookings = (data || []).map((b: any) => ({
      id: b.id,
      name: b.name,
      user_id: '',
      email: b.email,
      phone_number: b.phone_number,
      date: b.date,
      start_time: b.start_time,
      duration: b.duration,
      number_of_people: b.number_of_people,
      status: b.status,
      bay: b.bay,
      customer_notes: b.customer_notes,
      booking_type: b.booking_type,
      package_name: b.package_name,
      phone_confirmed: b.phone_confirmed,
      phone_confirmed_at: b.phone_confirmed_at,
      phone_confirmed_by: b.phone_confirmed_by,
      customer_id: b.customer_id,
      customer_code: b.customers?.customer_code || b.customer_code || null,
      customer: b.customers ? {
        customer_code: b.customers.customer_code,
        customer_name: b.customers.customer_name,
        contact_number: null,
        email: null,
        address: null,
        date_of_birth: null,
        preferred_contact_method: null,
        total_lifetime_value: 0,
        total_visits: 0,
        last_visit_date: null,
      } : null,
    }));

    return NextResponse.json(
      {
        bookings,
        count: bookings.length,
        date: targetDate,
        cutoff_time: isToday ? cutoffTime : null
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (e: any) {
    console.error('Unexpected error in GET /api/bookings/unconfirmed:', e);
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: e.message },
      { status: 500 }
    );
  }
}
