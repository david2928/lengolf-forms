"use client";

import { TrendingUp, TrendingDown, Receipt, Users, DollarSign, Calculator, Target } from 'lucide-react';
import type { TransactionKPIs as TransactionKPIData } from '@/types/transactions';

interface TransactionKPIsProps {
  kpis: TransactionKPIData | null;
  isLoading: boolean;
  error?: Error | null;
}

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  format?: 'currency' | 'number' | 'percentage';
  isLoading?: boolean;
}

function KPICard({ title, value, icon, format = 'number', isLoading }: KPICardProps) {
  const formatValue = (val: string | number) => {
    if (isLoading) return '...';
    
    const numValue = typeof val === 'string' ? parseFloat(val) : val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('th-TH', {
          style: 'currency',
          currency: 'THB',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(numValue);
      case 'percentage':
        return `${numValue.toFixed(1)}%`;
      case 'number':
      default:
        return new Intl.NumberFormat('th-TH').format(numValue);
    }
  };

  return (
    <div className="bg-white border border-gray-200 p-3 space-y-1">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">
          {title}
        </div>
        <div className="text-gray-400">
          {icon}
        </div>
      </div>
      
      <div className="text-lg font-semibold text-gray-900">
        {formatValue(value)}
      </div>
    </div>
  );
}

export function TransactionKPIs({ kpis, isLoading, error }: TransactionKPIsProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 text-sm text-red-600">
        Failed to load KPIs: {error.message}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <KPICard
        title="Total Sales"
        value={kpis?.totalSales || 0}
        icon={<DollarSign className="w-4 h-4" />}
        format="currency"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Transactions"
        value={kpis?.transactionCount || 0}
        icon={<Receipt className="w-4 h-4" />}
        format="number"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Gross Profit"
        value={kpis?.grossProfit || 0}
        icon={<Target className="w-4 h-4" />}
        format="currency"
        isLoading={isLoading}
      />
      
      <KPICard
        title="Margin"
        value={kpis?.grossMargin || 0}
        icon={<Calculator className="w-4 h-4" />}
        format="percentage"
        isLoading={isLoading}
      />
      
      <KPICard
        title="New Customers"
        value={kpis?.newCustomers || 0}
        icon={<Users className="w-4 h-4" />}
        format="number"
        isLoading={isLoading}
      />
    </div>
  );
} 