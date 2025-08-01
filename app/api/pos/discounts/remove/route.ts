import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { order_id, order_item_id, application_scope } = body;

    if (!application_scope) {
      return NextResponse.json({ error: "application_scope is required" }, { status: 400 });
    }

    if (application_scope === 'item' && !order_item_id) {
      return NextResponse.json({ error: "order_item_id is required for item-level discount removal" }, { status: 400 });
    }

    if (application_scope === 'receipt' && !order_id) {
      return NextResponse.json({ error: "order_id is required for receipt-level discount removal" }, { status: 400 });
    }

    if (application_scope === 'item') {
      // Remove item-level discount
      const { data: orderItem, error: fetchError } = await supabase
        .schema('pos')
        .from('order_items')
        .select('*')
        .eq('id', order_item_id)
        .single();

      if (fetchError) {
        console.error('Error fetching order item:', fetchError);
        return NextResponse.json({ error: "Order item not found" }, { status: 404 });
      }

      // Calculate original total price (without discount)
      const originalAmount = parseFloat(orderItem.unit_price) * orderItem.quantity;

      const { error: updateError } = await supabase
        .schema('pos')
        .from('order_items')
        .update({
          applied_discount_id: null,
          discount_amount: null,
          total_price: originalAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', order_item_id);

      if (updateError) {
        console.error('Error removing item discount:', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      // Recalculate order totals
      await recalculateOrderTotals(order_item_id);

      return NextResponse.json({ 
        success: true, 
        message: "Item discount removed successfully" 
      });

    } else if (application_scope === 'receipt') {
      // Remove receipt-level discount
      const { data: order, error: fetchError } = await supabase
        .schema('pos')
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .single();

      if (fetchError) {
        console.error('Error fetching order:', fetchError);
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Get all order items to recalculate totals
      const { data: orderItems, error: itemsError } = await supabase
        .schema('pos')
        .from('order_items')
        .select('total_price')
        .eq('order_id', order_id);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }

      // Calculate new totals without receipt discount
      const subtotal = orderItems?.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0) || 0;
      // Extract VAT from VAT-inclusive price (prices already include VAT)
      const taxAmount = subtotal * 0.07 / (1 + 0.07); // Extract 7% VAT
      const newTotal = subtotal; // Total is same as subtotal since VAT is already included

      // Debug logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Receipt discount removal debug:', {
          order_id,
          orderItems: orderItems?.map((item: any) => ({ total_price: item.total_price })),
          calculatedSubtotal: subtotal,
          taxAmount,
          newTotal,
          itemCount: orderItems?.length || 0
        });
      }

      // Note: Order-level discounts removed - order totals calculated from items automatically

      // Table session total will be updated automatically by database trigger

      return NextResponse.json({ 
        success: true, 
        message: "Receipt discount removed successfully",
        new_total: newTotal
      });
    }

    return NextResponse.json({ error: "Invalid application scope" }, { status: 400 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function recalculateOrderTotals(orderItemId: string) {
  try {
    // Get the order ID from the order item
    const { data: orderItem, error: itemError } = await supabase
      .schema('pos')
      .from('order_items')
      .select('order_id')
      .eq('id', orderItemId)
      .single();

    if (itemError) {
      console.error('Error fetching order item for recalculation:', itemError);
      return;
    }

    const orderId = orderItem.order_id;

    // Get all order items for this order
    const { data: orderItems, error: itemsError } = await supabase
      .schema('pos')
      .from('order_items')
      .select('total_price')
      .eq('order_id', orderId);

    if (itemsError) {
      console.error('Error fetching order items for recalculation:', itemsError);
      return;
    }

    const subtotal = orderItems?.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0) || 0;
    // Extract VAT from VAT-inclusive price (prices already include VAT)
    const taxAmount = subtotal * 0.07 / (1 + 0.07); // Extract 7% VAT

    // Update order totals
    const { error: updateError } = await supabase
      .schema('pos')
      .from('orders')
      .update({
        total_amount: subtotal, // Total is same as subtotal since VAT is already included
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order totals:', updateError);
    }
  } catch (error) {
    console.error('Error in recalculateOrderTotals:', error);
  }
}

