import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart
} from 'recharts';

interface SpendTrendData {
  date: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  conversions: number;
}

interface PlatformComparisonData {
  platform: string;
  spend: number;
  conversions: number;
  percentage: number;
}

interface ConversionFunnelData {
  platform: string;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionRate: number;
}

interface CACTrendData {
  date: string;
  googleCac: number;
  metaCac: number;
  blendedCac: number;
}

interface ROASData {
  platform: string;
  roas: number;
  spend: number;
  revenue: number;
}

interface ChartData {
  spendTrend: SpendTrendData[];
  platformComparison: PlatformComparisonData[];
  conversionFunnel: ConversionFunnelData[];
  cacTrend: CACTrendData[];
  roasByPlatform: ROASData[];
}

interface MarketingChartsProps {
  data: ChartData;
  isLoading?: boolean;
}

const MarketingCharts: React.FC<MarketingChartsProps> = ({ data, isLoading = false }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const COLORS = {
    google: '#4285F4',
    meta: '#8B5CF6',
    total: '#10B981',
    conversions: '#F59E0B'
  };

  const pieColors = ['#4285F4', '#8B5CF6'];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-48"></div>
            </CardHeader>
            <CardContent>
              <div className="h-64 bg-gray-100 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Spend Trend Chart - Full Width */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Daily Spend & Conversions Trend</CardTitle>
            <Badge variant="outline" className="text-xs">Last 30 Days</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data.spendTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                stroke="#666"
                fontSize={12}
              />
              <YAxis 
                yAxisId="spend"
                orientation="left"
                tickFormatter={formatCurrency}
                stroke="#666"
                fontSize={12}
              />
              <YAxis 
                yAxisId="conversions"
                orientation="right"
                stroke="#666"
                fontSize={12}
              />
              <Tooltip 
                formatter={(value: number, name: string) => {
                  if (name === 'conversions') return [value, 'Conversions'];
                  return [formatCurrency(value), name];
                }}
                labelFormatter={(label) => `Date: ${formatDate(label)}`}
              />
              <Legend />
              <Area
                yAxisId="spend"
                type="monotone"
                dataKey="googleSpend"
                stackId="1"
                stroke={COLORS.google}
                fill={COLORS.google}
                fillOpacity={0.6}
                name="Google Spend"
              />
              <Area
                yAxisId="spend"
                type="monotone"
                dataKey="metaSpend"
                stackId="1"
                stroke={COLORS.meta}
                fill={COLORS.meta}
                fillOpacity={0.6}
                name="Meta Spend"
              />
              <Line
                yAxisId="conversions"
                type="monotone"
                dataKey="conversions"
                stroke={COLORS.conversions}
                strokeWidth={3}
                dot={{ fill: COLORS.conversions, strokeWidth: 2, r: 4 }}
                name="Conversions"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Platform Comparison and Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Spend Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Platform Spend Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={data.platformComparison}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="spend"
                  label={({ platform, percentage }) => `${platform}: ${percentage.toFixed(1)}%`}
                >
                  {data.platformComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-4">
              {data.platformComparison.map((item, index) => (
                <div key={item.platform} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: pieColors[index] }}
                  ></div>
                  <span className="text-sm font-medium">{item.platform}</span>
                  <span className="text-sm text-gray-500">{formatCurrency(item.spend)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversion Funnel by Platform</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.conversionFunnel} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={formatNumber} />
                <YAxis type="category" dataKey="platform" width={80} />
                <Tooltip formatter={(value: number) => formatNumber(value)} />
                <Legend />
                <Bar dataKey="impressions" fill="#E5E7EB" name="Impressions" />
                <Bar dataKey="clicks" fill="#9CA3AF" name="Clicks" />
                <Bar dataKey="conversions" fill="#059669" name="Conversions" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {data.conversionFunnel.map(item => (
                <div key={item.platform} className="flex justify-between items-center text-sm">
                  <span className="font-medium">{item.platform} CVR:</span>
                  <Badge variant="outline">
                    {item.conversionRate.toFixed(2)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CAC Trend and ROAS Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CAC Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Acquisition Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.cacTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={formatCurrency}
                  fontSize={12}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Week of ${formatDate(label)}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="googleCac"
                  stroke={COLORS.google}
                  strokeWidth={2}
                  dot={{ fill: COLORS.google, strokeWidth: 2, r: 4 }}
                  name="Google CAC"
                />
                <Line
                  type="monotone"
                  dataKey="metaCac"
                  stroke={COLORS.meta}
                  strokeWidth={2}
                  dot={{ fill: COLORS.meta, strokeWidth: 2, r: 4 }}
                  name="Meta CAC"
                />
                <Line
                  type="monotone"
                  dataKey="blendedCac"
                  stroke={COLORS.total}
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ fill: COLORS.total, strokeWidth: 2, r: 5 }}
                  name="Blended CAC"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ROAS by Platform */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Return on Ad Spend (ROAS)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.roasByPlatform}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis tickFormatter={(value) => `${value}x`} />
                <Tooltip 
                  formatter={(value: number, name: string) => {
                    if (name === 'roas') return [`${value.toFixed(1)}x`, 'ROAS'];
                    return [formatCurrency(value), name];
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="roas" 
                  fill={COLORS.total}
                  name="ROAS"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-3">
              {data.roasByPlatform.map(item => (
                <div key={item.platform} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{item.platform}</span>
                    <Badge variant={item.roas >= 2.5 ? 'default' : item.roas >= 2.0 ? 'secondary' : 'destructive'}>
                      {item.roas.toFixed(1)}x ROAS
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Spend: {formatCurrency(item.spend)}</span>
                    <span>Revenue: {formatCurrency(item.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Platform Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.platformComparison.map(platform => (
              <div key={platform.platform} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ 
                      backgroundColor: platform.platform === 'Google Ads' ? COLORS.google : COLORS.meta 
                    }}
                  ></div>
                  <span className="font-semibold">{platform.platform}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total Spend:</span>
                    <span className="font-medium">{formatCurrency(platform.spend)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Conversions:</span>
                    <span className="font-medium">{platform.conversions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Share:</span>
                    <span className="font-medium">{platform.percentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">CAC:</span>
                    <span className="font-medium">
                      {platform.conversions > 0 ? formatCurrency(platform.spend / platform.conversions) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingCharts;