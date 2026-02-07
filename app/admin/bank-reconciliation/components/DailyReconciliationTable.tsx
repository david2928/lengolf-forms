'use client';

import React, { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronDown, ChevronRight, ArrowRight, Equal, AlertTriangle } from 'lucide-react';
import type { DailyReconciliation, ComparisonStatus, ComparisonResult, BankTransaction } from '../types/bank-reconciliation';

interface DailyReconciliationTableProps {
  days: DailyReconciliation[];
}

const COLS = 14; // total columns including Gap

const fmt = (amount: number) => {
  if (amount === 0) return '-';
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const fmtSigned = (amount: number) => {
  const prefix = amount > 0 ? '+' : '';
  return prefix + new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

const statusBadge = (status: ComparisonStatus) => {
  const styles: Record<ComparisonStatus, string> = {
    matched: 'bg-green-100 text-green-700 border-green-200',
    variance: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    partial: 'bg-blue-100 text-blue-700 border-blue-200',
    missing: 'bg-red-100 text-red-700 border-red-200',
    not_applicable: 'bg-gray-100 text-gray-500 border-gray-200',
  };
  const labels: Record<ComparisonStatus, string> = {
    matched: 'OK', variance: 'Var', partial: 'Partial', missing: 'Missing', not_applicable: 'N/A',
  };
  return (
    <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 ${styles[status]}`}>
      {labels[status]}
    </Badge>
  );
};

const rowBg = (status: ComparisonStatus, index: number) => {
  if (status === 'variance') return 'bg-yellow-50/60';
  if (status === 'missing') return 'bg-red-50/40';
  return index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50';
};

const txnStatusColor = (status: BankTransaction['reconciliationStatus']) => {
  switch (status) {
    case 'reconciled': return 'border-l-green-400 bg-green-50/40';
    case 'partial': return 'border-l-yellow-400 bg-yellow-50/40';
    case 'unreconciled': return 'border-l-red-400 bg-red-50/50';
    default: return 'border-l-gray-200';
  }
};

/** Build human-readable variance reasons for a day */
function getVarianceReasons(day: DailyReconciliation): string[] {
  const reasons: string[] = [];
  const { cardFlow, ewalletFlow, cashFlow } = day;

  if (cardFlow.posVsMerchantGross.status === 'variance') {
    reasons.push(`POS Card ${fmt(cardFlow.posCard)} vs Merchant Gross ${fmt(cardFlow.merchantGross)} (${fmtSigned(cardFlow.posVsMerchantGross.variance)})`);
  }
  if (cardFlow.posVsMerchantGross.status === 'missing') {
    if (cardFlow.posCard > 0 && cardFlow.merchantGross === 0) reasons.push('POS has card sales but no merchant settlement');
    else if (cardFlow.posCard === 0 && cardFlow.merchantGross > 0) reasons.push('Merchant settlement found but no POS card data');
  }
  if (cardFlow.merchantNetVsBank.status === 'variance') {
    reasons.push(`Merchant Net ${fmt(cardFlow.merchantNet)} vs Bank Card ${fmt(cardFlow.bankCardDeposit)} (${fmtSigned(cardFlow.merchantNetVsBank.variance)})`);
  }
  if (cardFlow.merchantNetVsBank.status === 'missing') {
    if (cardFlow.merchantNet > 0 && cardFlow.bankCardDeposit === 0) reasons.push('Merchant net credit but no bank card deposit');
    else if (cardFlow.merchantNet === 0 && cardFlow.bankCardDeposit > 0) reasons.push('Bank card deposit but no merchant settlement');
  }
  if (ewalletFlow.posVsMerchantGross.status === 'variance') {
    reasons.push(`POS eWallet ${fmt(ewalletFlow.posEwallet)} vs Merchant Gross ${fmt(ewalletFlow.merchantGross)} (${fmtSigned(ewalletFlow.posVsMerchantGross.variance)})`);
  }
  if (ewalletFlow.posVsMerchantGross.status === 'missing') {
    if (ewalletFlow.posEwallet > 0 && ewalletFlow.merchantGross === 0) reasons.push('POS has eWallet sales but no merchant settlement');
    else if (ewalletFlow.posEwallet === 0 && ewalletFlow.merchantGross > 0) reasons.push('eWallet merchant settlement found but no POS eWallet data');
  }
  if (ewalletFlow.merchantNetVsBank.status === 'variance') {
    reasons.push(`eWallet Merchant Net ${fmt(ewalletFlow.merchantNet)} vs Bank eWallet ${fmt(ewalletFlow.bankEwalletDeposit)} (${fmtSigned(ewalletFlow.merchantNetVsBank.variance)})`);
  }
  if (ewalletFlow.merchantNetVsBank.status === 'missing') {
    if (ewalletFlow.merchantNet > 0 && ewalletFlow.bankEwalletDeposit === 0) reasons.push('eWallet merchant net but no bank deposit');
    else if (ewalletFlow.merchantNet === 0 && ewalletFlow.bankEwalletDeposit > 0) reasons.push('Bank eWallet deposit but no merchant record');
  }
  if (cashFlow.posVsActual.status === 'variance') {
    reasons.push(`POS Cash ${fmt(cashFlow.posCash)} vs Cash Count ${fmt(cashFlow.closingActual ?? 0)} (${fmtSigned(cashFlow.posVsActual.variance)})`);
  }
  if (cashFlow.posVsActual.status === 'missing') {
    if (cashFlow.posCash > 0 && cashFlow.closingActual === null) reasons.push('POS has cash sales but no cash count');
    else if (cashFlow.posCash === 0 && cashFlow.closingActual !== null) reasons.push('Cash counted but no POS cash data');
  }
  if (day.unreconciledCount > 0) {
    reasons.push(`${day.unreconciledCount} unreconciled bank txn${day.unreconciledCount > 1 ? 's' : ''}`);
  }
  return reasons;
}

function isMismatch(result: ComparisonResult): boolean {
  return result.status === 'variance' || result.status === 'missing';
}

export default function DailyReconciliationTable({ days }: DailyReconciliationTableProps) {
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const toggleExpand = (date: string) => {
    setExpandedDate(prev => prev === date ? null : date);
  };

  // Summary stats
  const stats = useMemo(() => {
    let totalGap = 0;
    let daysWithGap = 0;
    let varianceDays = 0;
    let unreconciledTxns = 0;
    const suspiciousBankTxns: Array<{ date: string; txn: BankTransaction }> = [];
    const gapDays: Array<{ date: string; gap: number; posTotal: number }> = [];

    for (const day of days) {
      if (day.overallStatus === 'variance' || day.overallStatus === 'missing') varianceDays++;
      unreconciledTxns += day.unreconciledCount;
      totalGap += day.totalGap;

      if (Math.abs(day.totalGap) > 0.01) {
        daysWithGap++;
        gapDays.push({ date: day.date, gap: day.totalGap, posTotal: day.posTotal });
      }

      if (day.bankDay) {
        for (const txn of day.bankDay.transactions) {
          if (txn.reconciliationStatus === 'unreconciled') {
            suspiciousBankTxns.push({ date: day.date, txn });
          }
        }
      }
    }

    return {
      totalGap: Math.round(totalGap * 100) / 100,
      daysWithGap,
      varianceDays,
      unreconciledTxns,
      suspiciousBankTxns,
      gapDays,
    };
  }, [days]);

  // Footer totals
  const totals = days.reduce(
    (acc, day) => {
      acc.posCash += day.cashFlow.posCash;
      acc.posCard += day.cardFlow.posCard;
      acc.posEwallet += day.ewalletFlow.posEwallet;
      acc.posQr += day.qrFlow.posQr;
      acc.merchantGross += day.cardFlow.merchantGross;
      acc.merchantNet += day.cardFlow.merchantNet;
      acc.merchantFees += day.cardFlow.merchantFees;
      acc.bankCard += day.cardFlow.bankCardDeposit;
      acc.bankEwallet += day.ewalletFlow.bankEwalletDeposit;
      acc.bankTransfers += day.qrFlow.bankTransfers;
      acc.gap += day.totalGap;
      return acc;
    },
    { posCash: 0, posCard: 0, posEwallet: 0, posQr: 0, merchantGross: 0, merchantNet: 0, merchantFees: 0, bankCard: 0, bankEwallet: 0, bankTransfers: 0, gap: 0 }
  );

  const hasSuspicious = stats.suspiciousBankTxns.length > 0 || stats.gapDays.length > 0;

  return (
    <div className="space-y-3">
      {/* Summary stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className={`rounded-md border px-3 py-2 ${stats.varianceDays === 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Days with Variance</div>
          <div className={`text-lg font-bold ${stats.varianceDays === 0 ? 'text-green-700' : 'text-yellow-700'}`}>
            {stats.varianceDays} <span className="text-xs font-normal text-gray-400">/ {days.length}</span>
          </div>
        </div>
        <div className={`rounded-md border px-3 py-2 ${Math.abs(stats.totalGap) <= 0.01 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Gap</div>
          <div className={`text-lg font-bold tabular-nums ${Math.abs(stats.totalGap) <= 0.01 ? 'text-green-700' : 'text-red-700'}`}>
            {fmtSigned(stats.totalGap)}
          </div>
          {stats.daysWithGap > 0 && (
            <div className="text-[10px] text-gray-500">{stats.daysWithGap} day{stats.daysWithGap > 1 ? 's' : ''} with gap</div>
          )}
        </div>
        <div className={`rounded-md border px-3 py-2 ${stats.unreconciledTxns === 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Unreconciled Txns</div>
          <div className={`text-lg font-bold ${stats.unreconciledTxns === 0 ? 'text-green-700' : 'text-red-700'}`}>
            {stats.unreconciledTxns}
          </div>
        </div>
        <div className={`rounded-md border px-3 py-2 ${!hasSuspicious ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Suspicious Items</div>
          <div className={`text-lg font-bold ${!hasSuspicious ? 'text-green-700' : 'text-red-700'}`}>
            {stats.suspiciousBankTxns.length + stats.gapDays.length}
          </div>
        </div>
      </div>

      {/* Suspicious records panel */}
      {hasSuspicious && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-red-700 uppercase tracking-wider">Suspicious Records</div>

          {stats.gapDays.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-red-600 mb-1">Days with POS Total gap</div>
              {stats.gapDays.map((g) => (
                <div key={g.date} className="flex items-center gap-3 text-xs py-1 px-2 bg-white/60 rounded mb-0.5">
                  <span className="font-medium text-gray-700 w-16">{formatDate(g.date)}</span>
                  <span className="text-gray-500">POS Total {fmt(g.posTotal)}</span>
                  <span className="font-bold text-red-600 tabular-nums ml-auto">{fmtSigned(g.gap)} THB</span>
                </div>
              ))}
            </div>
          )}

          {stats.suspiciousBankTxns.length > 0 && (
            <div>
              <div className="text-[11px] font-medium text-red-600 mb-1">Unreconciled bank transactions</div>
              {stats.suspiciousBankTxns.map(({ date, txn }, i) => (
                <div key={`${date}-${txn.time}-${i}`} className="flex items-center gap-3 text-xs py-1 px-2 bg-white/60 rounded mb-0.5">
                  <span className="font-medium text-gray-700 w-16">{formatDate(date)}</span>
                  <span className="text-gray-400 w-11 tabular-nums">{txn.time}</span>
                  <span className="text-gray-700 truncate max-w-[220px]" title={txn.description}>{txn.description}</span>
                  <span className="font-medium tabular-nums text-green-600 w-20 text-right shrink-0">
                    {txn.deposit > 0 ? `+${fmt(txn.deposit)}` : `-${fmt(txn.withdrawal)}`}
                  </span>
                  <span className="text-red-600 text-[11px] ml-auto truncate max-w-[200px]" title={txn.reconciliationNote}>
                    {txn.reconciliationNote}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {/* Column group headers */}
              <TableRow className="border-b border-gray-100 bg-gray-50/80">
                <TableHead colSpan={2} className="py-1.5 px-4 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-r border-gray-200"></TableHead>
                <TableHead colSpan={4} className="py-1.5 text-center text-[10px] font-semibold text-blue-500 uppercase tracking-wider border-r border-gray-200">POS</TableHead>
                <TableHead colSpan={3} className="py-1.5 text-center text-[10px] font-semibold text-purple-500 uppercase tracking-wider border-r border-gray-200">K-Merchant</TableHead>
                <TableHead colSpan={3} className="py-1.5 text-center text-[10px] font-semibold text-emerald-500 uppercase tracking-wider border-r border-gray-200">Bank Statement</TableHead>
                <TableHead className="py-1.5"></TableHead>
                <TableHead className="py-1.5"></TableHead>
              </TableRow>
              {/* Column headers */}
              <TableRow className="border-b border-gray-200">
                <TableHead className="w-8 py-2 px-2"></TableHead>
                <TableHead className="py-2 px-4 border-r border-gray-200">
                  <div className="text-xs font-semibold text-gray-600">Date</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right">
                  <div className="text-xs font-semibold text-gray-600">Cash</div>
                  <div className="text-[9px] text-blue-400 font-normal">vs Actual</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right">
                  <div className="text-xs font-semibold text-gray-600">Card</div>
                  <div className="text-[9px] text-blue-400 font-normal">vs Gross</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right">
                  <div className="text-xs font-semibold text-gray-600">eWallet</div>
                  <div className="text-[9px] text-blue-400 font-normal">vs Gross</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right border-r border-gray-200">
                  <div className="text-xs font-semibold text-gray-600">QR</div>
                  <div className="text-[9px] text-blue-400 font-normal">vs Transfers</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right">
                  <div className="text-xs font-semibold text-gray-600">Gross</div>
                  <div className="text-[9px] text-purple-400 font-normal">vs POS</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right">
                  <div className="text-xs font-semibold text-gray-600">Net</div>
                  <div className="text-[9px] text-purple-400 font-normal">vs Bank</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right border-r border-gray-200">
                  <div className="text-xs font-semibold text-gray-600">Fees</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right">
                  <div className="text-xs font-semibold text-gray-600">Card</div>
                  <div className="text-[9px] text-emerald-400 font-normal">vs Net</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right">
                  <div className="text-xs font-semibold text-gray-600">eWallet</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right border-r border-gray-200">
                  <div className="text-xs font-semibold text-gray-600">Transfers</div>
                  <div className="text-[9px] text-emerald-400 font-normal">vs QR</div>
                </TableHead>
                <TableHead className="py-2 px-3 text-right">
                  <div className="text-xs font-semibold text-gray-600">Gap</div>
                  <div className="text-[9px] text-gray-400 font-normal">POS vs All</div>
                </TableHead>
                <TableHead className="py-2 px-4 text-center text-xs font-semibold text-gray-600 w-16">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {days.map((day, index) => {
                const isExpanded = expandedDate === day.date;
                const varianceReasons = day.overallStatus !== 'matched' && day.overallStatus !== 'not_applicable'
                  ? getVarianceReasons(day)
                  : [];
                const cardMismatch = isMismatch(day.cardFlow.posVsMerchantGross);
                const netMismatch = isMismatch(day.cardFlow.merchantNetVsBank);
                const ewalletMismatch = isMismatch(day.ewalletFlow.posVsMerchantGross) || isMismatch(day.ewalletFlow.merchantNetVsBank);
                const cashMismatch = isMismatch(day.cashFlow.posVsActual);
                const qrMismatch = isMismatch(day.qrFlow.posVsBankTransfers);
                const hasGap = Math.abs(day.totalGap) > 0.01;

                return (
                  <React.Fragment key={day.date}>
                    <TableRow
                      className={`cursor-pointer transition-colors hover:bg-blue-50/30 border-b border-gray-100 ${rowBg(day.overallStatus, index)}`}
                      onClick={() => toggleExpand(day.date)}
                    >
                      <TableCell className="py-2.5 px-2 text-gray-400">
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 border-r border-gray-100">
                        <span className="font-medium text-sm text-gray-800 whitespace-nowrap">
                          {formatDate(day.date)}
                        </span>
                        {day.unreconciledCount > 0 && (
                          <Badge variant="destructive" className="ml-1.5 text-[9px] px-1 py-0 leading-tight">
                            {day.unreconciledCount}
                          </Badge>
                        )}
                      </TableCell>
                      <NumCell value={day.cashFlow.posCash} highlight={cashMismatch} />
                      <NumCell value={day.cardFlow.posCard} highlight={cardMismatch} />
                      <NumCell value={day.ewalletFlow.posEwallet} highlight={ewalletMismatch} />
                      <NumCell value={day.qrFlow.posQr} highlight={qrMismatch} borderRight />
                      <NumCell value={day.cardFlow.merchantGross} highlight={cardMismatch} />
                      <NumCell value={day.cardFlow.merchantNet} highlight={netMismatch} />
                      <NumCell value={day.cardFlow.merchantFees} color="text-red-500" borderRight />
                      <NumCell value={day.cardFlow.bankCardDeposit} highlight={netMismatch} />
                      <NumCell value={day.ewalletFlow.bankEwalletDeposit} highlight={ewalletMismatch} />
                      <NumCell value={day.qrFlow.bankTransfers} highlight={qrMismatch} borderRight />
                      {/* Gap column */}
                      <TableCell className={`py-2.5 px-3 text-right text-sm tabular-nums font-medium ${hasGap ? 'text-red-600 bg-red-50/60' : 'text-gray-300'}`}>
                        {hasGap ? fmtSigned(day.totalGap) : '-'}
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-center">
                        {statusBadge(day.overallStatus)}
                      </TableCell>
                    </TableRow>

                    {/* Variance reason row */}
                    {!isExpanded && varianceReasons.length > 0 && (
                      <TableRow className="bg-yellow-50/30 border-b border-gray-100">
                        <TableCell colSpan={COLS} className="py-1 px-12">
                          <div className="flex items-center gap-1.5 text-[11px] text-yellow-700">
                            <AlertTriangle className="h-3 w-3 shrink-0" />
                            <span className="truncate">{varianceReasons.join(' | ')}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <TableRow className="bg-slate-50">
                        <TableCell colSpan={COLS} className="p-0">
                          <div className="px-5 py-4 space-y-4">
                            {/* POS Total breakdown */}
                            <POSTotalSummary day={day} />

                            {/* Variance reasons */}
                            {varianceReasons.length > 0 && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-md px-4 py-2.5">
                                <div className="text-[11px] font-semibold text-yellow-700 uppercase tracking-wider mb-1">
                                  Variance Details
                                </div>
                                {varianceReasons.map((reason, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-yellow-800 py-0.5">
                                    <AlertTriangle className="h-3 w-3 shrink-0 text-yellow-500" />
                                    {reason}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Comparison flow cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <ComparisonCard
                                title="Card Settlement"
                                comparisons={[
                                  {
                                    left: { label: 'POS Card', value: day.cardFlow.posCard },
                                    right: { label: 'Merchant Gross', value: day.cardFlow.merchantGross },
                                    result: day.cardFlow.posVsMerchantGross,
                                  },
                                  {
                                    left: { label: 'Merchant Net', value: day.cardFlow.merchantNet },
                                    right: { label: 'Bank Card', value: day.cardFlow.bankCardDeposit },
                                    result: day.cardFlow.merchantNetVsBank,
                                  },
                                ]}
                                extra={[{ label: 'Fees', value: day.cardFlow.merchantFees, color: 'text-red-500' }]}
                              />
                              <ComparisonCard
                                title="eWallet"
                                comparisons={[
                                  {
                                    left: { label: 'POS eWallet', value: day.ewalletFlow.posEwallet },
                                    right: { label: 'Merchant Gross', value: day.ewalletFlow.merchantGross },
                                    result: day.ewalletFlow.posVsMerchantGross,
                                  },
                                  {
                                    left: { label: 'Merchant Net', value: day.ewalletFlow.merchantNet },
                                    right: { label: 'Bank eWallet', value: day.ewalletFlow.bankEwalletDeposit },
                                    result: day.ewalletFlow.merchantNetVsBank,
                                  },
                                ]}
                                extra={day.ewalletFlow.merchantFees > 0 ? [{ label: 'Fees', value: day.ewalletFlow.merchantFees, color: 'text-red-500' }] : undefined}
                              />
                              <ComparisonCard
                                title="Cash"
                                comparisons={[
                                  {
                                    left: { label: 'POS Cash', value: day.cashFlow.posCash },
                                    right: { label: 'Cash Count', value: day.cashFlow.closingActual ?? 0 },
                                    result: day.cashFlow.posVsActual,
                                  },
                                ]}
                                extra={[
                                  { label: 'Closing Expected', value: day.cashFlow.closingExpected },
                                  {
                                    label: 'Count Variance',
                                    value: day.cashFlow.cashVariance,
                                    color: day.cashFlow.status === 'matched' ? 'text-green-600' :
                                      day.cashFlow.status === 'variance' ? 'text-yellow-600' : undefined,
                                  },
                                ]}
                              />
                              <ComparisonCard
                                title="Transfers"
                                comparisons={[
                                  {
                                    left: { label: 'POS QR', value: day.qrFlow.posQr },
                                    right: { label: 'Bank Transfers', value: day.qrFlow.bankTransfers },
                                    result: day.qrFlow.posVsBankTransfers,
                                  },
                                ]}
                              />
                            </div>

                            {/* Bank transactions list */}
                            {day.bankDay && (
                              <>
                                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">
                                  Bank Transactions ({day.bankDay.transactions.length})
                                </div>
                                <div className="space-y-1">
                                  {day.bankDay.transactions.map((txn, i) => (
                                    <div
                                      key={`${txn.date}-${txn.time}-${i}`}
                                      className={`flex items-center gap-4 text-xs py-2 px-3 rounded-md border-l-[3px] ${txnStatusColor(txn.reconciliationStatus)}`}
                                    >
                                      <span className="text-gray-400 w-11 shrink-0 tabular-nums">{txn.time}</span>
                                      <span className="text-gray-700 min-w-[180px] max-w-[240px] truncate" title={txn.description}>{txn.description}</span>
                                      <span className="w-24 text-right shrink-0 tabular-nums font-medium">
                                        {txn.deposit > 0 && <span className="text-green-600">+{fmt(txn.deposit)}</span>}
                                        {txn.withdrawal > 0 && <span className="text-red-600">-{fmt(txn.withdrawal)}</span>}
                                      </span>
                                      <span className="text-gray-400 w-32 truncate shrink-0" title={txn.channel}>{txn.channel}</span>
                                      <span className={`flex-1 truncate ${txn.reconciliationStatus === 'unreconciled' ? 'text-red-600 font-medium' : 'text-gray-400'}`} title={txn.reconciliationNote}>
                                        {txn.reconciliationNote}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}

              {/* Totals footer */}
              <TableRow className="font-semibold bg-gray-100/80 border-t-2 border-gray-300">
                <TableCell className="py-3"></TableCell>
                <TableCell className="py-3 px-4 text-sm text-gray-700 border-r border-gray-200">Total</TableCell>
                <NumCell value={totals.posCash} bold />
                <NumCell value={totals.posCard} bold />
                <NumCell value={totals.posEwallet} bold />
                <NumCell value={totals.posQr} bold borderRight />
                <NumCell value={totals.merchantGross} bold />
                <NumCell value={totals.merchantNet} bold />
                <NumCell value={totals.merchantFees} color="text-red-500" bold borderRight />
                <NumCell value={totals.bankCard} bold />
                <NumCell value={totals.bankEwallet} bold />
                <NumCell value={totals.bankTransfers} bold borderRight />
                <TableCell className={`py-3 px-3 text-right text-sm tabular-nums font-bold ${Math.abs(totals.gap) > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                  {fmtSigned(Math.round(totals.gap * 100) / 100)}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

/** Numeric cell with consistent styling and optional mismatch highlight */
function NumCell({ value, color, bold, borderRight, highlight }: {
  value: number;
  color?: string;
  bold?: boolean;
  borderRight?: boolean;
  highlight?: boolean;
}) {
  return (
    <TableCell className={`py-2.5 px-3 text-right text-sm tabular-nums ${color || 'text-gray-700'} ${bold ? 'font-semibold' : ''} ${borderRight ? 'border-r border-gray-100' : ''} ${highlight ? 'bg-yellow-100/60 font-medium' : ''}`}>
      {fmt(value)}
    </TableCell>
  );
}

/** POS Total reconciliation summary */
function POSTotalSummary({ day }: { day: DailyReconciliation }) {
  if (day.posTotal === 0) return null;
  const hasGap = Math.abs(day.totalGap) > 0.01;

  return (
    <div className={`rounded-md border px-4 py-3 ${hasGap ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
        <div>
          <span className="text-gray-500">POS Total</span>
          <span className="ml-1.5 font-bold text-gray-800 tabular-nums">{fmt(day.posTotal)}</span>
        </div>
        <div className="text-gray-400">=</div>
        <div>
          <span className="text-gray-500">Bank</span>
          <span className="ml-1 font-medium text-gray-700 tabular-nums">
            {fmt(day.cardFlow.bankCardDeposit + day.ewalletFlow.bankEwalletDeposit + day.qrFlow.bankTransfers)}
          </span>
        </div>
        <div className="text-gray-400">+</div>
        <div>
          <span className="text-gray-500">Cash</span>
          <span className="ml-1 font-medium text-gray-700 tabular-nums">{fmt(day.cashFlow.closingActual ?? day.cashFlow.posCash)}</span>
        </div>
        <div className="text-gray-400">+</div>
        <div>
          <span className="text-gray-500">Fees</span>
          <span className="ml-1 font-medium text-gray-700 tabular-nums">{fmt(day.cardFlow.merchantFees + day.ewalletFlow.merchantFees)}</span>
        </div>
        {hasGap ? (
          <div className="ml-auto flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-bold text-amber-700 tabular-nums">Gap: {fmtSigned(day.totalGap)} THB</span>
          </div>
        ) : (
          <div className="ml-auto">
            <span className="font-medium text-green-600">Fully accounted</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Comparison card showing A vs B with match/variance status */
function ComparisonCard({ title, comparisons, extra }: {
  title: string;
  comparisons: Array<{
    left: { label: string; value: number };
    right: { label: string; value: number };
    result: ComparisonResult;
  }>;
  extra?: Array<{ label: string; value: number; color?: string }>;
}) {
  return (
    <div className="bg-white rounded-md border border-gray-200 p-3">
      <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">{title}</div>
      <div className="space-y-2.5">
        {comparisons.map((comp) => {
          const isMatch = comp.result.status === 'matched';
          const isNA = comp.result.status === 'not_applicable';
          const varianceAmt = comp.result.variance;
          return (
            <div key={comp.left.label + comp.right.label} className="space-y-1">
              <div className="flex items-center gap-1 text-xs">
                <div className="flex-1">
                  <div className="text-gray-400 text-[10px]">{comp.left.label}</div>
                  <div className="font-medium tabular-nums text-gray-800">{fmt(comp.left.value)}</div>
                </div>
                <div className="shrink-0 px-0.5">
                  {isNA ? (
                    <span className="text-gray-300">-</span>
                  ) : isMatch ? (
                    <Equal className="h-3 w-3 text-green-500" />
                  ) : (
                    <span className="text-yellow-500 font-bold text-[10px]">&ne;</span>
                  )}
                </div>
                <div className="flex-1 text-right">
                  <div className="text-gray-400 text-[10px]">{comp.right.label}</div>
                  <div className="font-medium tabular-nums text-gray-800">{fmt(comp.right.value)}</div>
                </div>
              </div>
              {!isNA && !isMatch && varianceAmt !== 0 && (
                <div className="flex items-center justify-center gap-1 text-[10px] bg-yellow-50 rounded px-2 py-0.5">
                  <ArrowRight className="h-2.5 w-2.5 text-yellow-500" />
                  <span className="text-yellow-700 font-medium tabular-nums">{fmtSigned(varianceAmt)} THB</span>
                </div>
              )}
              {!isNA && isMatch && (
                <div className="flex items-center justify-center gap-1 text-[10px] bg-green-50 rounded px-2 py-0.5">
                  <span className="text-green-600 font-medium">Matched</span>
                </div>
              )}
            </div>
          );
        })}
        {extra && extra.length > 0 && (
          <div className="space-y-1.5 pt-0.5">
            {extra.map((item) => (
              <div key={item.label} className="flex justify-between items-center text-xs">
                <span className="text-gray-500">{item.label}</span>
                <span className={`font-medium tabular-nums ${item.color || 'text-gray-800'}`}>
                  {fmt(item.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
