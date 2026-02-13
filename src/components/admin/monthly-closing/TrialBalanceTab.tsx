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
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  ExpenseChecklistData,
  ExpenseChecklistItem,
  BankAccountBalance,
} from '@/types/tax-filing';

interface TrialBalanceTabProps {
  period: string;
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

const OPERATING_ACCOUNT = '170-3-26995-4';
const SAVINGS_ACCOUNT = '170-3-27029-4';

const ACCOUNT_LABELS: Record<string, string> = {
  [OPERATING_ACCOUNT]: 'Operating Account (170-3-26995-4)',
  [SAVINGS_ACCOUNT]: 'Savings Account (170-3-27029-4)',
};

export function TrialBalanceTab({ period }: TrialBalanceTabProps) {
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

  const toggleItem = useCallback(async (id: number, currentValue: boolean) => {
    const toggleKey = `ann_${id}`;
    const newValue = !currentValue;

    setTogglingIds((prev) => new Set(prev).add(toggleKey));
    setData((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((i) =>
        i.id === id ? { ...i, flow_completed: newValue } : i
      );
      return { ...prev, items };
    });

    try {
      const res = await fetch('/api/admin/tax-filing/expense-checklist/toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'annotation', id, flow_completed: newValue }),
      });

      if (!res.ok) {
        // Revert on failure
        setData((prev) => {
          if (!prev) return prev;
          const items = prev.items.map((i) =>
            i.id === id ? { ...i, flow_completed: currentValue } : i
          );
          return { ...prev, items };
        });
      }
    } catch {
      setData((prev) => {
        if (!prev) return prev;
        const items = prev.items.map((i) =>
          i.id === id ? { ...i, flow_completed: currentValue } : i
        );
        return { ...prev, items };
      });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(toggleKey);
        return next;
      });
    }
  }, []);

  const accountGroups = data ? groupByAccount(data.items) : [];
  const bankBalances = data?.bank_balances || [];

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
          <span>Loading trial balance...</span>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data && !loading && (
        <TrialBalanceContent
          bankBalances={bankBalances}
          accountGroups={accountGroups}
          togglingIds={togglingIds}
          onToggle={toggleItem}
        />
      )}
    </div>
  );
}

// ── Trial Balance Content ─────────────────────────────────────────────────

interface TrialBalanceContentProps {
  bankBalances: BankAccountBalance[];
  accountGroups: { account: string; items: ExpenseChecklistItem[] }[];
  togglingIds: Set<string>;
  onToggle: (id: number, currentValue: boolean) => void;
}

