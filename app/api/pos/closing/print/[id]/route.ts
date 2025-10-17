import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({
        error: 'Reconciliation ID is required'
      }, { status: 400 });
    }

    // Fetch reconciliation record
    const { data: reconciliation, error } = await supabase
      .schema('pos')
      .from('daily_reconciliations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !reconciliation) {
      console.error('Error fetching reconciliation:', error);
      return NextResponse.json({
        error: 'Reconciliation not found'
      }, { status: 404 });
    }

    // Return the reconciliation data for client-side printing
    // The actual thermal formatting will be done on the client using ReceiptFormatter
    return NextResponse.json({
      success: true,
      reconciliation,
      message: 'Reconciliation data ready for printing'
    });

  } catch (error) {
    console.error('Error in closing print endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
