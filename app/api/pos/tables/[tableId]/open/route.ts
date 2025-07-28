import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { getStaffIdFromPin, getCustomerIdFromBooking } from '@/lib/staff-helpers';
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
    const { bookingId, staffPin, staffId, paxCount, notes } = body;

    // Validate required fields - either staffId (preferred) or staffPin (legacy)
    if (!staffId && !staffPin) {
      return NextResponse.json({ error: "Staff ID or PIN is required" }, { status: 400 });
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
    console.log(`🔍 Checking if table ${tableId} is occupied...`);
    const { data: existingSessions, error: sessionCheckError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('table_id', tableId)
      .eq('status', 'occupied')
      .is('session_end', null);

    if (sessionCheckError) {
      console.error('Error checking existing session:', sessionCheckError);
      return NextResponse.json({ error: "Failed to check table status" }, { status: 500 });
    }

    console.log(`🔍 Found ${existingSessions?.length || 0} existing sessions for table ${tableId}`);

    // If there are any open sessions, table is occupied
    if (existingSessions && existingSessions.length > 0) {
      // In development, allow more aggressive cleanup of orphaned sessions
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Found ${existingSessions.length} existing sessions for table ${tableId}, checking for cleanup...`);
        
        // Check if sessions are truly orphaned (older than 1 hour with no recent activity)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const orphanedSessions = existingSessions.filter((session: TableSession) => 
          session.updatedAt < oneHourAgo && session.totalAmount === 0
        );
        
        if (orphanedSessions.length > 0) {
          console.log(`Cleaning up ${orphanedSessions.length} orphaned sessions...`);
          for (const session of orphanedSessions as any[]) {
            await supabase
              .schema('pos')
              .from('table_sessions')
              .update({ 
                status: 'closed', 
                session_end: new Date().toISOString(),
                notes: 'Auto-closed orphaned session (no activity, no orders)'
              })
              .eq('id', session.id);
          }
          
          // Refresh the sessions check
          const { data: refreshedSessions } = await supabase
            .schema('pos')
            .from('table_sessions')
            .select('*')
            .eq('table_id', tableId)
            .eq('status', 'occupied')
            .is('session_end', null);
            
          if (!refreshedSessions || refreshedSessions.length === 0) {
            // Table is now available after cleanup
            console.log('Table is now available after cleanup');
          } else {
            return NextResponse.json({ error: "Table is already occupied" }, { status: 409 });
          }
        } else {
          return NextResponse.json({ error: "Table is already occupied" }, { status: 409 });
        }
      } else {
        return NextResponse.json({ error: "Table is already occupied" }, { status: 409 });
      }
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

    // Resolve staff_id - use provided staffId or resolve from PIN
    console.log(`🔍 Resolving staff ID for staffId: ${staffId}, staffPin: ${staffPin}`);
    let resolvedStaffId: number | undefined = staffId;
    if (!resolvedStaffId && staffPin) {
      const staffIdFromPin = await getStaffIdFromPin(staffPin);
      console.log(`🔍 Staff ID from PIN ${staffPin}: ${staffIdFromPin}`);
      if (!staffIdFromPin) {
        console.log(`❌ Invalid staff PIN: ${staffPin}`);
        return NextResponse.json({ error: "Invalid staff PIN or inactive staff" }, { status: 400 });
      }
      resolvedStaffId = staffIdFromPin;
    }
    
    // Validate staff exists and is active
    const { data: staff, error: staffError } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, is_active')
      .eq('id', resolvedStaffId)
      .eq('is_active', true)
      .single();
    
    if (staffError || !staff) {
      return NextResponse.json({ error: "Invalid or inactive staff" }, { status: 400 });
    }

    // Resolve customer_id from booking if provided
    let customerId: string | null = null;
    if (bookingId) {
      customerId = await getCustomerIdFromBooking(bookingId);
    }

    // Determine final pax count
    const finalPaxCount = paxCount || defaultPaxCount;

    // Validate pax count doesn't exceed table capacity
    if (finalPaxCount > table.max_pax) {
      return NextResponse.json(
        { error: `Pax count (${finalPaxCount}) exceeds table capacity (${table.max_pax})` },
        { status: 400 }
      );
    }

    // Create new table session with normalized foreign keys
    const sessionData = {
      table_id: tableId,
      status: 'occupied',
      pax_count: finalPaxCount,
      booking_id: bookingId || null,
      staff_id: resolvedStaffId,
      customer_id: customerId,
      session_start: new Date().toISOString(),
      session_end: null,
      total_amount: 0,
      notes: notes || null
    };

    const { data: newSession, error: createError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .insert(sessionData)
      .select('*')
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
      staffPin: staffPin || undefined,
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