import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import type { GetTablesResponse, Table, Zone, TableSummary } from '@/types/pos';

export const dynamic = 'force-dynamic';

// Database response types (snake_case)
interface DatabaseTableSession {
  id: string;
  table_id: string;
  session_end: string | null;
  status: string;
  booking_id?: string;
  customer_id?: string;
  pax_count: number;
  total_amount: string;
  notes?: string;
  session_start?: string;
  staff_pin?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseBooking {
  id: string;
  customer_name?: string;
  // Add other booking fields as needed
}

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extract timestamp parameter for cache busting
    const url = new URL(request.url);
    const timestamp = url.searchParams.get('_t');

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
    // Add timestamp to force fresh query and avoid caching
    const { data: allSessionsData, error: sessionsError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .gte('created_at', '2020-01-01') // Force index usage to avoid cache
      .order('updated_at', { ascending: false }); // Get most recently updated first
    
    // Filter for active sessions (exclude paid and closed sessions)
    const sessionsData = allSessionsData?.filter((session: DatabaseTableSession) => 
      session.session_end === null && session.status !== 'paid'
    ) || [];

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
    }

    // Create a map of table_id to session data
    const sessionMap = new Map();
    if (sessionsData) {
      sessionsData.forEach((session: DatabaseTableSession) => {
        sessionMap.set(session.table_id, session);
      });
    }

    // Fetch booking data for sessions that have booking_id
    const bookingIds = sessionsData?.filter((s: DatabaseTableSession) => s.booking_id).map((s: DatabaseTableSession) => s.booking_id!) || [];
    let bookingsMap = new Map();
    
    if (bookingIds.length > 0) {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .in('id', bookingIds);
      
      if (!bookingsError && bookingsData) {
        bookingsData.forEach((booking: DatabaseBooking) => {
          bookingsMap.set(booking.id, booking);
        });
      }
    }

    // Fetch customer data for sessions that have customer_id (walk-in customers)
    const customerIds = sessionsData?.filter((s: DatabaseTableSession) => s.customer_id).map((s: DatabaseTableSession) => s.customer_id!) || [];
    let customersMap = new Map();
    
    if (customerIds.length > 0) {
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('id, customer_name, contact_number, email')
        .in('id', customerIds);
      
      if (!customersError && customersData) {
        customersData.forEach((customer: any) => {
          customersMap.set(customer.id, {
            id: customer.id,
            name: customer.customer_name,
            phone: customer.contact_number,
            email: customer.email
          });
        });
      }
    }

    // Fetch receipt discount information for active sessions
    const sessionIds = sessionsData?.map((s: DatabaseTableSession) => s.id) || [];
    let receiptDiscountsMap = new Map();
    
    if (sessionIds.length > 0) {
      // Get all orders for active sessions that have receipt-level discounts
      const { data: ordersWithDiscounts, error: discountsError } = await supabase
        .schema('pos')
        .from('orders')
        .select(`
          table_session_id,
          applied_discount_id,
          discounts:applied_discount_id (
            id,
            title,
            discount_type,
            discount_value
          )
        `)
        .in('table_session_id', sessionIds)
        .not('applied_discount_id', 'is', null);

      if (!discountsError && ordersWithDiscounts) {
        // Group discounts by session ID (assuming one receipt discount per session)
        ordersWithDiscounts.forEach((order: any) => {
          if (order.discounts && !receiptDiscountsMap.has(order.table_session_id)) {
            receiptDiscountsMap.set(order.table_session_id, {
              id: order.discounts.id,
              title: order.discounts.title,
              discount_type: order.discounts.discount_type,
              discount_value: order.discounts.discount_value,
              amount: 0 // Will be calculated from actual discount amount if needed
            });
          }
        });
      }
    }

    // Transform data to match TypeScript interfaces
    const tables: Table[] = tablesData?.map((table: any) => {
      const currentSession = sessionMap.get(table.id);
      const booking = currentSession?.booking_id ? bookingsMap.get(currentSession.booking_id) : null;
      const customer = currentSession?.customer_id ? customersMap.get(currentSession.customer_id) : null;
      const receiptDiscount = currentSession ? receiptDiscountsMap.get(currentSession.id) : null;
      
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
          orders: [],
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
          } : undefined,
          customer: customer ? {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            email: customer.email
          } : undefined,
          receiptDiscount: receiptDiscount || undefined
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

    const byZone = zonesData.map((zone: Zone) => {
      const zoneTables = tables.filter((t: Table) => t.zoneId === zone.id);
      const zoneOccupied = zoneTables.filter((t: Table) => t.currentSession?.status === 'occupied').length;
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
      tables: tables.sort((a: Table, b: Table) => a.zone.displayOrder - b.zone.displayOrder || a.tableNumber - b.tableNumber),
      zones: zonesData,
      summary
    };

    // Add cache-busting headers to prevent stale data
    const nextResponse = NextResponse.json(response);
    nextResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    nextResponse.headers.set('Pragma', 'no-cache');
    nextResponse.headers.set('Expires', '0');
    nextResponse.headers.set('Last-Modified', new Date().toUTCString());
    nextResponse.headers.set('ETag', `"${Date.now()}"`);
    
    return nextResponse;

  } catch (error) {
    console.error('Error in GET /api/pos/tables:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}