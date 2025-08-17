'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  Legend,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Circle as ScatterIcon } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  total_revenue: number | null;
  total_profit: number | null;
  avg_profit_margin: number | null;
  total_cost: number | null;
  units_in_stock: number;
  performance_trend: 'up' | 'down' | 'stable';
  trend_percentage: number | null;
}

interface ProductPerformanceChartProps {
  data: Product[];
}

type ChartType = 'bar' | 'pie' | 'scatter';

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
];

export default function ProductPerformanceChart({ data }: ProductPerformanceChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [metric, setMetric] = useState<'revenue' | 'profit' | 'quantity' | 'margin'>('revenue');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return `${value.toFixed(1)}%`;
  };

  // Prepare data for charts - show top 5 and aggregate others
  const sortedProducts = data
    .sort((a, b) => {
      switch (metric) {
        case 'revenue':
          return (b.total_revenue || 0) - (a.total_revenue || 0);
        case 'profit':
          return (b.total_profit || 0) - (a.total_profit || 0);
        case 'quantity':
          return b.quantity_sold - a.quantity_sold;
        case 'margin':
          return (b.avg_profit_margin || 0) - (a.avg_profit_margin || 0);
        default:
          return (b.total_revenue || 0) - (a.total_revenue || 0);
      }
    });

  const top5Products = sortedProducts.slice(0, 5);
  const otherProducts = sortedProducts.slice(5);

  // Calculate "Others" aggregate
  const othersAggregate = otherProducts.reduce((acc, product) => ({
    revenue: acc.revenue + (product.total_revenue || 0),
    profit: acc.profit + (product.total_profit || 0),
    quantity: acc.quantity + product.quantity_sold,
    count: acc.count + 1
  }), { revenue: 0, profit: 0, quantity: 0, count: 0 });

  const othersMargin = othersAggregate.revenue > 0 ? (othersAggregate.profit / othersAggregate.revenue) * 100 : 0;

  const chartData = [
    ...top5Products.map((product, index) => ({
      name: product.name.length > 12 ? product.name.substring(0, 12) + '...' : product.name,
      fullName: product.name,
      category: product.category,
      revenue: product.total_revenue || 0,
      profit: product.total_profit || 0,
      quantity: product.quantity_sold,
      margin: product.avg_profit_margin || 0,
      color: COLORS[index % COLORS.length],
    })),
    ...(otherProducts.length > 0 ? [{
      name: `Others (${othersAggregate.count})`,
      fullName: `${othersAggregate.count} other products`,
      category: 'Mixed',
      revenue: othersAggregate.revenue,
      profit: othersAggregate.profit,
      quantity: othersAggregate.quantity,
      margin: othersMargin,
      color: COLORS[5 % COLORS.length],
    }] : [])
  ];

  // Category aggregation for pie chart
  const categoryData = data.reduce((acc, product) => {
    const existing = acc.find(item => item.category === product.category);
    if (existing) {
      existing.revenue += product.total_revenue || 0;
      existing.profit += product.total_profit || 0;
      existing.quantity += product.quantity_sold;
      existing.count += 1;
    } else {
      acc.push({
        category: product.category,
        revenue: product.total_revenue || 0,
        profit: product.total_profit || 0,
        quantity: product.quantity_sold,
        count: 1,
      });
    }
    return acc;
  }, [] as Array<{
    category: string;
    revenue: number;
    profit: number;
    quantity: number;
    count: number;
  }>);

  const pieChartData = categoryData.map((category, index) => ({
    name: category.category,
    value: category[metric === 'margin' ? 'revenue' : metric],
    color: COLORS[index % COLORS.length],
  }));

  // Scatter plot data (profit vs revenue)
  const scatterData = data.map(product => ({
    name: product.name,
    revenue: product.total_revenue || 0,
    profit: product.total_profit || 0,
    margin: product.avg_profit_margin || 0,
    quantity: product.quantity_sold,
  }));

  const getYAxisLabel = () => {
    switch (metric) {
      case 'revenue':
        return 'Revenue (THB)';
      case 'profit':
        return 'Profit (THB)';
      case 'quantity':
        return 'Quantity Sold';
      case 'margin':
        return 'Profit Margin (%)';
      default:
        return 'Value';
    }
  };

  const getTooltipFormatter = (value: any, name: string) => {
    const numValue = Number(value) || 0;
    if (name === 'margin') {
      return [formatPercentage(numValue), 'Profit Margin'];
    }
    if (name === 'quantity') {
      return [numValue.toLocaleString(), 'Quantity'];
    }
    return [formatCurrency(numValue), name === 'revenue' ? 'Revenue' : 'Profit'];
  };

  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={450}>
      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 60, bottom: 120 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45}
          textAnchor="end"
          height={120}
          fontSize={11}
          interval={0}
        />
        <YAxis 
          tickFormatter={(value) => {
            if (metric === 'margin') return formatPercentage(value);
            if (metric === 'quantity') return value?.toLocaleString() || '0';
            return formatCurrency(value || 0);
          }}
        />
        <Tooltip 
          formatter={getTooltipFormatter}
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload;
            return item?.fullName || label;
          }}
        />
        <Bar 
          dataKey={metric} 
          fill="#3B82F6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderPieChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart>
        <Pie
          data={pieChartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {pieChartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip 
          formatter={(value) => {
            if (metric === 'margin') return formatPercentage(Number(value) || null);
            if (metric === 'quantity') return (Number(value) || 0).toLocaleString();
            return formatCurrency(Number(value) || 0);
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  const renderScatterChart = () => (
    <ResponsiveContainer width="100%" height={400}>
      <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid />
        <XAxis 
          dataKey="revenue" 
          type="number" 
          name="Revenue"
          tickFormatter={(value) => formatCurrency(value || 0)}
          label={{ value: 'Revenue (THB)', position: 'insideBottom', offset: -10 }}
        />
        <YAxis 
          dataKey="profit" 
          type="number" 
          name="Profit"
          tickFormatter={(value) => formatCurrency(value || 0)}
          label={{ value: 'Profit (THB)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          cursor={{ strokeDasharray: '3 3' }}
          formatter={(value, name) => {
            if (name === 'Revenue' || name === 'Profit') {
              return [formatCurrency(Number(value)), name];
            }
            return [value, name];
          }}
          labelFormatter={(label, payload) => {
            const item = payload?.[0]?.payload;
            return item?.name || 'Product';
          }}
        />
        <Scatter name="Products" data={scatterData} fill="#3B82F6" />
      </ScatterChart>
    </ResponsiveContainer>
  );

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'scatter':
        return renderScatterChart();
      default:
        return renderBarChart();
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">No product data available for visualization</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Product Performance Analysis</CardTitle>
          <div className="flex items-center gap-2">
            {/* Chart Type Selector */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={chartType === 'bar' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('bar')}
                className="p-2"
              >
                <BarChart3 className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'pie' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('pie')}
                className="p-2"
              >
                <PieChartIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={chartType === 'scatter' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setChartType('scatter')}
                className="p-2"
              >
                <ScatterIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Metric Selector (only for bar and pie charts) */}
            {chartType !== 'scatter' && (
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
            )}
          </div>
        </div>
        <div className="text-sm text-gray-600">
          {chartType === 'bar' && `Top 5 products by ${metric}${otherProducts.length > 0 ? ' (+ others)' : ''}`}
          {chartType === 'pie' && `${metric} distribution by category`}
          {chartType === 'scatter' && 'Revenue vs Profit analysis'}
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
}