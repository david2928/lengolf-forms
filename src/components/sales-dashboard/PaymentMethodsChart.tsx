'use client';

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  Banknote, 
  Smartphone, 
  Building2, 
  TrendingUp, 
  TrendingDown,
  Minus,
  DollarSign,
  Percent
} from 'lucide-react';
import { 
  PaymentMethodsChartProps, 
  PaymentMethodData,
  ChartDisplayMode 
} from '@/types/sales-dashboard';
import { 
  formatCurrency, 
  formatPercentage, 
  calculatePercentageChange,
  CHART_COLORS,
  DASHBOARD_COLORS 
} from '@/lib/dashboard-utils';

// Payment method categorization and icons
const PAYMENT_CATEGORIES = {
  'Cash': { icon: Banknote, color: CHART_COLORS.primary, category: 'physical' },
  'PromptPay': { icon: Smartphone, color: CHART_COLORS.secondary, category: 'digital' },
  'Visa': { icon: CreditCard, color: CHART_COLORS.accent, category: 'digital' },
  'Mastercard': { icon: CreditCard, color: CHART_COLORS.info, category: 'digital' },
  'QR Payment': { icon: Smartphone, color: CHART_COLORS.warning, category: 'digital' },
  'Alipay': { icon: Smartphone, color: '#10B981', category: 'digital' },
  'Mixed Payment': { icon: DollarSign, color: CHART_COLORS.muted, category: 'mixed' },
  'Other': { icon: DollarSign, color: '#9CA3AF', category: 'other' }
};

// Helper function to categorize payment methods based on the actual data
const categorizePaymentMethod = (paymentMethod: string): string => {
  if (!paymentMethod) return 'Other';
  
  const method = paymentMethod.toLowerCase();
  
  // Handle specific card types separately for better visibility
  if (method.includes('visa')) return 'Visa';
  if (method.includes('mastercard')) return 'Mastercard';
  
  // Handle other payment methods
  if (method.includes('promptpay')) return 'PromptPay';
  if (method === 'cash') return 'Cash';
  if (method.includes('qr payment')) return 'QR Payment';
  if (method.includes('alipay')) return 'Alipay';
  
  // Handle complex payment strings (combinations)
  if (method.includes(':') && method.includes(';')) {
    return 'Mixed Payment';
  }
  
  // Legacy fallback for generic card types
  if (method.includes('card') && method.includes('manual')) return 'Other';
  
  return 'Other';
};

interface PaymentInsight {
  type: 'growth' | 'decline' | 'stable';
  message: string;
  value: number;
  icon: React.ElementType;
}

