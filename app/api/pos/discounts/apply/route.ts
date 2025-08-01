import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { DiscountApplication } from '@/types/discount';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: DiscountApplication & {
      // Support for in-memory order items (before database save)
      target_item?: {
        id: string;
        product_id: string;
        quantity: number;
        unit_price: number;
      };
    } = await request.json();
    
    const { discount_id, order_id, order_item_id, application_scope, target_item } = body;

    if (!discount_id || !application_scope) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (application_scope === 'item' && !order_item_id && !target_item) {
      return NextResponse.json({ error: "order_item_id or target_item is required for item-level discounts" }, { status: 400 });
    }

    if (application_scope === 'receipt' && !order_id) {
      return NextResponse.json({ error: "order_id is required for receipt-level discounts" }, { status: 400 });
    }

    // Get product ID for validation - support both database items and in-memory items
    let productId = null;
    if (application_scope === 'item') {
      if (target_item) {
        // In-memory order item (not yet saved to database)
        productId = target_item.product_id;
      } else if (order_item_id) {
        // Database order item (already saved)
        const { data: orderItem, error: itemError } = await supabase
          .schema('pos')
          .from('order_items')
          .select('product_id')
          .eq('id', order_item_id)
          .single();

        if (itemError) {
          console.error('Error fetching order item:', itemError);
          return NextResponse.json({ error: "Order item not found" }, { status: 404 });
        }

        productId = orderItem.product_id;
      }
    }

    // Validate discount
    const { data: validation, error: validationError } = await supabase
      .rpc('validate_discount_application', {
        p_discount_id: discount_id,
        p_product_id: productId
      });

    if (validationError) {
      console.error('Error validating discount:', validationError);
      return NextResponse.json({ error: "Validation error" }, { status: 500 });
    }

    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason }, { status: 400 });
    }

    // Get discount details
    const { data: discount, error: discountError } = await supabase
      .schema('pos')
      .from('discounts')
      .select('*')
      .eq('id', discount_id)
      .single();

    if (discountError) {
      console.error('Error fetching discount:', discountError);
      return NextResponse.json({ error: discountError.message }, { status: 500 });
    }

    if (application_scope === 'item') {
      if (target_item) {
        // Handle in-memory order item (not yet saved to database)
        const originalAmount = target_item.unit_price * target_item.quantity;
        let discountAmount = 0;
        
        if (discount.discount_type === 'percentage') {
          discountAmount = originalAmount * (discount.discount_value / 100);
        } else {
          discountAmount = Math.min(discount.discount_value, originalAmount);
        }

        const newTotal = originalAmount - discountAmount;

        // Return discount calculation for client-side application
        return NextResponse.json({ 
          success: true, 
          discount_amount: discountAmount,
          new_total: newTotal,
          discount_details: {
            id: discount.id,
            title: discount.title,
            type: discount.discount_type,
            value: discount.discount_value
          }
        });

      } else if (order_item_id) {
        // Handle database order item (already saved)
        const { data: orderItem, error: itemError } = await supabase
          .schema('pos')
          .from('order_items')
          .select('*')
          .eq('id', order_item_id)
          .single();

        if (itemError) {
          console.error('Error fetching order item:', itemError);
          return NextResponse.json({ error: itemError.message }, { status: 500 });
        }

        // Calculate discount amount
        const originalAmount = parseFloat(orderItem.total_price);
        let discountAmount = 0;
        
        if (discount.discount_type === 'percentage') {
          discountAmount = originalAmount * (discount.discount_value / 100);
        } else {
          discountAmount = Math.min(discount.discount_value, originalAmount);
        }

        const newTotal = originalAmount - discountAmount;

        // Update order item in database
        const { error: updateError } = await supabase
          .schema('pos')
          .from('order_items')
          .update({
            applied_discount_id: discount_id,
            discount_amount: discountAmount,
            total_price: newTotal,
            updated_at: new Date().toISOString()
          })
          .eq('id', order_item_id);

        if (updateError) {
          console.error('Error updating order item:', updateError);
          return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        // Recalculate order totals
        await recalculateOrderTotals(order_item_id);

        return NextResponse.json({ 
          success: true, 
          discount_amount: discountAmount,
          new_total: newTotal 
        });
      }

    } else if (application_scope === 'receipt' && order_id) {
      // Apply discount to entire order
      const { data: order, error: orderError } = await supabase
        .schema('pos')
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        return NextResponse.json({ error: orderError.message }, { status: 500 });
      }

      // Get the sum of all order items to calculate discount on original amounts
      const { data: orderItems, error: itemsError } = await supabase
        .schema('pos')
        .from('order_items')
        .select('total_price')
        .eq('order_id', order_id);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
      }

      // Calculate discount amount based on sum of all order items (original amounts)
      const originalAmount = orderItems?.reduce((sum: number, item: any) => sum + parseFloat(item.total_price), 0) || 0;
      
      if (originalAmount === 0) {
        return NextResponse.json({ error: "Cannot apply discount to order with no items" }, { status: 400 });
      }

      // Debug logging for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Receipt discount calculation:', {
          order_id,
          discount_id,
          discount_type: discount.discount_type,
          discount_value: discount.discount_value,
          original_total_amount: order.total_amount,
          calculated_original_amount: originalAmount,
          item_count: orderItems?.length || 0
        });
      }

      let discountAmount = 0;
      
      if (discount.discount_type === 'percentage') {
        discountAmount = originalAmount * (discount.discount_value / 100);
      } else {
        discountAmount = Math.min(discount.discount_value, originalAmount);
      }

      const newSubtotal = originalAmount - discountAmount;
      // Extract VAT from VAT-inclusive price (prices already include VAT)
      const taxAmount = newSubtotal * 0.07 / (1 + 0.07); // Extract 7% VAT
      const newTotal = newSubtotal; // Total is same as subtotal since VAT is already included

      // Note: Order-level discounts removed - orders now only store sum of item totals
      // Total amount is automatically calculated by database triggers from order_items

      // Table session total will be updated automatically by database trigger

      return NextResponse.json({ 
        success: true, 
        discount_amount: discountAmount,
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

    // Update order totals - only total_amount exists in orders table now
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

