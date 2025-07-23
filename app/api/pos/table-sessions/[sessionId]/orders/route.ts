import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = params;

    // Get table session with order data
    const { data: tableSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !tableSession) {
      return NextResponse.json({ error: "Table session not found" }, { status: 404 });
    }

    // Fetch orders from the normalized orders table
    const { data: ordersData, error: ordersError } = await supabase
      .schema('pos')
      .from('orders')
      .select(`
        *,
        order_items(*)
      `)
      .eq('table_session_id', sessionId)
      .order('created_at', { ascending: true });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    // Transform the orders data to match the expected format
    const orders = ordersData?.flatMap(order => 
      order.order_items.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        productName: item.product_name,
        categoryId: item.category_id,
        categoryName: item.category_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        totalPrice: item.total_price,
        modifiers: item.modifiers || [],
        notes: item.notes,
        orderId: order.id,
        orderNumber: order.order_number,
        confirmedAt: order.created_at
      }))
    ) || [];

    // If no orders found in normalized tables, fallback to checking notes field for migration
    if (orders.length === 0 && tableSession.notes) {
      try {
        const orderData = JSON.parse(tableSession.notes);
        if (orderData.orders && Array.isArray(orderData.orders)) {
          // Return the legacy format but mark for potential migration
          const legacyOrders = orderData.orders;
          return NextResponse.json({
            success: true,
            orders: legacyOrders,
            totalAmount: parseFloat(tableSession.total_amount || '0'),
            sessionId: tableSession.id,
            isLegacyData: true
          });
        }
      } catch (parseError) {
        console.error('Error parsing legacy order data:', parseError);
      }
    }

    return NextResponse.json({
      success: true,
      orders,
      totalAmount: parseFloat(tableSession.total_amount || '0'),
      sessionId: tableSession.id,
      isNormalizedData: true
    });

  } catch (error) {
    console.error('Error in GET /api/pos/table-sessions/[sessionId]/orders:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}