import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin as supabase } from '@/lib/refac-supabase';
import { ReceiptFormatter, DailyClosingData } from '@/lib/receipt-formatter';

export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { reconciliationId } = body;

    if (!reconciliationId) {
      return NextResponse.json({
        error: 'Reconciliation ID is required'
      }, { status: 400 });
    }

    console.log('🖨️ Fetching reconciliation for thermal print:', reconciliationId);

    // Fetch reconciliation record
    const { data: reconciliation, error } = await supabase
      .schema('pos')
      .from('daily_reconciliations')
      .select('*')
      .eq('id', reconciliationId)
      .single();

    if (error || !reconciliation) {
      console.error('❌ Error fetching reconciliation:', error);
      return NextResponse.json({
        error: 'Reconciliation not found'
      }, { status: 404 });
    }

    console.log('✅ Reconciliation found:', {
      id: reconciliation.id,
      date: reconciliation.closing_date,
      staff: reconciliation.closed_by_staff_name
    });

    // Format data for thermal printer
    const closingData: DailyClosingData = {
      closingDate: reconciliation.closing_date,
      shiftIdentifier: reconciliation.shift_identifier,
      closedByStaffName: reconciliation.closed_by_staff_name,
      expectedCash: parseFloat(reconciliation.expected_cash),
      expectedCreditCard: parseFloat(reconciliation.expected_credit_card),
      qrPaymentsTotal: parseFloat(reconciliation.qr_payments_total || '0'),
      otherPaymentsTotal: parseFloat(reconciliation.other_payments_total || '0'),
      totalSales: parseFloat(reconciliation.total_sales),
      actualCash: parseFloat(reconciliation.actual_cash),
      actualCreditCard: parseFloat(reconciliation.actual_credit_card),
      creditCardBatchReference: reconciliation.credit_card_batch_reference,
      cashVariance: parseFloat(reconciliation.cash_variance),
      creditCardVariance: parseFloat(reconciliation.credit_card_variance),
      transactionCount: reconciliation.transaction_count,
      voidedCount: reconciliation.voided_count || 0,
      voidedAmount: parseFloat(reconciliation.voided_amount || '0'),
      varianceNotes: reconciliation.variance_notes,
      createdAt: reconciliation.created_at
    };

    // Generate ESC/POS thermal data
    const thermalData = ReceiptFormatter.generateDailyClosingReport(closingData);

    console.log('✅ Thermal data generated, size:', thermalData.length, 'bytes');

    // Return thermal data as base64 for transmission
    const base64Data = Buffer.from(thermalData).toString('base64');

    return NextResponse.json({
      success: true,
      data: base64Data,
      message: 'Daily closing report thermal data ready'
    });

  } catch (error) {
    console.error('❌ Error in closing print-thermal endpoint:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
