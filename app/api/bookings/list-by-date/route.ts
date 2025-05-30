import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase'; // Corrected import path
import { Booking } from '@/types/booking';

// Define a type for the data selected from Supabase
interface FetchedBookingData {
  id: string;
  name: string;
  date: string;
  start_time: string;
  duration: number;
  bay: string | null;
  status: 'confirmed' | 'cancelled';
  number_of_people: number;
  customer_notes: string | null;
  google_calendar_sync_status?: string | null; // Added field
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
      .select('id, name, date, start_time, duration, bay, status, number_of_people, customer_notes, google_calendar_sync_status') // Added field to select
      .eq('date', date)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings', details: error.message }, { status: 500 });
    }

    // Explicitly type `b` or ensure `data` is typed correctly from the Supabase call.
    // If `data` is `any[]`, then `b` would be `any`.
    const bookings: Booking[] = (data as FetchedBookingData[] || []).map((b: FetchedBookingData) => ({
      id: b.id,
      name: b.name, // customer name
      user_id: '', // Placeholder - decide if needed for this view
      email: '', // Placeholder
      phone_number: '', // Placeholder
      date: b.date,
      start_time: b.start_time,
      duration: b.duration, // Duration in hours
      // Calculate end_time based on start_time and duration for example (if not directly available)
      // This logic would need to be more robust if times cross midnight or for different duration units
      // For simplicity, not adding end_time calculation here yet, but it would be needed if Booking type strictly requires it and it's not in DB
      number_of_people: b.number_of_people,
      status: b.status,
      bay: b.bay,
      customer_notes: b.customer_notes,
      // Ensure all other required fields by Booking type are present
      // Defaulting them if not fetched and not essential for this specific list display
      created_at: undefined, // Or fetch if needed
      updated_at: undefined,
      updated_by_type: undefined,
      updated_by_identifier: undefined,
      cancelled_by_type: undefined,
      cancelled_by_identifier: undefined,
      cancellation_reason: undefined,
      google_calendar_sync_status: b.google_calendar_sync_status, // Mapped field
      calendar_event_id: undefined,
      calendar_events: undefined,
    }));

    return NextResponse.json({ bookings });

  } catch (e: any) {
    console.error('Unexpected error in GET /api/bookings/list-by-date:', e);
    return NextResponse.json({ error: 'An unexpected error occurred', details: e.message }, { status: 500 });
  }
} 