import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { receiptNumber } = await params;

    // Use the optimized RPC function to get all transaction data in a single call
    const { data, error } = await supabase.rpc('get_pos_transaction_by_receipt', {
      receipt_number_param: receiptNumber
    });

    if (error) {
      console.error('RPC query error:', error);
      return NextResponse.json({ 
        error: "Failed to fetch transaction",
        details: error.message 
      }, { status: 500 });
    }

    if (!data || !data.transaction) {
      return NextResponse.json({ 
        error: "Transaction not found" 
      }, { status: 404 });
    }

    // The RPC function returns the data in the exact format expected by the frontend
    return NextResponse.json(data);

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}