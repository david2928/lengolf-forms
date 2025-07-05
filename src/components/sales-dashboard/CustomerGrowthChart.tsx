'use client';

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Repeat, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';
import { 
  CustomerGrowthChartProps, 
  CustomerGrowthPoint 
} from '@/types/sales-dashboard';
import { 
  formatNumber, 
  formatPercentage, 
  calculatePercentageChange,
  formatDisplayDate,
  calculateMovingAverage,
  CHART_COLORS,
  DASHBOARD_COLORS 
} from '@/lib/dashboard-utils';

interface GrowthInsight {
  type: 'growth' | 'decline' | 'stable';
  message: string;
  value: number;
  icon: React.ElementType;
}

interface GrowthMetrics {
  totalCustomers: number;
  newCustomersAvg: number;
  returningCustomersAvg: number;
  newCustomerGrowthRate: number;
  customerRetentionRate: number;
  totalGrowthRate: number;
}

export default function CustomerGrowthChart({
  data = [],
  isLoading = false,
  showTotal = true,
  error = null,
  showInsights = true,
  className = '',
  summaryData
}: CustomerGrowthChartProps & {
  error?: string | null;
  showInsights?: boolean;
  className?: string;
}) {
  const title = "Customer Growth";
  
  // Process chart data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map(item => ({
      ...item,
      date: formatDisplayDate(item.date),
      displayDate: formatDisplayDate(item.date)
    }));
  }, [data]);

  // Calculate growth metrics
  const growthMetrics = useMemo((): GrowthMetrics => {
    if (!data || data.length === 0) {
      return {
        totalCustomers: 0,
        newCustomersAvg: 0,
        returningCustomersAvg: 0,
        newCustomerGrowthRate: 0,
        customerRetentionRate: 0,
        totalGrowthRate: 0
      };
    }

    const latest = data[data.length - 1];
    const earliest = data[0];
    
    // Use summary data for period totals if available, otherwise calculate from daily data
    let totalCustomers: number;
    let totalNewCustomers: number;
    let totalReturningCustomers: number;
    
    if (summaryData) {
      // Use accurate period totals from summary data
      totalCustomers = summaryData.unique_customers;
      totalNewCustomers = summaryData.new_customers;
      // Calculate returning customers as total - new
      totalReturningCustomers = totalCustomers - totalNewCustomers;
    } else {
      // Fallback: Calculate from daily data (may have double-counting issues)
      totalNewCustomers = data.reduce((sum, item) => sum + item.new_customers, 0);
      totalReturningCustomers = data.reduce((sum, item) => sum + item.returning_customers, 0);
      totalCustomers = totalNewCustomers + totalReturningCustomers;
    }
    
    const newCustomersAvg = totalNewCustomers / data.length;
    const returningCustomersAvg = totalReturningCustomers / data.length;
    
    // FIXED: Calculate growth rates based on meaningful metrics
    // For new customer growth, compare average of first week vs last week
    const firstWeekAvg = data.slice(0, Math.min(7, Math.floor(data.length / 2)))
      .reduce((sum, item) => sum + item.new_customers, 0) / Math.min(7, Math.floor(data.length / 2));
    const lastWeekAvg = data.slice(-Math.min(7, Math.floor(data.length / 2)))
      .reduce((sum, item) => sum + item.new_customers, 0) / Math.min(7, Math.floor(data.length / 2));
    
    const newCustomerGrowthRate = calculatePercentageChange(lastWeekAvg, firstWeekAvg) || 0;
    
    // FIXED: Calculate total growth rate based on daily customer volume trends
    // Compare average of first week vs last week for total daily customers
    const firstWeekTotalAvg = data.slice(0, Math.min(7, Math.floor(data.length / 2)))
      .reduce((sum, item) => sum + item.total_customers, 0) / Math.min(7, Math.floor(data.length / 2));
    const lastWeekTotalAvg = data.slice(-Math.min(7, Math.floor(data.length / 2)))
      .reduce((sum, item) => sum + item.total_customers, 0) / Math.min(7, Math.floor(data.length / 2));
    
    const totalGrowthRate = calculatePercentageChange(lastWeekTotalAvg, firstWeekTotalAvg) || 0;
    
    // FIXED: Calculate retention rate properly for the entire period
    // Retention rate = (returning customers / total customers) * 100
    const customerRetentionRate = totalCustomers > 0 
      ? (totalReturningCustomers / totalCustomers) * 100 
      : 0;

    return {
      totalCustomers,
      newCustomersAvg,
      returningCustomersAvg,
      newCustomerGrowthRate,
      customerRetentionRate,
      totalGrowthRate
    };
  }, [data, summaryData]);

  // Calculate insights
  const insights = useMemo(() => {
    if (!data || data.length === 0) return [];

    const insights: GrowthInsight[] = [];

    // Growth trend analysis
    if (growthMetrics.totalGrowthRate > 20) {
      insights.push({
        type: 'growth',
        message: `Strong growth: ${formatPercentage(growthMetrics.totalGrowthRate)} increase`,
        value: growthMetrics.totalGrowthRate,
        icon: TrendingUp
      });
    } else if (growthMetrics.totalGrowthRate < -5) {
      insights.push({
        type: 'decline',
        message: `Customer decline: ${formatPercentage(Math.abs(growthMetrics.totalGrowthRate))} decrease`,
        value: growthMetrics.totalGrowthRate,
        icon: TrendingDown
      });
    }

    // Retention analysis
    if (growthMetrics.customerRetentionRate > 70) {
      insights.push({
        type: 'growth',
        message: `High retention: ${formatPercentage(growthMetrics.customerRetentionRate)} returning customers`,
        value: growthMetrics.customerRetentionRate,
        icon: Repeat
      });
    } else if (growthMetrics.customerRetentionRate < 30) {
      insights.push({
        type: 'decline',
        message: `Low retention: Only ${formatPercentage(growthMetrics.customerRetentionRate)} returning`,
        value: growthMetrics.customerRetentionRate,
        icon: TrendingDown
      });
    }

    // New customer acquisition
    if (growthMetrics.newCustomerGrowthRate > 50) {
      insights.push({
        type: 'growth',
        message: `Excellent acquisition: ${formatPercentage(growthMetrics.newCustomerGrowthRate)} growth`,
        value: growthMetrics.newCustomerGrowthRate,
        icon: UserPlus
      });
    } else if (growthMetrics.newCustomerGrowthRate < -20) {
      insights.push({
        type: 'decline',
        message: `Acquisition declining: ${formatPercentage(Math.abs(growthMetrics.newCustomerGrowthRate))} drop`,
        value: growthMetrics.newCustomerGrowthRate,
        icon: TrendingDown
      });
    }

    return insights.slice(0, 3);
  }, [data, growthMetrics]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="font-medium text-gray-900 mb-2">{label}</div>
        <div className="space-y-1 text-sm">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between">
              <span className="text-gray-600" style={{ color: entry.color }}>
                {entry.name}:
              </span>
              <span className="font-medium">
                {formatNumber(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Customer Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900">
          {title}
        </CardTitle>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {[1, 2, 3].map((i) => (
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
        ) : processedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-80 text-gray-500">
            <Users className="h-12 w-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">No Customer Data</p>
            <p className="text-sm text-center">
              Customer growth data will appear here once transactions are recorded.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Insights */}
            {showInsights && insights.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Growth metrics summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatNumber(growthMetrics.totalCustomers)}
                  </p>
                  <p className="text-xs text-gray-600">Total Customers</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <UserPlus className="h-4 w-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatNumber(Math.round(growthMetrics.newCustomersAvg))}
                  </p>
                  <p className="text-xs text-gray-600">Avg New/Day</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Repeat className="h-4 w-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatPercentage(growthMetrics.customerRetentionRate)}
                  </p>
                  <p className="text-xs text-gray-600">Retention Rate</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {formatPercentage(growthMetrics.totalGrowthRate)}
                  </p>
                  <p className="text-xs text-gray-600">Growth Rate</p>
                </div>
              </div>
            </div>

            {/* Line Chart Only */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="#6b7280" 
                    fontSize={12}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#6b7280" 
                    fontSize={12}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  <Line
                    type="monotone"
                    dataKey="new_customers"
                    stroke={DASHBOARD_COLORS.customers}
                    strokeWidth={2}
                    dot={{ fill: DASHBOARD_COLORS.customers, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="New Customers"
                  />
                  <Line
                    type="monotone"
                    dataKey="returning_customers"
                    stroke={CHART_COLORS.secondary}
                    strokeWidth={2}
                    dot={{ fill: CHART_COLORS.secondary, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Returning Customers"
                  />
                  {showTotal && (
                    <Line
                      type="monotone"
                      dataKey="total_customers"
                      stroke={CHART_COLORS.accent}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: CHART_COLORS.accent, strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Total Customers"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 