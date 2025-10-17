import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const shiftIdentifier = searchParams.get('shift') || null;

    // Call the database function to get daily summary
    const { data, error } = await supabase
      .schema('pos')
      .rpc('get_daily_closing_summary', {
        p_date: date,
        p_shift_identifier: shiftIdentifier
      });

    if (error) {
      console.error('Error fetching closing summary:', error);
      return NextResponse.json({
        error: 'Failed to fetch closing summary'
      }, { status: 500 });
    }

    // Check if there's any data
    if (!data || data.length === 0) {
      return NextResponse.json({
        date,
        shift_identifier: shiftIdentifier,
        expected_cash: 0,
        expected_credit_card: 0,
        qr_payments_total: 0,
        other_payments_total: 0,
        transaction_count: 0,
        voided_count: 0,
        voided_amount: 0,
        total_sales: 0
      });
    }

    // Return the first row (should only be one row per date/shift)
    return NextResponse.json(data[0]);

  } catch (error) {
    console.error('Error in closing summary endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
