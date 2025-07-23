import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import type { OpenTableRequest, OpenTableResponse, TableSession } from '@/types/pos';

export async function POST(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tableId } = params;
    const body: OpenTableRequest = await request.json();
    const { bookingId, staffPin, paxCount, notes } = body;

    // Validate required fields
    if (!staffPin) {
      return NextResponse.json({ error: "Staff PIN is required" }, { status: 400 });
    }

    // Validate table exists and is available
    const { data: table, error: tableError } = await supabase
      .schema('pos')
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .eq('is_active', true)
      .single();

    if (tableError || !table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Check if table is already occupied
    const { data: existingSession, error: sessionCheckError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('table_id', tableId)
      .is('session_end', null)
      .maybeSingle();

    if (sessionCheckError) {
      console.error('Error checking existing session:', sessionCheckError);
      return NextResponse.json({ error: "Failed to check table status" }, { status: 500 });
    }

    if (existingSession && existingSession.status === 'occupied') {
      return NextResponse.json({ error: "Table is already occupied" }, { status: 409 });
    }

    // Validate booking if provided
    let booking = null;
    let defaultPaxCount = 1;
    
    if (bookingId) {
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError) {
        console.error('Error fetching booking:', bookingError);
        return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
      }

      booking = bookingData;
      defaultPaxCount = booking.number_of_people || 1;
    }

    // Validate staff PIN (optional - could integrate with staff system)
    // For now, we'll just validate that it's provided

    // Determine final pax count
    const finalPaxCount = paxCount || defaultPaxCount;

    // Validate pax count doesn't exceed table capacity
    if (finalPaxCount > table.max_pax) {
      return NextResponse.json(
        { error: `Pax count (${finalPaxCount}) exceeds table capacity (${table.max_pax})` },
        { status: 400 }
      );
    }

    // Create new table session
    const sessionData = {
      table_id: tableId,
      status: 'occupied',
      pax_count: finalPaxCount,
      booking_id: bookingId || null,
      staff_pin: staffPin,
      session_start: new Date().toISOString(),
      session_end: null,
      total_amount: 0,
      notes: notes || null
    };

    const { data: newSession, error: createError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .insert(sessionData)
      .select(`
        *,
        orders:table_orders(*)
      `)
      .single();

    if (createError) {
      console.error('Error creating table session:', createError);
      return NextResponse.json({ error: "Failed to open table" }, { status: 500 });
    }

    // Fetch booking data separately if booking_id exists
    let bookingData = null;
    if (newSession.booking_id) {
      const { data: fetchedBooking, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', newSession.booking_id)
        .single();
      
      if (!bookingFetchError && fetchedBooking) {
        bookingData = fetchedBooking;
      }
    }

    // Transform to TypeScript interface
    const tableSession: TableSession = {
      id: newSession.id,
      tableId: newSession.table_id,
      status: newSession.status,
      paxCount: newSession.pax_count,
      bookingId: newSession.booking_id,
      staffPin: newSession.staff_pin,
      sessionStart: newSession.session_start ? new Date(newSession.session_start) : undefined,
      sessionEnd: newSession.session_end ? new Date(newSession.session_end) : undefined,
      totalAmount: parseFloat(newSession.total_amount || '0'),
      notes: newSession.notes,
      createdAt: new Date(newSession.created_at),
      updatedAt: new Date(newSession.updated_at),
      orders: [],
      booking: bookingData ? {
        id: bookingData.id,
        name: bookingData.name,
        email: bookingData.email,
        phoneNumber: bookingData.phone_number,
        numberOfPeople: bookingData.number_of_people,
        bookingType: bookingData.booking_type,
        bay: bookingData.bay,
        customerNotes: bookingData.customer_notes,
        // Required fields for type compatibility
        date: bookingData.date || '',
        startTime: bookingData.start_time || '',
        duration: bookingData.duration || 0,
        status: bookingData.status || '',
        createdAt: new Date(bookingData.created_at),
        updatedAt: new Date(bookingData.updated_at)
      } : undefined
    };

    const response: OpenTableResponse = {
      success: true,
      session: tableSession,
      message: `Table ${table.display_name} opened successfully`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in POST /api/pos/tables/[tableId]/open:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}