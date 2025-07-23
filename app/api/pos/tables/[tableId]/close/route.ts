import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { paymentCompleter } from '@/services/PaymentCompleter';
import type { CloseTableRequest, CloseTableResponse, TableSession } from '@/types/pos';

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
    const body: CloseTableRequest = await request.json();
    const { reason, finalAmount, forceClose } = body;

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
    const { data: currentSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select(`
        *,
        orders:table_orders(*)
      `)
      .eq('table_id', tableId)
      .is('session_end', null)
      .single();

    if (sessionError || !currentSession) {
      return NextResponse.json({ error: "No active session found for this table" }, { status: 404 });
    }

    if (currentSession.status !== 'occupied') {
      return NextResponse.json({ error: "Table is not currently occupied" }, { status: 400 });
    }

    // Check payment status before allowing closure (unless forceClose is true for cancellations)
    const paymentStatus = await paymentCompleter.getPaymentStatus(currentSession.id);
    
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

    // Use payment completer to close the session properly
    const staffPin = body.staffPin || session.user.email?.split('@')[0] || 'unknown';
    const success = await paymentCompleter.closeTableSession(
      currentSession.id,
      staffPin,
      reason || 'Manual closure',
      forceClose // Pass the forceClose flag to allow closing with unpaid orders
    );

    if (!success) {
      return NextResponse.json({ error: "Failed to close table session" }, { status: 500 });
    }

    // Get the updated session data
    const { data: closedSession, error: fetchError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select(`
        *,
        orders:table_orders(*)
      `)
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
      status: 'free', // Table is now free
      paxCount: 0, // Reset pax count
      bookingId: closedSession.booking_id,
      staffPin: closedSession.staff_pin,
      sessionStart: closedSession.session_start ? new Date(closedSession.session_start) : undefined,
      sessionEnd: closedSession.session_end ? new Date(closedSession.session_end) : undefined,
      totalAmount: parseFloat(closedSession.total_amount || '0'),
      notes: closedSession.notes,
      createdAt: new Date(closedSession.created_at),
      updatedAt: new Date(closedSession.updated_at),
      orders: closedSession.orders?.map((order: any) => ({
        id: order.id,
        tableSessionId: order.table_session_id,
        orderId: order.order_id,
        orderNumber: order.order_number,
        orderTotal: parseFloat(order.order_total),
        orderStatus: order.order_status,
        createdAt: new Date(order.created_at)
      })) || [],
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