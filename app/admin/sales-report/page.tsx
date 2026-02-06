'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { 
  CalendarIcon, 
  DownloadIcon, 
  RefreshCwIcon,
  FilterIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  CopyIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Types
interface SalesSummary {
  totalSales: number;
  netSales: number;
  grossSales: number;
  totalVAT: number;
  totalCost: number;
  grossProfit: number;
  totalItemDiscount: number;
  totalSalesDiscount: number;
  totalPriceBeforeDiscount: number;
  discountedTransactions: number;
  totalTransactions: number;
  averageSalesPerTransaction: number;
  voidedTransactions: number;
  totalAmountVoided: number;
  uniqueCustomers: number;
  cashPayments: number;
  qrPayments: number;
  edcPayments: number;
  ewalletPayments: number;
}

interface DailySales {
  date: string;
  totalSales: number;
  grossSales: number;
  netSales: number;
  vat: number;
  cost: number;
  grossProfit: number;
  totalItemDiscount: number;
  totalSalesDiscount: number;
  totalPriceBeforeDiscount: number;
  discountedItems: number;
  salesTransactions: number;
  averageSalesPerTransaction: number;
  voidedTransactions: number;
  totalAmountVoided: number;
  numberOfPax: number;
  cashPayment: number;
  qrPayment: number;
  edcPayment: number;
  ewalletPayment: number;
}

interface PaymentMethodBreakdown {
  date: string;
  payment_method: string;
  total_amount: number;
  transaction_count: number;
}

type ViewMode = 'summary' | 'daily' | 'payment';
type DatePreset = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

// Date utility functions
const getDateRangeForPreset = (preset: DatePreset): { start: Date; end: Date } => {
  const now = new Date();
  const today = startOfDay(now);
  
  switch (preset) {
    case 'today':
      return { start: today, end: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return { start: yesterday, end: endOfDay(yesterday) };
    case 'last7days':
      return { start: subDays(today, 6), end: endOfDay(now) };
    case 'last30days':
      return { start: subDays(today, 29), end: endOfDay(now) };
    case 'thisMonth':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'lastMonth':
      const lastMonthStart = startOfMonth(subDays(startOfMonth(now), 1));
      const lastMonthEnd = endOfMonth(subDays(startOfMonth(now), 1));
      return { start: lastMonthStart, end: lastMonthEnd };
    case 'thisYear':
      return { start: startOfYear(now), end: endOfDay(now) };
    default:
      return { start: subDays(today, 29), end: endOfDay(now) };
  }
};

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 2,
  }).format(amount);
};

// Format number
const formatNumber = (num: number) => {
  return new Intl.NumberFormat('th-TH').format(num);
};

// Calculate trend
const calculateTrend = (current: number, previous: number) => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

// Copy value component
const CopyValueButton = ({ value }: { value: number }) => {
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value.toString());
      // You could add a toast notification here if desired
    } catch (err) {
      console.error('Failed to copy value:', err);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={copyToClipboard}
      className="h-8 w-8 p-0 hover:bg-gray-100"
    >
      <CopyIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
    </Button>
  );
};

