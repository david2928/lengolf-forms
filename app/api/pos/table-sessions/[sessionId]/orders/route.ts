import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

// Type definitions for table session orders
interface DatabaseOrder {
  id: string;
  order_number: string;
  table_session_id: string;
  created_at: string;
}

interface DatabaseOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  modifiers: any[];
  notes: string | null;
  created_at: string;
  // Discount fields
  applied_discount_id: string | null;
  discount_amount: string | null;
}

interface DatabaseProduct {
  id: string;
  name: string;
  category_id: string | null;
  categories: {
    name: string;
  } | null;
}

interface TransformedOrderItem {
  id: string;
  productId: string;
  productName: string;
  categoryId: string | null;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: any[];
  notes: string | null;
  orderId?: string;
  orderNumber?: string;
  confirmedAt?: string;
  // Discount fields
  applied_discount_id: string | null;
  discount_amount: number | null;
}

interface LegacyOrderData {
  orders: any[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await params;

    // Get table session with receipt discount data
    const { data: tableSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*, discounts(id, title, discount_type, discount_value, application_scope)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !tableSession) {
      return NextResponse.json({ error: "Table session not found" }, { status: 404 });
    }

    // Fetch orders from the normalized orders table (no longer need order-level discount data)
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
      .in('order_id', (ordersData || []).map((o: DatabaseOrder) => o.id))
      .order('created_at', { ascending: true });

    if (ordersError || itemsError) {
      console.error('Error fetching orders:', ordersError || itemsError);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    // Get product information for order items to enrich the data
    const productIds = (orderItemsData || []).map((item: DatabaseOrderItem) => item.product_id);
    let productsData: DatabaseProduct[] = [];
    
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .schema('products')
        .from('products')
        .select('id, name, category_id, categories(id, name)')
        .in('id', productIds);
      productsData = products || [];
    }
    
    // Create a product lookup map
    const productMap = new Map(productsData.map((p: DatabaseProduct) => [p.id, p]));

    // Transform the orders data to match the expected format
    const orders = (orderItemsData || []).map((item: DatabaseOrderItem): TransformedOrderItem => {
      const order = ordersData?.find((o: DatabaseOrder) => o.id === item.order_id);
      const product = productMap.get(item.product_id);
      
      return {
        id: item.id,
        productId: item.product_id,
        productName: item.modifiers && item.modifiers.length > 0 
          ? `${product?.name || 'Unknown Product'} (${item.modifiers[0].modifier_name})`
          : product?.name || 'Unknown Product',
        categoryId: product?.category_id || null,
        categoryName: product?.categories?.name || 'Unknown Category',
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price),
        totalPrice: parseFloat(item.total_price),
        modifiers: item.modifiers || [],
        notes: item.notes,
        orderId: order?.id,
        orderNumber: order?.order_number,
        confirmedAt: order?.created_at,
        // Include discount fields
        applied_discount_id: item.applied_discount_id,
        discount_amount: item.discount_amount ? parseFloat(item.discount_amount) : null
      };
    }) || [];

    // If no orders found in normalized tables, fallback to checking notes field for migration
    if (orders.length === 0 && tableSession.notes) {
      try {
        const orderData: LegacyOrderData = JSON.parse(tableSession.notes);
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

    // Get session-level receipt discount information
    const sessionReceiptDiscount = tableSession.applied_receipt_discount_id ? tableSession.discounts : null;
    const sessionReceiptDiscountAmount = parseFloat(tableSession.receipt_discount_amount || '0');

    return NextResponse.json({
      success: true,
      orders,
      totalAmount: parseFloat(tableSession.total_amount || '0'),
      sessionId: tableSession.id,
      isNormalizedData: true,
      // Include session-level receipt discount information
      receiptDiscount: sessionReceiptDiscount ? {
        id: sessionReceiptDiscount.id,
        title: sessionReceiptDiscount.title,
        discount_type: sessionReceiptDiscount.discount_type,
        discount_value: sessionReceiptDiscount.discount_value,
        amount: sessionReceiptDiscountAmount
      } : null
    });

  } catch (error) {
    console.error('Error in GET /api/pos/table-sessions/[sessionId]/orders:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}