'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ExpenseChecklistData,
  MonthlySalesData,
} from '@/types/tax-filing';

interface SalesVatTabProps {
  period: string;
}

function formatNum(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function SalesVatTab({ period }: SalesVatTabProps) {
  const [data, setData] = useState<ExpenseChecklistData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
  }, [period, fetchData]);

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

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading sales data...</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && !loading && (
        <SalesSummarySection sales={data.sales} />
      )}
    </div>
  );
}

// ── Sales Summary Section ───────────────────────────────────────────────

function SalesSummarySection({ sales }: { sales: MonthlySalesData }) {
  const totalNet = Math.round((sales.pos_sales_net + sales.other_sales_net) * 100) / 100;
  const totalVat = sales.total_output_vat;
  const totalGross = Math.round((totalNet + totalVat) * 100) / 100;

  // POS payment method rows
  const posRows = [
    { label: 'POS Credit (EDC)', amount: sales.pos_credit },
    { label: 'POS eWallet', amount: sales.pos_ewallet },
    { label: 'POS Bank Transfer/QR', amount: sales.pos_qr },
    { label: 'POS Cash', amount: sales.pos_cash },
  ].filter((r) => r.amount > 0);

  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
          <TrendingUp className="h-4 w-4" />
          <span>Revenue / Output VAT</span>
        </div>
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left font-medium text-gray-500">Source</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 w-[130px]">Gross</th>
              </tr>
            </thead>
            <tbody>
              {/* POS Sales by payment method */}
              {posRows.map((row) => (
                <tr key={row.label} className="border-b">
                  <td className="px-3 py-2 text-gray-600">{row.label}</td>
                  <td className="px-3 py-2 text-right font-mono">{formatNum(row.amount)}</td>
                </tr>
              ))}
              {/* POS subtotal */}
              <tr className="border-b bg-gray-50/50">
                <td className="px-3 py-2 text-gray-700 font-medium">
                  POS Total
                  <span className="text-gray-400 text-xs font-normal ml-1.5">
                    ({sales.pos_receipt_count} receipts)
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono font-medium">{formatNum(sales.pos_sales_total)}</td>
              </tr>

              {/* Other Sales */}
              {sales.other_sales.map((entry, idx) => (
                <tr key={`other-${idx}`} className="border-b">
                  <td className="px-3 py-2 text-gray-600">
                    {entry.category || entry.description}
                    {entry.category && entry.description && entry.category !== entry.description && (
                      <span className="text-gray-400 text-xs ml-1.5">{entry.description}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{formatNum(entry.amount)}</td>
                </tr>
              ))}
              {sales.other_sales.length > 0 && (
                <tr className="border-b bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-700 font-medium">Other Sales Total</td>
                  <td className="px-3 py-2 text-right font-mono font-medium">{formatNum(sales.other_sales_total)}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t font-medium">
                <td className="px-3 py-2 text-gray-700">Grand Total</td>
                <td className="px-3 py-2 text-right font-mono">{formatNum(totalGross)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-3 py-1 text-gray-500 text-xs">Net Sales</td>
                <td className="px-3 py-1 text-right font-mono text-xs text-gray-500">{formatNum(totalNet)}</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="px-3 py-1 pb-2 text-gray-500 text-xs">Output VAT</td>
                <td className="px-3 py-1 pb-2 text-right font-mono text-xs text-blue-700 font-medium">{formatNum(totalVat)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
