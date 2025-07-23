import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = params;
    const body = await request.json();
    const { orderItems, orderTotal } = body;

    // Validate that the table session exists
    const { data: tableSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !tableSession) {
      return NextResponse.json({ error: "Table session not found" }, { status: 404 });
    }

    // Generate UUID for order ID
    const orderId = crypto.randomUUID();

    // Create table order record
    const { error: orderError } = await supabase
      .schema('pos')
      .from('table_orders')
      .insert({
        table_session_id: sessionId,
        order_id: orderId,
        order_number: `ORD-${Date.now()}`,
        order_total: orderTotal,
        order_status: 'active'
      });

    if (orderError) {
      console.error('Error creating table order:', orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Store order items as JSON in the table session notes
    // Parse existing orders or initialize empty structure
    let existingData: { orders: any[] } = { orders: [] };
    if (tableSession.notes) {
      try {
        existingData = JSON.parse(tableSession.notes);
        if (!existingData.orders) {
          existingData.orders = [];
        }
      } catch (e) {
        console.error('Failed to parse existing notes:', e);
        existingData = { orders: [] };
      }
    }

    // Add individual order items to the orders array
    const itemsWithOrderId = orderItems.map((item: any) => ({
      ...item,
      orderId, // Add order ID for tracking
      addedAt: new Date().toISOString()
    }));
    
    existingData.orders.push(...itemsWithOrderId);

    // Update table session with new total and order data
    const newTotalAmount = parseFloat(tableSession.total_amount || '0') + orderTotal;
    
    const { error: updateError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .update({
        total_amount: newTotalAmount,
        notes: JSON.stringify({
          ...existingData,
          lastUpdated: new Date().toISOString()
        }),
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating table session:', updateError);
      return NextResponse.json({ error: "Failed to update table session" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      orderId,
      totalAmount: newTotalAmount,
      message: "Order added successfully"
    });

  } catch (error) {
    console.error('Error in POST /api/pos/table-sessions/[sessionId]/add-order:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}