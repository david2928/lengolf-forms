// Revenue Trends Chart Component
// Multi-line chart for revenue and profit trends with dual Y-axis

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, DollarSign, BarChart3, Calendar } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Bar
} from 'recharts';
import { 
  RevenueTrendPoint, 
  DASHBOARD_COLORS, 
  CHART_COLORS 
} from '@/types/sales-dashboard';
import { 
  formatCurrency, 
  formatCompactCurrency,
  formatDisplayDate,
  formatNumber 
} from '@/lib/dashboard-utils';

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface RevenueTrendsChartProps {
  data: RevenueTrendPoint[];
  isLoading?: boolean;
  periodType?: 'day' | 'week' | 'month';
  showTransactionCount?: boolean;
  showDualAxis?: boolean;
  simUtilizationData?: Array<{ date: string; utilization_pct: number }>;
}

interface RevenueTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface RevenueSummaryProps {
  data: RevenueTrendPoint[];
  periodType: 'day' | 'week' | 'month';
}

// =============================================================================
// CUSTOM TOOLTIP COMPONENT
// =============================================================================

const RevenueTooltip: React.FC<RevenueTooltipProps> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (active && payload && payload.length && label) {
    const data = payload[0].payload;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <p className="font-medium text-gray-900 text-sm mb-3">
          {formatDisplayDate(label)}
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Total Revenue</span>
            </div>
            <span className="text-sm font-semibold text-blue-600">
              {formatCurrency(data.total_revenue)}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Gross Profit</span>
            </div>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(data.gross_profit)}
            </span>
          </div>

          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500">Profit Margin</span>
              <span className="text-xs font-medium">
                {((data.gross_profit / data.total_revenue) * 100).toFixed(1)}%
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500">Transactions</span>
              <span className="text-xs font-medium">
                {formatNumber(data.transaction_count)}
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500">Avg Transaction</span>
              <span className="text-xs font-medium">
                {formatCurrency(data.avg_transaction_value)}
              </span>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500">Unique Customers</span>
              <span className="text-xs font-medium">
                {formatNumber(data.unique_customers)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// =============================================================================
// REVENUE SUMMARY COMPONENT
// =============================================================================

const RevenueSummary: React.FC<RevenueSummaryProps> = ({ 
  data, 
  periodType 
}) => {
  const summary = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalRevenue: 0,
        totalProfit: 0,
        totalTransactions: 0,
        avgMargin: 0,
        bestDay: null,
        worstDay: null
      };
    }

    const totalRevenue = data.reduce((sum, item) => sum + item.total_revenue, 0);
    const totalProfit = data.reduce((sum, item) => sum + item.gross_profit, 0);
    const totalTransactions = data.reduce((sum, item) => sum + item.transaction_count, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    
    // Find best performing day
    const bestDay = data.reduce((best, current) => 
      current.total_revenue > best.total_revenue ? current : best
    );

    // Find worst performing day
    const worstDay = data.reduce((worst, current) => 
      current.total_revenue < worst.total_revenue ? current : worst
    );

    return {
      totalRevenue,
      totalProfit,
      totalTransactions,
      avgMargin,
      bestDay,
      worstDay
    };
  }, [data]);

  const getPeriodLabel = () => {
    switch (periodType) {
      case 'week': return 'weeks';
      case 'month': return 'months';
      default: return 'days';
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
        <p className="text-lg font-bold text-blue-600">
          {formatCompactCurrency(summary.totalRevenue)}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Total Profit</p>
        <p className="text-lg font-bold text-green-600">
          {formatCompactCurrency(summary.totalProfit)}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Avg Margin</p>
        <p className="text-lg font-bold text-purple-600">
          {summary.avgMargin.toFixed(1)}%
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Transactions</p>
        <p className="text-lg font-bold text-orange-600">
          {formatNumber(summary.totalTransactions)}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Worst {periodType}</p>
        <p className="text-lg font-bold text-red-600">
          {summary.worstDay ? formatCompactCurrency(summary.worstDay.total_revenue) : 'N/A'}
        </p>
        {summary.worstDay && (
          <p className="text-xs text-gray-400">
            {formatDisplayDate(summary.worstDay.period_date)}
          </p>
        )}
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Best {periodType}</p>
        <p className="text-lg font-bold text-indigo-600">
          {summary.bestDay ? formatCompactCurrency(summary.bestDay.total_revenue) : 'N/A'}
        </p>
        {summary.bestDay && (
          <p className="text-xs text-gray-400">
            {formatDisplayDate(summary.bestDay.period_date)}
          </p>
        )}
      </div>
    </div>
  );
};

