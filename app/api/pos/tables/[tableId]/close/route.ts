import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { transactionQueryService } from '@/services/TransactionQueryService';
import { tableSessionService } from '@/services/TableSessionService';
import { getStaffIdFromPin } from '@/lib/staff-helpers';
import type { CloseTableRequest, CloseTableResponse, TableSession } from '@/types/pos';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const { tableId } = await params;
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body: CloseTableRequest = await request.json();
    const { reason, finalAmount, forceClose, staffPin } = body;

    // Validate required fields
    if (!staffPin) {
      return NextResponse.json({ error: "Staff PIN is required" }, { status: 400 });
    }

    // Validate staff PIN
    const staffId = await getStaffIdFromPin(staffPin);
    if (!staffId) {
      return NextResponse.json({ error: "Invalid staff PIN or inactive staff" }, { status: 400 });
    }

    // Validate table exists
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

    // Get current active session
    console.log(`🔍 Looking for active session for table: ${tableId}`);
    const { data: currentSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('table_id', tableId)
      .is('session_end', null)
      .single();

    if (sessionError || !currentSession) {
      console.log(`❌ No active session found for table ${tableId}:`, sessionError);
      
      // In development, let's check what sessions exist for this table
      if (process.env.NODE_ENV === 'development') {
        const { data: allSessions, error: allSessionsError } = await supabase
          .schema('pos')
          .from('table_sessions')
          .select('id, status, session_start, session_end, table_id')
          .eq('table_id', tableId)
          .order('created_at', { ascending: false })
          .limit(5);
          
        console.log(`🔍 All recent sessions for table ${tableId}:`, allSessions);
      }
      
      return NextResponse.json({ error: "No active session found for this table" }, { status: 404 });
    }

    if (currentSession.status !== 'occupied') {
      return NextResponse.json({ error: "Table is not currently occupied" }, { status: 400 });
    }

    // Check payment status before allowing closure (unless forceClose is true for cancellations)
    const paymentStatus = await transactionQueryService.getPaymentStatus(currentSession.id);
    
    if (!forceClose && paymentStatus.hasPendingPayments) {
      return NextResponse.json({ 
        error: "Cannot close table with unpaid orders",
        details: {
          totalUnpaid: paymentStatus.totalUnpaid,
          totalPaid: paymentStatus.totalPaid,
          transactions: paymentStatus.transactions.length
        }
      }, { status: 400 });
    }
    
    // Log if we're force closing with unpaid orders
    if (forceClose && paymentStatus.hasPendingPayments) {
      console.log(`🔍 Force closing table ${tableId} with unpaid orders. Unpaid: ฿${paymentStatus.totalUnpaid}`);
    }

    // Use appropriate service based on whether this is payment completion or cancellation
    let closeResult;
    if (forceClose) {
      // This is a cancellation - use TableSessionService
      closeResult = await tableSessionService.cancelSession(
        currentSession.id,
        staffPin,
        reason || 'Manual cancellation'
      );
    } else {
      // This is payment completion - use PaymentCompleter
      closeResult = await tableSessionService.completeSessionWithPayment(
        currentSession.id,
        staffPin,
        reason || 'Payment completed'
      );
    }

    if (!closeResult.success) {
      return NextResponse.json({ 
        error: closeResult.message,
        details: closeResult.errors 
      }, { status: 500 });
    }

    // Get the updated session data
    const { data: closedSession, error: fetchError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('id', currentSession.id)
      .single();

    if (fetchError) {
      console.error('Error fetching closed session:', fetchError);
      return NextResponse.json({ error: "Session closed but failed to fetch updated data" }, { status: 500 });
    }

    // Transform to TypeScript interface
    const tableSession: TableSession = {
      id: closedSession.id,
      tableId: closedSession.table_id,
      status: closedSession.status, // Use actual status (paid or closed)
      paxCount: 0, // Reset pax count
      bookingId: closedSession.booking_id,
      staffId: closedSession.staff_pin,
      sessionStart: closedSession.session_start ? new Date(closedSession.session_start) : undefined,
      sessionEnd: closedSession.session_end ? new Date(closedSession.session_end) : undefined,
      totalAmount: parseFloat(closedSession.total_amount || '0'),
      notes: closedSession.notes,
      createdAt: new Date(closedSession.created_at),
      updatedAt: new Date(closedSession.updated_at),
      orders: [],
      booking: closedSession.booking ? {
        id: closedSession.booking.id,
        name: closedSession.booking.name,
        email: closedSession.booking.email,
        phoneNumber: closedSession.booking.phone_number,
        numberOfPeople: closedSession.booking.number_of_people,
        bookingType: closedSession.booking.booking_type,
        bay: closedSession.booking.bay,
        customerNotes: closedSession.booking.customer_notes,
        // Required fields for type compatibility
        date: '',
        startTime: '',
        duration: 0,
        status: '',
        createdAt: new Date(),
        updatedAt: new Date()
      } : undefined
    };

    const response: CloseTableResponse = {
      success: true,
      closedSession: tableSession,
      message: `Table ${table.display_name} closed successfully. Total paid: ฿${paymentStatus.totalPaid.toFixed(2)}`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in POST /api/pos/tables/[tableId]/close:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}