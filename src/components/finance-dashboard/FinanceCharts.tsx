import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { TrendsData } from '@/hooks/useFinanceDashboard';

interface FinanceChartsProps {
  data: TrendsData | null;
  loading: boolean;
  selectedMonth: string;
}

function ChartSkeleton() {
  return (
    <div className="h-80">
      <Skeleton className="h-full w-full" />
    </div>
  );
}

export default function FinanceCharts({ data, loading, selectedMonth }: FinanceChartsProps) {
  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartSkeleton />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>EBITDA Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.trends || data.trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-500 py-8">
            No trend data available
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format chart data
  const chartData = data.trends.map(item => ({
    month: new Date(item.month).toLocaleDateString('en-US', { 
      month: 'short', 
      year: '2-digit' 
    }),
    revenue: parseFloat(item.total_sales?.toString() || '0'),
    historical_revenue: parseFloat(item.historical_total_sales?.toString() || '0'),
    gross_profit: parseFloat(item.gross_profit?.toString() || '0'),
    ebitda: parseFloat(item.ebitda?.toString() || '0'),
    historical_ebitda: parseFloat(item.historical_ebitda?.toString() || '0')
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Revenue Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trends (12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), '']}
                  labelStyle={{ color: '#374151' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  name="Current Revenue"
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="historical_revenue" 
                  stroke="#94A3B8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Historical Revenue"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* EBITDA Trends */}
        <Card>
          <CardHeader>
            <CardTitle>EBITDA Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), '']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="ebitda" 
                    fill="#10B981" 
                    name="Current EBITDA"
                    radius={[2, 2, 0, 0]}
                  />
                  <Bar 
                    dataKey="historical_ebitda" 
                    fill="#D1D5DB" 
                    name="Historical EBITDA"
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Profitability Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Gross Profit Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={formatCurrency} />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), '']}
                    labelStyle={{ color: '#374151' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gross_profit" 
                    stroke="#F59E0B" 
                    strokeWidth={3}
                    name="Gross Profit"
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>12-Month Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(chartData.reduce((sum, item) => sum + item.ebitda, 0))}
              </div>
              <div className="text-sm text-gray-600">Total EBITDA</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(chartData.reduce((sum, item) => sum + item.revenue, 0) / 12)}
              </div>
              <div className="text-sm text-gray-600">Avg Monthly Revenue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {(
                  (chartData.reduce((sum, item) => sum + item.ebitda, 0) / 
                   chartData.reduce((sum, item) => sum + item.revenue, 0)) * 100
                ).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Avg EBITDA Margin</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}