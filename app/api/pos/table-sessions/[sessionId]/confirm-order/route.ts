import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

// Type definitions for order confirmation
interface OrderItem {
  productId: string;
  quantity: number;
  modifiers?: any[];
  notes?: string;
}

interface DatabaseProduct {
  id: string;
  name: string;
  price: string;
}

interface EnrichedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers: any[];
  notes: string | null;
}

interface TableSession {
  id: string;
  status: string;
  session_end: string | null;
  total_amount: string;
  booking_id: string | null;
  customer_id: string | null;
  staff_id: string | null;
}

interface NewOrder {
  id: string;
  order_number: string;
  total_amount: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = params;
    const { orderItems, notes } = await request.json();

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json(
        { error: "Order items are required" },
        { status: 400 }
      );
    }

    // Validate order items structure
    for (const item of orderItems as OrderItem[]) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        return NextResponse.json(
          { error: "Each order item must have productId and positive quantity" },
          { status: 400 }
        );
      }
    }

    // Get the table session and validate it's active
    const { data: tableSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'occupied')
      .is('session_end', null)
      .single();

    if (sessionError || !tableSession) {
      return NextResponse.json(
        { error: "Table session not found or not active" },
        { status: 404 }
      );
    }

    // Fetch product prices from database
    const productIds = (orderItems as OrderItem[]).map((item: OrderItem) => item.productId);
    const { data: products, error: productsError } = await supabase
      .schema('products')
      .from('products')
      .select('id, name, price')
      .in('id', productIds);

    if (productsError || !products) {
      console.error('Failed to fetch products:', productsError);
      return NextResponse.json(
        { error: "Failed to fetch product information" },
        { status: 500 }
      );
    }

    // Create a map for quick product lookup
    const productMap = new Map((products || []).map((p: DatabaseProduct) => [p.id, p]));

    // Validate all products exist and calculate prices
    let calculatedSubtotal = 0;
    const enrichedOrderItems: EnrichedOrderItem[] = [];

    for (const item of orderItems as OrderItem[]) {
      const product = productMap.get(item.productId) as DatabaseProduct | undefined;
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }

      const unitPrice = parseFloat(product.price);
      // Validate unitPrice is a valid number
      if (isNaN(unitPrice) || unitPrice < 0) {
        console.error('Invalid product price:', product.price, 'for product:', item.productId);
        return NextResponse.json(
          { error: `Invalid product price for ${product.name}` },
          { status: 500 }
        );
      }

      const totalPrice = unitPrice * item.quantity;
      calculatedSubtotal += totalPrice;

      enrichedOrderItems.push({
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: unitPrice,
        totalPrice: totalPrice,
        modifiers: item.modifiers || [],
        notes: item.notes || null
      });
    }

    // Product prices already include VAT - no need to add VAT on top
    // Calculate the VAT portion that's already included (7% VAT = 7/107 of total)
    const taxAmount = calculatedSubtotal * (7 / 107);
    const subtotalWithoutVat = calculatedSubtotal - taxAmount;
    const totalAmount = calculatedSubtotal; // Total is the same as calculatedSubtotal since VAT is included

    // Create the order in normalized table with context from table session
    const { data: newOrder, error: orderError } = await supabase
      .schema('pos')
      .from('orders')
      .insert({
        table_session_id: sessionId,
        status: 'confirmed',
        total_amount: totalAmount,
        tax_amount: taxAmount,
        subtotal_amount: subtotalWithoutVat,
        confirmed_by: session.user.email,
        notes: notes || null,
        booking_id: tableSession.booking_id,
        customer_id: tableSession.customer_id,
        staff_id: tableSession.staff_id
      })
      .select()
      .single();

    if (orderError || !newOrder) {
      console.error('Failed to create order:', orderError);
      return NextResponse.json(
        { error: "Failed to create order" },
        { status: 500 }
      );
    }

    // Insert order items with server-calculated prices
    const orderItemsData = enrichedOrderItems.map((item: EnrichedOrderItem) => ({
      order_id: newOrder.id,
      product_id: item.productId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.totalPrice,
      modifiers: item.modifiers || [],
      notes: item.notes || null
    }));

    const { error: itemsError } = await supabase
      .schema('pos')
      .from('order_items')
      .insert(orderItemsData);

    if (itemsError) {
      console.error('Failed to create order items:', itemsError);
      // Try to cleanup the order
      await supabase.schema('pos').from('orders').delete().eq('id', newOrder.id);
      return NextResponse.json(
        { error: "Failed to create order items" },
        { status: 500 }
      );
    }

    // Update table session total amount - handle null case safely
    const currentSessionTotal = parseFloat(tableSession.total_amount) || 0;
    const newSessionTotal = currentSessionTotal + totalAmount;
    const { error: updateError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .update({
        total_amount: newSessionTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Failed to update table session:', updateError);
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      order: {
        id: newOrder.id,
        orderNumber: newOrder.order_number,
        totalAmount: newOrder.total_amount,
        itemCount: orderItems.length
      },
      message: "Order confirmed successfully"
    });

  } catch (error) {
    console.error('Error confirming order:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}