'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { TrendingUp, Calendar, BarChart3, LineChart as LineChartIcon } from 'lucide-react';

interface TrendData {
  date: string;
  revenue: number;
  profit: number;
  quantity: number;
  margin: number;
}

interface ProductTrendChartProps {
  productName: string;
  dateRange: {
    start: string;
    end: string;
  };
}

export default function ProductTrendChart({ productName, dateRange }: ProductTrendChartProps) {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [metric, setMetric] = useState<'revenue' | 'profit' | 'quantity' | 'margin'>('revenue');

  useEffect(() => {
    const fetchTrendData = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          start_date: dateRange.start,
          end_date: dateRange.end,
          product_name: productName,
        });

        const response = await fetch(`/api/dashboard/product-trend?${params}`);
        if (response.ok) {
          const data = await response.json();
          setTrendData(data.trend_data || []);
        }
      } catch (error) {
        console.error('Failed to fetch trend data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (productName) {
      fetchTrendData();
    }
  }, [productName, dateRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMetricColor = () => {
    switch (metric) {
      case 'revenue': return '#3B82F6';
      case 'profit': return '#10B981';
      case 'quantity': return '#F59E0B';
      case 'margin': return '#8B5CF6';
      default: return '#3B82F6';
    }
  };

  const getTooltipFormatter = (value: number, name: string) => {
    switch (name) {
      case 'revenue':
      case 'profit':
        return [formatCurrency(value), name === 'revenue' ? 'Revenue' : 'Profit'];
      case 'quantity':
        return [value.toString(), 'Quantity'];
      case 'margin':
        return [formatPercentage(value), 'Margin'];
      default:
        return [value.toString(), name];
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">Loading trend data...</p>
        </CardContent>
      </Card>
    );
  }

  if (trendData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No trend data available for this product</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend Analysis: {productName}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={chartType === 'line' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('line')}
                className="p-2"
              >
                <LineChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="p-2"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
            </div>

            {/* Metric Selector */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={metric === 'revenue' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMetric('revenue')}
              >
                Revenue
              </Button>
              <Button
                variant={metric === 'profit' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMetric('profit')}
              >
                Profit
              </Button>
              <Button
                variant={metric === 'quantity' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMetric('quantity')}
              >
                Quantity
              </Button>
              <Button
                variant={metric === 'margin' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setMetric('margin')}
              >
                Margin
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'line' ? (
            <LineChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
              />
              <YAxis 
                tickFormatter={(value) => {
                  if (metric === 'margin') return formatPercentage(value);
                  if (metric === 'quantity') return value.toString();
                  return formatCurrency(value);
                }}
              />
              <Tooltip 
                formatter={getTooltipFormatter}
                labelFormatter={(date) => `Date: ${formatDate(date)}`}
              />
              <Line 
                type="monotone" 
                dataKey={metric} 
                stroke={getMetricColor()}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : (
            <BarChart data={trendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
              />
              <YAxis 
                tickFormatter={(value) => {
                  if (metric === 'margin') return formatPercentage(value);
                  if (metric === 'quantity') return value.toString();
                  return formatCurrency(value);
                }}
              />
              <Tooltip 
                formatter={getTooltipFormatter}
                labelFormatter={(date) => `Date: ${formatDate(date)}`}
              />
              <Bar 
                dataKey={metric} 
                fill={getMetricColor()}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>

        {/* Trend Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 mb-1">Avg Daily Revenue</p>
            <p className="font-semibold text-blue-900">
              {formatCurrency(trendData.reduce((sum, d) => sum + d.revenue, 0) / trendData.length)}
            </p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 mb-1">Avg Daily Profit</p>
            <p className="font-semibold text-green-900">
              {formatCurrency(trendData.reduce((sum, d) => sum + d.profit, 0) / trendData.length)}
            </p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-xs text-orange-600 mb-1">Avg Daily Quantity</p>
            <p className="font-semibold text-orange-900">
              {Math.round(trendData.reduce((sum, d) => sum + d.quantity, 0) / trendData.length)}
            </p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 mb-1">Avg Margin</p>
            <p className="font-semibold text-purple-900">
              {formatPercentage(trendData.reduce((sum, d) => sum + d.margin, 0) / trendData.length)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}