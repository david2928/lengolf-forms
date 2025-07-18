import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase'; // Corrected import path
import { Booking } from '@/types/booking';

// Define a type for the data selected from Supabase
interface FetchedBookingData {
  id: string;
  name: string;
  email: string;
  phone_number: string;
  date: string;
  start_time: string;
  duration: number;
  bay: string | null;
  status: 'confirmed' | 'cancelled';
  number_of_people: number;
  customer_notes: string | null;
  booking_type: string | null;
  package_name: string | null;
  google_calendar_sync_status?: string | null; // Added field
  package_id?: string | null; // Package ID for foreign key
  referral_source?: string | null; // Where customer heard about us
  is_new_customer?: boolean; // Auto-detected via trigger
  customer_id?: string | null; // Customer ID
  customers?: {
    customer_code: string;
    customer_name: string;
  } | null; // Customer information from join
  // Add other fields that are selected if they are directly used before mapping to Booking
}

export async function GET(request: NextRequest) {
  // const supabase = createClient(); // refacSupabaseAdmin is already an initialized client
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) {
    return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date format. Please use YYYY-MM-DD.' }, { status: 400 });
  }

  try {
    const { data, error } = await refacSupabaseAdmin
      .from('bookings')
      .select(`
        id, name, email, phone_number, date, start_time, duration, bay, status, 
        number_of_people, customer_notes, booking_type, package_name, 
        google_calendar_sync_status, package_id, referral_source, is_new_customer,
        customer_id,
        customers(customer_code, customer_name)
      `)
      .eq('date', date)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings', details: error.message }, { status: 500 });
    }

    // Convert database results to Booking objects
    const bookings: Booking[] = (data as any[] || []).map((b: any) => ({
      id: b.id,
      name: b.name, // customer name
      user_id: '', // Placeholder - not needed for calendar view
      email: b.email,
      phone_number: b.phone_number,
      date: b.date,
      start_time: b.start_time,
      duration: b.duration, // Duration in hours
      number_of_people: b.number_of_people,
      status: b.status,
      bay: b.bay,
      customer_notes: b.customer_notes,
      booking_type: b.booking_type,
      package_name: b.package_name,
      google_calendar_sync_status: b.google_calendar_sync_status,
      package_id: b.package_id,
      referral_source: b.referral_source,
      is_new_customer: b.is_new_customer,
      customer_id: b.customer_id,
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
      // Optional fields not needed for calendar display
      created_at: undefined,
      updated_at: undefined,
      updated_by_type: undefined,
      updated_by_identifier: undefined,
      cancelled_by_type: undefined,
      cancelled_by_identifier: undefined,
      cancellation_reason: undefined,
      calendar_event_id: undefined,
      calendar_events: undefined,
    }));

    return NextResponse.json({ bookings });

  } catch (e: any) {
    console.error('Unexpected error in GET /api/bookings/list-by-date:', e);
    return NextResponse.json({ error: 'An unexpected error occurred', details: e.message }, { status: 500 });
  }
} 