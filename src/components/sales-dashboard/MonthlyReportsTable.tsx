'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Users,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { LoadingSpinner } from './DashboardLoading';

interface MonthlyReportRow {
  month: string;
  monthRange: string;
  totalRevenue: number;
  grossProfit: number;
  transactionCount: number;
  uniqueCustomers: number;
  newCustomers: number;
  avgTransactionValue: number;
  grossMarginPct: number;
  simUtilizationPct: number;
  simUsageCount: number;
  customerRetentionRate: number;
  avgTransactionsPerDay: number;
  revenueGrowth: number;
  profitGrowth: number;
  customerGrowth: number;
}

interface MonthlyReportsResponse {
  data: MonthlyReportRow[];
  success: boolean;
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number): string => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
};

const GrowthIndicator: React.FC<{ value: number; className?: string }> = ({ value, className = '' }) => {
  const isPositive = value > 0;
  const isZero = value === 0;
  
  if (isZero) {
    return (
      <span className={`text-gray-500 ${className}`}>
        {formatPercentage(value)}
      </span>
    );
  }
  
  return (
    <span className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'} ${className}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {formatPercentage(value)}
    </span>
  );
};

const MonthlyReportsTable: React.FC = () => {
  const [data, setData] = useState<MonthlyReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default to current year data
  const currentYear = new Date().getFullYear();
  const [dateRange] = useState({
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`
  });

  const fetchMonthlyReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sales/monthly-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dateRange),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch monthly reports: ${response.statusText}`);
      }

      const result: MonthlyReportsResponse = await response.json();
      setData(result.data || []);
    } catch (err) {
      console.error('Monthly reports fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load monthly reports');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchMonthlyReports();
  }, [fetchMonthlyReports]);

  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'Month',
      'Month Range',
      'Total Revenue',
      'Gross Profit',
      'Transactions',
      'Unique Customers',
      'New Customers',
      'Avg Transaction Value',
      'Gross Margin (%)',
      'SIM Utilization (%)',
      'SIM Usage Count',
      'Customer Retention Rate (%)',
      'Avg Transactions/Day',
      'Revenue Growth (%)',
      'Profit Growth (%)',
      'Customer Growth (%)'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(row => [
        row.month,
        `"${row.monthRange}"`,
        row.totalRevenue,
        row.grossProfit,
        row.transactionCount,
        row.uniqueCustomers,
        row.newCustomers,
        row.avgTransactionValue,
        row.grossMarginPct,
        row.simUtilizationPct,
        row.simUsageCount,
        row.customerRetentionRate,
        row.avgTransactionsPerDay,
        row.revenueGrowth,
        row.profitGrowth,
        row.customerGrowth
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `monthly-sales-report-${currentYear}.csv`;
    link.click();
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Monthly Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchMonthlyReports} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Define metrics with labels and formatting
  const metrics = [
    { key: 'totalRevenue', label: 'Revenue', format: formatCurrency },
    { key: 'revenueGrowth', label: 'Revenue Growth', format: (v: number) => <GrowthIndicator value={v} className="text-sm" /> },
    { key: 'grossProfit', label: 'Profit', format: formatCurrency },
    { key: 'profitGrowth', label: 'Profit Growth', format: (v: number) => <GrowthIndicator value={v} className="text-sm" /> },
    { key: 'grossMarginPct', label: 'Margin %', format: (v: number) => `${v.toFixed(1)}%` },
    { key: 'transactionCount', label: 'Transactions', format: formatNumber },
    { key: 'uniqueCustomers', label: 'Customers', format: formatNumber, icon: Users },
    { key: 'customerGrowth', label: 'Customer Growth', format: (v: number) => <GrowthIndicator value={v} className="text-sm" /> },
    { key: 'newCustomers', label: 'New Customers', format: formatNumber },
    { key: 'customerRetentionRate', label: 'Retention %', format: (v: number) => `${v.toFixed(1)}%` },
    { key: 'avgTransactionValue', label: 'Avg Transaction', format: formatCurrency },
    { key: 'simUtilizationPct', label: 'SIM Util %', format: (v: number) => `${v.toFixed(1)}%` },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Monthly Performance Report
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              All months of {currentYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={fetchMonthlyReports}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              disabled={isLoading || data.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">Loading monthly reports...</span>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No monthly data available for {currentYear}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Metric
                  </th>
                  {data.map((month) => (
                    <th key={month.month} className="px-4 py-3 text-center text-xs font-medium text-gray-500">
                      <div className="font-medium">{month.month}</div>
                      <div className="text-xs font-normal text-gray-400">{month.monthRange}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metrics.map((metric, index) => (
                  <tr key={metric.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                      <div className="flex items-center gap-2">
                        {metric.icon && <metric.icon className="h-4 w-4 text-gray-400" />}
                        {metric.label}
                      </div>
                    </td>
                    {data.map((month) => (
                      <td key={`${month.month}-${metric.key}`} className="px-4 py-4 text-sm text-center text-gray-900">
                        {metric.format(month[metric.key as keyof MonthlyReportRow] as number)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyReportsTable;