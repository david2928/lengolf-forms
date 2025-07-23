import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

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
    const { orderItems, orderTotal, notes } = await request.json();

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json(
        { error: "Order items are required" },
        { status: 400 }
      );
    }

    // Get the table session
    const { data: tableSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !tableSession) {
      return NextResponse.json(
        { error: "Table session not found" },
        { status: 404 }
      );
    }

    // Calculate totals
    const calculatedTotal = orderItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
    const taxAmount = calculatedTotal * 0.07; // 7% tax
    const subtotalAmount = calculatedTotal - taxAmount;

    // Create the order in normalized table
    const { data: newOrder, error: orderError } = await supabase
      .schema('pos')
      .from('orders')
      .insert({
        table_session_id: sessionId,
        status: 'confirmed',
        total_amount: calculatedTotal,
        tax_amount: taxAmount,
        subtotal_amount: subtotalAmount,
        confirmed_by: session.user.email,
        notes: notes || null
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

    // Insert order items
    const orderItemsData = orderItems.map((item: any) => ({
      order_id: newOrder.id,
      product_id: item.productId || null,
      product_name: item.productName,
      category_id: item.categoryId || null,
      category_name: item.categoryName || null,
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

    // Update table session total amount
    const newSessionTotal = tableSession.total_amount + calculatedTotal;
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