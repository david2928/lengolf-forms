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
  TrialBalanceTxEntry,
  TrialBalanceData,
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
  const [data, setData] = useState<TrialBalanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async (p: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tax-filing/trial-balance?period=${p}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result: TrialBalanceData = await res.json();
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

  const toggleItem = useCallback(async (entry: TrialBalanceTxEntry) => {
    const toggleKey = `tx_${entry.bank_transaction_id}`;
    const newValue = !entry.flow_completed;

    setTogglingIds((prev) => new Set(prev).add(toggleKey));
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        entries: prev.entries.map((e) =>
          e.bank_transaction_id === entry.bank_transaction_id
            ? { ...e, flow_completed: newValue }
            : e
        ),
      };
    });

    try {
      const body =
        entry.annotation_id !== null
          ? { type: 'annotation', id: entry.annotation_id, flow_completed: newValue }
          : { type: 'bank_transaction', item_key: `bt_${entry.bank_transaction_id}`, period, flow_completed: newValue };

      const res = await fetch('/api/admin/tax-filing/expense-checklist/toggle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // Revert on failure
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            entries: prev.entries.map((e) =>
              e.bank_transaction_id === entry.bank_transaction_id
                ? { ...e, flow_completed: entry.flow_completed }
                : e
            ),
          };
        });
      }
    } catch {
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entries: prev.entries.map((e) =>
            e.bank_transaction_id === entry.bank_transaction_id
              ? { ...e, flow_completed: entry.flow_completed }
              : e
          ),
        };
      });
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(toggleKey);
        return next;
      });
    }
  }, [period]);

  const accountGroups = data ? groupByAccount(data.entries) : [];
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
  accountGroups: { account: string; entries: TrialBalanceTxEntry[] }[];
  togglingIds: Set<string>;
  onToggle: (entry: TrialBalanceTxEntry) => void;
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
        const checked = group.entries.filter((e) => e.flow_completed).length;
        return (
          <div key={group.account} className="border rounded-lg overflow-x-auto">
            <div className="bg-gray-100 border-b px-3 py-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                {ACCOUNT_LABELS[group.account] || `Account ${group.account}`}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">
                  {checked}/{group.entries.length} checked
                </span>
                {balance && (
                  <span className="text-xs text-gray-400">
                    {formatNum(balance.beginning_balance)} &rarr; {formatNum(balance.ending_balance)}
                  </span>
                )}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-2 py-2 text-center font-medium text-gray-500 w-[30px]"></th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 w-[30px]">#</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 w-[65px]">Date</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[160px]">Description / Vendor</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 min-w-[80px]">Notes</th>
                  <th className="px-2 py-2 text-left font-medium text-gray-500 w-[100px]">Tax</th>
                  <th className="px-2 py-2 text-right font-medium text-red-500 w-[100px]">Withdrawal</th>
                  <th className="px-2 py-2 text-right font-medium text-green-600 w-[100px]">Deposit</th>
                  <th className="px-2 py-2 text-right font-medium text-gray-500 w-[100px]">Balance</th>
                </tr>
              </thead>
              {balance && (
                <tbody>
                  <tr className="border-b bg-blue-50/30">
                    <td colSpan={8} className="px-2 py-1.5 text-xs text-gray-500 italic">
                      Beginning Balance
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs font-medium">
                      {formatNum(balance.beginning_balance)}
                    </td>
                  </tr>
                </tbody>
              )}
              <tbody>
                {group.entries.map((entry, idx) => (
                  <TrialBalanceRow
                    key={entry.bank_transaction_id}
                    entry={entry}
                    seq={idx + 1}
                    isToggling={togglingIds.has(`tx_${entry.bank_transaction_id}`)}
                    onToggle={() => onToggle(entry)}
                  />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t font-medium">
                  <td colSpan={6} className="px-2 py-2 text-right text-gray-500">
                    Totals ({group.entries.length} items)
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-red-600">
                    {formatNum(group.entries.reduce((s, e) => s + e.withdrawal, 0))}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-green-600">
                    {formatNum(group.entries.reduce((s, e) => s + e.deposit, 0))}
                  </td>
                  <td className="px-2 py-2 text-right font-mono" />
                </tr>
                {balance && (
                  <tr className="bg-blue-50/30 border-t">
                    <td colSpan={8} className="px-2 py-1.5 text-xs text-gray-500 italic text-right">
                      Ending Balance
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-xs font-medium">
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
  entry,
  seq,
  isToggling,
  onToggle,
}: {
  entry: TrialBalanceTxEntry;
  seq: number;
  isToggling: boolean;
  onToggle: () => void;
}) {
  const completed = entry.flow_completed;
  const isDeposit = entry.deposit > 0;
  const badges: { label: string; color: string }[] = [];

  if (entry.vat_type !== 'none') {
    badges.push({ label: entry.vat_type.toUpperCase(), color: TAX_BADGE_COLORS[entry.vat_type] });
  }
  if (entry.wht_type !== 'none') {
    badges.push({ label: entry.wht_type.toUpperCase(), color: TAX_BADGE_COLORS[entry.wht_type] });
  }

  const displayName = entry.vendor_name || entry.description || '';

  return (
    <tr className={cn(
      "border-b hover:bg-gray-50/50 transition-colors",
      completed && "bg-green-50/30",
      isDeposit && !completed && "bg-green-50/10"
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
        {formatDate(entry.transaction_date)}
      </td>
      <td className={cn("px-2 py-1.5 font-medium text-xs", completed ? "text-gray-400 line-through" : "text-gray-700")}>
        {displayName}
      </td>
      <td className={cn("px-2 py-1.5 text-xs", completed ? "text-gray-400" : "text-gray-500")}>
        {entry.notes || ''}
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
      <td className={cn("px-2 py-1.5 text-right font-mono text-xs", completed ? "text-gray-400" : "text-red-600")}>
        {entry.withdrawal > 0 ? formatNum(entry.withdrawal) : ''}
      </td>
      <td className={cn("px-2 py-1.5 text-right font-mono text-xs", completed ? "text-gray-400" : "text-green-600")}>
        {entry.deposit > 0 ? formatNum(entry.deposit) : ''}
      </td>
      <td className={cn("px-2 py-1.5 text-right font-mono text-xs", completed && "text-gray-400")}>
        {formatNum(entry.balance)}
      </td>
    </tr>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function groupByAccount(
  entries: TrialBalanceTxEntry[]
): { account: string; entries: TrialBalanceTxEntry[] }[] {
  const map = new Map<string, TrialBalanceTxEntry[]>();
  entries.forEach((entry) => {
    const key = entry.account_number || OPERATING_ACCOUNT;
    const group = map.get(key);
    if (group) {
      group.push(entry);
    } else {
      map.set(key, [entry]);
    }
  });

  const order = [OPERATING_ACCOUNT, SAVINGS_ACCOUNT];
  const result: { account: string; entries: TrialBalanceTxEntry[] }[] = [];

  order.forEach((acct) => {
    const group = map.get(acct);
    if (group) {
      result.push({ account: acct, entries: group });
      map.delete(acct);
    }
  });

  map.forEach((group, acct) => {
    result.push({ account: acct, entries: group });
  });

  return result;
}
