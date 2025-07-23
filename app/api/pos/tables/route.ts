import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import type { GetTablesResponse, Table, Zone, TableSummary } from '@/types/pos';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch zones
    const { data: zones, error: zonesError } = await supabase
      .schema('pos')
      .from('zones')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (zonesError) {
      console.error('Error fetching zones:', zonesError);
      return NextResponse.json({ error: "Failed to fetch zones" }, { status: 500 });
    }

    // Fetch all tables with their current sessions (if any)
    const { data: tablesData, error: tablesError } = await supabase
      .schema('pos')
      .from('tables')
      .select(`
        *,
        zone:zones(*)
      `)
      .eq('is_active', true)
      .order('zone_id, table_number');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
    }

    // Fetch current sessions separately to avoid join issues
    const { data: sessionsData, error: sessionsError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select(`
        *,
        orders:table_orders(*)
      `)
      .is('session_end', null);

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    // Create a map of table_id to session data
    const sessionMap = new Map();
    if (sessionsData) {
      sessionsData.forEach(session => {
        sessionMap.set(session.table_id, session);
      });
    }

    // Fetch booking data for sessions that have booking_id
    const bookingIds = sessionsData?.filter(s => s.booking_id).map(s => s.booking_id) || [];
    let bookingsMap = new Map();
    
    if (bookingIds.length > 0) {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('id', bookingIds);
      
      if (!bookingsError && bookingsData) {
        bookingsData.forEach(booking => {
          bookingsMap.set(booking.id, booking);
        });
      }
    }

    // Transform data to match TypeScript interfaces
    const tables: Table[] = tablesData?.map((table: any) => {
      const currentSession = sessionMap.get(table.id);
      const booking = currentSession?.booking_id ? bookingsMap.get(currentSession.booking_id) : null;
      
      return {
        id: table.id,
        zoneId: table.zone_id,
        tableNumber: table.table_number,
        displayName: table.display_name,
        maxPax: table.max_pax,
        position: {
          x: table.position_x,
          y: table.position_y
        },
        isActive: table.is_active,
        createdAt: new Date(table.created_at),
        updatedAt: new Date(table.updated_at),
        zone: {
          id: table.zone.id,
          name: table.zone.name,
          displayName: table.zone.display_name,
          zoneType: table.zone.zone_type,
          colorTheme: table.zone.color_theme,
          isActive: table.zone.is_active,
          displayOrder: table.zone.display_order,
          createdAt: new Date(table.zone.created_at),
          updatedAt: new Date(table.zone.updated_at)
        },
        currentSession: currentSession ? {
          id: currentSession.id,
          tableId: currentSession.table_id,
          status: currentSession.status,
          paxCount: currentSession.pax_count,
          bookingId: currentSession.booking_id,
          staffPin: currentSession.staff_pin,
          sessionStart: currentSession.session_start ? new Date(currentSession.session_start) : undefined,
          sessionEnd: currentSession.session_end ? new Date(currentSession.session_end) : undefined,
          totalAmount: parseFloat(currentSession.total_amount || '0'),
          notes: currentSession.notes,
          createdAt: new Date(currentSession.created_at),
          updatedAt: new Date(currentSession.updated_at),
          orders: currentSession.orders?.map((order: any) => ({
            id: order.id,
            tableSessionId: order.table_session_id,
            orderId: order.order_id,
            orderNumber: order.order_number,
            orderTotal: parseFloat(order.order_total),
            orderStatus: order.order_status,
            createdAt: new Date(order.created_at)
          })) || [],
          booking: booking ? {
            id: booking.id,
            name: booking.name,
            email: booking.email,
            phoneNumber: booking.phone_number,
            numberOfPeople: booking.number_of_people,
            bookingType: booking.booking_type,
            bay: booking.bay,
            customerNotes: booking.customer_notes,
            date: booking.date || '',
            startTime: booking.start_time || '',
            duration: booking.duration || 0,
            status: booking.status || '',
            createdAt: new Date(booking.created_at),
            updatedAt: new Date(booking.updated_at)
          } : undefined
        } : undefined
      };
    }) || [];

    // Transform zones
    const zonesData: Zone[] = zones?.map((zone: any) => ({
      id: zone.id,
      name: zone.name,
      displayName: zone.display_name,
      zoneType: zone.zone_type,
      colorTheme: zone.color_theme,
      isActive: zone.is_active,
      displayOrder: zone.display_order,
      createdAt: new Date(zone.created_at),
      updatedAt: new Date(zone.updated_at)
    })) || [];

    // Calculate summary
    const totalTables = tables.length;
    const occupiedTables = tables.filter(t => t.currentSession?.status === 'occupied').length;
    const availableTables = totalTables - occupiedTables;
    const totalRevenue = tables.reduce((sum, t) => sum + (t.currentSession?.totalAmount || 0), 0);

    const byZone = zonesData.map((zone: any) => {
      const zoneTables = tables.filter(t => t.zoneId === zone.id);
      const zoneOccupied = zoneTables.filter(t => t.currentSession?.status === 'occupied').length;
      return {
        zoneName: zone.displayName,
        total: zoneTables.length,
        occupied: zoneOccupied,
        available: zoneTables.length - zoneOccupied
      };
    });

    const summary: TableSummary = {
      totalTables,
      occupiedTables,
      availableTables,
      totalRevenue,
      byZone
    };

    const response: GetTablesResponse = {
      tables: tables.sort((a, b) => a.zone.displayOrder - b.zone.displayOrder || a.tableNumber - b.tableNumber),
      zones: zonesData,
      summary
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in GET /api/pos/tables:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}