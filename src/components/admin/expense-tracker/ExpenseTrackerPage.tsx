'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Receipt } from 'lucide-react';
import { ExpenseTrackerFilters } from './ExpenseTrackerFilters';
import { ExpenseTrackerKPIs } from './ExpenseTrackerKPIs';
import { ExpenseTrackerTable } from './ExpenseTrackerTable';
import { toast } from '@/components/ui/use-toast';
import type {
  AnnotatedTransaction,
  TransactionsSummary,
  ExpenseTrackerFilters as FilterState,
  Vendor,
  AnnotationUpsert,
  TransactionType,
} from '@/types/expense-tracker';
import type { MatchResult } from '@/lib/receipt-matching-engine';

/**
 * Rule-based classifier for deposit transactions.
 * Returns a transaction_type if the description+channel pattern is unambiguous,
 * or null if manual review is needed.
 */
function classifyDeposit(
  description: string,
  channel: string,
  details: string,
): TransactionType | null {
  // Cash machine deposits
  if (description === 'Cash Deposit') return 'cash_deposit';
  // KBank card terminal settlements
  if (description === 'Trade Finance Deposit') return 'sale';
  if (description === 'Transfer Deposit' && channel === 'Trade Finance') return 'sale';
  // Internal transfers from other LENGOLF accounts via K BIZ
  if (
    description === 'Transfer Deposit' &&
    channel === 'K BIZ' &&
    details.toLowerCase().includes('lengolf')
  ) return 'internal_transfer';
  // Card payments (Visa/Mastercard full-pay/installment)
  if (description === 'Payment Received: FullPay/Install/Redemp') return 'credit_card';
  // E-wallet payments (Alipay, WeChat Pay)
  if (description === 'Payment Received: Alipay/WeChat') return 'ewallet';
  // Platform settlements (GoWabi) — check before generic Internet/Mobile rule
  if (description === 'Transfer Deposit' && channel === 'K-Cash Connect Plus') return 'platform_settlement';
  if (description === 'Transfer Deposit' && details.toLowerCase().includes('gowabi')) return 'platform_settlement';
  // QR/PromptPay transfers from customers via any bank
  if (
    description === 'Transfer Deposit' &&
    (channel === 'K PLUS' || channel === 'MAKE by KBank' || channel.startsWith('Internet/Mobile'))
  ) return 'qr_payment';
  return null;
}

const ACCOUNTS = [
  { account_number: '170-3-27029-4', account_name: 'Savings (29-4)' },
  { account_number: '170-3-26995-4', account_name: 'Current (95-4)' },
];

