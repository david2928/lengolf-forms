import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import type { Table } from '@/types/pos';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const { tableId } = await params;
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch table with current session
    const { data: tableData, error: tableError } = await supabase
      .schema('pos')
      .from('tables')
      .select(`
        *,
        zone:zones(*),
        current_session:table_sessions!left(*)
      `)
      .eq('id', tableId)
      .eq('is_active', true)
      .is('table_sessions.session_end', null)
      .single();

    if (tableError) {
      console.error('Error fetching table:', tableError);
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    // Transform data to match TypeScript interface
    const table: Table = {
      id: tableData.id,
      zoneId: tableData.zone_id,
      tableNumber: tableData.table_number,
      displayName: tableData.display_name,
      maxPax: tableData.max_pax,
      position: {
        x: tableData.position_x,
        y: tableData.position_y
      },
      isActive: tableData.is_active,
      createdAt: new Date(tableData.created_at),
      updatedAt: new Date(tableData.updated_at),
      zone: {
        id: tableData.zone.id,
        name: tableData.zone.name,
        displayName: tableData.zone.display_name,
        zoneType: tableData.zone.zone_type,
        colorTheme: tableData.zone.color_theme,
        isActive: tableData.zone.is_active,
        displayOrder: tableData.zone.display_order,
        createdAt: new Date(tableData.zone.created_at),
        updatedAt: new Date(tableData.zone.updated_at)
      },
      currentSession: tableData.current_session ? {
        id: tableData.current_session.id,
        tableId: tableData.current_session.table_id,
        status: tableData.current_session.status,
        paxCount: tableData.current_session.pax_count,
        bookingId: tableData.current_session.booking_id,
        staffId: tableData.current_session.staff_pin,
        sessionStart: tableData.current_session.session_start ? new Date(tableData.current_session.session_start) : undefined,
        sessionEnd: tableData.current_session.session_end ? new Date(tableData.current_session.session_end) : undefined,
        totalAmount: parseFloat(tableData.current_session.total_amount || '0'),
        subtotalAmount: parseFloat(tableData.current_session.subtotal_amount || '0'),
        receiptDiscountAmount: parseFloat(tableData.current_session.receipt_discount_amount || '0'),
        notes: tableData.current_session.notes,
        createdAt: new Date(tableData.current_session.created_at),
        updatedAt: new Date(tableData.current_session.updated_at),
        orders: [],
        booking: tableData.current_session.booking ? {
          id: tableData.current_session.booking.id,
          name: tableData.current_session.booking.name,
          email: tableData.current_session.booking.email,
          phoneNumber: tableData.current_session.booking.phone_number,
          numberOfPeople: tableData.current_session.booking.number_of_people,
          bookingType: tableData.current_session.booking.booking_type,
          bay: tableData.current_session.booking.bay,
          customerNotes: tableData.current_session.booking.customer_notes,
          // Required fields that aren't used in this context
          date: '',
          startTime: '',
          duration: 0,
          status: '',
          createdAt: new Date(),
          updatedAt: new Date()
        } : undefined
      } : undefined
    };

    return NextResponse.json(table);

  } catch (error) {
    console.error('Error in GET /api/pos/tables/[tableId]:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}