import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!search || search.length < 2) {
    return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
  }

  try {
    // Search bookings by customer name or phone number
    // Only search confirmed bookings from today onwards
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await refacSupabaseAdmin
      .from('bookings')
      .select(`
        id, name, email, phone_number, date, start_time, duration, bay, status, 
        number_of_people, customer_notes, booking_type, package_name,
        customers(customer_code, customer_name)
      `)
      .gte('date', today) // Only future bookings
      .eq('status', 'confirmed')
      .or(`name.ilike.%${search}%,phone_number.ilike.%${search}%`)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Error searching bookings:', error);
      return NextResponse.json({ error: 'Failed to search bookings', details: error.message }, { status: 500 });
    }

    // Transform to the expected format for POS modal
    const bookings = (data || []).map((booking: any) => ({
      id: booking.id,
      customerId: booking.customer_id,
      name: booking.name,
      email: booking.email,
      phoneNumber: booking.phone_number,
      date: booking.date,
      startTime: booking.start_time,
      duration: booking.duration,
      numberOfPeople: booking.number_of_people,
      status: booking.status,
      bay: booking.bay,
      bookingType: booking.booking_type,
      packageName: booking.package_name,
      customerNotes: booking.customer_notes,
      createdAt: new Date(booking.created_at),
      updatedAt: new Date(booking.updated_at)
    }));

    return NextResponse.json(bookings);

  } catch (error: any) {
    console.error('Unexpected error in GET /api/bookings:', error);
    return NextResponse.json({ error: 'An unexpected error occurred', details: error.message }, { status: 500 });
  }
}