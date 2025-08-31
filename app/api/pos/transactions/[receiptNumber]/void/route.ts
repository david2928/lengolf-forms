import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ receiptNumber: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { receiptNumber } = await params;
    const body = await request.json();
    const { reason, staffPin } = body;

    // Validate required fields
    if (!reason || !staffPin) {
      return NextResponse.json({ 
        error: "Reason and staff PIN are required" 
      }, { status: 400 });
    }

    // Validate terminal PIN
    if (staffPin !== '40724') {
      return NextResponse.json({ 
        error: "Invalid terminal PIN" 
      }, { status: 403 });
    }

    // Get the transaction to void
    const { refacSupabaseAdmin: supabase } = await import('@/lib/refac-supabase');
    
    const { data: transaction, error: fetchError } = await supabase
      .schema('pos')
      .from('transactions')
      .select('id, status')
      .eq('receipt_number', receiptNumber)
      .single();

    if (fetchError || !transaction) {
      return NextResponse.json({ 
        error: "Transaction not found" 
      }, { status: 404 });
    }

    if (transaction.status === 'voided') {
      return NextResponse.json({ 
        error: "Transaction is already voided" 
      }, { status: 400 });
    }

    // Update transaction status to voided
    const { error: updateError } = await supabase
      .schema('pos')
      .from('transactions')
      .update({ 
        status: 'voided',
        updated_at: new Date().toISOString()
      })
      .eq('receipt_number', receiptNumber);

    if (updateError) {
      console.error('Error voiding transaction:', updateError);
      return NextResponse.json({ 
        error: "Failed to void transaction" 
      }, { status: 500 });
    }

    // Also void the transaction items
    const { error: itemsError } = await supabase
      .schema('pos')
      .from('transaction_items')
      .update({ 
        is_voided: true,
        voided_at: new Date().toISOString(),
        voided_by: 'Terminal PIN 40724'
      })
      .eq('transaction_id', transaction.id);

    if (itemsError) {
      console.warn('Failed to void transaction items:', itemsError);
      // Continue anyway - main transaction is voided
    }

    return NextResponse.json({
      success: true,
      message: "Transaction voided successfully"
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}