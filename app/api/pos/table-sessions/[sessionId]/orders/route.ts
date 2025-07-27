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
      .select('*')
      .eq('table_session_id', sessionId)
      .order('created_at', { ascending: true });
    
    // Fetch order items separately
    const { data: orderItemsData, error: itemsError } = await supabase
      .schema('pos')
      .from('order_items')
      .select('*')
      .in('order_id', ordersData?.map(o => o.id) || [])
      .order('created_at', { ascending: true });

    if (ordersError || itemsError) {
      console.error('Error fetching orders:', ordersError || itemsError);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    // Get product information for order items to enrich the data
    const productIds = orderItemsData?.map(item => item.product_id) || [];
    let productsData: any[] = [];
    
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .schema('products')
        .from('products')
        .select('id, name, category_id, categories(id, name)')
        .in('id', productIds);
      productsData = products || [];
    }
    
    // Create a product lookup map
    const productMap = new Map(productsData.map(p => [p.id, p]));

    // Transform the orders data to match the expected format
    const orders = orderItemsData?.map((item: any) => {
      const order = ordersData?.find(o => o.id === item.order_id);
      const product = productMap.get(item.product_id);
      
      return {
        id: item.id,
        productId: item.product_id,
        productName: product?.name || 'Unknown Product',
        categoryId: product?.category_id || null,
        categoryName: product?.categories?.name || 'Unknown Category',
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        totalPrice: parseFloat(item.total_price),
        modifiers: item.modifiers || [],
        notes: item.notes,
        orderId: order?.id,
        orderNumber: order?.order_number,
        confirmedAt: order?.created_at
      };
    }) || [];

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