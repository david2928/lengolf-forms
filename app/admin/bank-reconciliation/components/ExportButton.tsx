'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import type { DailyReconciliation } from '../types/bank-reconciliation';

interface ExportButtonProps {
  days: DailyReconciliation[];
}

export default function ExportButton({ days }: ExportButtonProps) {
  const handleExport = () => {
    const headers = [
      'Date',
      'POS Cash',
      'POS Card',
      'POS QR',
      'Merchant Gross',
      'Merchant Net',
      'Merchant Fees',
      'Bank Card Deposit',
      'Bank eWallet Deposit',
      'Bank Transfers',
      'POS Total',
      'Accounted Total',
      'Gap',
      'Cash Variance',
      'Overall Status',
      'Unreconciled Count',
    ];

    const rows = days.map((day) => [
      day.date,
      day.cashFlow.posCash.toFixed(2),
      day.cardFlow.posCard.toFixed(2),
      day.qrFlow.posQr.toFixed(2),
      day.cardFlow.merchantGross.toFixed(2),
      day.cardFlow.merchantNet.toFixed(2),
      day.cardFlow.merchantFees.toFixed(2),
      day.cardFlow.bankCardDeposit.toFixed(2),
      day.ewalletFlow.bankEwalletDeposit.toFixed(2),
      day.qrFlow.bankTransfers.toFixed(2),
      day.posTotal.toFixed(2),
      day.accountedTotal.toFixed(2),
      day.totalGap.toFixed(2),
      day.cashFlow.cashVariance.toFixed(2),
      day.overallStatus,
      String(day.unreconciledCount),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank-reconciliation-${days[0]?.date ?? 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={days.length === 0}>
      <Download className="h-4 w-4 mr-1" />
      Export CSV
    </Button>
  );
}
