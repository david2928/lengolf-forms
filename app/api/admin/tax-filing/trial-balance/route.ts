import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { TrialBalanceTxEntry, TrialBalanceData, BankAccountBalance } from '@/types/tax-filing';

const OPERATING_ACCOUNT = '170-3-26995-4';

export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period');

  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ error: "period param required (YYYY-MM)" }, { status: 400 });
  }

  try {
    const startDate = `${period}-01`;
    const [y, m] = period.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${period}-${String(lastDay).padStart(2, '0')}`;

    const [entries, bankBalances] = await Promise.all([
      fetchAllBankTransactions(period, startDate, endDate),
      fetchBankBalances(startDate, endDate),
    ]);

    const result: TrialBalanceData = { period, entries, bank_balances: bankBalances };
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in trial-balance endpoint:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Fetch all bank transactions with annotation overlay ───────────────────

async function fetchAllBankTransactions(
  period: string,
  startDate: string,
  endDate: string,
): Promise<TrialBalanceTxEntry[]> {
  // 1. All bank transactions in the period
  const { data: bankTxns, error: bankErr } = await refacSupabaseAdmin
    .schema('finance')
    .from('bank_statement_transactions')
    .select('id, transaction_date, description, deposit, withdrawal, balance, account_number')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('account_number', { ascending: true })
    .order('transaction_date', { ascending: true })
    .order('id', { ascending: true });

  if (bankErr) {
    console.error('Error fetching bank transactions:', bankErr);
    throw new Error('Failed to fetch bank transactions');
  }

  if (!bankTxns || bankTxns.length === 0) return [];

  // Operating account: expenses only (withdrawals). Sales deposits are tracked in the Sales VAT tab.
  // Savings account: show all transactions (deposits + withdrawals).
  const filteredTxns = (bankTxns as Array<{
    id: number;
    account_number: string;
    withdrawal: number | null;
  }>).filter((tx) =>
    tx.account_number !== OPERATING_ACCOUNT || (tx.withdrawal ?? 0) > 0
  );

  if (filteredTxns.length === 0) return [];

  const txIds = filteredTxns.map((t) => t.id);

  // 2. Annotations + extras (for check-off state of non-annotated txns) in parallel
  const extraKeys = txIds.map((id) => `bt_${id}`);

  const [annotationsResult, extrasResult] = await Promise.all([
    refacSupabaseAdmin
      .schema('finance')
      .from('transaction_annotations')
      .select('id, bank_transaction_id, vendor_id, vendor_name_override, vat_type, vat_amount, wht_type, wht_amount, transaction_type, notes, flow_completed')
      .in('bank_transaction_id', txIds),
    refacSupabaseAdmin
      .schema('finance')
      .from('expense_checklist_extras')
      .select('item_key, flow_completed')
      .eq('period', period)
      .in('item_key', extraKeys),
  ]);

  if (annotationsResult.error) {
    console.error('Error fetching annotations:', annotationsResult.error);
  }
  if (extrasResult.error) {
    console.error('Error fetching checklist extras:', extrasResult.error);
  }

  // Build annotation map: bank_transaction_id → annotation
  const annMap = new Map<number, {
    id: number;
    vendor_id: string | null;
    vendor_name_override: string | null;
    vat_type: string;
    vat_amount: string | null;
    wht_type: string;
    wht_amount: string | null;
    transaction_type: string | null;
    notes: string | null;
    flow_completed: boolean;
  }>();
  (annotationsResult.data || []).forEach((a: {
    id: number;
    bank_transaction_id: number;
    vendor_id: string | null;
    vendor_name_override: string | null;
    vat_type: string;
    vat_amount: string | null;
    wht_type: string;
    wht_amount: string | null;
    transaction_type: string | null;
    notes: string | null;
    flow_completed: boolean;
  }) => {
    annMap.set(a.bank_transaction_id, a);
  });

  // Build extras map: item_key → flow_completed
  const extrasMap = new Map<string, boolean>();
  (extrasResult.data || []).forEach((e: { item_key: string; flow_completed: boolean }) => {
    extrasMap.set(e.item_key, e.flow_completed);
  });

  // 3. Fetch vendor names for vendor_ids in annotations
  const vendorIds = Array.from(new Set(
    Array.from(annMap.values())
      .map((a) => a.vendor_id)
      .filter((id): id is string => id !== null)
  ));

  const vendorMap = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendors } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('id, name')
      .in('id', vendorIds);
    (vendors || []).forEach((v: { id: string; name: string }) => {
      vendorMap.set(v.id, v.name);
    });
  }

  // 4. Build entries
  return (filteredTxns as Array<{
    id: number;
    transaction_date: string;
    description: string;
    deposit: number | null;
    withdrawal: number | null;
    balance: number;
    account_number: string;
  }>).map((tx) => {
    const ann = annMap.get(tx.id);
    const vendorName = ann
      ? (ann.vendor_name_override || (ann.vendor_id ? vendorMap.get(ann.vendor_id) ?? null : null))
      : null;

    const flowCompleted = ann
      ? (ann.flow_completed ?? false)
      : (extrasMap.get(`bt_${tx.id}`) ?? false);

    return {
      bank_transaction_id: tx.id,
      transaction_date: tx.transaction_date,
      description: tx.description || '',
      deposit: parseFloat(String(tx.deposit || 0)),
      withdrawal: parseFloat(String(tx.withdrawal || 0)),
      balance: parseFloat(String(tx.balance || 0)),
      account_number: tx.account_number || OPERATING_ACCOUNT,
      annotation_id: ann ? ann.id : null,
      vendor_name: vendorName ?? null,
      vat_type: (ann?.vat_type || 'none') as 'none' | 'pp30' | 'pp36',
      wht_type: (ann?.wht_type || 'none') as 'none' | 'pnd3' | 'pnd53',
      vat_amount: ann?.vat_amount ? parseFloat(String(ann.vat_amount)) : null,
      wht_amount: ann?.wht_amount ? parseFloat(String(ann.wht_amount)) : null,
      transaction_type: ann?.transaction_type ?? null,
      notes: ann?.notes ?? null,
      flow_completed: flowCompleted,
    };
  });
}

// ── Fetch bank balances ───────────────────────────────────────────────────

async function fetchBankBalances(
  startDate: string,
  endDate: string,
): Promise<BankAccountBalance[]> {
  // Try RPC first
  const { data, error } = await refacSupabaseAdmin.rpc('get_bank_balances_for_period', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (!error && data && (data as unknown[]).length > 0) {
    return (data as Array<{
      account_number: string;
      account_name: string;
      beginning_balance: number;
      ending_balance: number;
      total_deposits: number;
      total_withdrawals: number;
      transaction_count: number;
    }>).map((row) => ({
      account_number: row.account_number,
      account_name: row.account_name || 'LENGOLF CO.,LTD.',
      beginning_balance: parseFloat(String(row.beginning_balance || 0)),
      ending_balance: parseFloat(String(row.ending_balance || 0)),
      total_deposits: parseFloat(String(row.total_deposits || 0)),
      total_withdrawals: parseFloat(String(row.total_withdrawals || 0)),
      transaction_count: Number(row.transaction_count || 0),
    }));
  }

  if (error) {
    console.warn('get_bank_balances_for_period RPC not found, using fallback query');
  }

  // Fallback: direct query
  const { data: periodData, error: periodErr } = await refacSupabaseAdmin
    .schema('finance')
    .from('bank_statement_transactions')
    .select('account_number, account_name, deposit, withdrawal, balance, transaction_date')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date', { ascending: true })
    .order('id', { ascending: true });

  if (periodErr || !periodData || periodData.length === 0) {
    if (periodErr) console.error('Error fetching bank transactions for balances:', periodErr);
    return [];
  }

  const accountMap = new Map<string, {
    account_name: string;
    total_deposits: number;
    total_withdrawals: number;
    transaction_count: number;
    last_balance: number;
  }>();

  (periodData as Array<{
    account_number: string;
    account_name: string;
    deposit: number | null;
    withdrawal: number | null;
    balance: number;
  }>).forEach((tx) => {
    const acct = accountMap.get(tx.account_number) || {
      account_name: tx.account_name || 'LENGOLF CO.,LTD.',
      total_deposits: 0,
      total_withdrawals: 0,
      transaction_count: 0,
      last_balance: 0,
    };
    acct.total_deposits += parseFloat(String(tx.deposit || 0));
    acct.total_withdrawals += parseFloat(String(tx.withdrawal || 0));
    acct.transaction_count++;
    acct.last_balance = parseFloat(String(tx.balance));
    accountMap.set(tx.account_number, acct);
  });

  const accountNumbers = Array.from(accountMap.keys());
  const beginMap = new Map<string, number>();

  await Promise.all(accountNumbers.map(async (acctNum) => {
    const { data: beginRow } = await refacSupabaseAdmin
      .schema('finance')
      .from('bank_statement_transactions')
      .select('balance')
      .eq('account_number', acctNum)
      .lt('transaction_date', startDate)
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false })
      .limit(1);

    if (beginRow && beginRow.length > 0) {
      beginMap.set(acctNum, parseFloat(String((beginRow[0] as { balance: number }).balance)));
    }
  }));

  const order = [OPERATING_ACCOUNT, '170-3-27029-4'];
  const sortedKeys = Array.from(accountMap.keys()).sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return sortedKeys.map((acctNum) => {
    const acct = accountMap.get(acctNum)!;
    return {
      account_number: acctNum,
      account_name: acct.account_name,
      beginning_balance: Math.round((beginMap.get(acctNum) || 0) * 100) / 100,
      ending_balance: Math.round(acct.last_balance * 100) / 100,
      total_deposits: Math.round(acct.total_deposits * 100) / 100,
      total_withdrawals: Math.round(acct.total_withdrawals * 100) / 100,
      transaction_count: acct.transaction_count,
    };
  });
}
