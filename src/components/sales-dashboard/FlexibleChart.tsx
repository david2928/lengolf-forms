'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Settings, TrendingUp, BarChart3, Calendar, Layers, Percent, RefreshCw } from 'lucide-react';
import { formatCurrency, formatPercentage, formatDisplayDate, formatNumber } from '@/lib/dashboard-utils';

interface FlexibleChartProps {
  startDate?: string;
  endDate?: string;
  isLoading?: boolean;
  title?: string;
  className?: string;
}

type ChartType = 'line' | 'stacked' | 'stacked100';
type TimePeriod = 'daily' | 'weekly' | 'monthly';
type DimensionType = 'none' | 'category' | 'payment_method' | 'customer_type';
type MetricType = 'revenue' | 'profit' | 'transaction_count' | 'avg_transaction_value' | 'utilization';

interface FlexibleAnalyticsData {
  date: string;
  dimension: string;
  value: number;
  raw_value: number;
  percentage: number;
}

interface FlexibleAnalyticsResponse {
  data: FlexibleAnalyticsData[];
  metadata: {
    start_date: string;
    end_date: string;
    metric_type: string;
    time_period: string;
    dimension_type: string;
    chart_type: string;
  };
  summary: {
    total_value: number;
    period_count: number;
    dimension_count: number;
    metric_label: string;
    time_period_label: string;
    dimension_label: string;
  };
}

