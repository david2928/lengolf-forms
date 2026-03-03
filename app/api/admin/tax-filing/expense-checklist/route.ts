import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type {
  ExpenseChecklistItem,
  Pp36LineItem,
  KbankEdcItem,
  PlatformFeeItem,
  ExpenseChecklistSummary,
  ExpenseChecklistData,
  MonthlySalesData,
  MonthlySalesLineItem,
  MonthlyPayrollData,
  VatSummaryData,
  BankAccountBalance,
} from '@/types/tax-filing';

// Revenue transaction types to exclude (not expenses)
const REVENUE_TYPES = ['credit_card', 'ewallet', 'qr_payment', 'sale', 'cash_deposit', 'internal_transfer', 'platform_settlement'];

// KBank merchant IDs
const KBANK_CARD_MERCHANT = '401016061365001';
const KBANK_EWALLET_MERCHANT = '401016061373001';

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

    // Calculate previous month for PP36 claimable lookup
    const prevMonth = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;

    // Run all independent queries in parallel
    const [annotationsResult, kbankData, salesData, otherSalesResult, platformFees, bankBalances, pp36Data] = await Promise.all([
      fetchAnnotationsWithBankTxns(startDate, endDate),
      fetchKbankEdc(period, startDate, endDate),
      fetchPosSales(startDate, endDate),
      fetchOtherSales(startDate, endDate),
      fetchPlatformFees(period, startDate, endDate),
      fetchBankBalances(startDate, endDate),
      fetchPp36ByReportingMonth(prevMonth, period),
    ]);

    const { items, payroll } = annotationsResult;

    return NextResponse.json(
      buildResponse(period, items, kbankData, platformFees, salesData, otherSalesResult, payroll, bankBalances, pp36Data)
    );
  } catch (error) {
    console.error('Error in expense checklist endpoint:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Fetch annotations + bank transactions + vendors ─────────────────────

async function fetchAnnotationsWithBankTxns(
  startDate: string,
  endDate: string
): Promise<{ items: ExpenseChecklistItem[]; payroll: MonthlyPayrollData }> {
  // 1. Fetch all annotations
  const { data: annotations, error: annError } = await refacSupabaseAdmin
    .schema('finance')
    .from('transaction_annotations')
    .select(`
      id,
      bank_transaction_id,
      vendor_id,
      vendor_name_override,
      vat_type,
      vat_amount,
      wht_type,
      wht_amount,
      tax_base,
      transaction_type,
      notes,
      invoice_ref,
      document_url,
      flow_completed
    `);

  if (annError) {
    console.error('Error fetching annotations:', annError);
    throw new Error("Failed to fetch annotations");
  }

  if (!annotations || annotations.length === 0) {
    return {
      items: [],
      payroll: { total_salary: 0, salary_count: 0, total_sso: 0, sso_count: 0 },
    };
  }

  // Get all bank transaction IDs from annotations
  const bankTxIds = annotations.map((a: { bank_transaction_id: number }) => a.bank_transaction_id);

  // 2. Fetch bank transactions — include account_number
  const { data: bankTxns, error: bankError } = await refacSupabaseAdmin
    .schema('finance')
    .from('bank_statement_transactions')
    .select('id, transaction_date, withdrawal, description, account_number')
    .in('id', bankTxIds)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .gt('withdrawal', 0);

  if (bankError) {
    console.error('Error fetching bank transactions:', bankError);
    throw new Error("Failed to fetch bank transactions");
  }

  // Build bank transaction lookup
  const bankTxMap = new Map<number, {
    transaction_date: string;
    withdrawal: number;
    description: string;
    account_number: string;
  }>();
  (bankTxns || []).forEach((tx: {
    id: number;
    transaction_date: string;
    withdrawal: number;
    description: string;
    account_number: string;
  }) => {
    bankTxMap.set(tx.id, tx);
  });

  // Filter annotations to only those with matching bank withdrawals in the period
  const filteredAnnotations = annotations.filter((ann: {
    bank_transaction_id: number;
    transaction_type: string | null;
  }) => {
    const bankTx = bankTxMap.get(ann.bank_transaction_id);
    if (!bankTx) return false;
    // Exclude revenue transaction types
    if (ann.transaction_type && REVENUE_TYPES.includes(ann.transaction_type)) return false;
    return true;
  });

  // 3. Fetch vendors for display names
  const vendorIds = filteredAnnotations
    .map((a: { vendor_id: string | null }) => a.vendor_id)
    .filter((id: string | null): id is string => id !== null);

  const vendorMap = new Map<string, { name: string }>();
  if (vendorIds.length > 0) {
    const uniqueVendorIds = Array.from(new Set(vendorIds));
    const { data: vendorData, error: vendorError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('id, name')
      .in('id', uniqueVendorIds);

    if (vendorError) {
      console.error('Error fetching vendors:', vendorError);
    } else {
      (vendorData || []).forEach((v: { id: string; name: string }) => {
        vendorMap.set(v.id, { name: v.name });
      });
    }
  }

  // 4. Build checklist items + extract payroll data
  let totalSalary = 0;
  let salaryCount = 0;
  let totalSso = 0;
  let ssoCount = 0;

  const items: ExpenseChecklistItem[] = filteredAnnotations.map((ann: {
    id: number;
    bank_transaction_id: number;
    vendor_id: string | null;
    vendor_name_override: string | null;
    vat_type: string;
    vat_amount: string | null;
    wht_type: string;
    wht_amount: string | null;
    tax_base: string | null;
    transaction_type: string | null;
    notes: string | null;
    invoice_ref: string | null;
    document_url: string | null;
    flow_completed: boolean;
  }) => {
    const bankTx = bankTxMap.get(ann.bank_transaction_id)!;
    const vendor = ann.vendor_id ? vendorMap.get(ann.vendor_id) : null;
    const vendorName = ann.vendor_name_override || vendor?.name || bankTx.description || 'Unknown';

    // Aggregate salary and SSO
    if (ann.transaction_type === 'salary') {
      totalSalary = Math.round((totalSalary + bankTx.withdrawal) * 100) / 100;
      salaryCount++;
    }
    if (ann.transaction_type === 'sso') {
      totalSso = Math.round((totalSso + bankTx.withdrawal) * 100) / 100;
      ssoCount++;
    }

    return {
      id: ann.id,
      bank_transaction_id: ann.bank_transaction_id,
      transaction_date: bankTx.transaction_date,
      vendor_name: vendorName,
      account_number: bankTx.account_number || '170-3-26995-4',
      vat_type: (ann.vat_type || 'none') as 'none' | 'pp30' | 'pp36',
      vat_amount: ann.vat_amount ? parseFloat(String(ann.vat_amount)) : null,
      wht_type: (ann.wht_type || 'none') as 'none' | 'pnd3' | 'pnd53',
      wht_amount: ann.wht_amount ? parseFloat(String(ann.wht_amount)) : null,
      tax_base: ann.tax_base ? parseFloat(String(ann.tax_base)) : null,
      withdrawal: bankTx.withdrawal,
      transaction_type: ann.transaction_type,
      notes: ann.notes,
      invoice_ref: ann.invoice_ref,
      document_url: ann.document_url,
      flow_completed: ann.flow_completed || false,
    };
  });

  // Sort by account_number (operating first), then by transaction_date
  items.sort((a, b) => {
    if (a.account_number !== b.account_number) {
      return a.account_number.localeCompare(b.account_number);
    }
    return a.transaction_date.localeCompare(b.transaction_date);
  });

  return {
    items,
    payroll: {
      total_salary: totalSalary,
      salary_count: salaryCount,
      total_sso: totalSso,
      sso_count: ssoCount,
    },
  };
}

// ── Fetch PP36 by vat_reporting_month ────────────────────────────────────
// PP36 input VAT is based on invoice month (vat_reporting_month), not bank date.
// Claimable = previous month's invoices (PP36 filed & paid this month).
// Payable = current month's invoices (PP36 to file & pay next month).

interface Pp36Data {
  claimable_items: Pp36LineItem[];
  payable_items: Pp36LineItem[];
  claimable_vat: number;
  claimable_base: number;
  payable_vat: number;
  payable_base: number;
}

async function fetchPp36ByReportingMonth(
  prevMonth: string,
  currentMonth: string
): Promise<Pp36Data> {
  // Fetch PP36 annotations with bank transaction + vendor details
  const { data: annotations, error: annError } = await refacSupabaseAdmin
    .schema('finance')
    .from('transaction_annotations')
    .select('id, bank_transaction_id, vendor_id, vendor_name_override, vat_amount, tax_base, vat_reporting_month, notes, flow_completed')
    .eq('vat_type', 'pp36')
    .in('vat_reporting_month', [prevMonth, currentMonth]);

  if (annError || !annotations || annotations.length === 0) {
    if (annError) console.error('Error fetching PP36 by reporting month:', annError);
    return { claimable_items: [], payable_items: [], claimable_vat: 0, claimable_base: 0, payable_vat: 0, payable_base: 0 };
  }

  // Fetch bank transactions for dates/withdrawals
  const bankTxIds = annotations.map((a: { bank_transaction_id: number }) => a.bank_transaction_id);
  const { data: bankTxns } = await refacSupabaseAdmin
    .schema('finance')
    .from('bank_statement_transactions')
    .select('id, transaction_date, withdrawal')
    .in('id', bankTxIds);

  const bankTxMap = new Map<number, { transaction_date: string; withdrawal: number }>();
  (bankTxns || []).forEach((tx: { id: number; transaction_date: string; withdrawal: number }) => {
    bankTxMap.set(tx.id, tx);
  });

  // Fetch vendor names
  const vendorIds = annotations
    .map((a: { vendor_id: string | null }) => a.vendor_id)
    .filter((id: string | null): id is string => id !== null);
  const vendorMap = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: vendors } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('id, name')
      .in('id', Array.from(new Set(vendorIds)));
    (vendors || []).forEach((v: { id: string; name: string }) => {
      vendorMap.set(v.id, v.name);
    });
  }

  // Build line items and aggregate
  const claimableItems: Pp36LineItem[] = [];
  const payableItems: Pp36LineItem[] = [];
  let claimableVat = 0, claimableBase = 0, payableVat = 0, payableBase = 0;

  (annotations as Array<{
    id: number;
    bank_transaction_id: number;
    vendor_id: string | null;
    vendor_name_override: string | null;
    vat_amount: string | null;
    tax_base: string | null;
    vat_reporting_month: string;
    notes: string | null;
    flow_completed: boolean;
  }>).forEach((ann) => {
    const bankTx = bankTxMap.get(ann.bank_transaction_id);
    const vat = parseFloat(String(ann.vat_amount || 0));
    const grossBase = parseFloat(String(ann.tax_base || 0));
    const netBase = Math.round((grossBase - vat) * 100) / 100;
    const vendorName = ann.vendor_name_override
      || (ann.vendor_id ? vendorMap.get(ann.vendor_id) : null)
      || 'Unknown';

    const item: Pp36LineItem = {
      id: ann.id,
      vendor_name: vendorName,
      invoice_month: ann.vat_reporting_month,
      vat_amount: Math.round(vat * 100) / 100,
      tax_base: netBase,
      withdrawal: bankTx?.withdrawal || 0,
      transaction_date: bankTx?.transaction_date || '',
      notes: ann.notes,
      flow_completed: ann.flow_completed || false,
    };

    if (ann.vat_reporting_month === prevMonth) {
      claimableItems.push(item);
      claimableVat += vat;
      claimableBase += netBase;
    } else {
      payableItems.push(item);
      payableVat += vat;
      payableBase += netBase;
    }
  });

  // Sort by transaction date
  claimableItems.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  payableItems.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  return {
    claimable_items: claimableItems,
    payable_items: payableItems,
    claimable_vat: Math.round(claimableVat * 100) / 100,
    claimable_base: Math.round(claimableBase * 100) / 100,
    payable_vat: Math.round(payableVat * 100) / 100,
    payable_base: Math.round(payableBase * 100) / 100,
  };
}

// ── Fetch POS Sales ─────────────────────────────────────────────────────

async function fetchPosSales(
  startDate: string,
  endDate: string
): Promise<{
  pos_credit: number;
  pos_ewallet: number;
  pos_qr: number;
  pos_cash: number;
  pos_sales_net: number;
  pos_sales_vat: number;
  pos_sales_total: number;
  pos_receipt_count: number;
}> {
  // Use get_daily_sales_report RPC — it properly allocates Split Payment across methods
  const { data: dailyRows, error: rpcError } = await refacSupabaseAdmin
    .rpc('get_daily_sales_report', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

  if (rpcError) {
    console.error('Error fetching POS sales via RPC:', rpcError);
    return { pos_credit: 0, pos_ewallet: 0, pos_qr: 0, pos_cash: 0, pos_sales_net: 0, pos_sales_vat: 0, pos_sales_total: 0, pos_receipt_count: 0 };
  }

  let posCash = 0;
  let posQr = 0;
  let posCredit = 0;
  let posEwallet = 0;
  let totalNet = 0;
  let totalVat = 0;
  let totalAmount = 0;
  let receiptCount = 0;

  // RPC returns camelCase column names
  (dailyRows || []).forEach((row: {
    cashPayment: string;
    qrPayment: string;
    edcPayment: string;
    ewalletPayment: string;
    netSales: string;
    vat: string;
    totalSales: string;
    salesTransactions: number;
  }) => {
    posCash += parseFloat(row.cashPayment || '0');
    posQr += parseFloat(row.qrPayment || '0');
    posCredit += parseFloat(row.edcPayment || '0');
    posEwallet += parseFloat(row.ewalletPayment || '0');
    totalNet += parseFloat(row.netSales || '0');
    totalVat += parseFloat(row.vat || '0');
    totalAmount += parseFloat(row.totalSales || '0');
    receiptCount += Number(row.salesTransactions || 0);
  });

  return {
    pos_credit: Math.round(posCredit * 100) / 100,
    pos_ewallet: Math.round(posEwallet * 100) / 100,
    pos_qr: Math.round(posQr * 100) / 100,
    pos_cash: Math.round(posCash * 100) / 100,
    pos_sales_net: Math.round(totalNet * 100) / 100,
    pos_sales_vat: Math.round(totalVat * 100) / 100,
    pos_sales_total: Math.round(totalAmount * 100) / 100,
    pos_receipt_count: receiptCount,
  };
}

// ── Fetch Other Sales (from annotations with transaction_type='sale') ───

async function fetchOtherSales(
  startDate: string,
  endDate: string
): Promise<MonthlySalesLineItem[]> {
  // Fetch annotations tagged as 'sale' or 'platform_settlement'
  const { data: saleAnnotations, error: annError } = await refacSupabaseAdmin
    .schema('finance')
    .from('transaction_annotations')
    .select('id, bank_transaction_id, vendor_id, vendor_name_override, transaction_type, notes, invoice_ref')
    .in('transaction_type', ['sale', 'platform_settlement']);

  if (annError || !saleAnnotations || saleAnnotations.length === 0) {
    if (annError) console.error('Error fetching sale annotations:', annError);
    return [];
  }

  // Get bank transactions for these annotations (deposits in period)
  const bankTxIds = saleAnnotations.map((a: { bank_transaction_id: number }) => a.bank_transaction_id);
  const { data: bankTxns, error: bankError } = await refacSupabaseAdmin
    .schema('finance')
    .from('bank_statement_transactions')
    .select('id, transaction_date, deposit, description')
    .in('id', bankTxIds)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .gt('deposit', 0);

  if (bankError || !bankTxns || bankTxns.length === 0) {
    if (bankError) console.error('Error fetching sale bank transactions:', bankError);
    return [];
  }

  const bankTxMap = new Map<number, { deposit: number; description: string; transaction_date: string }>();
  (bankTxns as Array<{ id: number; deposit: number; description: string; transaction_date: string }>).forEach((tx) => {
    bankTxMap.set(tx.id, tx);
  });

  // Resolve vendor names
  const vendorIds = saleAnnotations
    .map((a: { vendor_id: string | null }) => a.vendor_id)
    .filter((id: string | null): id is string => id !== null);

  const vendorNameMap = new Map<string, string>();
  if (vendorIds.length > 0) {
    const uniqueIds = Array.from(new Set(vendorIds));
    const { data: vendors } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendors')
      .select('id, name')
      .in('id', uniqueIds);
    (vendors || []).forEach((v: { id: string; name: string }) => {
      vendorNameMap.set(v.id, v.name);
    });
  }

  // For platform_settlement: fetch vendor receipts to get commission amounts
  // gross sale = deposit (net from platform) + commission (from vendor receipt)
  const platformVendorIds = saleAnnotations
    .filter((a: { transaction_type: string }) => a.transaction_type === 'platform_settlement')
    .map((a: { vendor_id: string | null }) => a.vendor_id)
    .filter((id: string | null): id is string => id !== null);

  // Map vendor_id → total commission from vendor receipts in this period
  const platformCommissionMap = new Map<string, number>();
  if (platformVendorIds.length > 0) {
    const uniquePlatformIds = Array.from(new Set(platformVendorIds));
    const { data: receipts } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select('vendor_id, total_amount')
      .in('vendor_id', uniquePlatformIds)
      .or(`and(receipt_date.gte.${startDate},receipt_date.lte.${endDate}),and(invoice_date.gte.${startDate},invoice_date.lte.${endDate})`);

    (receipts || []).forEach((r: { vendor_id: string; total_amount: number | null }) => {
      const existing = platformCommissionMap.get(r.vendor_id) || 0;
      platformCommissionMap.set(r.vendor_id, existing + parseFloat(String(r.total_amount || 0)));
    });
  }

  // Build line items
  const items: MonthlySalesLineItem[] = [];
  (saleAnnotations as Array<{
    id: number;
    bank_transaction_id: number;
    vendor_id: string | null;
    vendor_name_override: string | null;
    transaction_type: string;
    notes: string | null;
    invoice_ref: string | null;
  }>).forEach((ann) => {
    const bankTx = bankTxMap.get(ann.bank_transaction_id);
    if (!bankTx) return;

    let amount: number;
    if (ann.transaction_type === 'platform_settlement' && ann.vendor_id) {
      // Gross sale = deposit (net) + platform commission (from vendor receipt)
      const commission = platformCommissionMap.get(ann.vendor_id) || 0;
      amount = Math.round((parseFloat(String(bankTx.deposit)) + commission) * 100) / 100;
    } else {
      // Direct sale — deposit is the gross amount
      amount = Math.round(parseFloat(String(bankTx.deposit)) * 100) / 100;
    }

    const vat = Math.round((amount * 7 / 107) * 100) / 100;
    const vendorName = ann.vendor_name_override
      || (ann.vendor_id ? vendorNameMap.get(ann.vendor_id) : null)
      || ann.notes
      || bankTx.description
      || 'Unknown';

    items.push({
      category: vendorName,
      description: ann.invoice_ref || '',
      amount,
      vat,
    });
  });

  // Sort by amount descending
  items.sort((a, b) => b.amount - a.amount);
  return items;
}

// ── Fetch KBank EDC ─────────────────────────────────────────────────────

async function fetchKbankEdc(
  period: string,
  startDate: string,
  endDate: string
): Promise<KbankEdcItem[]> {
  // Fetch merchant transaction summaries aggregated by merchant_id
  const { data: merchantData, error: merchantError } = await refacSupabaseAdmin
    .schema('finance')
    .from('merchant_transaction_summaries')
    .select('merchant_id, total_fee_commission_amount, vat_on_fee_amount')
    .gte('report_date', startDate)
    .lte('report_date', endDate)
    .in('merchant_id', [KBANK_CARD_MERCHANT, KBANK_EWALLET_MERCHANT]);

  if (merchantError) {
    console.error('Error fetching merchant data:', merchantError);
    return [];
  }

  // Fetch completion state from expense_checklist_extras
  const { data: extras } = await refacSupabaseAdmin
    .schema('finance')
    .from('expense_checklist_extras')
    .select('item_key, flow_completed')
    .eq('period', period)
    .in('item_key', ['kbank_card', 'kbank_ewallet']);

  const extrasMap = new Map<string, boolean>();
  (extras || []).forEach((e: { item_key: string; flow_completed: boolean }) => {
    extrasMap.set(e.item_key, e.flow_completed);
  });

  // Aggregate by merchant
  const cardRows = (merchantData || []).filter(
    (r: { merchant_id: string }) => r.merchant_id === KBANK_CARD_MERCHANT
  );
  const ewalletRows = (merchantData || []).filter(
    (r: { merchant_id: string }) => r.merchant_id === KBANK_EWALLET_MERCHANT
  );

  const result: KbankEdcItem[] = [];

  const buildItem = (
    key: string,
    label: string,
    rows: Array<{ total_fee_commission_amount: number; vat_on_fee_amount: number }>
  ): KbankEdcItem | null => {
    if (rows.length === 0) return null;
    const totalCommission = Math.round(rows.reduce((s, r) => s + parseFloat(String(r.total_fee_commission_amount || 0)), 0) * 100) / 100;
    const totalVat = Math.round(rows.reduce((s, r) => s + parseFloat(String(r.vat_on_fee_amount || 0)), 0) * 100) / 100;
    return {
      item_key: key,
      label,
      total_commission: totalCommission,
      total_vat: totalVat,
      total_amount: Math.round((totalCommission + totalVat) * 100) / 100,
      settlement_count: rows.length,
      flow_completed: extrasMap.get(key) || false,
    };
  };

  const cardItem = buildItem('kbank_card', 'KBank Card (EDC)', cardRows);
  if (cardItem) result.push(cardItem);

  const ewalletItem = buildItem('kbank_ewallet', 'KBank eWallet', ewalletRows);
  if (ewalletItem) result.push(ewalletItem);

  return result;
}

// ── Fetch Platform Fees (GoWabi, etc.) ──────────────────────────────────
// Platform fee vendors (category='Platform') always show in the checklist.
// If a vendor receipt exists for that vendor in the period, amounts auto-populate.

async function fetchPlatformFees(
  period: string,
  startDate: string,
  endDate: string
): Promise<PlatformFeeItem[]> {
  // 1. Get all platform fee vendors
  const { data: pfVendors, error: vendorError } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('vendors')
    .select('id, name')
    .eq('category', 'Platform');

  if (vendorError || !pfVendors || pfVendors.length === 0) {
    if (vendorError) console.error('Error fetching platform vendors:', vendorError);
    return [];
  }

  const vendorIds = pfVendors.map((v: { id: string }) => v.id);
  const vendorNameMap = new Map<string, string>();
  pfVendors.forEach((v: { id: string; name: string }) => {
    vendorNameMap.set(v.id, v.name);
  });

  // 2. Find vendor receipts for these vendors in the period
  const { data: receipts } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('vendor_receipts')
    .select(`
      id, vendor_id, receipt_date, invoice_number,
      total_amount, tax_base, vat_amount, vat_type
    `)
    .in('vendor_id', vendorIds)
    .or(`and(receipt_date.gte.${startDate},receipt_date.lte.${endDate}),and(invoice_date.gte.${startDate},invoice_date.lte.${endDate})`);

  // Group receipts by vendor_id
  const receiptsByVendor = new Map<string, Array<{
    id: string;
    vendor_id: string;
    receipt_date: string | null;
    invoice_number: string | null;
    total_amount: number | null;
    tax_base: number | null;
    vat_amount: number | null;
    vat_type: string | null;
  }>>();
  (receipts || []).forEach((r: {
    id: string;
    vendor_id: string;
    receipt_date: string | null;
    invoice_number: string | null;
    total_amount: number | null;
    tax_base: number | null;
    vat_amount: number | null;
    vat_type: string | null;
  }) => {
    const existing = receiptsByVendor.get(r.vendor_id);
    if (existing) {
      existing.push(r);
    } else {
      receiptsByVendor.set(r.vendor_id, [r]);
    }
  });

  // 3. Fetch completion state from expense_checklist_extras
  const pfItemKeys = vendorIds.map((id: string) => `pf_${id}`);
  const { data: extras } = await refacSupabaseAdmin
    .schema('finance')
    .from('expense_checklist_extras')
    .select('item_key, flow_completed')
    .eq('period', period)
    .in('item_key', pfItemKeys);

  const extrasMap = new Map<string, boolean>();
  (extras || []).forEach((e: { item_key: string; flow_completed: boolean }) => {
    extrasMap.set(e.item_key, e.flow_completed);
  });

  // 4. Build one item per platform vendor
  return pfVendors.map((vendor: { id: string; name: string }) => {
    const itemKey = `pf_${vendor.id}`;
    const vendorReceipts = receiptsByVendor.get(vendor.id) || [];
    const hasReceipt = vendorReceipts.length > 0;

    // Sum amounts across all receipts for this vendor in the period
    let totalAmount = 0;
    let vatAmount = 0;
    let taxBase = 0;
    let vatType: 'pp30' | 'pp36' | 'none' = 'none';
    let receiptDate: string | null = null;
    let invoiceRef: string | null = null;
    let receiptId: string | null = null;

    if (hasReceipt) {
      vendorReceipts.forEach((r) => {
        totalAmount += parseFloat(String(r.total_amount || 0));
        vatAmount += parseFloat(String(r.vat_amount || 0));
        taxBase += parseFloat(String(r.tax_base || 0));
        // Use the vat_type from the first receipt that has one
        if (vatType === 'none' && r.vat_type && r.vat_type !== 'none') {
          vatType = r.vat_type as 'pp30' | 'pp36';
        }
      });
      totalAmount = Math.round(totalAmount * 100) / 100;
      vatAmount = Math.round(vatAmount * 100) / 100;
      taxBase = Math.round(taxBase * 100) / 100;
      // Use first receipt for date/ref/id
      receiptDate = vendorReceipts[0].receipt_date;
      invoiceRef = vendorReceipts.map((r) => r.invoice_number).filter(Boolean).join(', ') || null;
      receiptId = vendorReceipts[0].id;
    }

    return {
      item_key: itemKey,
      vendor_id: vendor.id,
      label: vendor.name,
      total_amount: totalAmount,
      vat_amount: vatAmount,
      tax_base: taxBase,
      vat_type: vatType,
      vendor_receipt_id: receiptId,
      receipt_date: receiptDate,
      invoice_ref: invoiceRef,
      flow_completed: extrasMap.get(itemKey) || false,
      has_receipt: hasReceipt,
    };
  });
}

// ── Fetch Bank Balances (for Trial Balance) ─────────────────────────────

async function fetchBankBalances(
  startDate: string,
  endDate: string
): Promise<BankAccountBalance[]> {
  // Fetch beginning balances (last txn before period) and ending balances (last txn in period)
  // Use raw SQL via RPC since we need DISTINCT ON
  const { data, error } = await refacSupabaseAdmin.rpc('get_bank_balances_for_period', {
    p_start_date: startDate,
    p_end_date: endDate,
  });

  if (!error && data && data.length > 0) {
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

  // Fallback: query directly if RPC doesn't exist
  if (error) {
    console.warn('get_bank_balances_for_period RPC not found, using fallback query');
  }

  // Get ending balances + aggregates for accounts in this period
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

  // Group by account
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
    transaction_date: string;
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

  // Get beginning balances (last txn before period start per account)
  const accountNumbers = Array.from(accountMap.keys());
  const beginMap = new Map<string, number>();

  for (const acctNum of accountNumbers) {
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
  }

  const result: BankAccountBalance[] = [];
  const order = ['170-3-26995-4', '170-3-27029-4'];

  // Sort: operating first, then savings
  const sortedKeys = Array.from(accountMap.keys()).sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  sortedKeys.forEach((acctNum) => {
    const acct = accountMap.get(acctNum)!;
    result.push({
      account_number: acctNum,
      account_name: acct.account_name,
      beginning_balance: Math.round((beginMap.get(acctNum) || 0) * 100) / 100,
      ending_balance: Math.round(acct.last_balance * 100) / 100,
      total_deposits: Math.round(acct.total_deposits * 100) / 100,
      total_withdrawals: Math.round(acct.total_withdrawals * 100) / 100,
      transaction_count: acct.transaction_count,
    });
  });

  return result;
}

// ── Build Response ──────────────────────────────────────────────────────

function buildResponse(
  period: string,
  items: ExpenseChecklistItem[],
  kbankEdc: KbankEdcItem[],
  platformFees: PlatformFeeItem[],
  posData: { pos_credit: number; pos_ewallet: number; pos_qr: number; pos_cash: number; pos_sales_net: number; pos_sales_vat: number; pos_sales_total: number; pos_receipt_count: number },
  manualRevenue: MonthlySalesLineItem[],
  payroll: MonthlyPayrollData,
  bankBalances: BankAccountBalance[],
  pp36Data: Pp36Data
): ExpenseChecklistData {
  const kbankItemCount = kbankEdc.length;
  const kbankCompleted = kbankEdc.filter((k) => k.flow_completed).length;
  const kbankTotalAmount = Math.round(kbankEdc.reduce((s, k) => s + k.total_amount, 0) * 100) / 100;
  const kbankCommission = Math.round(kbankEdc.reduce((s, k) => s + k.total_commission, 0) * 100) / 100;
  const kbankVat = Math.round(kbankEdc.reduce((s, k) => s + k.total_vat, 0) * 100) / 100;

  // Platform fees from linked vendor receipts
  const pfItemCount = platformFees.length;
  const pfCompleted = platformFees.filter((p) => p.flow_completed).length;
  const pfTotalAmount = Math.round(platformFees.reduce((s, p) => s + p.total_amount, 0) * 100) / 100;
  const pfVatPp30 = Math.round(
    platformFees.filter((p) => p.vat_type === 'pp30').reduce((s, p) => s + p.vat_amount, 0) * 100
  ) / 100;
  const pfVatPp36 = Math.round(
    platformFees.filter((p) => p.vat_type === 'pp36').reduce((s, p) => s + p.vat_amount, 0) * 100
  ) / 100;
  const pfVatTotal = Math.round((pfVatPp30 + pfVatPp36) * 100) / 100;

  const totalExpenses = Math.round(
    (items.reduce((s, i) => s + i.withdrawal, 0) + kbankTotalAmount + pfTotalAmount) * 100
  ) / 100;

  // Build sales data
  const otherSalesNet = Math.round(
    manualRevenue.reduce((s, e) => s + (e.amount - e.vat), 0) * 100
  ) / 100;
  const otherSalesVat = Math.round(
    manualRevenue.reduce((s, e) => s + e.vat, 0) * 100
  ) / 100;
  const otherSalesTotal = Math.round(
    manualRevenue.reduce((s, e) => s + e.amount, 0) * 100
  ) / 100;

  const totalOutputVat = Math.round((posData.pos_sales_vat + otherSalesVat) * 100) / 100;

  const sales: MonthlySalesData = {
    pos_credit: posData.pos_credit,
    pos_ewallet: posData.pos_ewallet,
    pos_qr: posData.pos_qr,
    pos_cash: posData.pos_cash,
    pos_sales_net: posData.pos_sales_net,
    pos_sales_vat: posData.pos_sales_vat,
    pos_sales_total: posData.pos_sales_total,
    pos_receipt_count: posData.pos_receipt_count,
    other_sales: manualRevenue,
    other_sales_net: otherSalesNet,
    other_sales_vat: otherSalesVat,
    other_sales_total: otherSalesTotal,
    total_output_vat: totalOutputVat,
  };

  // VAT summary: PP30 calculation — include platform fee VAT
  const inputVatPp30 = Math.round(
    (items.filter((i) => i.vat_type === 'pp30').reduce((s, i) => s + (i.vat_amount || 0), 0) + kbankVat + pfVatPp30) * 100
  ) / 100;

  // PP36 input VAT: use vat_reporting_month (prev month invoices) instead of bank date
  // Platform fee PP36 still uses receipt-date filtering (consistent with platform fee logic)
  const inputVatPp36 = Math.round((pp36Data.claimable_vat + pfVatPp36) * 100) / 100;

  // Purchase base: PP30 items from bank-date filter + PP36 from reporting month
  const pp30PurchaseBase = Math.round(
    items.filter((i) => i.vat_type === 'pp30').reduce((s, i) => s + (i.tax_base || 0), 0) * 100
  ) / 100;
  const kbankPurchaseBase = kbankCommission; // commission is the tax base
  const pfPurchaseBase = Math.round(
    platformFees.filter((p) => p.vat_type !== 'none').reduce((s, p) => s + p.tax_base, 0) * 100
  ) / 100;
  const totalPurchaseBase = Math.round((pp30PurchaseBase + pp36Data.claimable_base + kbankPurchaseBase + pfPurchaseBase) * 100) / 100;

  // PP36 filing month label (next month after the selected period)
  // Date constructor is 0-indexed, so passing 1-indexed pm gives next month.
  // Dec (pm=12) correctly wraps to Jan of next year via Date overflow.
  const [py, pm] = period.split('-').map(Number);
  const filingDate = new Date(py, pm, 1);
  const pp36FilingMonth = filingDate.toLocaleDateString('en-US', { month: 'long' });

  const totalSalesNet = Math.round((posData.pos_sales_net + otherSalesNet) * 100) / 100;
  const excessCarriedForward = 0; // TODO: configurable from previous period
  const netResult = Math.round((totalOutputVat - inputVatPp30 - inputVatPp36 - excessCarriedForward) * 100) / 100;

  const vatSummary: VatSummaryData = {
    total_sales_net: totalSalesNet,
    output_vat: totalOutputVat,
    total_purchase_base: totalPurchaseBase,
    input_vat_pp30: inputVatPp30,
    input_vat_pp36: inputVatPp36,
    pp36_payable: pp36Data.payable_vat,
    pp36_filing_month: pp36FilingMonth,
    excess_carried_forward: excessCarriedForward,
    tax_to_be_paid: netResult > 0 ? netResult : 0,
    excess_to_be_claimed: netResult < 0 ? Math.abs(netResult) : 0,
  };

  const summary: ExpenseChecklistSummary = {
    total_items: items.length + kbankItemCount + pfItemCount,
    completed_items: items.filter((i) => i.flow_completed).length + kbankCompleted + pfCompleted,
    total_expenses: totalExpenses,
    vat_pp30: inputVatPp30,
    vat_pp36: inputVatPp36,
    wht_pnd3: Math.round(
      items.filter((i) => i.wht_type === 'pnd3').reduce((s, i) => s + (i.wht_amount || 0), 0) * 100
    ) / 100,
    wht_pnd53: Math.round(
      items.filter((i) => i.wht_type === 'pnd53').reduce((s, i) => s + (i.wht_amount || 0), 0) * 100
    ) / 100,
    kbank_commission: kbankCommission,
    kbank_vat: kbankVat,
    platform_fee_vat: pfVatTotal,
    total_salary: payroll.total_salary,
    total_sso: payroll.total_sso,
  };

  // Filter PP36 out of main items — PP36 is shown in its own section
  const pp30Items = items.filter((i) => i.vat_type !== 'pp36');

  return {
    period,
    items: pp30Items,
    pp36_claimable: pp36Data.claimable_items,
    pp36_payable: pp36Data.payable_items,
    kbank_edc: kbankEdc,
    platform_fees: platformFees,
    sales,
    payroll,
    vat_summary: vatSummary,
    summary,
    bank_balances: bankBalances,
  };
}