// =============================================================================
// LOADING COMPONENT
// =============================================================================

const RevenueTrendsChartLoading: React.FC = () => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-6 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-3 w-16 mx-auto mb-1" />
              <Skeleton className="h-6 w-20 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </CardContent>
    </Card>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const RevenueTrendsChart: React.FC<RevenueTrendsChartProps> = ({ 
  data, 
  isLoading = false,
  periodType = 'day',
  showTransactionCount = false,
  showDualAxis = false,
  simUtilizationData = []
}) => {
  // Process chart data combining revenue data with sim utilization - moved before early returns to satisfy Rules of Hooks
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map(point => {
      // Find matching sim utilization data by date
      const simData = simUtilizationData.find(sim => sim.date === point.period_date);
      
      return {
        ...point,
        period_date: point.period_date,
        total_revenue: Number(point.total_revenue),
        gross_profit: Number(point.gross_profit),
        transaction_count: Number(point.transaction_count),
        avg_transaction_value: Number(point.avg_transaction_value),
        unique_customers: Number(point.unique_customers),
        profit_margin: point.total_revenue > 0 ? (point.gross_profit / point.total_revenue) * 100 : 0,
        sim_utilization: simData ? Number(simData.utilization_pct) : 0
      };
    });
  }, [data, simUtilizationData]);

  // Calculate Y-axis domains
  const profitValues = chartData.map(d => d.gross_profit);
  const maxProfit = Math.max(...profitValues);
  const profitDomain = [0, Math.ceil(maxProfit * 1.1)];

  // Fixed utilization domain to always show 0-100%
  const utilizationDomain = [0, 100];

  // Show loading state
  if (isLoading) {
    return <RevenueTrendsChartLoading />;
  }

  if (!data || data.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue & Profit Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-gray-500">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No revenue data available</p>
              <p className="text-sm">Revenue trends will appear here once data is available.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Gross Profit & Sim Utilization
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {periodType === 'day' ? 'Daily' : periodType === 'week' ? 'Weekly' : 'Monthly'} gross profit (bars) and sim utilization trends (line)
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              {data.length} {periodType}s
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <RevenueSummary data={data} periodType={periodType} />
        
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            
            <XAxis 
              dataKey="period_date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatDisplayDate(value)}
              stroke="#6b7280"
            />
            
            <YAxis 
              yAxisId="profit"
              domain={profitDomain}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatCompactCurrency(value)}
              label={{ 
                value: 'Gross Profit (THB)', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
              stroke="#6b7280"
            />
            
            <YAxis 
              yAxisId="utilization"
              orientation="right"
              domain={utilizationDomain}
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              label={{ 
                value: 'Sim Utilization (%)', 
                angle: 90, 
                position: 'insideRight',
                style: { textAnchor: 'middle' }
              }}
              stroke="#6b7280"
            />
            
            <Tooltip content={<RevenueTooltip />} />
            <Legend />

            {/* Gross Profit bars */}
            <Bar
              yAxisId="profit"
              dataKey="gross_profit"
              fill={DASHBOARD_COLORS.success}
              name="Gross Profit"
              radius={[2, 2, 0, 0]}
            />
            
            {/* Sim Utilization line */}
            <Line 
              yAxisId="utilization"
              type="monotone" 
              dataKey="sim_utilization" 
              stroke={DASHBOARD_COLORS.purple}
              strokeWidth={3}
              dot={{ 
                fill: DASHBOARD_COLORS.purple, 
                strokeWidth: 2, 
                r: 4 
              }}
              activeDot={{ 
                r: 6, 
                stroke: DASHBOARD_COLORS.purple,
                strokeWidth: 2,
                fill: '#fff'
              }}
              name="Sim Utilization"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default RevenueTrendsChart; 