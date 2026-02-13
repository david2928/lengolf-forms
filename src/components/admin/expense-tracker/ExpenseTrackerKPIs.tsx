'use client';

import { Receipt, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { TransactionsSummary } from '@/types/expense-tracker';

interface ExpenseTrackerKPIsProps {
  summary: TransactionsSummary;
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function KpiCard({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="flex flex-col">
      <span className={`text-[10px] font-semibold ${color}`}>{label}</span>
      <span className="text-sm font-bold tabular-nums">{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

export function ExpenseTrackerKPIs({ summary }: ExpenseTrackerKPIsProps) {
  const completionPct = summary.total_transactions > 0
    ? Math.round((summary.annotated_count / summary.total_transactions) * 100)
    : 0;

  const totalExpenseTax = summary.vat_pp30 + summary.vat_pp36 + summary.wht_pnd3 + summary.wht_pnd53;
  // Revenue breakdown total should match total_deposits (excludes cash deposits & internal transfers)
  const totalRevenue = summary.total_deposits;

  return (
    <div className="space-y-3">
      {/* Top row: Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Receipt className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Transactions</span>
            </div>
            <div className="text-xl font-bold">{summary.total_transactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Annotated</span>
            </div>
            <div className="text-xl font-bold">
              {completionPct}%
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({summary.annotated_count}/{summary.total_transactions})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-red-500 mb-1">
              <TrendingDown className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Bank Withdrawals</span>
            </div>
            <div className="text-xl font-bold tabular-nums text-red-600">{fmt(summary.total_withdrawals)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-green-500 mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium">Bank Deposits</span>
            </div>
            <div className="text-xl font-bold tabular-nums text-green-600">{fmt(summary.total_deposits)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: Expense Tax + Revenue Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Expense Tax Breakdown */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Expense Tax Breakdown</span>
              <span className="text-xs font-bold tabular-nums">{fmt(totalExpenseTax)}</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <KpiCard label="PP30 VAT" value={fmt(summary.vat_pp30)} color="text-blue-600" sub="Domestic" />
              <KpiCard label="PP36 VAT" value={fmt(summary.vat_pp36)} color="text-violet-600" sub="Reverse chg" />
              <KpiCard label="PND3 WHT" value={fmt(summary.wht_pnd3)} color="text-orange-600" sub="Individual" />
              <KpiCard label="PND53 WHT" value={fmt(summary.wht_pnd53)} color="text-amber-600" sub="Company" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue Breakdown */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Deposit Breakdown</span>
              <span className="text-xs font-bold tabular-nums">{fmt(totalRevenue)}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="QR / Transfer" value={fmt(summary.revenue_qr)} color="text-lime-600" />
              <KpiCard label="Card + eWallet" value={fmt(summary.revenue_card_ewallet)} color="text-indigo-600" />
              <KpiCard label="Other" value={fmt(Math.max(0, summary.total_deposits - summary.revenue_qr - summary.revenue_card_ewallet))} color="text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
