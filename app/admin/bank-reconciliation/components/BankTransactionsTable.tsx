'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BankTransaction } from '../types/bank-reconciliation';

interface BankTransactionsTableProps {
  transactions: BankTransaction[];
}

const fmt = (amount: number) => {
  if (amount === 0) return '-';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDateHeader = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const categoryBadge = (category: BankTransaction['category']) => {
  const styles: Record<BankTransaction['category'], { bg: string; label: string }> = {
    card_settlement: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Card' },
    ewallet_settlement: { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'eWallet' },
    transfer_deposit: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Transfer' },
    gowabi_payout: { bg: 'bg-orange-50 text-orange-700 border-orange-200', label: 'GoWabi' },
    withdrawal: { bg: 'bg-red-50 text-red-700 border-red-200', label: 'Withdrawal' },
    other: { bg: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Other' },
  };
  const s = styles[category];
  return <Badge variant="outline" className={`text-[10px] font-medium px-1.5 py-0 ${s.bg}`}>{s.label}</Badge>;
};

const statusDot = (status: BankTransaction['reconciliationStatus']) => {
  const colors: Record<string, string> = {
    reconciled: 'bg-green-400',
    partial: 'bg-yellow-400',
    unreconciled: 'bg-red-400',
    pending: 'bg-gray-300',
  };
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status] || colors.pending}`} />;
};

export default function BankTransactionsTable({ transactions }: BankTransactionsTableProps) {
  const [showUnreconciledOnly, setShowUnreconciledOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!showUnreconciledOnly) return transactions;
    return transactions.filter(t => t.reconciliationStatus === 'unreconciled');
  }, [transactions, showUnreconciledOnly]);

  const unreconciledCount = useMemo(
    () => transactions.filter(t => t.reconciliationStatus === 'unreconciled').length,
    [transactions]
  );

  // Group filtered transactions by date
  const groupedByDate = useMemo(() => {
    const groups: { date: string; txns: BankTransaction[] }[] = [];
    let currentDate = '';
    for (const txn of filtered) {
      if (txn.date !== currentDate) {
        currentDate = txn.date;
        groups.push({ date: currentDate, txns: [] });
      }
      groups[groups.length - 1].txns.push(txn);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50/50">
        <div className="text-sm font-semibold text-gray-700">
          Bank Transactions
          <span className="ml-2 text-gray-400 font-normal">{filtered.length} records</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="unreconciled-filter"
            checked={showUnreconciledOnly}
            onCheckedChange={setShowUnreconciledOnly}
          />
          <Label htmlFor="unreconciled-filter" className="text-xs text-gray-600 cursor-pointer">
            Unreconciled only
            {unreconciledCount > 0 && (
              <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0">
                {unreconciledCount}
              </Badge>
            )}
          </Label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200">
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-500 w-14">Time</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-500">Description</TableHead>
              <TableHead className="py-2.5 px-3 text-xs font-semibold text-gray-500 w-20 text-center">Type</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-500 text-right">Amount</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-500 w-36">Channel</TableHead>
              <TableHead className="py-2.5 px-4 text-xs font-semibold text-gray-500">Reconciliation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {groupedByDate.map((group) => (
              <React.Fragment key={group.date}>
                {/* Date separator row */}
                <TableRow className="bg-gray-50/80 border-b border-gray-100">
                  <TableCell colSpan={6} className="py-2 px-4">
                    <span className="text-xs font-semibold text-gray-500">
                      {formatDateHeader(group.date)}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-2">
                      {group.txns.length} transaction{group.txns.length !== 1 ? 's' : ''}
                    </span>
                  </TableCell>
                </TableRow>

                {/* Transactions for this date */}
                {group.txns.map((txn, i) => {
                  const isUnreconciled = txn.reconciliationStatus === 'unreconciled';
                  return (
                    <TableRow
                      key={`${txn.date}-${txn.time}-${i}`}
                      className={`border-b border-gray-50 transition-colors hover:bg-gray-50 last:border-b-0 ${
                        isUnreconciled ? 'bg-red-50/40' : ''
                      }`}
                    >
                      <TableCell className="py-2.5 px-4 text-xs text-gray-400 tabular-nums">{txn.time}</TableCell>
                      <TableCell className="py-2.5 px-4">
                        <span className="text-sm text-gray-800 truncate block max-w-[280px]" title={txn.description}>
                          {txn.description}
                        </span>
                        {txn.details && (txn.category === 'transfer_deposit' || txn.category === 'gowabi_payout') && (
                          <span className="text-[10px] text-gray-400 truncate block max-w-[280px]" title={txn.details}>
                            {txn.details}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-center">{categoryBadge(txn.category)}</TableCell>
                      <TableCell className="py-2.5 px-4 text-right tabular-nums text-sm font-medium">
                        {txn.deposit > 0 && <span className="text-green-600">+{fmt(txn.deposit)}</span>}
                        {txn.withdrawal > 0 && <span className="text-red-600">-{fmt(txn.withdrawal)}</span>}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-xs text-gray-400 truncate max-w-[140px]" title={txn.channel}>
                        {txn.channel}
                      </TableCell>
                      <TableCell className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          {statusDot(txn.reconciliationStatus)}
                          <span className={`text-xs truncate max-w-[220px] ${
                            isUnreconciled ? 'text-red-600 font-medium' : 'text-gray-400'
                          }`} title={txn.reconciliationNote}>
                            {txn.reconciliationNote || '-'}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </React.Fragment>
            ))}

            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-400 py-12">
                  {showUnreconciledOnly ? 'No unreconciled transactions found' : 'No transactions to display'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