const FlexibleChart: React.FC<FlexibleChartProps> = ({ 
  startDate = '2024-05-01',
  endDate = '2024-05-31',
  isLoading = false, 
  title = "Flexible Analytics",
  className = ""
}) => {
  // Chart configuration state
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('revenue');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
  const [dimension, setDimension] = useState<DimensionType>('none');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showSettings, setShowSettings] = useState(false);
  const [data, setData] = useState<FlexibleAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableMetrics: { value: MetricType; label: string; color: string }[] = [
    { value: 'revenue', label: 'Revenue', color: '#3b82f6' },
    { value: 'profit', label: 'Profit', color: '#10b981' },
    { value: 'transaction_count', label: 'Transaction Count', color: '#f59e0b' },
    { value: 'avg_transaction_value', label: 'Avg Transaction Value', color: '#8b5cf6' },
    { value: 'utilization', label: 'Sim Utilization %', color: '#ef4444' }
  ];

  const availableTimePeriods: { value: TimePeriod; label: string }[] = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' }
  ];

  const availableDimensions: { value: DimensionType; label: string }[] = [
    { value: 'none', label: 'No Breakdown' },
    { value: 'category', label: 'Product Category' },
    { value: 'payment_method', label: 'Payment Method' },
    { value: 'customer_type', label: 'Customer Type' }
  ];

  // Auto-adjust chart type based on dimension
  useEffect(() => {
    if (dimension === 'none' && chartType !== 'line') {
      setChartType('line');
    }
  }, [dimension, chartType]);

  // Fetch data when parameters change
  const fetchData = async () => {
    if (!startDate || !endDate) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        metric_type: selectedMetric,
        time_period: timePeriod,
        dimension_type: dimension,
        chart_type: chartType
      });
      
      const response = await fetch(`/api/sales/flexible-analytics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics data: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Flexible analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch data when parameters change
  useEffect(() => {
    fetchData();
  }, [startDate, endDate, selectedMetric, timePeriod, dimension, chartType]);

  // Process data for charts
  const chartData = useMemo(() => {
    if (!data?.data) return [];
    
    if (dimension === 'none') {
      // Simple line chart data
      return data.data.map(item => ({
        date: formatDisplayDate(item.date),
        value: chartType === 'stacked100' ? item.percentage : item.raw_value,
        raw_value: item.raw_value
      }));
    } else {
      // Group by date for stacked charts
      const groupedData: { [date: string]: any } = {};
      
      data.data.forEach(item => {
        const date = formatDisplayDate(item.date);
        if (!groupedData[date]) {
          groupedData[date] = { date };
        }
        
        const value = chartType === 'stacked100' ? item.percentage : item.raw_value;
        groupedData[date][item.dimension] = value;
        groupedData[date][`${item.dimension}_raw`] = item.raw_value;
      });
      
      return Object.values(groupedData);
    }
  }, [data, chartType, dimension]);

  // Get unique dimensions for stacked charts
  const dimensions = useMemo(() => {
    if (!data?.data || dimension === 'none') return [];
    
    const uniqueDimensions = Array.from(new Set(data.data.map(item => item.dimension)));
    return uniqueDimensions.sort();
  }, [data, dimension]);

  const currentMetric = availableMetrics.find(m => m.value === selectedMetric);

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#f97316'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-gray-600">
                  {dimension === 'none' ? currentMetric?.label : entry.dataKey}
                </span>
              </div>
              <span className="text-sm font-medium">
                {selectedMetric === 'revenue' || selectedMetric === 'profit' || selectedMetric === 'avg_transaction_value' 
                  ? formatCurrency(entry.payload[`${entry.dataKey}_raw`] || entry.value)
                  : selectedMetric === 'utilization'
                  ? formatPercentage(entry.payload[`${entry.dataKey}_raw`] || entry.value)
                  : formatNumber(entry.payload[`${entry.dataKey}_raw`] || entry.value)
                }
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (isLoading || loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-2">Failed to load analytics data</p>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              <Button onClick={fetchData} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            {data?.summary && (
              <Badge variant="outline" className="text-xs">
                {data.summary.period_count} {data.summary.time_period_label.toLowerCase()} periods
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1"
            >
              <Settings className="h-4 w-4" />
              {showSettings ? 'Hide' : 'Settings'}
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
            {/* Metric Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Metric
              </label>
              <Select value={selectedMetric} onValueChange={(value: MetricType) => setSelectedMetric(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMetrics.map(metric => (
                    <SelectItem key={metric.value} value={metric.value}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: metric.color }}
                        />
                        {metric.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Period Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Time Period
              </label>
              <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTimePeriods.map(period => (
                    <SelectItem key={period.value} value={period.value}>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {period.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dimension Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Stack By
              </label>
              <Select value={dimension} onValueChange={(value: DimensionType) => setDimension(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableDimensions.map(dim => (
                    <SelectItem key={dim.value} value={dim.value}>
                      {dim.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chart Type Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Chart Type
              </label>
              <Select 
                value={chartType} 
                onValueChange={(value: ChartType) => setChartType(value)}
                disabled={dimension === 'none'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Line Chart
                    </div>
                  </SelectItem>
                  <SelectItem value="stacked" disabled={dimension === 'none'}>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Stacked (Absolute)
                    </div>
                  </SelectItem>
                  <SelectItem value="stacked100" disabled={dimension === 'none'}>
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Stacked 100%
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Summary Stats */}
        {data?.summary && (
          <div className="mb-6 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-blue-600">
                  {selectedMetric === 'revenue' || selectedMetric === 'profit' || selectedMetric === 'avg_transaction_value'
                    ? formatCurrency(data.summary.total_value)
                    : selectedMetric === 'utilization'
                    ? formatPercentage(data.summary.total_value)
                    : formatNumber(data.summary.total_value)
                  }
                </p>
                <p className="text-xs text-gray-500">Total {currentMetric?.label}</p>
              </div>
              <div>
                <p className="text-lg font-bold text-green-600">
                  {data.summary.period_count}
                </p>
                <p className="text-xs text-gray-500">{data.summary.time_period_label} Periods</p>
              </div>
              <div>
                <p className="text-lg font-bold text-purple-600">
                  {dimension === 'none' ? 'Single' : data.summary.dimension_count}
                </p>
                <p className="text-xs text-gray-500">
                  {dimension === 'none' ? 'Metric' : `${data.summary.dimension_label}s`}
                </p>
              </div>
              <div>
                <p className="text-lg font-bold text-orange-600">
                  {chartType === 'line' ? 'Trend' : chartType === 'stacked100' ? 'Percentage' : 'Stacked'}
                </p>
                <p className="text-xs text-gray-500">Display Mode</p>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <ResponsiveContainer width="100%" height={400}>
          {dimension === 'none' || chartType === 'line' ? (
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12}
                tickFormatter={(value) => {
                  return selectedMetric === 'revenue' || selectedMetric === 'profit' || selectedMetric === 'avg_transaction_value'
                    ? formatCurrency(value)
                    : selectedMetric === 'utilization'
                    ? `${value}%`
                    : formatNumber(value);
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone"
                dataKey="value" 
                stroke={currentMetric?.color || '#3b82f6'}
                strokeWidth={2}
                dot={{ fill: currentMetric?.color || '#3b82f6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name={currentMetric?.label || 'Value'}
              />
            </LineChart>
          ) : (
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280" 
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis 
                stroke="#6b7280" 
                fontSize={12}
                domain={chartType === 'stacked100' ? [0, 100] : [0, 'dataMax']}
                type="number"
                allowDataOverflow={false}
                tickCount={6}
                tickFormatter={(value) => {
                  if (chartType === 'stacked100') {
                    return `${Math.round(value)}%`;
                  }
                  return selectedMetric === 'revenue' || selectedMetric === 'profit' || selectedMetric === 'avg_transaction_value'
                    ? formatCurrency(value)
                    : selectedMetric === 'utilization'
                    ? `${value}%`
                    : formatNumber(value);
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {dimensions.map((dim, index) => (
                <Bar 
                  key={dim}
                  dataKey={dim} 
                  stackId={chartType === 'stacked100' ? 'percent' : 'absolute'} 
                  fill={colors[index % colors.length]}
                  name={dim}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default FlexibleChart; 