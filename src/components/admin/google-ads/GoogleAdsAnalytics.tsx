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
  Calendar,
  Search,
  DollarSign,
  MousePointer,
  Eye,
  Target,
  BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, ComposedChart, Area, AreaChart } from 'recharts';

interface GoogleAdsData {
  type: 'date_analytics' | 'campaign_analytics' | 'keyword_analytics';
  period: { startDate: string; endDate: string };
  data: any[];
  summary?: {
    total_impressions: number;
    total_clicks: number;
    total_cost: number;
    total_conversions: number;
    total_conversion_value: number;
  };
}

interface GoogleAdsAnalyticsProps {
  className?: string;
}

export default function GoogleAdsAnalytics({ className }: GoogleAdsAnalyticsProps) {
  const [analyticsData, setAnalyticsData] = useState<GoogleAdsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'date' | 'campaign' | 'keyword'>('date');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [lastSync, setLastSync] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy
      });
      
      const response = await fetch(`/api/google-ads/analytics?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const syncGoogleAdsData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/google-ads/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          syncType: 'all',
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to sync Google Ads data');
      }
      
      const result = await response.json();
      setLastSync(new Date().toLocaleString());
      
      // Refresh analytics after sync
      await fetchAnalytics();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [groupBy, dateRange]);

  const getCampaignTypeDistribution = () => {
    if (!analyticsData?.data || analyticsData.type !== 'campaign_analytics') return [];
    
    const typeMap = new Map();
    analyticsData.data.forEach(campaign => {
      const type = campaign.campaign_type || 'Unknown';
      if (!typeMap.has(type)) {
        typeMap.set(type, 0);
      }
      typeMap.set(type, typeMap.get(type) + (campaign.cost_thb || 0));
    });
    
    return Array.from(typeMap.entries()).map(([name, value]) => ({ name, value }));
  };

  const getKeywordMatchTypeDistribution = () => {
    if (!analyticsData?.data || analyticsData.type !== 'keyword_analytics') return [];
    
    const matchTypeMap = new Map();
    analyticsData.data.forEach(keyword => {
      const matchType = keyword.keyword_match_type || 'Unknown';
      if (!matchTypeMap.has(matchType)) {
        matchTypeMap.set(matchType, 0);
      }
      matchTypeMap.set(matchType, matchTypeMap.get(matchType) + (keyword.total_cost_thb || 0));
    });
    
    return Array.from(matchTypeMap.entries()).map(([name, value]) => ({ name, value }));
  };

  const renderKPICards = () => {
    if (!analyticsData?.summary) return null;

    const { summary } = analyticsData;
    const avgCPC = summary.total_clicks > 0 ? summary.total_cost / summary.total_clicks : 0;
    const ctr = summary.total_impressions > 0 ? (summary.total_clicks / summary.total_impressions) * 100 : 0;
    const roas = summary.total_cost > 0 ? summary.total_conversion_value / summary.total_cost : 0;
    const conversionRate = summary.total_clicks > 0 ? (summary.total_conversions / summary.total_clicks) * 100 : 0;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Spend</p>
                <p className="text-2xl font-bold">฿{summary.total_cost.toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clicks</p>
                <p className="text-2xl font-bold">{summary.total_clicks.toLocaleString()}</p>
                <p className="text-xs text-gray-500">CTR: {ctr.toFixed(2)}%</p>
              </div>
              <MousePointer className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Impressions</p>
                <p className="text-2xl font-bold">{summary.total_impressions.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Avg CPC: ฿{avgCPC.toFixed(2)}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Conversions</p>
                <p className="text-2xl font-bold">{summary.total_conversions.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Rate: {conversionRate.toFixed(2)}%</p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderChart = () => {
    if (!analyticsData?.data || analyticsData.data.length === 0) return null;

    const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

    if (groupBy === 'date') {
      return (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Performance Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <ComposedChart data={analyticsData.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'Cost (฿)') return [`฿${parseFloat(String(value)).toFixed(2)}`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="cost_thb" fill="#8884d8" fillOpacity={0.3} stroke="#8884d8" name="Cost (฿)" />
                <Line yAxisId="right" type="monotone" dataKey="clicks" stroke="#82ca9d" strokeWidth={3} name="Clicks" />
                <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#ffc658" strokeWidth={2} name="Conversions" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      );
    }

    if (groupBy === 'campaign') {
      return (
        <div className="space-y-6 mb-6">
          {/* Campaign Performance Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Performance Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={analyticsData.data.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="campaign_name" 
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'Cost (฿)') return [`฿${parseFloat(String(value)).toFixed(2)}`, name];
                      if (name === 'Avg CPC (฿)') return [`฿${parseFloat(String(value)).toFixed(2)}`, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="cost_thb" fill="#8884d8" name="Cost (฿)" />
                  <Bar yAxisId="right" dataKey="clicks" fill="#82ca9d" name="Clicks" />
                  <Bar yAxisId="right" dataKey="conversions" fill="#ffc658" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Campaign Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={getCampaignTypeDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ฿${value.toFixed(0)} (${(percent * 100).toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getCampaignTypeDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`฿${parseFloat(String(value)).toFixed(2)}`, 'Total Cost']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Campaign Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Efficiency Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={analyticsData.data.slice(0, 8)} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="campaign_name" type="category" width={150} />
                  <Tooltip 
                    formatter={(value, name) => {
                      const nameStr = String(name);
                      if (nameStr.includes('CPC') || nameStr.includes('Cost')) return [`฿${parseFloat(String(value)).toFixed(2)}`, name];
                      if (nameStr.includes('%')) return [`${parseFloat(String(value)).toFixed(2)}%`, name];
                      return [parseFloat(String(value)).toFixed(2), name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="ctr" fill="#82ca9d" name="CTR (%)" />
                  <Bar dataKey="conversion_rate" fill="#ffc658" name="Conversion Rate (%)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Keyword charts
    return (
      <div className="space-y-6 mb-6">
        {/* Top Keywords Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Keywords</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={analyticsData.data.slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="keyword_text" 
                  angle={-45}
                  textAnchor="end"
                  height={120}
                />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'Total Cost (฿)') return [`฿${parseFloat(String(value)).toFixed(2)}`, name];
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="total_cost_thb" fill="#8884d8" name="Total Cost (฿)" />
                <Bar yAxisId="right" dataKey="total_clicks" fill="#82ca9d" name="Total Clicks" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Keyword Match Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Keyword Match Type Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={getKeywordMatchTypeDistribution()}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ฿${value.toFixed(0)} (${(percent * 100).toFixed(1)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {getKeywordMatchTypeDistribution().map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`฿${parseFloat(String(value)).toFixed(2)}`, 'Total Cost']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderTable = () => {
    if (!analyticsData?.data || analyticsData.data.length === 0) return null;

    const headers = groupBy === 'date' 
      ? ['Date', 'Impressions', 'Clicks', 'Cost', 'Conversions', 'CTR', 'CPC', 'ROAS']
      : groupBy === 'campaign'
      ? ['Campaign', 'Type', 'Status', 'Impressions', 'Clicks', 'Cost', 'Conversions', 'CTR', 'CPC']
      : ['Keyword', 'Match Type', 'Campaign', 'Impressions', 'Clicks', 'Cost', 'CTR', 'CPC'];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Detailed Performance Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {headers.map(header => (
                    <th key={header} className="text-left p-2">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analyticsData.data.slice(0, 20).map((row, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    {groupBy === 'date' && (
                      <>
                        <td className="p-2">{row.date}</td>
                        <td className="p-2">{row.impressions?.toLocaleString() || 0}</td>
                        <td className="p-2">{row.clicks?.toLocaleString() || 0}</td>
                        <td className="p-2">฿{row.cost_thb?.toFixed(2) || '0.00'}</td>
                        <td className="p-2">{row.conversions?.toFixed(1) || '0.0'}</td>
                        <td className="p-2">{row.ctr}%</td>
                        <td className="p-2">฿{row.avg_cpc}</td>
                        <td className="p-2">{row.roas}</td>
                      </>
                    )}
                    {groupBy === 'campaign' && (
                      <>
                        <td className="p-2">{row.campaign_name}</td>
                        <td className="p-2">
                          <Badge variant="outline">{row.campaign_type}</Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant={row.campaign_status === 'ENABLED' ? 'default' : 'secondary'}>
                            {row.campaign_status}
                          </Badge>
                        </td>
                        <td className="p-2">{row.impressions?.toLocaleString() || 0}</td>
                        <td className="p-2">{row.clicks?.toLocaleString() || 0}</td>
                        <td className="p-2">฿{row.cost_thb?.toFixed(2) || '0.00'}</td>
                        <td className="p-2">{row.conversions?.toFixed(1) || '0.0'}</td>
                        <td className="p-2">{row.ctr}%</td>
                        <td className="p-2">฿{row.avg_cpc}</td>
                      </>
                    )}
                    {groupBy === 'keyword' && (
                      <>
                        <td className="p-2">{row.keyword_text}</td>
                        <td className="p-2">
                          <Badge variant="outline">{row.keyword_match_type}</Badge>
                        </td>
                        <td className="p-2">{row.campaign_name}</td>
                        <td className="p-2">{row.total_impressions?.toLocaleString() || 0}</td>
                        <td className="p-2">{row.total_clicks?.toLocaleString() || 0}</td>
                        <td className="p-2">฿{row.total_cost_thb?.toFixed(2) || '0.00'}</td>
                        <td className="p-2">{(row.avg_ctr * 100)?.toFixed(2) || '0.00'}%</td>
                        <td className="p-2">฿{(row.avg_cpc_thb || row.avg_cpc || 0).toFixed(2)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Search className="h-7 w-7 text-blue-600" />
            Google Ads Analytics
          </h2>
          <p className="text-gray-600 mt-1">Campaign and keyword performance data</p>
          {lastSync && (
            <p className="text-sm text-gray-500 mt-1">Last sync: {lastSync}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="border rounded px-3 py-1 text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="border rounded px-3 py-1 text-sm"
            />
          </div>

          {/* Group By */}
          <Select value={groupBy} onValueChange={(value: 'date' | 'campaign' | 'keyword') => setGroupBy(value)}>
            <SelectTrigger className="w-40">
              <BarChart3 className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">By Date</SelectItem>
              <SelectItem value="campaign">By Campaign</SelectItem>
              <SelectItem value="keyword">By Keyword</SelectItem>
            </SelectContent>
          </Select>

          {/* Sync Button */}
          <Button
            onClick={syncGoogleAdsData}
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Data
          </Button>

          {/* Refresh Button */}
          <Button
            onClick={fetchAnalytics}
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
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
            <p className="text-gray-600">Loading Google Ads data...</p>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      {!isLoading && analyticsData && renderKPICards()}

      {/* Chart */}
      {!isLoading && analyticsData && renderChart()}

      {/* Data Table */}
      {!isLoading && analyticsData && renderTable()}

      {/* No Data State */}
      {!isLoading && !analyticsData?.data?.length && !error && (
        <Card>
          <CardContent className="p-8 text-center">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">No Google Ads data found for the selected period.</p>
            <p className="text-sm text-gray-500 mt-2">Try syncing data or selecting a different date range.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}