function TrialBalanceContent({
  bankBalances,
  accountGroups,
  togglingIds,
  onToggle,
}: TrialBalanceContentProps) {
  if (bankBalances.length === 0 && accountGroups.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Landmark className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No bank transactions found</p>
        <p className="text-sm mt-1">No data available for this period</p>
      </div>
    );
  }

  const balanceMap = new Map<string, BankAccountBalance>();
  bankBalances.forEach((b) => balanceMap.set(b.account_number, b));

  return (
    <div className="space-y-3">
      {/* Account summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {bankBalances.map((acct) => (
          <Card key={acct.account_number}>
            <CardContent className="pt-4 pb-3 px-4">
              <div className="text-xs font-medium text-gray-500 mb-2">
                {ACCOUNT_LABELS[acct.account_number] || `Account ${acct.account_number}`}
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Beginning Balance</span>
                  <span className="font-mono">{formatNum(acct.beginning_balance)}</span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span className="flex items-center gap-1">
                    <ArrowDownRight className="h-3 w-3" />
                    Deposits
                  </span>
                  <span className="font-mono">+{formatNum(acct.total_deposits)}</span>
                </div>
                <div className="flex justify-between text-red-600">
                  <span className="flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    Withdrawals
                  </span>
                  <span className="font-mono">-{formatNum(acct.total_withdrawals)}</span>
                </div>
                <div className="border-t pt-1.5 flex justify-between font-medium">
                  <span className="text-gray-700">Ending Balance</span>
                  <span className="font-mono">{formatNum(acct.ending_balance)}</span>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  {acct.transaction_count} transactions
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed transaction tables per account */}
      {accountGroups.map((group) => {
        const balance = balanceMap.get(group.account);
        return (
          <div key={group.account} className="border rounded-lg overflow-x-auto">
            <div className="bg-gray-100 border-b px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                {ACCOUNT_LABELS[group.account] || `Account ${group.account}`}
              </span>
              {balance && (
                <span className="text-xs text-gray-400">
                  {formatNum(balance.beginning_balance)} &rarr; {formatNum(balance.ending_balance)}
                </span>
              )}
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
                  <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Amount</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500 w-[80px]">VAT</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500 w-[80px]">WHT</th>
                </tr>
              </thead>
              {balance && (
                <tbody>
                  <tr className="border-b bg-blue-50/30">
                    <td colSpan={6} className="px-2 py-1.5 text-xs text-gray-500 italic">
                      Beginning Balance
                    </td>
                    <td colSpan={3} className="px-2 py-1.5 text-right font-mono text-xs font-medium">
                      {formatNum(balance.beginning_balance)}
                    </td>
                  </tr>
                </tbody>
              )}
              <tbody>
                {group.items.map((item, idx) => (
                  <TrialBalanceRow
                    key={item.id}
                    item={item}
                    seq={idx + 1}
                    isToggling={togglingIds.has(`ann_${item.id}`)}
                    onToggle={() => onToggle(item.id, item.flow_completed)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t font-medium">
                  <td colSpan={6} className="px-2 py-2 text-right text-gray-500">
                    Totals ({group.items.length} items)
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {formatNum(group.items.reduce((s, i) => s + i.withdrawal, 0))}
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {formatNum(group.items.reduce((s, i) => s + (i.vat_amount || 0), 0))}
                  </td>
                  <td className="px-2 py-2 text-right font-mono">
                    {formatNum(group.items.reduce((s, i) => s + (i.wht_amount || 0), 0))}
                  </td>
                </tr>
                {balance && (
                  <tr className="bg-blue-50/30 border-t">
                    <td colSpan={6} className="px-2 py-1.5 text-xs text-gray-500 italic text-right">
                      Ending Balance
                    </td>
                    <td colSpan={3} className="px-2 py-1.5 text-right font-mono text-xs font-medium">
                      {formatNum(balance.ending_balance)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ── Row Component ───────────────────────────────────────────────────────

function TrialBalanceRow({
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
        {formatNum(item.withdrawal)}
      </td>
      <td className={cn("px-2 py-1.5 text-right font-mono text-xs", completed && "text-gray-400")}>
        {item.vat_amount && item.vat_amount > 0 ? formatNum(item.vat_amount) : ''}
      </td>
      <td className={cn("px-2 py-1.5 text-right font-mono text-xs", completed && "text-gray-400")}>
        {item.wht_amount && item.wht_amount > 0 ? formatNum(item.wht_amount) : ''}
      </td>
    </tr>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function groupByAccount(items: ExpenseChecklistItem[]): { account: string; items: ExpenseChecklistItem[] }[] {
  const map = new Map<string, ExpenseChecklistItem[]>();
  items.forEach((item) => {
    const key = item.account_number || OPERATING_ACCOUNT;
    const group = map.get(key);
    if (group) {
      group.push(item);
    } else {
      map.set(key, [item]);
    }
  });

  const order = [OPERATING_ACCOUNT, SAVINGS_ACCOUNT];
  const result: { account: string; items: ExpenseChecklistItem[] }[] = [];

  order.forEach((acct) => {
    const group = map.get(acct);
    if (group) {
      result.push({ account: acct, items: group });
      map.delete(acct);
    }
  });

  map.forEach((group, acct) => {
    result.push({ account: acct, items: group });
  });

  return result;
}
