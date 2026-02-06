import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { ReconciliationDataRequest, ReconciliationDataResponse } from '../../../../admin/bank-reconciliation/types/bank-reconciliation';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ReconciliationDataRequest = await request.json();
    const { startDate, endDate } = body;

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Start date and end date are required" },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json(
        { error: "Dates must be in YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: "Start date must be before end date" },
        { status: 400 }
      );
    }

    // Run all 4 queries in parallel
    const [merchantResult, closingResult, salesResult, cashResult] = await Promise.all([
      // 1. Merchant transaction summaries (card + ewallet settlements)
      refacSupabaseAdmin
        .schema('finance')
        .from('merchant_transaction_summaries')
        .select('*')
        .gte('report_date', startDate)
        .lte('report_date', endDate)
        .order('report_date', { ascending: true }),

      // 2. POS daily closings
      refacSupabaseAdmin
        .schema('pos')
        .from('daily_reconciliations')
        .select('*')
        .gte('closing_date', startDate)
        .lte('closing_date', endDate)
        .order('closing_date', { ascending: true }),

      // 3. POS daily sales via RPC
      refacSupabaseAdmin.rpc('get_daily_sales_report', {
        p_start_date: startDate,
        p_end_date: endDate,
      }),

      // 4. Cash checks
      refacSupabaseAdmin
        .from('cash_checks')
        .select('*')
        .gte('timestamp', `${startDate}T00:00:00`)
        .lte('timestamp', `${endDate}T23:59:59`)
        .order('timestamp', { ascending: true }),
    ]);

    // Check for errors
    if (merchantResult.error) {
      console.error('Merchant query error:', merchantResult.error);
      return NextResponse.json({ error: "Failed to fetch merchant settlements" }, { status: 500 });
    }
    if (closingResult.error) {
      console.error('Closing query error:', closingResult.error);
      return NextResponse.json({ error: "Failed to fetch daily closings" }, { status: 500 });
    }
    if (salesResult.error) {
      console.error('Sales query error:', salesResult.error);
      return NextResponse.json({ error: "Failed to fetch daily sales" }, { status: 500 });
    }
    if (cashResult.error) {
      console.error('Cash check query error:', cashResult.error);
      return NextResponse.json({ error: "Failed to fetch cash checks" }, { status: 500 });
    }

    const response: ReconciliationDataResponse = {
      merchantSettlements: merchantResult.data || [],
      dailyClosings: closingResult.data || [],
      dailySales: salesResult.data || [],
      cashChecks: cashResult.data || [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Bank reconciliation data error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