export default function SalesReportPage() {
  // State
  const [datePreset, setDatePreset] = useState<DatePreset>('last30days');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [dailySales, setDailySales] = useState<DailySales[]>([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentMethodBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');

  // Calculate date range
  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customStartDate && customEndDate) {
      return { start: customStartDate, end: customEndDate };
    }
    return getDateRangeForPreset(datePreset);
  }, [datePreset, customStartDate, customEndDate]);

  // API data fetch functions
  const fetchSalesSummary = async (startDate: Date, endDate: Date): Promise<SalesSummary> => {
    const response = await fetch('/api/admin/sales-report/summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch sales summary');
    }

    return response.json();
  };

  const fetchDailySales = async (startDate: Date, endDate: Date): Promise<DailySales[]> => {
    const response = await fetch('/api/admin/sales-report/daily', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch daily sales data');
    }

    return response.json();
  };

  const fetchPaymentBreakdown = async (startDate: Date, endDate: Date): Promise<PaymentMethodBreakdown[]> => {
    const response = await fetch('/api/admin/sales-report/payment-breakdown', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch payment method breakdown');
    }

    return response.json();
  };

  // Load data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [summary, daily, breakdown] = await Promise.all([
        fetchSalesSummary(dateRange.start, dateRange.end),
        fetchDailySales(dateRange.start, dateRange.end),
        fetchPaymentBreakdown(dateRange.start, dateRange.end)
      ]);
      setSalesSummary(summary);
      setDailySales(daily);
      setPaymentBreakdown(breakdown);
    } catch (error) {
      console.error('Failed to load sales data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  // Load data on mount and when date range changes
  useEffect(() => {
    loadData();
  }, [dateRange.start, dateRange.end, loadData]);

  // Export functions
  const exportCSV = () => {
    let csvContent: string;
    let filename: string;

    if (viewMode === 'payment') {
      if (!paymentBreakdown.length) return;

      const headers = ['Date', 'Payment Method', 'Amount', 'Transactions'];
      const rows = paymentBreakdown.map(row => [
        row.date,
        row.payment_method,
        Number(row.total_amount).toFixed(2),
        row.transaction_count,
      ]);

      csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      filename = `payment-breakdown-${format(dateRange.start, 'yyyy-MM-dd')}-to-${format(dateRange.end, 'yyyy-MM-dd')}.csv`;
    } else {
      if (!dailySales.length) return;

      const headers = [
        'Date', 'Total Sales', 'Gross Sales', 'Net Sales', 'VAT', 'Cost', 'Gross Profit',
        'Total Discount Given', 'Discounted Items',
        'Sales Transactions', 'Average Sales/Transaction', 'Voided Transactions',
        'Total Amount Voided', 'Number of Pax', 'Cash', 'QR Payment', 'EDC Machine', 'eWallet'
      ];

      const rows = dailySales.map(day => [
        day.date,
        day.totalSales.toFixed(2),
        day.grossSales.toFixed(2),
        day.netSales.toFixed(2),
        day.vat.toFixed(2),
        day.cost.toFixed(2),
        day.grossProfit.toFixed(2),
        day.totalSalesDiscount.toFixed(2),
        day.discountedItems,
        day.salesTransactions,
        day.averageSalesPerTransaction.toFixed(2),
        day.voidedTransactions,
        day.totalAmountVoided.toFixed(2),
        day.numberOfPax,
        day.cashPayment.toFixed(2),
        day.qrPayment.toFixed(2),
        day.edcPayment.toFixed(2),
        day.ewalletPayment.toFixed(2),
      ]);

      csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
      filename = `sales-report-${format(dateRange.start, 'yyyy-MM-dd')}-to-${format(dateRange.end, 'yyyy-MM-dd')}.csv`;
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
          <p className="text-gray-600">Comprehensive sales analytics and reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isLoading}
          >
            <RefreshCwIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Select
            value={viewMode}
            onValueChange={(value: string) => setViewMode(value as ViewMode)}
          >
            <SelectTrigger className="w-[180px] h-9">
              <FilterIcon className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="daily">Daily View</SelectItem>
              <SelectItem value="payment">Payment Methods</SelectItem>
            </SelectContent>
          </Select>
          {viewMode !== 'summary' && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={viewMode === 'daily' ? !dailySales.length : !paymentBreakdown.length}
            >
              <DownloadIcon className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Preset Selection */}
            <div className="flex-1">
              <Select
                value={datePreset}
                onValueChange={(value: string) => setDatePreset(value as DatePreset)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Pickers */}
            {datePreset === 'custom' && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'PPP') : 'Start Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'PPP') : 'End Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}

            {/* Selected Date Range Display */}
            <div className="flex items-center text-sm text-gray-600">
              {format(dateRange.start, 'MMM dd, yyyy')} - {format(dateRange.end, 'MMM dd, yyyy')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {viewMode === 'summary' ? (
        /* Summary View */
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : salesSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Sales */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Sales</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesSummary.totalSales)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.totalSales} />
                  </div>
                </CardContent>
              </Card>

              {/* Net Sales */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Net Sales</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesSummary.netSales)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.netSales} />
                  </div>
                </CardContent>
              </Card>

              {/* Gross Sales */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Gross Sales</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesSummary.grossSales)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.grossSales} />
                  </div>
                </CardContent>
              </Card>

              {/* VAT */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total VAT</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesSummary.totalVAT)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.totalVAT} />
                  </div>
                </CardContent>
              </Card>

              {/* Total Discount Given */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Discount Given</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(salesSummary.totalSalesDiscount)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.totalSalesDiscount} />
                  </div>
                </CardContent>
              </Card>

              {/* Cost */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Cost</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesSummary.totalCost)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.totalCost} />
                  </div>
                </CardContent>
              </Card>

              {/* Gross Profit */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesSummary.grossProfit)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.grossProfit} />
                  </div>
                </CardContent>
              </Card>

              {/* Transactions */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Sales Transactions</p>
                      <p className="text-2xl font-bold">{formatNumber(salesSummary.totalTransactions)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.totalTransactions} />
                  </div>
                </CardContent>
              </Card>

              {/* Discounted Transactions */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Discounted Transactions</p>
                      <p className="text-2xl font-bold text-orange-600">{formatNumber(salesSummary.discountedTransactions)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.discountedTransactions} />
                  </div>
                </CardContent>
              </Card>

              {/* Average Transaction */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Sales/Transaction</p>
                      <p className="text-2xl font-bold">{formatCurrency(salesSummary.averageSalesPerTransaction)}</p>
                    </div>
                    <CopyValueButton value={salesSummary.averageSalesPerTransaction} />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {/* Additional Metrics */}
          {salesSummary && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Discount Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Discount Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Discount Given:</span>
                    <span className="font-semibold text-orange-600">{formatCurrency(salesSummary.totalSalesDiscount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discounted Transactions:</span>
                    <span className="font-semibold text-orange-600">{formatNumber(salesSummary.discountedTransactions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average Discount per Transaction:</span>
                    <span className="font-semibold text-orange-600">
                      {salesSummary.discountedTransactions > 0 
                        ? formatCurrency(salesSummary.totalSalesDiscount / salesSummary.discountedTransactions)
                        : formatCurrency(0)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Void Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Void Transactions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Number of Voided Transactions:</span>
                    <span className="font-semibold">{formatNumber(salesSummary.voidedTransactions)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount Voided:</span>
                    <span className="font-semibold">{formatCurrency(salesSummary.totalAmountVoided)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Unique Customers:</span>
                    <span className="font-semibold">{formatNumber(salesSummary.uniqueCustomers)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Methods</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cash:</span>
                    <span className="font-semibold">{formatCurrency(salesSummary.cashPayments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">QR Payment:</span>
                    <span className="font-semibold">{formatCurrency(salesSummary.qrPayments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">EDC Machine:</span>
                    <span className="font-semibold">{formatCurrency(salesSummary.edcPayments)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">eWallet (Alipay/WeChat):</span>
                    <span className="font-semibold">{formatCurrency(salesSummary.ewalletPayments)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      ) : viewMode === 'daily' ? (
        /* Daily View Table */
        <Card>
          <CardHeader>
            <CardTitle>Daily Sales Breakdown</CardTitle>
            <CardDescription>
              Detailed daily sales data for the selected period ({dailySales.length} days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-right p-2 font-medium">Total Sales</th>
                      <th className="text-right p-2 font-medium">Gross Sales</th>
                      <th className="text-right p-2 font-medium">Net Sales</th>
                      <th className="text-right p-2 font-medium">VAT</th>
                      <th className="text-right p-2 font-medium">Cost</th>
                      <th className="text-right p-2 font-medium">Gross Profit</th>
                      <th className="text-right p-2 font-medium">Total Discount</th>
                      <th className="text-right p-2 font-medium">Discounted Items</th>
                      <th className="text-right p-2 font-medium">Sales Transactions</th>
                      <th className="text-right p-2 font-medium">Avg Sales/Transaction</th>
                      <th className="text-right p-2 font-medium">Voided Transactions</th>
                      <th className="text-right p-2 font-medium">Amount Voided</th>
                      <th className="text-right p-2 font-medium">Number of Pax</th>
                      <th className="text-right p-2 font-medium">Cash</th>
                      <th className="text-right p-2 font-medium">QR Payment</th>
                      <th className="text-right p-2 font-medium">EDC Machine</th>
                      <th className="text-right p-2 font-medium">eWallet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySales.map((day, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{format(new Date(day.date), 'MMM dd, yyyy')}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(day.totalSales)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.grossSales)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.netSales)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.vat)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.cost)}</td>
                        <td className="p-2 text-right text-green-600 font-medium">{formatCurrency(day.grossProfit)}</td>
                        <td className="p-2 text-right text-orange-600">{formatCurrency(day.totalSalesDiscount)}</td>
                        <td className="p-2 text-right text-orange-600">{formatNumber(day.discountedItems)}</td>
                        <td className="p-2 text-right">{formatNumber(day.salesTransactions)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.averageSalesPerTransaction)}</td>
                        <td className="p-2 text-right">{formatNumber(day.voidedTransactions)}</td>
                        <td className="p-2 text-right text-red-600">{formatCurrency(day.totalAmountVoided)}</td>
                        <td className="p-2 text-right">{formatNumber(day.numberOfPax)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.cashPayment)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.qrPayment)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.edcPayment)}</td>
                        <td className="p-2 text-right">{formatCurrency(day.ewalletPayment)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-semibold bg-gray-50">
                      <td className="p-2">TOTAL</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.totalSales, 0))}</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.grossSales, 0))}</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.netSales, 0))}</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.vat, 0))}</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.cost, 0))}</td>
                      <td className="p-2 text-right text-green-600">{formatCurrency(dailySales.reduce((sum, day) => sum + day.grossProfit, 0))}</td>
                      <td className="p-2 text-right text-orange-600">{formatCurrency(dailySales.reduce((sum, day) => sum + day.totalSalesDiscount, 0))}</td>
                      <td className="p-2 text-right text-orange-600">{formatNumber(dailySales.reduce((sum, day) => sum + day.discountedItems, 0))}</td>
                      <td className="p-2 text-right">{formatNumber(dailySales.reduce((sum, day) => sum + day.salesTransactions, 0))}</td>
                      <td className="p-2 text-right">-</td>
                      <td className="p-2 text-right">{formatNumber(dailySales.reduce((sum, day) => sum + day.voidedTransactions, 0))}</td>
                      <td className="p-2 text-right text-red-600">{formatCurrency(dailySales.reduce((sum, day) => sum + day.totalAmountVoided, 0))}</td>
                      <td className="p-2 text-right">{formatNumber(dailySales.reduce((sum, day) => sum + day.numberOfPax, 0))}</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.cashPayment, 0))}</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.qrPayment, 0))}</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.edcPayment, 0))}</td>
                      <td className="p-2 text-right">{formatCurrency(dailySales.reduce((sum, day) => sum + day.ewalletPayment, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Payment Methods Breakdown View */
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods Breakdown</CardTitle>
            <CardDescription>
              Daily breakdown by payment method for the selected period ({paymentBreakdown.length} rows)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-12 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Date</th>
                      <th className="text-left p-2 font-medium">Payment Method</th>
                      <th className="text-right p-2 font-medium">Amount</th>
                      <th className="text-right p-2 font-medium">Transactions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentBreakdown.map((row, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                        <td className="p-2">
                          <Badge variant="outline" className={
                            row.payment_method === 'Cash' ? 'border-green-300 text-green-700' :
                            row.payment_method === 'QR Payment' ? 'border-blue-300 text-blue-700' :
                            'border-purple-300 text-purple-700'
                          }>
                            {row.payment_method}
                          </Badge>
                        </td>
                        <td className="p-2 text-right font-medium">{formatCurrency(Number(row.total_amount))}</td>
                        <td className="p-2 text-right">{formatNumber(row.transaction_count)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {['Cash', 'QR Payment', 'EDC Machine'].map(method => {
                      const methodRows = paymentBreakdown.filter(r => r.payment_method === method);
                      if (methodRows.length === 0) return null;
                      return (
                        <tr key={method} className="border-t font-semibold bg-gray-50">
                          <td className="p-2">{method} Total</td>
                          <td className="p-2"></td>
                          <td className="p-2 text-right">{formatCurrency(methodRows.reduce((sum, r) => sum + Number(r.total_amount), 0))}</td>
                          <td className="p-2 text-right">{formatNumber(methodRows.reduce((sum, r) => sum + r.transaction_count, 0))}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 font-bold bg-gray-100">
                      <td className="p-2">GRAND TOTAL</td>
                      <td className="p-2"></td>
                      <td className="p-2 text-right">{formatCurrency(paymentBreakdown.reduce((sum, r) => sum + Number(r.total_amount), 0))}</td>
                      <td className="p-2 text-right">{formatNumber(paymentBreakdown.reduce((sum, r) => sum + r.transaction_count, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}