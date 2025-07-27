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
    const { itemId, reason, staffPin, quantityToRemove } = await request.json();

    if (!itemId || !reason || !staffPin) {
      return NextResponse.json(
        { error: "Missing required fields: itemId, reason, staffPin" },
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

    // Find the order item in the normalized tables using view
    const { data: orderItem, error: itemError } = await supabase
      .schema('pos')
      .from('v_order_items')
      .select('*')
      .eq('id', itemId)
      .single();
      
    // Get the order details separately
    const { data: orderData, error: orderError } = await supabase
      .schema('pos')
      .from('v_orders')
      .select('*')
      .eq('id', orderItem?.order_id)
      .single();

    if (itemError || !orderItem || orderError || !orderData) {
      return NextResponse.json(
        { error: "Item or order not found" },
        { status: 404 }
      );
    }

    // Verify the order belongs to this table session
    if (orderData.table_session_id !== sessionId) {
      return NextResponse.json(
        { error: "Item does not belong to this table session" },
        { status: 403 }
      );
    }

    const removeQuantity = quantityToRemove || orderItem.quantity;
    
    // Validate removal quantity
    if (removeQuantity <= 0 || removeQuantity > orderItem.quantity) {
      return NextResponse.json(
        { error: "Invalid quantity to remove" },
        { status: 400 }
      );
    }

    const removedItem = {
      id: orderItem.id,
      productName: orderItem.product_name,
      quantity: removeQuantity,
      totalPrice: (orderItem.total_price / orderItem.quantity) * removeQuantity
    };

    // Calculate the amount to subtract from totals
    const amountToRemove = removedItem.totalPrice;

    // Update the order item quantity or remove it completely
    if (removeQuantity >= orderItem.quantity) {
      // Remove the item completely
      const { error: deleteError } = await supabase
        .schema('pos')
        .from('order_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) {
        console.error('Failed to delete order item:', deleteError);
        return NextResponse.json(
          { error: "Failed to remove item" },
          { status: 500 }
        );
      }
    } else {
      // Update the item with reduced quantity
      const remainingQuantity = orderItem.quantity - removeQuantity;
      const newTotalPrice = orderItem.total_price - amountToRemove;

      const { error: updateItemError } = await supabase
        .schema('pos')
        .from('order_items')
        .update({
          quantity: remainingQuantity,
          total_price: newTotalPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);

      if (updateItemError) {
        console.error('Failed to update order item:', updateItemError);
        return NextResponse.json(
          { error: "Failed to update item quantity" },
          { status: 500 }
        );
      }
    }

    // Update the order total
    const { error: updateOrderError } = await supabase
      .schema('pos')
      .from('orders')
      .update({
        total_amount: orderData.total_amount - amountToRemove,
        subtotal_amount: (orderData.total_amount - amountToRemove) / 1.07, // Remove tax
        tax_amount: (orderData.total_amount - amountToRemove) * 0.07,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderData.id);

    if (updateOrderError) {
      console.error('Failed to update order total:', updateOrderError);
      // Don't fail the request, but log the error
    }

    // Update the table session total
    const { error: updateSessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .update({
        total_amount: tableSession.total_amount - amountToRemove,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateSessionError) {
      console.error('Failed to update table session total:', updateSessionError);
      // Don't fail the request, but log the error
    }

    // Log the removal for audit trail
    const { error: logError } = await supabase
      .schema('pos')
      .from('item_removals')
      .insert({
        table_session_id: sessionId,
        item_id: itemId,
        item_name: removedItem.productName,
        item_quantity: removeQuantity,
        item_total_price: removedItem.totalPrice,
        removal_reason: reason,
        staff_pin: staffPin,
        removed_by: session.user.email,
        removed_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Failed to log item removal:', logError);
      // Don't fail the request if logging fails, but log the error
    }

    const newTotalAmount = tableSession.total_amount - amountToRemove;

    return NextResponse.json({
      success: true,
      message: "Item removed successfully",
      newTotalAmount,
      removedItem: {
        id: removedItem.id,
        productName: removedItem.productName,
        quantity: removedItem.quantity,
        totalPrice: removedItem.totalPrice
      }
    });

  } catch (error) {
    console.error('Error removing item from running tab:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}