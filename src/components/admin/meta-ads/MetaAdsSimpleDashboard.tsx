'use client';

import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  RefreshCw,
  DollarSign,
  MousePointer,
  Eye,
  BarChart3,
  Facebook,
  Instagram,
  Target,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ComposedChart, Area, PieChart, Pie, Cell } from 'recharts';

interface MetaMetrics {
  totalSpend: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
  metaBookings: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
  impressions: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
  clicks: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
  ctr: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
  conversions: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
  costPerBooking: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
  costPerConversion: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
}

interface ChartData {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  metaBookings: number;
  facebookBookings: number;
  instagramBookings: number;
  ctr: number;
  costPerBooking: number;
  costPerConversion: number;
}

interface OverviewData {
  success: boolean;
  period: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
  metrics: MetaMetrics;
}

interface PerformanceData {
  success: boolean;
  period: { startDate: string; endDate: string };
  chartData: ChartData[];
  totals: {
    totalSpend: number;
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalMetaBookings: number;
    totalFacebookBookings: number;
    totalInstagramBookings: number;
  };
}

export default function MetaAdsSimpleDashboard() {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [chartView, setChartView] = useState<'spend-bookings' | 'impressions' | 'clicks' | 'ctr' | 'conversions'>('spend-bookings');

  const fetchOverviewData = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await fetch(`/api/meta-ads/overview-metrics?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch overview metrics');
      }
      
      const data = await response.json();
      setOverviewData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - (dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90) * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const response = await fetch(`/api/meta-ads/performance-chart?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch performance chart data');
      }
      
      const data = await response.json();
      setPerformanceData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  const refreshData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchOverviewData(),
        fetchPerformanceData()
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [dateRange]);

  const formatNumber = (num: number, isPercent = false, isCurrency = false) => {
    if (isCurrency) {
      return `฿${num.toLocaleString()}`;
    }
    if (isPercent) {
      return `${num.toFixed(2)}%`;
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <ArrowDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable', change: number) => {
    if (trend === 'stable') return 'text-gray-600';
    // For cost metrics, down is good (green), up is bad (red)
    // For performance metrics, up is good (green), down is bad (red)
    if (Math.abs(change) < 1) return 'text-gray-600';
    return change > 0 ? 'text-green-600' : 'text-red-600';
  };

  const renderKPICards = () => {
    if (!overviewData) return null;

    const { metrics } = overviewData;

    const kpiData = [
      {
        title: 'Total Spend',
        value: formatNumber(metrics.totalSpend.value, false, true),
        change: metrics.totalSpend.change,
        trend: metrics.totalSpend.trend,
        icon: <DollarSign className="h-5 w-5 text-blue-600" />,
        isCostMetric: true
      },
      {
        title: 'Meta Bookings',
        value: metrics.metaBookings.value.toString(),
        change: metrics.metaBookings.change,
        trend: metrics.metaBookings.trend,
        icon: <Target className="h-5 w-5 text-green-600" />,
        isCostMetric: false
      },
      {
        title: 'Impressions',
        value: formatNumber(metrics.impressions.value),
        change: metrics.impressions.change,
        trend: metrics.impressions.trend,
        icon: <Eye className="h-5 w-5 text-purple-600" />,
        isCostMetric: false
      },
      {
        title: 'Clicks',
        value: formatNumber(metrics.clicks.value),
        change: metrics.clicks.change,
        trend: metrics.clicks.trend,
        icon: <MousePointer className="h-5 w-5 text-orange-600" />,
        isCostMetric: false
      },
      {
        title: 'CTR',
        value: formatNumber(metrics.ctr.value, true),
        change: metrics.ctr.change,
        trend: metrics.ctr.trend,
        icon: <BarChart3 className="h-5 w-5 text-indigo-600" />,
        isCostMetric: false
      },
      {
        title: 'Conversions',
        value: metrics.conversions.value.toString(),
        change: metrics.conversions.change,
        trend: metrics.conversions.trend,
        icon: <TrendingUp className="h-5 w-5 text-emerald-600" />,
        isCostMetric: false
      },
      {
        title: 'Cost/Booking',
        value: formatNumber(metrics.costPerBooking.value, false, true),
        change: metrics.costPerBooking.change,
        trend: metrics.costPerBooking.trend,
        icon: <Target className="h-5 w-5 text-red-600" />,
        isCostMetric: true
      },
      {
        title: 'Cost/Convert',
        value: formatNumber(metrics.costPerConversion.value, false, true),
        change: metrics.costPerConversion.change,
        trend: metrics.costPerConversion.trend,
        icon: <TrendingUp className="h-5 w-5 text-pink-600" />,
        isCostMetric: true
      }
    ];

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                {kpi.icon}
                {getTrendIcon(kpi.trend)}
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-sm text-gray-600">{kpi.title}</p>
                <div className={`text-xs flex items-center gap-1 ${
                  kpi.isCostMetric ? 
                    (kpi.change < 0 ? 'text-green-600' : kpi.change > 0 ? 'text-red-600' : 'text-gray-600') :
                    (kpi.change > 0 ? 'text-green-600' : kpi.change < 0 ? 'text-red-600' : 'text-gray-600')
                }`}>
                  {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}% vs prev period
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderMainChart = () => {
    if (!performanceData?.chartData) return null;

    const getChartData = () => {
      switch (chartView) {
        case 'impressions':
          return { 
            dataKey: 'impressions', 
            name: 'Impressions', 
            color: '#8b5cf6',
            yAxisId: 'left'
          };
        case 'clicks':
          return { 
            dataKey: 'clicks', 
            name: 'Clicks', 
            color: '#f97316',
            yAxisId: 'left'
          };
        case 'ctr':
          return { 
            dataKey: 'ctr', 
            name: 'CTR (%)', 
            color: '#6366f1',
            yAxisId: 'left'
          };
        case 'conversions':
          return { 
            dataKey: 'conversions', 
            name: 'Conversions', 
            color: '#10b981',
            yAxisId: 'left'
          };
        default:
          return null;
      }
    };

    const chartConfig = getChartData();

    return (
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Meta Ads Performance Trend
            </CardTitle>
            <Select value={chartView} onValueChange={(value: any) => setChartView(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spend-bookings">Spend vs Bookings</SelectItem>
                <SelectItem value="impressions">Impressions</SelectItem>
                <SelectItem value="clicks">Clicks</SelectItem>
                <SelectItem value="ctr">CTR</SelectItem>
                <SelectItem value="conversions">Conversions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            {chartView === 'spend-bookings' ? (
              <ComposedChart data={performanceData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value, name) => {
                    if (name === 'Spend (฿)') return [`฿${parseFloat(String(value)).toFixed(0)}`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Area 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="spend" 
                  fill="#3b82f6" 
                  fillOpacity={0.3} 
                  stroke="#3b82f6" 
                  name="Spend (฿)" 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="metaBookings" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  name="Meta Bookings" 
                />
              </ComposedChart>
            ) : chartConfig ? (
              <LineChart data={performanceData.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey={chartConfig.dataKey} 
                  stroke={chartConfig.color} 
                  strokeWidth={2} 
                  name={chartConfig.name}
                />
              </LineChart>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a chart view to display data
              </div>
            )}
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderPlatformBreakdown = () => {
    if (!performanceData?.totals) return null;

    const { totals } = performanceData;
    
    const platformData = [
      {
        name: 'Facebook',
        bookings: totals.totalFacebookBookings,
        color: '#1877f2'
      },
      {
        name: 'Instagram',
        bookings: totals.totalInstagramBookings,
        color: '#E4405F'
      }
    ];

    // Calculate spend split (assuming 50/50 for now)
    const spendData = [
      {
        name: 'Facebook',
        spend: totals.totalSpend * 0.5,
        color: '#1877f2'
      },
      {
        name: 'Instagram',
        spend: totals.totalSpend * 0.5,
        color: '#E4405F'
      }
    ];

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-600" />
              Platform Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={platformData}
                    cx={100}
                    cy={100}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="bookings"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {platformData.map((platform, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-sm font-medium">{platform.name}</span>
                  </div>
                  <div className="text-sm font-semibold">{platform.bookings} bookings</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              Platform Spend Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center mb-4">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={spendData}
                    cx={100}
                    cy={100}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="spend"
                  >
                    {spendData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`฿${Number(value).toFixed(0)}`, 'Spend']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {spendData.map((platform, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-sm font-medium">{platform.name}</span>
                  </div>
                  <div className="text-sm font-semibold">฿{platform.spend.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Facebook className="h-7 w-7 text-blue-600" />
            Meta Ads Dashboard
          </h2>
          <p className="text-gray-600 mt-1">Simple metrics and trends following Google Ads pattern</p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(value: '7d' | '30d' | '90d') => setDateRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={refreshData}
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-700">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading Meta Ads dashboard data...</p>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      {!isLoading && overviewData && performanceData && (
        <>
          {/* KPI Cards */}
          {renderKPICards()}

          {/* Main Performance Chart */}
          {renderMainChart()}

          {/* Platform Breakdown */}
          {renderPlatformBreakdown()}
        </>
      )}

      {/* No Data State */}
      {!isLoading && !overviewData && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Facebook className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No Meta Ads data found for the selected period.</p>
            <p className="text-sm text-gray-500 mt-2">
              Ensure Meta Ads data is synced and try refreshing.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}