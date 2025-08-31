import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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

    // Note: Order creation is handled by the confirm-order endpoint
    // This endpoint just adds items to the current session cart

    // Store order items in current_order_items JSONB column instead of notes
    // The notes field should remain for human-readable session notes
    let currentOrderItems = tableSession.current_order_items || [];
    if (!Array.isArray(currentOrderItems)) {
      currentOrderItems = [];
    }

    // Add individual items to the cart
    const itemsWithTimestamp = orderItems.map((item: any) => ({
      ...item,
      addedAt: new Date().toISOString()
    }));
    
    currentOrderItems.push(...itemsWithTimestamp);

    // Update table session with new total and order data
    const newTotalAmount = parseFloat(tableSession.total_amount || '0') + orderTotal;
    
    const { error: updateError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .update({
        total_amount: newTotalAmount,
        current_order_items: currentOrderItems,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating table session:', updateError);
      return NextResponse.json({ error: "Failed to update table session" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      totalAmount: newTotalAmount,
      message: "Items added to cart successfully"
    });

  } catch (error) {
    console.error('Error in POST /api/pos/table-sessions/[sessionId]/add-order:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}