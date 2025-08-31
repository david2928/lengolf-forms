import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sessionId } = await params;
    
    // Get session and validate it exists
    const { data: tableSession, error: sessionError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .select('applied_receipt_discount_id, receipt_discount_amount')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Error fetching table session:', sessionError);
      return NextResponse.json({ error: "Table session not found" }, { status: 404 });
    }

    if (!tableSession.applied_receipt_discount_id) {
      return NextResponse.json({ error: "No receipt discount applied to this session" }, { status: 400 });
    }

    // Remove the discount from the session
    const { error: updateError } = await supabase
      .schema('pos')
      .from('table_sessions')
      .update({
        applied_receipt_discount_id: null,
        receipt_discount_amount: 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error removing receipt discount:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // The trigger will automatically recalculate the total_amount

    // Get the new session total
    const { data: orders, error: ordersError } = await supabase
      .schema('pos')
      .from('orders')
      .select('total_amount')
      .eq('table_session_id', sessionId);

    const newSessionTotal = orders?.reduce((sum: number, order: any) => sum + parseFloat(order.total_amount.toString()), 0) || 0;

    return NextResponse.json({ 
      success: true,
      removed_discount_amount: tableSession.receipt_discount_amount,
      new_session_total: newSessionTotal,
      message: "Receipt discount removed successfully" 
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}