export default function PaymentMethodsChart({
  data = [],
  isLoading = false,
  error = null,
  title = "Payment Methods",
  showInsights = true,
  displayMode = 'revenue',
  className = ''
}: PaymentMethodsChartProps) {
  // Process and categorize payment data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Calculate totals first
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
    const totalTransactions = data.reduce((sum, item) => sum + item.transaction_count, 0);
    
    console.log('PaymentMethodsChart - Raw data:', data);
    console.log('PaymentMethodsChart - Total revenue:', totalRevenue);
    console.log('PaymentMethodsChart - Total transactions:', totalTransactions);

    const processed = data
      .map(item => {
        const category = categorizePaymentMethod(item.payment_type);
        const categoryInfo = PAYMENT_CATEGORIES[category as keyof typeof PAYMENT_CATEGORIES] || PAYMENT_CATEGORIES.Other;
        
        // Recalculate percentages properly
        const percentage = displayMode === 'revenue' 
          ? totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0
          : totalTransactions > 0 ? (item.transaction_count / totalTransactions) * 100 : 0;
        
        const result = {
          ...item,
          ...categoryInfo,
          payment_method: category,
          displayValue: displayMode === 'revenue' ? item.revenue : item.transaction_count,
          percentage: percentage // Use our calculated percentage, not the one from API
        };
        
        console.log(`PaymentMethodsChart - ${item.payment_type} -> ${category}:`, {
          revenue: item.revenue,
          percentage: percentage,
          displayValue: result.displayValue
        });
        
        return result;
      })
      .sort((a, b) => b.displayValue - a.displayValue);
      
    console.log('PaymentMethodsChart - Processed data:', processed);
    return processed;
  }, [data, displayMode]);

  // Calculate insights
  const insights = useMemo(() => {
    if (!data || data.length === 0) return [];

    const insights: PaymentInsight[] = [];
    const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);

    // Digital vs Physical payments
    const digitalPayments = data
      .filter(item => PAYMENT_CATEGORIES[categorizePaymentMethod(item.payment_type) as keyof typeof PAYMENT_CATEGORIES]?.category === 'digital')
      .reduce((sum, item) => sum + item.revenue, 0);
    const digitalPercentage = totalRevenue > 0 ? (digitalPayments / totalRevenue) * 100 : 0;

    if (digitalPercentage > 80) {
      insights.push({
        type: 'growth',
        message: `${formatPercentage(digitalPercentage)} digital payments`,
        value: digitalPercentage,
        icon: TrendingUp
      });
    } else if (digitalPercentage < 50) {
      insights.push({
        type: 'decline',
        message: `Only ${formatPercentage(digitalPercentage)} digital payments`,
        value: digitalPercentage,
        icon: TrendingDown
      });
    }

    // Top payment method dominance
    if (processedData.length > 0) {
      const topMethod = processedData[0];
      if (topMethod.percentage > 50) {
        insights.push({
          type: 'stable',
          message: `${topMethod.payment_method} dominates with ${formatPercentage(topMethod.percentage)}`,
          value: topMethod.percentage,
          icon: Minus
        });
      }
    }

    return insights.slice(0, 2); // Limit to 2 insights for cleaner layout
  }, [data, processedData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const IconComponent = data.icon;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <IconComponent className="h-4 w-4" style={{ color: data.color }} />
          <span className="font-medium text-gray-900">{data.payment_method}</span>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Revenue:</span>
            <span className="font-medium">{formatCurrency(data.revenue)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Transactions:</span>
            <span className="font-medium">{data.transaction_count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Percentage:</span>
            <span className="font-medium">{formatPercentage(data.percentage)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Avg Transaction:</span>
            <span className="font-medium">
              {formatCurrency(data.revenue / data.transaction_count)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Payment Methods</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-20" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-16" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-80 bg-gray-50 rounded-lg animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-80 text-gray-500">
            <CreditCard className="h-12 w-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Payment Data</p>
            <p className="text-sm text-center">
              Payment method data will appear here once transactions are recorded.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {title}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Revenue distribution by payment method
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Insights */}
        {showInsights && insights.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {insights.map((insight, index) => {
              const IconComponent = insight.icon;
              const bgColor = insight.type === 'growth' ? 'bg-green-50' :
                             insight.type === 'decline' ? 'bg-red-50' : 'bg-blue-50';
              const textColor = insight.type === 'growth' ? 'text-green-700' :
                               insight.type === 'decline' ? 'text-red-700' : 'text-blue-700';
              const iconColor = insight.type === 'growth' ? 'text-green-500' :
                               insight.type === 'decline' ? 'text-red-500' : 'text-blue-500';

              return (
                <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${bgColor}`}>
                  <IconComponent className={`h-5 w-5 ${iconColor}`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${textColor}`}>
                      {insight.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Main layout: Chart on left, Table on right (same as CategoryBreakdownChart) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart - Left side (2/3 width) */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={processedData}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="payment_method"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  tickFormatter={(value) => 
                    displayMode === 'revenue' 
                      ? formatCurrency(value)
                      : value.toLocaleString()
                  }
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="displayValue"
                  radius={[4, 4, 0, 0]}
                >
                  {processedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table - Right side (1/3 width) */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Payment Method Details</h4>
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-700">Method</th>
                      <th className="text-right p-2 font-medium text-gray-700">
                        {displayMode === 'revenue' ? 'Revenue' : 'Count'}
                      </th>
                      <th className="text-right p-2 font-medium text-gray-700">%</th>
                      <th className="text-right p-2 font-medium text-gray-700">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedData.map((entry, index) => {
                      const IconComponent = entry.icon;
                      return (
                        <tr key={index} className="border-t border-gray-100">
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: `${entry.color}20` }}
                              >
                                <IconComponent className="w-3 h-3" style={{ color: entry.color }} />
                              </div>
                              <span className="text-gray-900 truncate text-xs">
                                {entry.payment_method}
                              </span>
                            </div>
                          </td>
                          <td className="text-right p-2 font-medium text-gray-900">
                            {displayMode === 'revenue' 
                              ? formatCurrency(entry.revenue)
                              : entry.transaction_count.toLocaleString()
                            }
                          </td>
                          <td className="text-right p-2 text-gray-600">
                            {formatPercentage(entry.percentage)}
                          </td>
                          <td className="text-right p-2 text-gray-600">
                            {formatCurrency(entry.revenue / entry.transaction_count)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Payment Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-gray-600">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {processedData.length}
              </p>
              <p>Payment Methods</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {formatCurrency(processedData.reduce((sum, item) => sum + item.revenue, 0))}
              </p>
              <p>Total Revenue</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {processedData.reduce((sum, item) => sum + item.transaction_count, 0).toLocaleString()}
              </p>
              <p>Total Transactions</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">
                {processedData.length > 0 
                  ? formatCurrency(
                      processedData.reduce((sum, item) => sum + item.revenue, 0) /
                      processedData.reduce((sum, item) => sum + item.transaction_count, 0)
                    )
                  : formatCurrency(0)
                }
              </p>
              <p>Average Transaction</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}