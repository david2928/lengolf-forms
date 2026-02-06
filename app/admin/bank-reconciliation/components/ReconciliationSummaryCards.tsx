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
      sub: `Merchant: ${formatCurrency(summary.totalEwalletMerchantNet)}`,
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

  return (
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
  );
}
