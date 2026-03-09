'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calculator, Loader2 } from 'lucide-react';
import { WhtFilingTab } from '@/components/admin/monthly-closing/WhtFilingTab';
import { ExpensesChecklistTab } from '@/components/admin/monthly-closing/ExpensesChecklistTab';
import { SalesVatTab } from '@/components/admin/monthly-closing/SalesVatTab';
import { TrialBalanceTab } from '@/components/admin/monthly-closing/TrialBalanceTab';
import type { VatSummaryData } from '@/types/tax-filing';

function getDefaultPeriod(): string {
  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const y = prev.getFullYear();
  const m = String(prev.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function generatePeriodOptions(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    options.push({ value: `${y}-${m}`, label });
  }
  return options;
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getPeriodLabel(period: string): string {
  const [y, m] = period.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function MonthlyClosingPage() {
  const [period, setPeriod] = useState(getDefaultPeriod);
  const periodOptions = useMemo(() => generatePeriodOptions(), []);
  const [vatSummary, setVatSummary] = useState<VatSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Receive vat_summary from ExpensesChecklistTab to avoid double-fetch
  const handleVatSummaryUpdate = useCallback((summary: VatSummaryData) => {
    setVatSummary(summary);
    setSummaryLoading(false);
  }, []);

  // Initial fetch for summary card (lightweight — tab may not be active yet)
  const fetchSummary = useCallback(async (p: string) => {
    setSummaryLoading(true);
    try {
      const res = await fetch(`/api/admin/tax-filing/expense-checklist?period=${p}`);
      if (res.ok) {
        const data = await res.json();
        setVatSummary(data.vat_summary);
      }
    } catch {
      // Silently fail — tabs will show their own errors
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(period);
  }, [period, fetchSummary]);

  return (
    <div className="container mx-auto py-6 space-y-4 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-gray-700" />
          <div>
            <h1 className="text-xl font-bold">Sales/Expense Checklist</h1>
            <p className="text-sm text-gray-500">
              Monthly sales overview, expense checklist, and tax filing
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Monthly Tax Filing Summary */}
      <TaxFilingSummary
        period={period}
        vatSummary={vatSummary}
        loading={summaryLoading}
      />

      {/* Tabs */}
      <Tabs defaultValue="sales" className="space-y-3">
        <TabsList>
          <TabsTrigger value="sales">Sales VAT</TabsTrigger>
          <TabsTrigger value="purchase">Purchase VAT</TabsTrigger>
          <TabsTrigger value="wht">WHT (PND3/PND53)</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <SalesVatTab period={period} />
        </TabsContent>

        <TabsContent value="purchase">
          <ExpensesChecklistTab period={period} onVatSummaryUpdate={handleVatSummaryUpdate} />
        </TabsContent>

        <TabsContent value="wht">
          <WhtFilingTab period={period} />
        </TabsContent>

        <TabsContent value="trial-balance">
          <TrialBalanceTab period={period} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Tax Filing Summary Card ──────────────────────────────────────────────

function TaxFilingSummary({
  period,
  vatSummary,
  loading,
}: {
  period: string;
  vatSummary: VatSummaryData | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-4 pb-3 px-4">
          <div className="flex items-center gap-2 py-4 justify-center text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading tax filing summary...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!vatSummary) return null;

  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="mb-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calculator className="h-4 w-4" />
            <span>Monthly Tax Filing Information</span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-6">
            Tax Filing of {getPeriodLabel(period)} (Ordinary filing)
          </p>
        </div>
        <div className="text-sm divide-y">
          {/* Sales section */}
          <div className="space-y-1 pb-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-700 font-medium">Sales for this month</span>
              <span className="font-mono">{formatNum(vatSummary.total_sales_net)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-700 font-medium">This month&apos;s sales VAT per Report</span>
              <span className="font-mono">{formatNum(vatSummary.output_vat)}</span>
            </div>
          </div>

          {/* Purchase VAT section */}
          <div className="space-y-1 py-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-700 font-medium">This month&apos;s purchase VAT claimed</span>
              <span className="font-mono">{formatNum(vatSummary.input_vat_pp30 + vatSummary.input_vat_pp36)}</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-gray-600">Input VAT per Report P.P. 30</span>
              <span className="font-mono">{formatNum(vatSummary.input_vat_pp30)}</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-gray-600">Input VAT per Report P.P. 36</span>
              <span className="font-mono">{formatNum(vatSummary.input_vat_pp36)}</span>
            </div>
            <div className="flex justify-between items-center py-1 pl-4">
              <span className="text-gray-500 text-xs">Total purchase base</span>
              <span className="font-mono text-gray-500 text-xs">{formatNum(vatSummary.total_purchase_base)}</span>
            </div>
          </div>

          {/* PP36 payable (informational) */}
          {vatSummary.pp36_payable > 0 && (
            <div className="py-3">
              <div className="flex justify-between items-center py-1">
                <span className="text-amber-700 font-medium">
                  PP36 to file in {vatSummary.pp36_filing_month}
                </span>
                <span className="font-mono text-amber-700">{formatNum(vatSummary.pp36_payable)}</span>
              </div>
              <p className="text-xs text-gray-400 pl-0 mt-0.5">
                Foreign service invoices for this month — file &amp; pay PP36 next month
              </p>
            </div>
          )}

          {/* Carried forward */}
          <div className="py-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-700 font-medium">Excess purchase VAT Carried Forward</span>
              <span className="font-mono">{formatNum(vatSummary.excess_carried_forward)}</span>
            </div>
          </div>

          {/* Result */}
          <div className="space-y-1 pt-3">
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-800 font-bold">Tax to be paid</span>
              <span className="font-mono font-bold">{formatNum(vatSummary.tax_to_be_paid)}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-gray-800 font-bold">Excess tax to be claimed</span>
              <span className="font-mono font-bold">{formatNum(vatSummary.excess_to_be_claimed)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
