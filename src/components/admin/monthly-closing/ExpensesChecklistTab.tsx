'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText,
  CircleCheck,
  CheckCircle2,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ExpenseChecklistData,
  ExpenseChecklistItem,
  Pp36LineItem,
  KbankEdcItem,
  PlatformFeeItem,
  ExpenseChecklistSummary,
  MonthlyPayrollData,
} from '@/types/tax-filing';

interface ExpensesChecklistTabProps {
  period: string; // YYYY-MM
  onVatSummaryUpdate?: (summary: import('@/types/tax-filing').VatSummaryData) => void;
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: string): string {
  if (!d) return '';
  const parts = d.split('-');
  return `${parts[2]}/${parts[1]}`;
}

const TAX_BADGE_COLORS: Record<string, string> = {
  pp30: 'bg-blue-100 text-blue-700 border-blue-200',
  pp36: 'bg-violet-100 text-violet-700 border-violet-200',
  pnd3: 'bg-orange-100 text-orange-700 border-orange-200',
  pnd53: 'bg-amber-100 text-amber-700 border-amber-200',
};


export function ExpensesChecklistTab({ period, onVatSummaryUpdate }: ExpensesChecklistTabProps) {
  const [data, setData] = useState<ExpenseChecklistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tax-filing/expense-checklist?period=${p}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result: ExpenseChecklistData = await res.json();
      setData(result);
      if (onVatSummaryUpdate && result.vat_summary) {
        onVatSummaryUpdate(result.vat_summary);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [onVatSummaryUpdate]);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

  const revertToggle = useCallback((
    type: 'annotation' | 'kbank_edc' | 'platform_fee',
    id: number | undefined,
    itemKey: string | undefined,
    originalValue: boolean
  ) => {
    setData((prev) => {
      if (!prev) return prev;
      if (type === 'annotation') {
        const items = prev.items.map((i) =>
          i.id === id ? { ...i, flow_completed: originalValue } : i
        );
        const pp36_claimable = prev.pp36_claimable.map((i) =>
          i.id === id ? { ...i, flow_completed: originalValue } : i
        );
        const pp36_payable = prev.pp36_payable.map((i) =>
          i.id === id ? { ...i, flow_completed: originalValue } : i
        );
        return { ...prev, items, pp36_claimable, pp36_payable, summary: recalcSummary(items, prev.kbank_edc, prev.platform_fees, prev.payroll) };
      } else if (type === 'kbank_edc') {
        const kbank_edc = prev.kbank_edc.map((k) =>
          k.item_key === itemKey ? { ...k, flow_completed: originalValue } : k
        );
        return { ...prev, kbank_edc, summary: recalcSummary(prev.items, kbank_edc, prev.platform_fees, prev.payroll) };
      } else {
        const platform_fees = prev.platform_fees.map((p) =>
          p.item_key === itemKey ? { ...p, flow_completed: originalValue } : p
        );
        return { ...prev, platform_fees, summary: recalcSummary(prev.items, prev.kbank_edc, platform_fees, prev.payroll) };
      }
    });
  }, []);

  const toggleItem = useCallback(async (
    type: 'annotation' | 'kbank_edc' | 'platform_fee',
    id: number | undefined,
    itemKey: string | undefined,
    currentValue: boolean
  ) => {
    const toggleKey = type === 'annotation' ? `ann_${id}` : type === 'kbank_edc' ? `kbank_${itemKey}` : `pf_${itemKey}`;
    const newValue = !currentValue;

    // Optimistic update
    setTogglingIds((prev) => new Set(prev).add(toggleKey));
    setData((prev) => {
      if (!prev) return prev;
      if (type === 'annotation') {
        const items = prev.items.map((i) =>
          i.id === id ? { ...i, flow_completed: newValue } : i
        );
        const pp36_claimable = prev.pp36_claimable.map((i) =>
          i.id === id ? { ...i, flow_completed: newValue } : i
        );
        const pp36_payable = prev.pp36_payable.map((i) =>
          i.id === id ? { ...i, flow_completed: newValue } : i
        );
        return { ...prev, items, pp36_claimable, pp36_payable, summary: recalcSummary(items, prev.kbank_edc, prev.platform_fees, prev.payroll) };
      } else if (type === 'kbank_edc') {
        const kbank_edc = prev.kbank_edc.map((k) =>
          k.item_key === itemKey ? { ...k, flow_completed: newValue } : k
        );
        return { ...prev, kbank_edc, summary: recalcSummary(prev.items, kbank_edc, prev.platform_fees, prev.payroll) };
      } else {
        const platform_fees = prev.platform_fees.map((p) =>
          p.item_key === itemKey ? { ...p, flow_completed: newValue } : p
        );
        return { ...prev, platform_fees, summary: recalcSummary(prev.items, prev.kbank_edc, platform_fees, prev.payroll) };
      }
    });

    try {
      const body: Record<string, unknown> = { type, flow_completed: newValue };
      if (type === 'annotation') body.id = id;
      if (type === 'kbank_edc' || type === 'platform_fee') {
        body.item_key = itemKey;
        body.period = period;
      }

      const res = await fetch('/api/admin/tax-filing/expense-checklist/toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Revert on failure
        revertToggle(type, id, itemKey, currentValue);
      }
    } catch {
      revertToggle(type, id, itemKey, currentValue);
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(toggleKey);
        return next;
      });
    }
  }, [period, revertToggle]);

  const markAllComplete = useCallback(async () => {
    if (!data) return;

    // Only mark VAT-related items
    const vatItems = data.items.filter((i) => i.vat_type !== 'none');
    const uncompleted = [
      ...vatItems.filter((i) => !i.flow_completed).map((i) => ({ type: 'annotation' as const, id: i.id, itemKey: undefined })),
      ...data.kbank_edc.filter((k) => !k.flow_completed).map((k) => ({ type: 'kbank_edc' as const, id: undefined, itemKey: k.item_key })),
      ...data.platform_fees.filter((p) => p.vat_type !== 'none' && !p.flow_completed).map((p) => ({ type: 'platform_fee' as const, id: undefined, itemKey: p.item_key })),
    ];

    if (uncompleted.length === 0) return;

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((i) =>
        i.vat_type !== 'none' ? { ...i, flow_completed: true } : i
      );
      const kbank_edc = prev.kbank_edc.map((k) => ({ ...k, flow_completed: true }));
      const platform_fees = prev.platform_fees.map((p) =>
        p.vat_type !== 'none' ? { ...p, flow_completed: true } : p
      );
      return { ...prev, items, kbank_edc, platform_fees, summary: recalcSummary(items, kbank_edc, platform_fees, prev.payroll) };
    });

    // Fire all toggles in parallel
    const promises = uncompleted.map((item) => {
      const body: Record<string, unknown> = { type: item.type, flow_completed: true };
      if (item.type === 'annotation') body.id = item.id;
      if (item.type === 'kbank_edc' || item.type === 'platform_fee') {
        body.item_key = item.itemKey;
        body.period = period;
      }

      return fetch('/api/admin/tax-filing/expense-checklist/toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    });

    try {
      await Promise.all(promises);
    } catch {
      // Refresh on any error to get correct state
      fetchData(period);
    }
  }, [data, period, fetchData]);

  // Derive VAT-only items for purchase VAT section (items are already PP30-only from API)
  const vatItems = data ? data.items.filter((i) => i.vat_type !== 'none') : [];
  const vatPlatformFees = data ? data.platform_fees.filter((p) => p.vat_type !== 'none') : [];
  const pp30PlatformFees = vatPlatformFees.filter((p) => p.vat_type === 'pp30');
  const pp36Claimable = data?.pp36_claimable || [];
  const pp36Payable = data?.pp36_payable || [];

  // Count completed among all VAT items
  const vatItemsCompleted = vatItems.filter((i) => i.flow_completed).length;
  const kbankCompleted = data ? data.kbank_edc.filter((k) => k.flow_completed).length : 0;
  const vatPfCompleted = vatPlatformFees.filter((p) => p.flow_completed).length;
  const pp36ClaimableCompleted = pp36Claimable.filter((i) => i.flow_completed).length;
  const pp36PayableCompleted = pp36Payable.filter((i) => i.flow_completed).length;
  const totalVatItems = vatItems.length + pp36Claimable.length + pp36Payable.length + (data?.kbank_edc.length || 0) + vatPlatformFees.length;
  const totalVatCompleted = vatItemsCompleted + pp36ClaimableCompleted + pp36PayableCompleted + kbankCompleted + vatPfCompleted;
  const allVatComplete = totalVatItems > 0 && totalVatCompleted === totalVatItems;

  // PP30 filing total = PP30 input VAT + PP36 input VAT (both claimable on PP30)
  const pp30Total = data ? Math.round((data.vat_summary.input_vat_pp30 + data.vat_summary.input_vat_pp36) * 100) / 100 : 0;

  // Helper to get month label from YYYY-MM
  const getMonthLabel = (ym: string) => {
    const [yr, mo] = ym.split('-').map(Number);
    return new Date(yr, mo - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };
  // Previous month label for PP36 claimable section header
  const [periodY, periodM] = (data?.period || period).split('-').map(Number);
  const prevMonthLabel = getMonthLabel(
    periodM === 1 ? `${periodY - 1}-12` : `${periodY}-${String(periodM - 1).padStart(2, '0')}`
  );
  const currentMonthLabel = getMonthLabel(data?.period || period);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(period)}
          disabled={loading}
        >
          <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading monthly closing data...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* ─── Purchase VAT KPI Cards ─── */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TAX_BADGE_COLORS.pp30)}>PP30</Badge>
                  <span>Total Input VAT</span>
                </div>
                <p className="text-2xl font-bold">{formatNum(pp30Total)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TAX_BADGE_COLORS.pp30)}>PP30</Badge>
                  <span>Input VAT</span>
                </div>
                <p className="text-2xl font-bold">{formatNum(data.vat_summary.input_vat_pp30)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TAX_BADGE_COLORS.pp36)}>PP36</Badge>
                  <span>Input VAT</span>
                </div>
                <p className="text-2xl font-bold">{formatNum(data.vat_summary.input_vat_pp36)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <CircleCheck className="h-4 w-4" />
                  <span>Completed</span>
                </div>
                <p className="text-2xl font-bold">
                  <span className={allVatComplete ? 'text-green-600' : totalVatCompleted > 0 ? 'text-amber-600' : ''}>
                    {totalVatCompleted}
                  </span>
                  <span className="text-gray-400 text-lg"> / {totalVatItems}</span>
                </p>
              </CardContent>
            </Card>
            {data.vat_summary.pp36_payable > 0 ? (
              <Card className="border-amber-200 bg-amber-50/30">
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-sm text-amber-700 mb-1">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">PP36</Badge>
                    <span>Payable</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-700">{formatNum(data.vat_summary.pp36_payable)}</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">File in {data.vat_summary.pp36_filing_month}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                    <Receipt className="h-4 w-4" />
                    <span>Purchase VAT Base</span>
                  </div>
                  <p className="text-2xl font-bold">{formatNum(data.vat_summary.total_purchase_base)}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
               SECTION 1: Monthly PP30 Filing
               PP30 domestic items + PP36 claimable (prev month invoices)
             ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs px-2 py-0.5", TAX_BADGE_COLORS.pp30)}>PP30</Badge>
              <h3 className="text-sm font-semibold text-gray-800">Monthly PP30 Filing</h3>
            </div>

            {/* Combined PP30 + PP36 claimable + KBank EDC + PP30 platform fees table */}
            {(vatItems.length > 0 || pp36Claimable.length > 0 || pp30PlatformFees.length > 0 || (data?.kbank_edc.length || 0) > 0) && (
              <div className="border rounded-lg overflow-x-auto">
                <div className="bg-blue-50 border-b px-3 py-1.5 text-xs font-medium text-blue-700">
                  Purchase VAT Items ({vatItems.length + pp36Claimable.length + (data?.kbank_edc.length || 0) + pp30PlatformFees.length} items)
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-2 py-2 text-center font-medium text-gray-500 w-[30px]"></th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 w-[30px]">#</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 w-[65px]">Date</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[180px]">Vendor</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px]">Description</th>
                      <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px]">Tax</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Tax Base</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500 w-[80px]">VAT</th>
                      <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Withdrawal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* PP30 items */}
                    {vatItems.map((item, idx) => (
                      <ChecklistRow
                        key={item.id}
                        item={item}
                        seq={idx + 1}
                        isToggling={togglingIds.has(`ann_${item.id}`)}
                        onToggle={() => toggleItem('annotation', item.id, undefined, item.flow_completed)}
                      />
                    ))}
                    {/* PP36 claimable items (prev month foreign invoices) */}
                    {pp36Claimable.map((p36, idx) => (
                      <tr key={`p36c_${p36.id}`} className={cn(
                        "border-b hover:bg-gray-50/50 transition-colors",
                        p36.flow_completed && "bg-green-50/30"
                      )}>
                        <td className="px-2 py-1.5 text-center">
                          <Checkbox
                            checked={p36.flow_completed}
                            onCheckedChange={() => toggleItem('annotation', p36.id, undefined, p36.flow_completed)}
                            disabled={togglingIds.has(`ann_${p36.id}`)}
                            className={cn(p36.flow_completed && 'accent-green-600')}
                          />
                        </td>
                        <td className={cn("px-2 py-1.5 text-gray-400 text-xs", p36.flow_completed && "text-gray-300")}>{vatItems.length + idx + 1}</td>
                        <td className={cn("px-2 py-1.5 text-xs whitespace-nowrap", p36.flow_completed && "text-gray-400")}>{formatDate(p36.transaction_date)}</td>
                        <td className={cn("px-2 py-1.5 font-medium", p36.flow_completed ? "text-gray-400 line-through" : "text-gray-700")}>{p36.vendor_name}</td>
                        <td className={cn("px-2 py-1.5 text-xs", p36.flow_completed ? "text-gray-400" : "text-gray-500")}>{p36.notes || ''}</td>
                        <td className="px-2 py-1.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TAX_BADGE_COLORS.pp36, p36.flow_completed && "opacity-50")}>PP36</Badge>
                        </td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", p36.flow_completed && "text-gray-400")}>{formatNum(p36.tax_base)}</td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", p36.flow_completed && "text-gray-400")}>{formatNum(p36.vat_amount)}</td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", p36.flow_completed && "text-gray-400")}>{formatNum(p36.withdrawal)}</td>
                      </tr>
                    ))}
                    {/* KBank EDC fees */}
                    {(data?.kbank_edc || []).map((kbank, idx) => (
                      <tr key={`kbank_${kbank.item_key}`} className={cn(
                        "border-b hover:bg-gray-50/50 transition-colors",
                        kbank.flow_completed && "bg-green-50/30"
                      )}>
                        <td className="px-2 py-1.5 text-center">
                          <Checkbox
                            checked={kbank.flow_completed}
                            onCheckedChange={() => toggleItem('kbank_edc', undefined, kbank.item_key, kbank.flow_completed)}
                            disabled={togglingIds.has(`kbank_${kbank.item_key}`)}
                            className={cn(kbank.flow_completed && 'accent-green-600')}
                          />
                        </td>
                        <td className={cn("px-2 py-1.5 text-gray-400 text-xs", kbank.flow_completed && "text-gray-300")}>{vatItems.length + pp36Claimable.length + idx + 1}</td>
                        <td className={cn("px-2 py-1.5 text-xs whitespace-nowrap", kbank.flow_completed && "text-gray-400")}></td>
                        <td className={cn("px-2 py-1.5 font-medium", kbank.flow_completed ? "text-gray-400 line-through" : "text-gray-700")}>{kbank.label}</td>
                        <td className={cn("px-2 py-1.5 text-xs", kbank.flow_completed ? "text-gray-400" : "text-gray-500")}>Bank charges ({kbank.settlement_count} settlements)</td>
                        <td className="px-2 py-1.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TAX_BADGE_COLORS.pp30, kbank.flow_completed && "opacity-50")}>PP30</Badge>
                        </td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", kbank.flow_completed && "text-gray-400")}>{formatNum(kbank.total_commission)}</td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", kbank.flow_completed && "text-gray-400")}>{formatNum(kbank.total_vat)}</td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", kbank.flow_completed && "text-gray-400")}>{formatNum(kbank.total_amount)}</td>
                      </tr>
                    ))}
                    {/* PP30 platform fees (GoWabi, etc.) */}
                    {pp30PlatformFees.map((pf, idx) => (
                      <tr key={`pf30_${pf.item_key}`} className={cn(
                        "border-b hover:bg-gray-50/50 transition-colors",
                        pf.flow_completed && "bg-green-50/30"
                      )}>
                        <td className="px-2 py-1.5 text-center">
                          <Checkbox
                            checked={pf.flow_completed}
                            onCheckedChange={() => toggleItem('platform_fee', undefined, pf.item_key, pf.flow_completed)}
                            disabled={togglingIds.has(`pf_${pf.item_key}`)}
                            className={cn(pf.flow_completed && 'accent-green-600')}
                          />
                        </td>
                        <td className={cn("px-2 py-1.5 text-gray-400 text-xs", pf.flow_completed && "text-gray-300")}>{vatItems.length + pp36Claimable.length + (data?.kbank_edc.length || 0) + idx + 1}</td>
                        <td className={cn("px-2 py-1.5 text-xs whitespace-nowrap", pf.flow_completed && "text-gray-400")}>{pf.receipt_date ? formatDate(pf.receipt_date) : ''}</td>
                        <td className={cn("px-2 py-1.5 font-medium", pf.flow_completed ? "text-gray-400 line-through" : "text-gray-700")}>
                          {pf.label}
                          {pf.invoice_ref && <span className="text-gray-400 text-xs ml-1.5">#{pf.invoice_ref}</span>}
                        </td>
                        <td className={cn("px-2 py-1.5 text-xs", pf.flow_completed ? "text-gray-400" : "text-gray-500")}>Platform fee</td>
                        <td className="px-2 py-1.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TAX_BADGE_COLORS.pp30, pf.flow_completed && "opacity-50")}>PP30</Badge>
                        </td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", pf.flow_completed && "text-gray-400")}>{pf.has_receipt ? formatNum(pf.tax_base) : ''}</td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", pf.flow_completed && "text-gray-400")}>{pf.has_receipt && pf.vat_amount > 0 ? formatNum(pf.vat_amount) : ''}</td>
                        <td className={cn("px-2 py-1.5 text-right font-mono text-xs", pf.flow_completed && "text-gray-400")}>{pf.has_receipt ? formatNum(pf.total_amount) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t font-medium">
                      <td colSpan={6} className="px-2 py-2 text-right text-gray-500">
                        Totals ({vatItems.length + pp36Claimable.length + (data?.kbank_edc.length || 0) + pp30PlatformFees.length} items)
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {formatNum(
                          vatItems.reduce((s, i) => s + (i.tax_base || 0), 0) +
                          pp36Claimable.reduce((s, i) => s + i.tax_base, 0) +
                          (data?.kbank_edc || []).reduce((s, k) => s + k.total_commission, 0) +
                          pp30PlatformFees.reduce((s, p) => s + p.tax_base, 0)
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {formatNum(
                          vatItems.reduce((s, i) => s + (i.vat_amount || 0), 0) +
                          pp36Claimable.reduce((s, i) => s + i.vat_amount, 0) +
                          (data?.kbank_edc || []).reduce((s, k) => s + k.total_vat, 0) +
                          pp30PlatformFees.reduce((s, p) => s + p.vat_amount, 0)
                        )}
                      </td>
                      <td className="px-2 py-2 text-right font-mono">
                        {formatNum(
                          vatItems.reduce((s, i) => s + i.withdrawal, 0) +
                          pp36Claimable.reduce((s, i) => s + i.withdrawal, 0) +
                          (data?.kbank_edc || []).reduce((s, k) => s + k.total_amount, 0) +
                          pp30PlatformFees.reduce((s, p) => s + p.total_amount, 0)
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ═══ PP36 Monthly Filing — this month's foreign invoices ═══ */}
            {pp36Payable.length > 0 && (
              <>
                <div className="flex items-center gap-2 mt-4">
                  <Badge variant="outline" className={cn("text-xs px-2 py-0.5", TAX_BADGE_COLORS.pp36)}>PP36</Badge>
                  <h3 className="text-sm font-semibold text-gray-800">Monthly PP36 Filing</h3>
                  <span className="text-xs text-gray-500">
                    {currentMonthLabel} invoices — file in {data.vat_summary.pp36_filing_month}
                  </span>
                </div>
                <div className="border rounded-lg overflow-x-auto">
                  <div className="bg-violet-50 border-b px-3 py-1.5 text-xs font-medium text-violet-700">
                    Purchase VAT Items ({pp36Payable.length} items)
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-2 py-2 text-center font-medium text-gray-500 w-[30px]"></th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500 w-[30px]">#</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500 w-[65px]">Date</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[180px]">Vendor</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px]">Description</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px]">Tax</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Tax Base</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-500 w-[80px]">VAT</th>
                        <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Withdrawal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pp36Payable.map((p36, idx) => (
                        <tr key={`p36p_${p36.id}`} className={cn(
                          "border-b hover:bg-gray-50/50 transition-colors",
                          p36.flow_completed && "bg-green-50/30"
                        )}>
                          <td className="px-2 py-1.5 text-center">
                            <Checkbox
                              checked={p36.flow_completed}
                              onCheckedChange={() => toggleItem('annotation', p36.id, undefined, p36.flow_completed)}
                              disabled={togglingIds.has(`ann_${p36.id}`)}
                              className={cn(p36.flow_completed && 'accent-green-600')}
                            />
                          </td>
                          <td className={cn("px-2 py-1.5 text-gray-400 text-xs", p36.flow_completed && "text-gray-300")}>{idx + 1}</td>
                          <td className={cn("px-2 py-1.5 text-xs whitespace-nowrap", p36.flow_completed && "text-gray-400")}>{formatDate(p36.transaction_date)}</td>
                          <td className={cn("px-2 py-1.5 font-medium", p36.flow_completed ? "text-gray-400 line-through" : "text-gray-700")}>{p36.vendor_name}</td>
                          <td className={cn("px-2 py-1.5 text-xs", p36.flow_completed ? "text-gray-400" : "text-gray-500")}>{p36.notes || ''}</td>
                          <td className="px-2 py-1.5">
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", TAX_BADGE_COLORS.pp36, p36.flow_completed && "opacity-50")}>PP36</Badge>
                          </td>
                          <td className={cn("px-2 py-1.5 text-right font-mono text-xs", p36.flow_completed && "text-gray-400")}>{formatNum(p36.tax_base)}</td>
                          <td className={cn("px-2 py-1.5 text-right font-mono text-xs", p36.flow_completed && "text-gray-400")}>{formatNum(p36.vat_amount)}</td>
                          <td className={cn("px-2 py-1.5 text-right font-mono text-xs", p36.flow_completed && "text-gray-400")}>{formatNum(p36.withdrawal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t font-medium">
                        <td colSpan={6} className="px-2 py-2 text-right text-gray-500">
                          Totals ({pp36Payable.length} items)
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          {formatNum(pp36Payable.reduce((s, i) => s + i.tax_base, 0))}
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          {formatNum(pp36Payable.reduce((s, i) => s + i.vat_amount, 0))}
                        </td>
                        <td className="px-2 py-2 text-right font-mono">
                          {formatNum(pp36Payable.reduce((s, i) => s + i.withdrawal, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}

            {/* KBank EDC */}
            {data.kbank_edc.length > 0 && (
              <Card>
                <CardContent className="pt-4 pb-3 px-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">KBank EDC Fees</h3>
                  <div className="border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-2 py-2 text-center font-medium text-gray-500 w-[30px]"></th>
                          <th className="px-2 py-2 text-left font-medium text-gray-500">Type</th>
                          <th className="px-2 py-2 text-right font-medium text-gray-500">Settlements</th>
                          <th className="px-2 py-2 text-right font-medium text-gray-500">Commission</th>
                          <th className="px-2 py-2 text-right font-medium text-gray-500">VAT</th>
                          <th className="px-2 py-2 text-right font-medium text-gray-500">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.kbank_edc.map((kbank) => (
                          <tr
                            key={kbank.item_key}
                            className={cn(
                              "border-b hover:bg-gray-50/50 transition-colors",
                              kbank.flow_completed && "bg-green-50/30"
                            )}
                          >
                            <td className="px-2 py-2 text-center">
                              <Checkbox
                                checked={kbank.flow_completed}
                                onCheckedChange={() => toggleItem('kbank_edc', undefined, kbank.item_key, kbank.flow_completed)}
                                disabled={togglingIds.has(`kbank_${kbank.item_key}`)}
                                className={cn(kbank.flow_completed && 'accent-green-600')}
                              />
                            </td>
                            <td className={cn("px-2 py-2 font-medium", kbank.flow_completed && "text-gray-400")}>
                              {kbank.label}
                            </td>
                            <td className={cn("px-2 py-2 text-right", kbank.flow_completed && "text-gray-400")}>
                              {kbank.settlement_count}
                            </td>
                            <td className={cn("px-2 py-2 text-right font-mono", kbank.flow_completed && "text-gray-400")}>
                              {formatNum(kbank.total_commission)}
                            </td>
                            <td className={cn("px-2 py-2 text-right font-mono", kbank.flow_completed && "text-gray-400")}>
                              {formatNum(kbank.total_vat)}
                            </td>
                            <td className={cn("px-2 py-2 text-right font-mono font-medium", kbank.flow_completed && "text-gray-400")}>
                              {formatNum(kbank.total_amount)}
                            </td>
                          </tr>
                        ))}
                        {data.kbank_edc.length > 1 && (() => {
                          const totalCommission = Math.round(data.kbank_edc.reduce((s, k) => s + k.total_commission, 0) * 100) / 100;
                          const totalVat = Math.round(totalCommission * 7) / 100;
                          const totalAmount = Math.round((totalCommission + totalVat) * 100) / 100;
                          return (
                            <tr className="bg-gray-50 border-t-2 border-gray-200">
                              <td></td>
                              <td className="px-2 py-2 font-semibold text-gray-700">Total</td>
                              <td className="px-2 py-2 text-right font-semibold text-gray-700">
                                {data.kbank_edc.reduce((s, k) => s + k.settlement_count, 0)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono font-semibold text-gray-700">
                                {formatNum(totalCommission)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono font-semibold text-gray-700">
                                {formatNum(totalVat)}
                              </td>
                              <td className="px-2 py-2 text-right font-mono font-semibold text-gray-700">
                                {formatNum(totalAmount)}
                              </td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Record as Bank Charges in Flow Account
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Platform Fees */}
            <PlatformFeesSection
              platformFees={vatPlatformFees}
              togglingIds={togglingIds}
              onToggle={(itemKey, currentValue) => toggleItem('platform_fee', undefined, itemKey, currentValue)}
            />
          </div>

          {/* ─── Completion Bar ─── */}
          {totalVatItems > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 border rounded-lg">
              <div className="text-sm text-gray-600">
                {allVatComplete ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    All {totalVatItems} VAT items completed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    {totalVatCompleted} of {totalVatItems} VAT items completed
                  </span>
                )}
              </div>
              {!allVatComplete && (
                <Button size="sm" variant="outline" onClick={markAllComplete}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark All Complete
                </Button>
              )}
            </div>
          )}

        </>
      )}
    </div>
  );
}

// ── Platform Fees Section ────────────────────────────────────────────────

interface PlatformFeesSectionProps {
  platformFees: PlatformFeeItem[];
  togglingIds: Set<string>;
  onToggle: (itemKey: string, currentValue: boolean) => void;
}

function PlatformFeesSection({
  platformFees,
  togglingIds,
  onToggle,
}: PlatformFeesSectionProps) {
  if (platformFees.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          <Receipt className="h-4 w-4" />
          <span>Platform Fees</span>
        </div>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-2 py-2 text-center font-medium text-gray-500 w-[30px]"></th>
                <th className="px-2 py-2 text-left font-medium text-gray-500">Vendor</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[80px]">Tax</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Amount</th>
                <th className="px-2 py-2 text-right font-medium text-gray-500 w-[80px]">VAT</th>
                <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {platformFees.map((fee) => (
                <tr
                  key={fee.item_key}
                  className={cn(
                    "border-b hover:bg-gray-50/50 transition-colors",
                    fee.flow_completed && "bg-green-50/30"
                  )}
                >
                  <td className="px-2 py-2 text-center">
                    <Checkbox
                      checked={fee.flow_completed}
                      onCheckedChange={() => onToggle(fee.item_key, fee.flow_completed)}
                      disabled={togglingIds.has(`pf_${fee.item_key}`)}
                      className={cn(fee.flow_completed && 'accent-green-600')}
                    />
                  </td>
                  <td className={cn("px-2 py-2", fee.flow_completed && "text-gray-400")}>
                    <span className="font-medium">{fee.label}</span>
                    {fee.invoice_ref && (
                      <span className="text-gray-400 text-xs ml-1.5">#{fee.invoice_ref}</span>
                    )}
                    {fee.receipt_date && (
                      <span className="text-gray-400 text-xs ml-1.5">{formatDate(fee.receipt_date)}</span>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {fee.vat_type !== 'none' && (
                      <Badge
                        variant="outline"
                        className={cn("text-[10px] px-1.5 py-0", TAX_BADGE_COLORS[fee.vat_type], fee.flow_completed && "opacity-50")}
                      >
                        {fee.vat_type.toUpperCase()}
                      </Badge>
                    )}
                  </td>
                  <td className={cn("px-2 py-2 text-right font-mono", fee.flow_completed && "text-gray-400")}>
                    {fee.has_receipt ? formatNum(fee.total_amount) : '-'}
                  </td>
                  <td className={cn("px-2 py-2 text-right font-mono", fee.flow_completed && "text-gray-400")}>
                    {fee.has_receipt && fee.vat_amount > 0 ? formatNum(fee.vat_amount) : ''}
                  </td>
                  <td className="px-2 py-2">
                    {fee.has_receipt ? (
                      <span className="text-xs text-green-600">Receipt linked</span>
                    ) : (
                      <span className="text-xs text-amber-500">Pending upload</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Amounts auto-populated from uploaded vendor receipts
        </p>
      </CardContent>
    </Card>
  );
}

// ── Row Component ───────────────────────────────────────────────────────

function ChecklistRow({
  item,
  seq,
  isToggling,
  onToggle,
}: {
  item: ExpenseChecklistItem;
  seq: number;
  isToggling: boolean;
  onToggle: () => void;
}) {
  const completed = item.flow_completed;
  const badges: { label: string; color: string }[] = [];

  if (item.vat_type !== 'none') {
    badges.push({ label: item.vat_type.toUpperCase(), color: TAX_BADGE_COLORS[item.vat_type] });
  }
  if (item.wht_type !== 'none') {
    badges.push({ label: item.wht_type.toUpperCase(), color: TAX_BADGE_COLORS[item.wht_type] });
  }

  return (
    <tr className={cn(
      "border-b hover:bg-gray-50/50 transition-colors",
      completed && "bg-green-50/30"
    )}>
      <td className="px-2 py-1.5 text-center">
        <Checkbox
          checked={completed}
          onCheckedChange={onToggle}
          disabled={isToggling}
          className={cn(completed && 'accent-green-600')}
        />
      </td>
      <td className={cn("px-2 py-1.5 text-gray-400 text-xs", completed && "text-gray-300")}>{seq}</td>
      <td className={cn("px-2 py-1.5 text-xs whitespace-nowrap", completed && "text-gray-400")}>
        {formatDate(item.transaction_date)}
      </td>
      <td className={cn("px-2 py-1.5 font-medium", completed ? "text-gray-400 line-through" : "text-gray-700")}>
        {item.vendor_name}
      </td>
      <td className={cn("px-2 py-1.5 text-xs", completed ? "text-gray-400" : "text-gray-500")}>
        {item.notes || ''}
      </td>
      <td className="px-2 py-1.5">
        <div className="flex gap-1 flex-wrap">
          {badges.map((b) => (
            <Badge
              key={b.label}
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", b.color, completed && "opacity-50")}
            >
              {b.label}
            </Badge>
          ))}
        </div>
      </td>
      <td className={cn("px-2 py-1.5 text-right font-mono text-xs", completed && "text-gray-400")}>
        {item.tax_base ? formatNum(item.tax_base) : ''}
      </td>
      <td className={cn("px-2 py-1.5 text-right font-mono text-xs", completed && "text-gray-400")}>
        {item.vat_amount && item.vat_amount > 0 ? formatNum(item.vat_amount) : ''}
      </td>
      <td className={cn("px-2 py-1.5 text-right font-mono text-xs", completed && "text-gray-400")}>
        {formatNum(item.withdrawal)}
      </td>
    </tr>
  );
}

// ── PP36 Items Table ─────────────────────────────────────────────────────

function Pp36ItemsTable({ items }: { items: Pp36LineItem[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b">
          <th className="px-2 py-2 text-left font-medium text-gray-500 w-[30px]">#</th>
          <th className="px-2 py-2 text-left font-medium text-gray-500 w-[65px]">Paid</th>
          <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[180px]">Vendor</th>
          <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[120px]">Description</th>
          <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Tax Base</th>
          <th className="px-2 py-2 text-right font-medium text-gray-500 w-[80px]">VAT</th>
          <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Withdrawal</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, idx) => (
          <tr key={item.id} className="border-b hover:bg-gray-50/50 transition-colors">
            <td className="px-2 py-1.5 text-gray-400 text-xs">{idx + 1}</td>
            <td className="px-2 py-1.5 text-xs whitespace-nowrap">{formatDate(item.transaction_date)}</td>
            <td className="px-2 py-1.5 font-medium text-gray-700">{item.vendor_name}</td>
            <td className="px-2 py-1.5 text-xs text-gray-500">{item.notes || ''}</td>
            <td className="px-2 py-1.5 text-right font-mono text-xs">{formatNum(item.tax_base)}</td>
            <td className="px-2 py-1.5 text-right font-mono text-xs">{formatNum(item.vat_amount)}</td>
            <td className="px-2 py-1.5 text-right font-mono text-xs">{formatNum(item.withdrawal)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="bg-gray-50 border-t font-medium">
          <td colSpan={4} className="px-2 py-2 text-right text-gray-500">
            Totals ({items.length} items)
          </td>
          <td className="px-2 py-2 text-right font-mono">
            {formatNum(items.reduce((s, i) => s + i.tax_base, 0))}
          </td>
          <td className="px-2 py-2 text-right font-mono">
            {formatNum(items.reduce((s, i) => s + i.vat_amount, 0))}
          </td>
          <td className="px-2 py-2 text-right font-mono">
            {formatNum(items.reduce((s, i) => s + i.withdrawal, 0))}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function recalcSummary(
  items: ExpenseChecklistItem[],
  kbankEdc: KbankEdcItem[],
  platformFees: PlatformFeeItem[],
  payroll: MonthlyPayrollData
): ExpenseChecklistSummary {
  const kbankTotalAmount = Math.round(kbankEdc.reduce((s, k) => s + k.total_amount, 0) * 100) / 100;
  const kbankCommission = Math.round(kbankEdc.reduce((s, k) => s + k.total_commission, 0) * 100) / 100;
  const kbankVat = Math.round(kbankEdc.reduce((s, k) => s + k.total_vat, 0) * 100) / 100;

  const pfTotalAmount = Math.round(platformFees.reduce((s, p) => s + p.total_amount, 0) * 100) / 100;
  const pfVatPp30 = Math.round(
    platformFees.filter((p) => p.vat_type === 'pp30').reduce((s, p) => s + p.vat_amount, 0) * 100
  ) / 100;
  const pfVatPp36 = Math.round(
    platformFees.filter((p) => p.vat_type === 'pp36').reduce((s, p) => s + p.vat_amount, 0) * 100
  ) / 100;
  const pfVatTotal = Math.round((pfVatPp30 + pfVatPp36) * 100) / 100;

  return {
    total_items: items.length + kbankEdc.length + platformFees.length,
    completed_items:
      items.filter((i) => i.flow_completed).length +
      kbankEdc.filter((k) => k.flow_completed).length +
      platformFees.filter((p) => p.flow_completed).length,
    total_expenses: Math.round((items.reduce((s, i) => s + i.withdrawal, 0) + kbankTotalAmount + pfTotalAmount) * 100) / 100,
    vat_pp30: Math.round(
      (items.filter((i) => i.vat_type === 'pp30').reduce((s, i) => s + (i.vat_amount || 0), 0) + kbankVat + pfVatPp30) * 100
    ) / 100,
    vat_pp36: Math.round(
      (items.filter((i) => i.vat_type === 'pp36').reduce((s, i) => s + (i.vat_amount || 0), 0) + pfVatPp36) * 100
    ) / 100,
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
}
