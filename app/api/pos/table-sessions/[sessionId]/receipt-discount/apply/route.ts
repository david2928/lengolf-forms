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
    const { discount_id } = await request.json();

    if (!discount_id) {
      return NextResponse.json({ error: "discount_id is required" }, { status: 400 });
    }

    // Get session and validate it exists
    const { data: tableSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('id', params.sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching table session:', sessionError);
      return NextResponse.json({ error: "Table session not found" }, { status: 404 });
    }

    // Get discount details and validate
    const { data: discount, error: discountError } = await supabase
      .schema('pos')
      .from('discounts')
      .select('*')
      .eq('id', discount_id)
      .single();

    if (discountError) {
      console.error('Error fetching discount:', discountError);
      return NextResponse.json({ error: "Discount not found" }, { status: 404 });
    }

    if (discount.application_scope !== 'receipt') {
      return NextResponse.json({ error: "Discount is not applicable to receipts" }, { status: 400 });
    }

    if (!discount.is_active) {
      return NextResponse.json({ error: "Discount is not active" }, { status: 400 });
    }

    // Calculate current session total (sum of all orders)
    const { data: orders, error: ordersError } = await supabase
      .schema('pos')
      .from('orders')
      .select('total_amount')
      .eq('table_session_id', params.sessionId);

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: "Error fetching orders" }, { status: 500 });
    }

    const currentOrdersTotal = orders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_amount.toString()), 0) || 0;

    if (currentOrdersTotal === 0) {
      return NextResponse.json({ error: "Cannot apply discount to empty session" }, { status: 400 });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.discount_type === 'percentage') {
      discountAmount = currentOrdersTotal * (discount.discount_value / 100);
    } else {
      discountAmount = Math.min(discount.discount_value, currentOrdersTotal);
    }

    // Apply the discount to the session
    const { error: updateError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .update({
        applied_receipt_discount_id: discount_id,
        receipt_discount_amount: discountAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.sessionId);

    if (updateError) {
      console.error('Error applying receipt discount:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // The trigger will automatically update the total_amount

    return NextResponse.json({ 
      success: true, 
      discount_amount: discountAmount,
      new_session_total: currentOrdersTotal - discountAmount,
      discount_details: {
        id: discount.id,
        title: discount.title,
        type: discount.discount_type,
        value: discount.discount_value
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}