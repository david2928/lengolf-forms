'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  CreditCard,
  Wallet,
  Banknote,
  QrCode,
} from 'lucide-react';
import type { ReconciliationSummary } from '../types/bank-reconciliation';

interface ReconciliationSummaryCardsProps {
  summary: ReconciliationSummary;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount);
};

export default function ReconciliationSummaryCards({ summary }: ReconciliationSummaryCardsProps) {
  const cards = [
    {
      label: 'Days Matched',
      value: `${summary.matchedDays} / ${summary.totalDays}`,
      sub: summary.varianceDays > 0 ? `${summary.varianceDays} variance` : null,
      icon: CheckCircle,
      color: summary.matchedDays === summary.totalDays ? 'text-green-600' : 'text-yellow-600',
      bg: summary.matchedDays === summary.totalDays ? 'bg-green-50' : 'bg-yellow-50',
    },
    {
      label: 'Card Settlement',
      value: formatCurrency(summary.totalCardBankDeposit),
      sub: `Fees: ${formatCurrency(summary.totalCardFees)}`,
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'eWallet Settlement',
      value: formatCurrency(summary.totalEwalletBankDeposit),
      sub: `Fees: ${formatCurrency(summary.totalEwalletFees)}`,
      icon: Wallet,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Cash Accuracy',
      value: `${summary.cashAccurateDays} / ${summary.totalDays}`,
      sub: `POS: ${formatCurrency(summary.totalPosCash)}`,
      icon: Banknote,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'QR / Transfers',
      value: formatCurrency(summary.totalBankTransfers),
      sub: `POS QR: ${formatCurrency(summary.totalPosQr)}`,
      icon: QrCode,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Unreconciled Records',
      value: String(summary.totalUnreconciledRecords),
      sub: summary.totalUnreconciledRecords === 0 ? 'All reconciled' : 'Needs review',
      icon: summary.totalUnreconciledRecords === 0 ? CheckCircle : summary.totalUnreconciledRecords <= 3 ? AlertTriangle : XCircle,
      color: summary.totalUnreconciledRecords === 0 ? 'text-green-600' : 'text-red-600',
      bg: summary.totalUnreconciledRecords === 0 ? 'bg-green-50' : 'bg-red-50',
    },
  ];

  const totalNet = summary.totalCardMerchantNet + summary.totalEwalletMerchantNet;
  const totalFees = summary.totalCardFees + summary.totalEwalletFees;
  const totalGross = totalNet + totalFees;
  const totalBankDeposits = summary.totalCardBankDeposit + summary.totalEwalletBankDeposit;
  const totalPosEdcEwallet = summary.totalPosCard + summary.totalPosEwallet;

  return (
    <div className="space-y-3">
      {/* EDC Settlement Summary */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm px-4 py-3">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">EDC Settlement Summary</div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <div>
            <span className="text-gray-500">Card Net</span>
            <span className="ml-1.5 font-bold text-blue-700 tabular-nums">{formatCurrency(summary.totalCardMerchantNet)}</span>
          </div>
          <div className="text-gray-300">+</div>
          <div>
            <span className="text-gray-500">eWallet Net</span>
            <span className="ml-1.5 font-bold text-purple-700 tabular-nums">{formatCurrency(summary.totalEwalletMerchantNet)}</span>
          </div>
          <div className="text-gray-300">=</div>
          <div>
            <span className="text-gray-500">Total Net</span>
            <span className="ml-1.5 font-bold text-gray-900 tabular-nums">{formatCurrency(totalNet)}</span>
            <span className="ml-1 text-[10px] text-gray-400">(Bank: {formatCurrency(totalBankDeposits)})</span>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <span className="text-gray-500">Commission</span>
            <span className="ml-1.5 font-bold text-red-600 tabular-nums">{formatCurrency(summary.totalCommission)}</span>
          </div>
          <div>
            <span className="text-gray-500">VAT</span>
            <span className="ml-1.5 font-bold text-red-600 tabular-nums">{formatCurrency(summary.totalVat)}</span>
          </div>
          <div>
            <span className="text-gray-500">Total Fees</span>
            <span className="ml-1.5 font-bold text-red-600 tabular-nums">{formatCurrency(totalFees)}</span>
          </div>
          <div className="border-l border-gray-200 pl-4">
            <span className="text-gray-500">Total Gross</span>
            <span className="ml-1.5 font-bold text-gray-900 tabular-nums">{formatCurrency(totalGross)}</span>
            <span className="ml-1 text-[10px] text-gray-400">(POS: {formatCurrency(totalPosEdcEwallet)})</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card) => (
          <Card key={card.label} className={card.bg}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-gray-600">{card.label}</span>
              </div>
              <div className={`text-lg font-bold ${card.color}`}>{card.value}</div>
              {card.sub && (
                <div className="text-xs text-gray-500 mt-0.5">{card.sub}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