const DEFAULT_SUMMARY: TransactionsSummary = {
  total_transactions: 0,
  annotated_count: 0,
  total_withdrawals: 0,
  total_deposits: 0,
  vat_pp30: 0,
  vat_pp36: 0,
  wht_pnd3: 0,
  wht_pnd53: 0,
  revenue_cash: 0,
  revenue_qr: 0,
  revenue_card_ewallet: 0,
};

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function ExpenseTrackerPage() {
  const [filters, setFilters] = useState<FilterState>({
    month: getCurrentMonth(),
    account: 'all',
    transactionType: 'all',
    vatType: 'all',
    whtType: 'all',
    showOnlyUnannotated: false,
  });
  const [transactions, setTransactions] = useState<AnnotatedTransaction[]>([]);
  const [summary, setSummary] = useState<TransactionsSummary>(DEFAULT_SUMMARY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receiptMatches, setReceiptMatches] = useState<Record<number, MatchResult[]>>({});
  const autoLinkedRef = useRef(false);
  const autoClassifiedRef = useRef(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        month: filters.month,
        account: filters.account,
      });
      const res = await fetch(`/api/admin/expense-tracker/transactions?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || DEFAULT_SUMMARY);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions');
      setTransactions([]);
      setSummary(DEFAULT_SUMMARY);
    } finally {
      setLoading(false);
    }
  }, [filters.month, filters.account]);

  const fetchMatches = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        month: filters.month,
        account: filters.account,
      });
      const res = await fetch(`/api/admin/expense-tracker/match-receipts?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setReceiptMatches(data.matches || {});
    } catch {
      // Non-fatal - matches are a nice-to-have
    }
  }, [filters.month, filters.account]);

  useEffect(() => {
    autoLinkedRef.current = false;
    autoClassifiedRef.current = false;
    fetchTransactions();
    fetchMatches();
  }, [fetchTransactions, fetchMatches]);

  // Auto-link high-confidence matches
  useEffect(() => {
    if (autoLinkedRef.current) return;
    const autoMatches = Object.entries(receiptMatches)
      .filter(([, matches]) => matches.length > 0 && matches[0].level === 'auto')
      .map(([txId, matches]) => ({
        bank_transaction_id: Number(txId),
        vendor_receipt_id: matches[0].receipt.id,
        source: matches[0].receipt.source,
      }));

    if (autoMatches.length === 0) return;
    autoLinkedRef.current = true;

    // Link them in parallel
    const linkPromises = autoMatches.map(async ({ bank_transaction_id, vendor_receipt_id, source }) => {
      try {
        const res = await fetch('/api/admin/expense-tracker/link-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bank_transaction_id,
            vendor_receipt_id,
            apply_extraction: true,
            ...(source === 'invoice' ? { source: 'invoice' } : {}),
          }),
        });
        return res.ok;
      } catch {
        return false;
      }
    });

    Promise.all(linkPromises).then((results) => {
      const linked = results.filter(Boolean).length;
      if (linked > 0) {
        toast({
          title: `Auto-linked ${linked} document${linked > 1 ? 's' : ''}`,
          description: 'High-confidence matches applied automatically.',
        });
        // Refresh data after auto-linking
        fetchTransactions();
        fetchMatches();
      }
    });
  }, [receiptMatches, fetchTransactions, fetchMatches]);

  // Auto-classify deposit transactions using rule-based patterns
  useEffect(() => {
    if (autoClassifiedRef.current) return;
    if (transactions.length === 0) return;

    const toClassify = transactions
      .filter((row) => row.transaction.deposit > 0 && !row.annotation?.transaction_type)
      .map((row) => ({
        bank_transaction_id: row.transaction.id,
        transaction_type: classifyDeposit(
          row.transaction.description ?? '',
          row.transaction.channel ?? '',
          row.transaction.details ?? '',
        ),
      }))
      .filter(
        (item): item is { bank_transaction_id: number; transaction_type: TransactionType } =>
          item.transaction_type !== null,
      );

    autoClassifiedRef.current = true;

    if (toClassify.length === 0) return;

    Promise.all(
      toClassify.map(async ({ bank_transaction_id, transaction_type }) => {
        try {
          const res = await fetch('/api/admin/expense-tracker/annotations', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bank_transaction_id, transaction_type }),
          });
          return res.ok;
        } catch {
          return false;
        }
      }),
    ).then((results) => {
      const classified = results.filter(Boolean).length;
      if (classified > 0) {
        toast({
          title: `Auto-classified ${classified} deposit${classified > 1 ? 's' : ''}`,
          description: 'Transaction types applied automatically.',
        });
        fetchTransactions();
      }
    });
  }, [transactions, fetchTransactions]);

  const handleAnnotationSaved = useCallback(
    (bankTxId: number, annotation: AnnotationUpsert) => {
      setTransactions((prev) =>
        prev.map((row) => {
          if (row.transaction.id !== bankTxId) return row;
          return {
            ...row,
            annotation: {
              id: row.annotation?.id ?? 0,
              bank_transaction_id: bankTxId,
              vendor_id: annotation.vendor_id ?? null,
              vendor_name_override: annotation.vendor_name_override ?? null,
              vat_type: annotation.vat_type ?? 'none',
              vat_amount: annotation.vat_amount ?? null,
              vat_reporting_month: annotation.vat_reporting_month ?? null,
              wht_type: annotation.wht_type ?? 'none',
              wht_rate: annotation.wht_rate ?? 3,
              wht_amount: annotation.wht_amount ?? null,
              wht_reporting_month: annotation.wht_reporting_month ?? null,
              tax_base: annotation.tax_base ?? null,
              vat_amount_override: annotation.vat_amount_override ?? false,
              wht_amount_override: annotation.wht_amount_override ?? false,
              tax_base_override: annotation.tax_base_override ?? false,
              invoice_ref: annotation.invoice_ref ?? null,
              document_url: annotation.document_url ?? row.annotation?.document_url ?? null,
              vendor_receipt_id: annotation.vendor_receipt_id ?? row.annotation?.vendor_receipt_id ?? null,
              transaction_type: annotation.transaction_type ?? row.annotation?.transaction_type ?? null,
              notes: annotation.notes ?? null,
              has_items: row.annotation?.has_items ?? false,
              flow_completed: row.annotation?.flow_completed ?? false,
              flow_completed_at: row.annotation?.flow_completed_at ?? null,
              created_by: row.annotation?.created_by ?? null,
              updated_by: annotation.updated_by ?? null,
              created_at: row.annotation?.created_at ?? new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };
        })
      );

      // Recalculate summary
      setSummary((prev) => {
        let annotatedCount = 0;
        let vatPP30 = 0;
        let vatPP36 = 0;
        let whtPND3 = 0;
        let whtPND53 = 0;
        let revCash = 0;
        let revQR = 0;
        let revCardEwallet = 0;
        let totalWithdrawals = 0;
        let totalDeposits = 0;

        transactions.forEach((row) => {
          const ann = row.transaction.id === bankTxId ? annotation : row.annotation;
          const tt = ann?.transaction_type;
          // Expenses: include all withdrawals
          totalWithdrawals += Number(row.transaction.withdrawal) || 0;
          // Revenue: exclude internal transfers and cash deposits
          const isRevenue = tt !== 'internal_transfer' && tt !== 'cash_deposit';
          if (isRevenue) {
            totalDeposits += Number(row.transaction.deposit) || 0;
          }
          if (ann) {
            annotatedCount++;
            const vatAmt = Number(ann.vat_amount) || 0;
            const whtAmt = Number(ann.wht_amount) || 0;
            const vt = ann.vat_type || 'none';
            const wt = ann.wht_type || 'none';
            if (vt === 'pp30') vatPP30 += vatAmt;
            if (vt === 'pp36') vatPP36 += vatAmt;
            if (wt === 'pnd3') whtPND3 += whtAmt;
            if (wt === 'pnd53') whtPND53 += whtAmt;
            const deposit = Number(row.transaction.deposit) || 0;
            if (tt === 'cash_deposit') revCash += deposit;
            if (tt === 'qr_payment') revQR += deposit;
            if (tt === 'credit_card' || tt === 'ewallet') revCardEwallet += deposit;
          }
        });

        const r2 = (n: number) => Math.round(n * 100) / 100;
        return {
          ...prev,
          annotated_count: annotatedCount,
          total_withdrawals: r2(totalWithdrawals),
          total_deposits: r2(totalDeposits),
          vat_pp30: r2(vatPP30),
          vat_pp36: r2(vatPP36),
          wht_pnd3: r2(whtPND3),
          wht_pnd53: r2(whtPND53),
          revenue_cash: r2(revCash),
          revenue_qr: r2(revQR),
          revenue_card_ewallet: r2(revCardEwallet),
        };
      });
    },
    [transactions]
  );

  const handleVendorUpdated = useCallback((updatedVendor: Vendor) => {
    setTransactions((prev) =>
      prev.map((row) => {
        if (row.vendor?.id === updatedVendor.id) {
          return { ...row, vendor: updatedVendor };
        }
        return row;
      })
    );
  }, []);

  const handleReceiptLinked = useCallback(
    async (bankTxId: number, receiptId: string, source?: 'receipt' | 'invoice') => {
      try {
        const res = await fetch('/api/admin/expense-tracker/link-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bank_transaction_id: bankTxId,
            vendor_receipt_id: receiptId,
            apply_extraction: true,
            ...(source === 'invoice' ? { source: 'invoice' } : {}),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Link failed' }));
          throw new Error(err.error);
        }
        // Refresh after linking
        await Promise.all([fetchTransactions(), fetchMatches()]);
        toast({ title: 'Receipt linked', description: 'Extraction data applied to transaction.' });
      } catch (err) {
        toast({
          title: 'Link failed',
          description: err instanceof Error ? err.message : 'Failed to link receipt',
          variant: 'destructive',
        });
      }
    },
    [fetchTransactions, fetchMatches]
  );

  const handleReceiptUnlinked = useCallback(
    async (bankTxId: number) => {
      try {
        const res = await fetch('/api/admin/expense-tracker/link-receipt', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bank_transaction_id: bankTxId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unlink failed' }));
          throw new Error(err.error);
        }
        await Promise.all([fetchTransactions(), fetchMatches()]);
        toast({ title: 'Receipt unlinked' });
      } catch (err) {
        toast({
          title: 'Unlink failed',
          description: err instanceof Error ? err.message : 'Failed to unlink receipt',
          variant: 'destructive',
        });
      }
    },
    [fetchTransactions, fetchMatches]
  );

  // Apply client-side filters
  const filteredTransactions = transactions.filter((row) => {
    if (filters.showOnlyUnannotated && row.annotation) return false;
    if (filters.transactionType === 'unset') { if (row.annotation?.transaction_type) return false; }
    else if (filters.transactionType !== 'all' && row.annotation?.transaction_type !== filters.transactionType) return false;
    if (filters.vatType !== 'all' && (row.annotation?.vat_type ?? 'none') !== filters.vatType) return false;
    if (filters.whtType !== 'all' && (row.annotation?.wht_type ?? 'none') !== filters.whtType) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Receipt className="h-6 w-6" />
        <div>
          <h1 className="text-xl font-bold">Transaction Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Annotate bank transactions with vendor, VAT, and WHT details
          </p>
        </div>
      </div>

      {/* Filters */}
      <ExpenseTrackerFilters
        filters={filters}
        onChange={setFilters}
        accounts={ACCOUNTS}
      />

      {/* KPIs */}
      <ExpenseTrackerKPIs summary={summary} />

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Table */}
      <ExpenseTrackerTable
        transactions={filteredTransactions}
        onAnnotationSaved={handleAnnotationSaved}
        onVendorUpdated={handleVendorUpdated}
        onReceiptLinked={handleReceiptLinked}
        onReceiptUnlinked={handleReceiptUnlinked}
        receiptMatches={receiptMatches}
        loading={loading}
      />
    </div>
  );
}
