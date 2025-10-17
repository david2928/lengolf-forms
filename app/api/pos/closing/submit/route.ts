import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';

interface SubmitReconciliationRequest {
  date: string;
  shift_identifier?: string;
  actual_cash: number;
  actual_credit_card: number;
  credit_card_batch_reference?: string;
  variance_notes?: string;
  staff_pin: string;
}

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: SubmitReconciliationRequest = await request.json();
    const {
      date,
      shift_identifier,
      actual_cash,
      actual_credit_card,
      credit_card_batch_reference,
      variance_notes,
      staff_pin
    } = body;

    // Validate required fields
    if (!date || actual_cash === undefined || actual_credit_card === undefined || !staff_pin) {
      return NextResponse.json({
        error: 'Date, actual cash, actual credit card, and staff PIN are required'
      }, { status: 400 });
    }

    // Verify staff PIN (using clear_pin column like staff login)
    const { data: staffData, error: staffError } = await supabase
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name')
      .eq('clear_pin', staff_pin)
      .eq('is_active', true)
      .maybeSingle();

    if (staffError || !staffData) {
      return NextResponse.json({
        error: 'Invalid staff PIN'
      }, { status: 401 });
    }

    // Get expected amounts from the summary function
    const { data: summaryData, error: summaryError } = await supabase
      .schema('pos')
      .rpc('get_daily_closing_summary', {
        p_date: date,
        p_shift_identifier: shift_identifier || null
      });

    if (summaryError || !summaryData || summaryData.length === 0) {
      return NextResponse.json({
        error: 'Failed to fetch expected amounts'
      }, { status: 500 });
    }

    const summary = summaryData[0];

    // Calculate variances
    const cash_variance = actual_cash - parseFloat(summary.expected_cash);
    const credit_card_variance = actual_credit_card - parseFloat(summary.expected_credit_card);

    // Insert reconciliation record
    const { data: reconciliationData, error: reconciliationError } = await supabase
      .schema('pos')
      .from('daily_reconciliations')
      .insert({
        closing_date: date,
        shift_identifier: shift_identifier || null,
        expected_cash: summary.expected_cash,
        expected_credit_card: summary.expected_credit_card,
        qr_payments_total: summary.qr_payments_total,
        other_payments_total: summary.other_payments_total,
        actual_cash,
        actual_credit_card,
        credit_card_batch_reference: credit_card_batch_reference || null,
        cash_variance,
        credit_card_variance,
        transaction_count: summary.transaction_count,
        voided_count: summary.voided_count,
        voided_amount: summary.voided_amount,
        total_sales: summary.total_sales,
        closed_by_staff_id: staffData.id,
        closed_by_staff_name: staffData.staff_name,
        variance_notes: variance_notes || null
      })
      .select()
      .single();

    if (reconciliationError) {
      console.error('Error creating reconciliation:', reconciliationError);

      // Check if it's a unique constraint violation
      if (reconciliationError.code === '23505') {
        return NextResponse.json({
          error: 'Reconciliation already exists for this date and shift'
        }, { status: 409 });
      }

      return NextResponse.json({
        error: 'Failed to create reconciliation'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      reconciliation: reconciliationData,
      cash_variance,
      credit_card_variance
    });

  } catch (error) {
    console.error('Error in closing submit endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
