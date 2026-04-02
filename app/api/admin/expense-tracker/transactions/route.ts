import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month'); // YYYY-MM
    const account = searchParams.get('account') || 'all';

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 });
    }

    const startDate = `${month}-01`;
    // Last day of the month
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    // Fetch bank transactions for the month
    let txQuery = refacSupabaseAdmin
      .schema('finance')
      .from('bank_statement_transactions')
      .select('id, transaction_date, transaction_time, description, withdrawal, deposit, balance, channel, details, category, account_number, account_name')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: true })
      .order('transaction_time', { ascending: true });

    if (account !== 'all') {
      txQuery = txQuery.eq('account_number', account);
    }

    const { data: transactions, error: txError } = await txQuery;

    if (txError) {
      console.error('Transaction query error:', txError);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        transactions: [],
        summary: { total_transactions: 0, annotated_count: 0, total_withdrawals: 0, total_deposits: 0, vat_pp30: 0, vat_pp36: 0, wht_pnd3: 0, wht_pnd53: 0, revenue_cash: 0, revenue_qr: 0, revenue_card_ewallet: 0 }
      });
    }

    const txIds = transactions.map((t: { id: number }) => t.id);

    // Fetch annotations for these transactions
    const { data: annotations, error: annError } = await refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .select('*')
      .in('bank_transaction_id', txIds);

    if (annError) {
      console.error('Annotation query error:', annError);
      return NextResponse.json({ error: "Failed to fetch annotations" }, { status: 500 });
    }

    // Fetch vendor details for annotated transactions (from backoffice.vendors)
    const vendorIds = (annotations || [])
      .map((a: { vendor_id: string | null }) => a.vendor_id)
      .filter((id: string | null): id is string => id !== null);

    let vendors: Record<string, { id: string; name: string; address: string | null; tax_id: string | null; is_company: boolean; is_domestic: boolean }> = {};
    if (vendorIds.length > 0) {
      const { data: vendorData } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('vendors')
        .select('id, name, address, tax_id, is_company, is_domestic')
        .in('id', vendorIds);

      if (vendorData) {
        vendorData.forEach((v: { id: string; name: string; address: string | null; tax_id: string | null; is_company: boolean; is_domestic: boolean }) => {
          vendors[v.id] = v;
        });
      }
    }

    // Build annotation map
    const annotationMap: Record<number, typeof annotations[0]> = {};
    (annotations || []).forEach((a: { bank_transaction_id: number }) => {
      annotationMap[a.bank_transaction_id] = a;
    });

    // Fetch annotation items for annotations that have them
    const annotationsWithItems = (annotations || []).filter((a: { has_items?: boolean }) => a.has_items);
    const itemsMap: Record<number, Array<Record<string, unknown>>> = {};

    if (annotationsWithItems.length > 0) {
      const annIds = annotationsWithItems.map((a: { id: number }) => a.id);
      const { data: items } = await refacSupabaseAdmin
        .schema('finance')
        .from('transaction_annotation_items')
        .select('*')
        .in('annotation_id', annIds)
        .order('item_index', { ascending: true });

      if (items) {
        items.forEach((item: { annotation_id: number }) => {
          if (!itemsMap[item.annotation_id]) itemsMap[item.annotation_id] = [];
          itemsMap[item.annotation_id].push(item);
        });
      }
    }

    // Combine
    const combined = transactions.map((tx: { id: number; withdrawal: number; deposit: number }) => {
      const ann = annotationMap[tx.id] || null;
      const vendor = ann?.vendor_id ? vendors[ann.vendor_id] || null : null;
      const items = ann?.id ? itemsMap[ann.id] : undefined;
      return { transaction: tx, annotation: ann, vendor, ...(items ? { items } : {}) };
    });

    // Summary
    let vatPP30 = 0;
    let vatPP36 = 0;
    let whtPND3 = 0;
    let whtPND53 = 0;
    let revenueCash = 0;
    let revenueQR = 0;
    let revenueCardEwallet = 0;
    let annotatedCount = 0;
    let totalWithdrawals = 0;
    let totalDeposits = 0;

    combined.forEach((row: { transaction: { withdrawal: number; deposit: number }; annotation: { vat_type: string; vat_amount: number | null; wht_type: string; wht_amount: number | null; transaction_type: string | null } | null }) => {
      const deposit = Number(row.transaction.deposit) || 0;
      const withdrawal = Number(row.transaction.withdrawal) || 0;
      const tt = row.annotation?.transaction_type;
      // Revenue: exclude internal transfers and cash deposits
      if (tt !== 'internal_transfer' && tt !== 'cash_deposit') {
        totalDeposits += deposit;
      }
      // Expenses: include all withdrawals
      totalWithdrawals += withdrawal;
      if (row.annotation) {
        annotatedCount++;
        const vatAmt = Number(row.annotation.vat_amount) || 0;
        const whtAmt = Number(row.annotation.wht_amount) || 0;
        if (row.annotation.vat_type === 'pp30') vatPP30 += vatAmt;
        if (row.annotation.vat_type === 'pp36') vatPP36 += vatAmt;
        if (row.annotation.wht_type === 'pnd3') whtPND3 += whtAmt;
        if (row.annotation.wht_type === 'pnd53') whtPND53 += whtAmt;
        // Revenue breakdown by transaction type
        if (tt === 'cash_deposit') revenueCash += deposit;
        if (tt === 'qr_payment') revenueQR += deposit;
        if (tt === 'credit_card' || tt === 'ewallet') revenueCardEwallet += deposit;
      }
    });

    const r2 = (n: number) => Math.round(n * 100) / 100;

    return NextResponse.json({
      transactions: combined,
      summary: {
        total_transactions: transactions.length,
        annotated_count: annotatedCount,
        total_withdrawals: r2(totalWithdrawals),
        total_deposits: r2(totalDeposits),
        vat_pp30: r2(vatPP30),
        vat_pp36: r2(vatPP36),
        wht_pnd3: r2(whtPND3),
        wht_pnd53: r2(whtPND53),
        revenue_cash: r2(revenueCash),
        revenue_qr: r2(revenueQR),
        revenue_card_ewallet: r2(revenueCardEwallet),
      }
    });
  } catch (error) {
    console.error('Expense tracker transactions error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
