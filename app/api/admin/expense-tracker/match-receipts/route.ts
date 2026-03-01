import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { findMatches } from '@/lib/receipt-matching-engine';
import type { ReceiptCandidate, TransactionTarget } from '@/lib/receipt-matching-engine';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const account = searchParams.get('account') || 'all';

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "month param required (YYYY-MM)" }, { status: 400 });
    }

    const startDate = `${month}-01`;
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`;

    // Fetch unlinked receipts (within a wider date range for T+/-3 matching)
    const receiptStart = new Date(y, m - 1, -3).toISOString().split('T')[0]; // 3 days before month start
    const receiptEnd = new Date(y, m, lastDay + 3).toISOString().split('T')[0]; // 3 days after month end

    const { data: receipts, error: rErr } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('vendor_receipts')
      .select('id, vendor_id, receipt_date, total_amount, invoice_number, extraction_confidence, file_url, vat_type, wht_applicable, extraction_notes, vendors!inner(name)')
      .gte('receipt_date', receiptStart)
      .lte('receipt_date', receiptEnd);

    if (rErr) {
      console.error('[match-receipts] Receipt query error:', rErr);
      return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
    }

    // Check which receipts are already linked
    const receiptIds = (receipts || []).map((r: { id: string }) => r.id);
    let linkedReceiptIds = new Set<string>();
    if (receiptIds.length > 0) {
      const { data: linked } = await refacSupabaseAdmin
        .schema('finance')
        .from('transaction_annotations')
        .select('vendor_receipt_id')
        .in('vendor_receipt_id', receiptIds)
        .not('vendor_receipt_id', 'is', null);

      if (linked) {
        linkedReceiptIds = new Set(linked.map((l: { vendor_receipt_id: string }) => l.vendor_receipt_id));
      }
    }

    // Filter to unlinked receipts only
    const receiptCandidates: ReceiptCandidate[] = (receipts || [])
      .filter((r: { id: string }) => !linkedReceiptIds.has(r.id))
      .map((r: any) => ({
        id: r.id,
        vendor_id: r.vendor_id,
        vendor_name: r.vendors?.name || null,
        receipt_date: r.receipt_date,
        total_amount: r.total_amount,
        invoice_number: r.invoice_number,
        extraction_confidence: r.extraction_confidence,
        file_url: r.file_url,
        vat_type: r.vat_type,
        wht_applicable: r.wht_applicable || false,
        extraction_notes: r.extraction_notes,
        source: 'receipt' as const,
      }));

    // Fetch invoices from backoffice.invoices (coaching/service invoices)
    const { data: invoices, error: invErr } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('invoices')
      .select('id, invoice_number, invoice_date, subtotal, tax_amount, total_amount, pdf_file_path, supplier_id, invoice_suppliers!inner(name)')
      .gte('invoice_date', receiptStart)
      .lte('invoice_date', receiptEnd);

    if (invErr) {
      console.error('[match-receipts] Invoice query error:', invErr);
      // Non-fatal — continue with receipt candidates only
    }

    // Filter out invoices already linked via invoice_ref in annotations
    let linkedInvoiceRefs = new Set<string>();
    if (invoices && invoices.length > 0) {
      const invoiceNumbers = invoices.map((inv: { invoice_number: string }) => inv.invoice_number);
      const { data: linkedAnns } = await refacSupabaseAdmin
        .schema('finance')
        .from('transaction_annotations')
        .select('invoice_ref')
        .in('invoice_ref', invoiceNumbers)
        .not('invoice_ref', 'is', null);

      if (linkedAnns) {
        linkedInvoiceRefs = new Set(linkedAnns.map((a: { invoice_ref: string }) => a.invoice_ref));
      }
    }

    const invoiceCandidates: ReceiptCandidate[] = (invoices || [])
      .filter((inv: { invoice_number: string }) => !linkedInvoiceRefs.has(inv.invoice_number))
      .map((inv: any) => ({
        id: inv.id,
        vendor_id: inv.supplier_id || '',
        vendor_name: inv.invoice_suppliers?.name || null,
        receipt_date: inv.invoice_date,
        total_amount: inv.total_amount != null ? Number(inv.total_amount) : null,
        invoice_number: inv.invoice_number,
        extraction_confidence: 'high',
        file_url: inv.pdf_file_path || '',
        vat_type: null,
        wht_applicable: true,
        extraction_notes: null,
        source: 'invoice' as const,
      }));

    const allCandidates = [...receiptCandidates, ...invoiceCandidates];

    if (allCandidates.length === 0) {
      return NextResponse.json({ matches: {} });
    }

    // Fetch bank transactions (withdrawals only) for the month
    let txQuery = refacSupabaseAdmin
      .schema('finance')
      .from('bank_statement_transactions')
      .select('id, transaction_date, withdrawal, description, details')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .gt('withdrawal', 0);

    if (account !== 'all') {
      txQuery = txQuery.eq('account_number', account);
    }

    const { data: txData, error: txErr } = await txQuery;

    if (txErr) {
      console.error('[match-receipts] Transaction query error:', txErr);
      return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
    }

    // Get existing annotations to know vendor_id and linked receipt
    const txIds = (txData || []).map((t: { id: number }) => t.id);
    let annotationMap: Record<number, { vendor_id: string | null; vendor_receipt_id: string | null; invoice_ref: string | null }> = {};
    if (txIds.length > 0) {
      const { data: anns } = await refacSupabaseAdmin
        .schema('finance')
        .from('transaction_annotations')
        .select('bank_transaction_id, vendor_id, vendor_receipt_id, invoice_ref')
        .in('bank_transaction_id', txIds);

      if (anns) {
        anns.forEach((a: { bank_transaction_id: number; vendor_id: string | null; vendor_receipt_id: string | null; invoice_ref: string | null }) => {
          annotationMap[a.bank_transaction_id] = { vendor_id: a.vendor_id, vendor_receipt_id: a.vendor_receipt_id, invoice_ref: a.invoice_ref };
        });
      }
    }

    const targets: TransactionTarget[] = (txData || []).map((t: any) => ({
      id: t.id,
      transaction_date: t.transaction_date,
      withdrawal: Number(t.withdrawal) || 0,
      description: t.description || '',
      details: t.details || '',
      vendor_id: annotationMap[t.id]?.vendor_id || null,
      // Treat invoice-linked transactions as already linked (skip in scoring)
      vendor_receipt_id: annotationMap[t.id]?.vendor_receipt_id || annotationMap[t.id]?.invoice_ref || null,
    }));

    const matches = findMatches(allCandidates, targets);

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('[match-receipts] Error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
