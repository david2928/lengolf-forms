// Category Breakdown Chart Component
// Donut chart with interactive tooltips and legend

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { PieChart as PieChartIcon, BarChart3, TrendingUp, Package } from 'lucide-react';
import { 
  CategoryData, 
  CHART_COLORS,
  DASHBOARD_COLORS 
} from '@/types/sales-dashboard';
import { 
  formatCurrency, 
  formatCompactCurrency,
  formatPercentage,
  formatNumber,
  processCategoryData
} from '@/lib/dashboard-utils';

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface CategoryBreakdownChartProps {
  data: CategoryData[];
  isLoading?: boolean;
  showProfit?: boolean;
  chartType?: 'donut' | 'pie' | 'bar';
}

interface CategoryTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface CategoryStatsProps {
  data: CategoryData[];
}

// =============================================================================
// PROCESSED CATEGORY DATA TYPE
// =============================================================================

interface ProcessedCategoryData {
  name: string;
  value: number;
  profit: number;
  percentage: number;
  margin_pct: number;
  transaction_count: number;
  avg_transaction_value: number;
  fill: string;
}

// =============================================================================
// CUSTOM TOOLTIP COMPONENT
// =============================================================================

const CategoryTooltip: React.FC<CategoryTooltipProps> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: data.fill }}
          ></div>
          <p className="font-medium text-gray-900 text-sm">
            {data.name}
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">Revenue</span>
            <span className="text-sm font-semibold text-blue-600">
              {formatCurrency(data.value)}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">Profit</span>
            <span className="text-sm font-semibold text-green-600">
              {formatCurrency(data.profit)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-gray-600">Share</span>
            <span className="text-sm font-semibold text-purple-600">
              {formatPercentage(data.percentage, 1)}
            </span>
          </div>

          <div className="border-t pt-2 mt-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs text-gray-500">Margin</span>
              <span className="text-xs font-medium">
                {formatPercentage(data.margin_pct, 1)}
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
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// =============================================================================
// CATEGORY STATS COMPONENT
// =============================================================================

const CategoryStats: React.FC<CategoryStatsProps> = ({ data }) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalCategories: 0,
        topCategory: null,
        highestMargin: null,
        totalRevenue: 0,
        avgMargin: 0
      };
    }

    const totalRevenue = data.reduce((sum, cat) => sum + cat.revenue, 0);
    const totalProfit = data.reduce((sum, cat) => sum + cat.profit, 0);
    const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const topCategory = data.reduce((top, current) => 
      current.revenue > top.revenue ? current : top
    );

    const highestMargin = data.reduce((highest, current) => 
      current.margin_pct > highest.margin_pct ? current : highest
    );

    return {
      totalCategories: data.length,
      topCategory,
      highestMargin,
      totalRevenue,
      avgMargin
    };
  }, [data]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Categories</p>
        <p className="text-lg font-bold text-gray-900">
          {stats.totalCategories}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Top Category</p>
        <p className="text-sm font-bold text-blue-600 truncate">
          {stats.topCategory?.parent_category || 'N/A'}
        </p>
        <p className="text-xs text-gray-400">
          {stats.topCategory ? formatCompactCurrency(stats.topCategory.revenue) : ''}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Best Margin</p>
        <p className="text-sm font-bold text-green-600 truncate">
          {stats.highestMargin?.parent_category || 'N/A'}
        </p>
        <p className="text-xs text-gray-400">
          {stats.highestMargin ? formatPercentage(stats.highestMargin.margin_pct, 1) : ''}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Avg Margin</p>
        <p className="text-lg font-bold text-purple-600">
          {formatPercentage(stats.avgMargin, 1)}
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// LOADING COMPONENT
// =============================================================================

const CategoryBreakdownChartLoading: React.FC = () => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-16" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-3 w-12 mx-auto mb-1" />
              <Skeleton className="h-5 w-16 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[350px] w-full" />
      </CardContent>
    </Card>
  );
};

// =============================================================================
// CUSTOM LABEL COMPONENT
// =============================================================================

const renderCustomLabel = (entry: any) => {
  if (entry.percentage < 5) return null; // Don't show labels for small slices
  
  return `${entry.name}: ${entry.percentage.toFixed(1)}%`;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Color palette for categories
const CATEGORY_COLORS = CHART_COLORS;

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({ 
  data, 
  isLoading = false,
  showProfit = false,
  chartType = 'bar'
}) => {
  // Show loading state
  if (isLoading) {
    return <CategoryBreakdownChartLoading />;
  }

  // Process chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const totalRevenue = data.reduce((sum, cat) => sum + cat.revenue, 0);
    
    const processed = data
      .map((cat, index) => ({
        name: cat.parent_category,
        value: Number(cat.revenue), // Ensure revenue is a number
        profit: Number(cat.profit),
        percentage: totalRevenue > 0 ? (cat.revenue / totalRevenue) * 100 : 0,
        margin_pct: cat.margin_pct,
        transaction_count: cat.transaction_count,
        avg_transaction_value: cat.avg_transaction_value,
        fill: CHART_COLORS[index % CHART_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value); // Sort by revenue descending (highest first)
    
    return processed;
  }, [data, showProfit]);

  if (!data || data.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Revenue by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            <div className="text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No category data available</p>
              <p className="text-sm">Category breakdown will appear here once data is available.</p>
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
              Revenue by Category
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Revenue distribution across product categories (sorted by revenue)
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Package className="h-3 w-3 mr-1" />
              {data.length} categories
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <CategoryStats data={data} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bar Chart - Left side */}
          <div className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart 
                data={chartData} 
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCompactCurrency(value)}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CategoryTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table - Right side */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Category Details</h4>
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="text-left p-2 font-medium text-gray-700">Category</th>
                      <th className="text-right p-2 font-medium text-gray-700">Revenue</th>
                      <th className="text-right p-2 font-medium text-gray-700">%</th>
                      <th className="text-right p-2 font-medium text-gray-700">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((entry, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: entry.fill }}
                            ></div>
                            <span className="text-gray-900 truncate text-xs">
                              {entry.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-right p-2 font-medium text-gray-900">
                          {formatCompactCurrency(entry.value)}
                        </td>
                        <td className="text-right p-2 text-gray-600">
                          {formatPercentage(entry.percentage, 1)}
                        </td>
                        <td className="text-right p-2 text-gray-600">
                          {formatPercentage(entry.margin_pct, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Category Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
            {chartData.length > 0 && (
              <>
                <p>
                  <span className="font-medium">{chartData[0].name}</span> leads with{' '}
                  <span className="font-medium text-blue-600">
                    {formatPercentage(chartData[0].percentage, 1)}
                  </span> of total revenue
                </p>
                {chartData.length > 1 && (
                  <p>
                    Top 2 categories account for{' '}
                    <span className="font-medium text-green-600">
                      {formatPercentage(chartData[0].percentage + chartData[1].percentage, 1)}
                    </span> of the total
                  </p>
                )}
                <p>
                  Average margin across all categories:{' '}
                  <span className="font-medium text-purple-600">
                    {formatPercentage(chartData.reduce((sum, cat) => sum + cat.margin_pct, 0) / chartData.length, 1)}
                  </span>
                </p>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdownChart; 