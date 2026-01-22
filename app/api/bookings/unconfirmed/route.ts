import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { DateTime } from 'luxon';

/**
 * GET /api/bookings/unconfirmed
 *
 * Returns bookings that need phone confirmation:
 * - status = 'confirmed'
 * - phone_confirmed = false (or null)
 * - For today: start_time >= now + 15 minutes
 * - For coaching: also includes next day's early bookings (before 14:00)
 *
 * Only includes:
 * - New customers (is_new_customer = true)
 * - Coaching bookings (booking_type contains 'coaching')
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
    const nextDay = DateTime.fromISO(targetDate).plus({ days: 1 }).toISODate();

    // Build query for unconfirmed bookings for target date
    let query = refacSupabaseAdmin
      .from('bookings')
      .select(`
        id, name, email, phone_number, date, start_time, duration, bay, status,
        number_of_people, customer_notes, booking_type, package_name,
        phone_confirmed, phone_confirmed_at, phone_confirmed_by,
        customer_id, is_new_customer, created_at, customer_contacted_via,
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

    // Also fetch next day's early coaching bookings (before 14:00)
    const { data: nextDayData, error: nextDayError } = await refacSupabaseAdmin
      .from('bookings')
      .select(`
        id, name, email, phone_number, date, start_time, duration, bay, status,
        number_of_people, customer_notes, booking_type, package_name,
        phone_confirmed, phone_confirmed_at, phone_confirmed_by,
        customer_id, is_new_customer, created_at, customer_contacted_via,
        customers(customer_code, customer_name)
      `)
      .eq('date', nextDay)
      .eq('status', 'confirmed')
      .or('phone_confirmed.is.null,phone_confirmed.eq.false')
      .lt('start_time', '14:00')
      .order('start_time', { ascending: true });

    if (nextDayError) {
      console.error('Error fetching next day bookings:', nextDayError);
      // Continue with today's data only
    }

    // Combine today's and next day's data
    const allData = [...(data || []), ...(nextDayData || [])];

    // Filter bookings based on rules:
    // TODAY:
    //   - ResOS bookings → always include
    //   - New customer bookings → only if created before today
    //   - Coaching bookings → only if after 14:00
    // TOMORROW:
    //   - Coaching bookings before 14:00 → include
    const filteredData = allData.filter((b: any) => {
      const isNewCustomer = b.is_new_customer === true;
      const isCoaching = b.booking_type?.toLowerCase().includes('coaching') || false;
      const isResOS = b.customer_contacted_via === 'ResOS';
      const bookingTime = b.start_time; // HH:mm format

      // Check if booking was created on the same day as the booking date
      const createdDate = b.created_at
        ? DateTime.fromISO(b.created_at).setZone('Asia/Bangkok').toISODate()
        : null;
      const isCreatedSameDay = createdDate === b.date;

      // Tomorrow's bookings: only coaching before 14:00
      if (b.date === nextDay) {
        return isCoaching; // Already filtered to < 14:00 in query
      }

      // Today's bookings:
      // ResOS → always include
      if (isResOS) {
        return true;
      }

      // Coaching → only after 14:00
      if (isCoaching) {
        return bookingTime >= '14:00';
      }

      // New customer → only if NOT created same day
      if (isNewCustomer) {
        return !isCreatedSameDay;
      }

      return false;
    });

    // Transform data to match Booking type
    const bookings = filteredData.map((b: any) => ({
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
      customer_contacted_via: b.customer_contacted_via,
      customer_code: b.customers?.customer_code || null,
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
