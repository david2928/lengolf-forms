import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { getStaffIdFromPin } from '@/lib/staff-helpers';
import type { TransferTableRequest, TransferTableResponse, TableSession } from '@/types/pos';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TransferTableRequest = await request.json();
    const { fromTableId, toTableId, staffPin, orderIds, transferAll = true } = body;

    // Validate required fields
    if (!fromTableId || !toTableId) {
      return NextResponse.json({ error: "Both fromTableId and toTableId are required" }, { status: 400 });
    }

    if (!staffPin) {
      return NextResponse.json({ error: "Staff PIN is required" }, { status: 400 });
    }

    if (fromTableId === toTableId) {
      return NextResponse.json({ error: "Cannot transfer to the same table" }, { status: 400 });
    }

    // Validate staff PIN
    const staffId = await getStaffIdFromPin(staffPin);
    if (!staffId) {
      return NextResponse.json({ error: "Invalid staff PIN or inactive staff" }, { status: 400 });
    }

    // Validate both tables exist
    const { data: tables, error: tablesError } = await supabase
      .schema('pos')
      .from('tables')
      .select('*')
      .in('id', [fromTableId, toTableId])
      .eq('is_active', true);

    if (tablesError || tables.length !== 2) {
      return NextResponse.json({ error: "One or both tables not found" }, { status: 404 });
    }

    const fromTable = tables.find((t: any) => t.id === fromTableId);
    const toTable = tables.find((t: any) => t.id === toTableId);

    // Get source table session
    const { data: fromSession, error: fromSessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('table_id', fromTableId)
      .is('session_end', null)
      .single();

    if (fromSessionError || !fromSession) {
      return NextResponse.json({ error: "Source table has no active session" }, { status: 404 });
    }

    if (fromSession.status !== 'occupied') {
      return NextResponse.json({ error: "Source table is not currently occupied" }, { status: 400 });
    }

    // Check destination table is available
    const { data: toSession, error: toSessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('table_id', toTableId)
      .is('session_end', null)
      .maybeSingle();

    if (toSessionError) {
      console.error('Error checking destination table:', toSessionError);
      return NextResponse.json({ error: "Failed to check destination table status" }, { status: 500 });
    }

    if (toSession && toSession.status === 'occupied') {
      return NextResponse.json({ error: "Destination table is already occupied" }, { status: 409 });
    }

    // Validate pax count doesn't exceed destination table capacity
    if (fromSession.pax_count > toTable.max_pax) {
      return NextResponse.json(
        { error: `Pax count (${fromSession.pax_count}) exceeds destination table capacity (${toTable.max_pax})` },
        { status: 400 }
      );
    }

    // Determine which orders to transfer
    let ordersToTransfer = fromSession.orders || [];
    if (!transferAll && orderIds && orderIds.length > 0) {
      ordersToTransfer = ordersToTransfer.filter((order: any) => orderIds.includes(order.order_id));
    }

    // Perform transfer in a transaction
    const { data: transferResult, error: transferError } = await supabase.rpc('transfer_table_session', {
      p_from_table_id: fromTableId,
      p_to_table_id: toTableId,
      p_transfer_all: transferAll,
      p_order_ids: transferAll ? null : orderIds
    });

    if (transferError) {
      console.error('Error in table transfer:', transferError);
      return NextResponse.json({ error: "Failed to transfer table" }, { status: 500 });
    }

    // Fetch the new session details
    const { data: newToSession, error: newSessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('table_id', toTableId)
      .is('session_end', null)
      .single();

    if (newSessionError) {
      console.error('Error fetching new session:', newSessionError);
      return NextResponse.json({ error: "Transfer completed but failed to fetch new session" }, { status: 500 });
    }

    // Transform sessions to TypeScript interfaces
    const transformSession = (sessionData: any): TableSession => ({
      id: sessionData.id,
      tableId: sessionData.table_id,
      status: sessionData.status || 'free',
      paxCount: sessionData.pax_count || 0,
      bookingId: sessionData.booking_id,
      staffPin: sessionData.staff_pin,
      sessionStart: sessionData.session_start ? new Date(sessionData.session_start) : undefined,
      sessionEnd: sessionData.session_end ? new Date(sessionData.session_end) : undefined,
      totalAmount: parseFloat(sessionData.total_amount || '0'),
      notes: sessionData.notes,
      createdAt: new Date(sessionData.created_at),
      updatedAt: new Date(sessionData.updated_at),
      orders: sessionData.orders?.map((order: any) => ({
        id: order.id,
        tableSessionId: order.table_session_id,
        orderId: order.order_id,
        orderNumber: order.order_number,
        orderTotal: parseFloat(order.order_total),
        orderStatus: order.order_status,
        createdAt: new Date(order.created_at)
      })) || [],
      booking: sessionData.booking ? {
        id: sessionData.booking.id,
        name: sessionData.booking.name,
        email: sessionData.booking.email,
        phoneNumber: sessionData.booking.phone_number,
        numberOfPeople: sessionData.booking.number_of_people,
        bookingType: sessionData.booking.booking_type,
        bay: sessionData.booking.bay,
        customerNotes: sessionData.booking.customer_notes,
        // Required fields for type compatibility
        date: '',
        startTime: '',
        duration: 0,
        status: '',
        createdAt: new Date(),
        updatedAt: new Date()
      } : undefined
    });

    // Source session is now closed (paid)
    const fromSessionClosed: TableSession = {
      ...transformSession(fromSession),
      status: 'paid',
      paxCount: 0,
      sessionEnd: new Date()
    };

    const toSessionNew = transformSession(newToSession);

    const response: TransferTableResponse = {
      success: true,
      fromSession: fromSessionClosed,
      toSession: toSessionNew,
      transferredOrders: ordersToTransfer.map((order: any) => ({
        id: order.id,
        tableSessionId: order.table_session_id,
        orderId: order.order_id,
        orderNumber: order.order_number,
        orderTotal: parseFloat(order.order_total),
        orderStatus: order.order_status,
        createdAt: new Date(order.created_at)
      })),
      message: `Successfully transferred from ${fromTable?.display_name} to ${toTable?.display_name}`
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in POST /api/pos/tables/transfer:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}