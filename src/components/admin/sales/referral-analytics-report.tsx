'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Users, Database, RefreshCw, Download } from 'lucide-react';

interface ReferralAnalyticsData {
  analysisType: 'daily' | 'weekly' | 'monthly';
  data: any[];
  summary: {
    totalCustomers: number;
    sourceBreakdown: Record<string, { count: number; percentage: number }>;
    monthlyTrends?: Record<string, { total: number; sources: Record<string, number> }>;
    weeklyTrends?: Record<string, { total: number; sources: Record<string, number> }>;
    dataSourceBreakdown: Record<string, number>;
    monthsAnalyzed?: number;
    weeksAnalyzed?: number;
  };
}

const COLORS = {
  Google: '#4285F4',
  Facebook: '#4267B2',
  Instagram: '#E4405F',
  TikTok: '#000000',
  Friends: '#28A745',
  'Mall Advertisement': '#FF6B6B',
  YouTube: '#FF0000',
  ClassPass: '#9B59B6',
  Gowabi: '#FFB347',
  'Hotel/Tourism': '#17A2B8',
  LINE: '#00C300',
  Unknown: '#6C757D',
  Other: '#FFC107'
};

export default function ReferralAnalyticsReport() {
  const [data, setData] = useState<ReferralAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/sales/referral-analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: '2024-01-01',
          endDate: '2025-12-31',
          analysisType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch referral analytics');
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [analysisType]);

  const formatSourceBreakdownForChart = (sourceBreakdown: Record<string, { count: number; percentage: number }>) => {
    const sortedSources = Object.entries(sourceBreakdown)
      .filter(([source]) => source !== 'Unknown') // Exclude Unknown from charts
      .sort(([,a], [,b]) => b.count - a.count);
    
    const top5 = sortedSources.slice(0, 5);
    const others = sortedSources.slice(5);
    
    const chartData = top5.map(([source, data]) => ({
      source,
      count: data.count,
      percentage: data.percentage,
      fill: COLORS[source as keyof typeof COLORS] || '#6C757D'
    }));
    
    // Add "Others" category if there are more than 5 sources
    if (others.length > 0) {
      const othersCount = others.reduce((sum, [, data]) => sum + data.count, 0);
      const othersPercentage = others.reduce((sum, [, data]) => sum + data.percentage, 0);
      
      chartData.push({
        source: 'Others',
        count: othersCount,
        percentage: othersPercentage,
        fill: COLORS.Other
      });
    }
    
    return chartData;
  };

  const formatMonthlyTrendsForChart = (monthlyTrends: Record<string, { total: number; sources: Record<string, number> }>) => {
    return Object.entries(monthlyTrends)
      .map(([month, data]) => ({
        month,
        total: data.total,
        ...data.sources
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const formatWeeklyTrendsForChart = (weeklyTrends: Record<string, { total: number; sources: Record<string, number> }>) => {
    return Object.entries(weeklyTrends)
      .map(([week, data]) => {
        // Extract week number for display - format: "2025-01-06 - 2025-01-12"
        const weekStart = week.split(' - ')[0];
        const weekNumber = getWeekNumber(new Date(weekStart));
        return {
          week: `W${weekNumber}`,
          fullWeek: week,
          total: data.total,
          ...data.sources
        };
      })
      .sort((a, b) => a.fullWeek.localeCompare(b.fullWeek));
  };

  // Helper function to get week number
  const getWeekNumber = (date: Date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Referral Analytics Report</h2>
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-700">
              <span className="font-semibold">Error:</span>
              <span>{error}</span>
            </div>
            <Button onClick={fetchData} className="mt-4" variant="outline">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const sourceChartData = formatSourceBreakdownForChart(data.summary.sourceBreakdown);
  const monthlyChartData = data.summary.monthlyTrends ? formatMonthlyTrendsForChart(data.summary.monthlyTrends) : [];
  const weeklyChartData = data.summary.weeklyTrends ? formatWeeklyTrendsForChart(data.summary.weeklyTrends) : [];
  const topSources = Object.entries(data.summary.sourceBreakdown)
    .filter(([source]) => source !== 'Unknown') // Exclude Unknown from top sources
    .sort(([,a], [,b]) => b.count - a.count)
    .slice(0, 5);

  // Calculate growing channel based on trends (monthly or weekly)
  const growingChannel = (() => {
    const trends = analysisType === 'monthly' ? data.summary.monthlyTrends : data.summary.weeklyTrends;
    if (!trends) return null;
    
    const periods = Object.keys(trends).sort();
    if (periods.length < 2) return null;
    
    const lastPeriod = periods[periods.length - 1];
    const previousPeriod = periods[periods.length - 2];
    
    const lastPeriodData = trends[lastPeriod];
    const previousPeriodData = trends[previousPeriod];
    
    // Calculate growth for each source
    const growthData = Object.keys(lastPeriodData.sources)
      .map(source => {
        const currentCount = lastPeriodData.sources[source] || 0;
        const previousCount = previousPeriodData.sources[source] || 0;
        const growth = previousCount > 0 ? ((currentCount - previousCount) / previousCount) * 100 : 0;
        
        return {
          source,
          growth,
          currentCount,
          previousCount,
          growthValue: currentCount - previousCount
        };
      })
      .filter(item => item.currentCount > 0) // Only include sources with current activity
      .sort((a, b) => b.growthValue - a.growthValue); // Sort by absolute growth value
    
    return growthData[0] || null;
  })();

  // Export function for CSV
  const exportToCSV = () => {
    const csvData = analysisType === 'monthly' && data.summary.monthlyTrends
      ? Object.entries(data.summary.monthlyTrends).map(([month, monthData]) => ({
          Month: month,
          'Total Customers': monthData.total,
          ...Object.entries(monthData.sources).reduce((acc, [source, count]) => {
            acc[source] = count;
            return acc;
          }, {} as Record<string, number>)
        }))
      : analysisType === 'weekly' && data.summary.weeklyTrends
      ? Object.entries(data.summary.weeklyTrends).map(([week, weekData]) => ({
          Week: week,
          'Total Customers': weekData.total,
          ...Object.entries(weekData.sources).reduce((acc, [source, count]) => {
            acc[source] = count;
            return acc;
          }, {} as Record<string, number>)
        }))
      : topSources.map(([source, sourceData]) => ({
          Source: source,
          Count: sourceData.count,
          Percentage: `${sourceData.percentage.toFixed(1)}%`
        }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `referral-analytics-${analysisType}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Referral Analytics Report</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant={analysisType === 'monthly' ? 'default' : 'outline'}
            onClick={() => setAnalysisType('monthly')}
            size="sm"
          >
            Monthly
          </Button>
          <Button
            variant={analysisType === 'weekly' ? 'default' : 'outline'}
            onClick={() => setAnalysisType('weekly')}
            size="sm"
          >
            Weekly
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analysisType === 'weekly' 
                ? `Total across ${data.summary.weeksAnalyzed || 0} weeks`
                : 'Combined from all sources'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Channel</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topSources[0]?.[0] || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              {topSources[0] ? `${topSources[0][1].count} customers (${topSources[0][1].percentage.toFixed(1)}%)` : 'No data'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growing Channel</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {growingChannel ? growingChannel.source : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              {growingChannel ? (
                growingChannel.growthValue > 0 ? 
                  `+${growingChannel.growthValue} customers this ${analysisType === 'monthly' ? 'month' : 'week'}` : 
                  `${growingChannel.growthValue} customers this ${analysisType === 'monthly' ? 'month' : 'week'}`
              ) : 'No growth data available'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Declining Channel</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const trends = analysisType === 'monthly' ? data.summary.monthlyTrends : data.summary.weeklyTrends;
                if (!trends) return 'N/A';
                
                const periods = Object.keys(trends).sort();
                if (periods.length < 3) return 'N/A'; // Need at least 3 periods for trend analysis
                
                // Look at last 3 periods for trend analysis
                const recent = trends[periods[periods.length - 1]];
                const middle = trends[periods[periods.length - 2]];
                const older = trends[periods[periods.length - 3]];
                
                let worstDecline = null;
                let worstTrend = 999;
                
                // Calculate trend over 3 periods
                Object.keys(recent.sources).forEach(source => {
                  const recentCount = recent.sources[source] || 0;
                  const middleCount = middle.sources[source] || 0;
                  const olderCount = older.sources[source] || 0;
                  
                  // Calculate average decline over 3 periods
                  const trend1 = middleCount - olderCount;
                  const trend2 = recentCount - middleCount;
                  const avgTrend = (trend1 + trend2) / 2;
                  
                  // Only consider sources with meaningful volume
                  if (recentCount > 0 && avgTrend < worstTrend) {
                    worstTrend = avgTrend;
                    worstDecline = source;
                  }
                });
                
                return worstDecline || 'None';
              })()}
            </div>
            <p className="text-xs text-muted-foreground">
              {(() => {
                const trends = analysisType === 'monthly' ? data.summary.monthlyTrends : data.summary.weeklyTrends;
                if (!trends) return 'No trend data';
                
                const periods = Object.keys(trends).sort();
                if (periods.length < 3) return 'Need more periods';
                
                const recent = trends[periods[periods.length - 1]];
                const middle = trends[periods[periods.length - 2]];
                const older = trends[periods[periods.length - 3]];
                
                let worstTrend = 999;
                
                Object.keys(recent.sources).forEach(source => {
                  const recentCount = recent.sources[source] || 0;
                  const middleCount = middle.sources[source] || 0;
                  const olderCount = older.sources[source] || 0;
                  
                  const trend1 = middleCount - olderCount;
                  const trend2 = recentCount - middleCount;
                  const avgTrend = (trend1 + trend2) / 2;
                  
                  if (recentCount > 0 && avgTrend < worstTrend) {
                    worstTrend = avgTrend;
                  }
                });
                
                return worstTrend < 0 ? `${worstTrend.toFixed(1)} avg decline` : 'All channels stable';
              })()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Referral Source Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ source, percentage }) => `${source}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {sourceChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'Customers']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Breakdown Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Count by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="source" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80}
                  interval={0}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Trends Chart - Monthly or Weekly */}
      {(analysisType === 'monthly' && monthlyChartData.length > 0) || (analysisType === 'weekly' && weeklyChartData.length > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {analysisType === 'monthly' ? 'Monthly' : 'Weekly'} New Customer Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={analysisType === 'monthly' ? monthlyChartData : weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={analysisType === 'monthly' ? 'month' : 'week'}
                  angle={analysisType === 'weekly' ? -45 : 0}
                  textAnchor={analysisType === 'weekly' ? 'end' : 'middle'}
                  height={analysisType === 'weekly' ? 80 : 50}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => 
                    analysisType === 'weekly' 
                      ? weeklyChartData.find(d => d.week === value)?.fullWeek || value
                      : value
                  }
                />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} name="Total" />
                <Line type="monotone" dataKey="Google" stroke={COLORS.Google} strokeWidth={2} />
                <Line type="monotone" dataKey="Facebook" stroke={COLORS.Facebook} strokeWidth={2} />
                <Line type="monotone" dataKey="Instagram" stroke={COLORS.Instagram} strokeWidth={2} />
                <Line type="monotone" dataKey="Friends" stroke={COLORS.Friends} strokeWidth={2} />
                <Line type="monotone" dataKey="Mall Advertisement" stroke={COLORS['Mall Advertisement']} strokeWidth={2} />
                <Line type="monotone" dataKey="TikTok" stroke={COLORS.TikTok} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}


      {/* Raw Data Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {analysisType === 'monthly' && data.summary.monthlyTrends 
                ? 'Monthly Referral Breakdown'
                : analysisType === 'weekly' && data.summary.weeklyTrends
                ? 'Weekly Referral Breakdown'
                : 'Top Referral Sources'}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {(analysisType === 'weekly' && data.summary.weeklyTrends) || (analysisType === 'monthly' && data.summary.monthlyTrends) ? (
              // Horizontal layout table for both weekly and monthly (matching sales dashboard style)
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                        Referral Source
                      </th>
                      {Object.entries((analysisType === 'weekly' ? data.summary.weeklyTrends : data.summary.monthlyTrends) || {})
                        .sort(([a], [b]) => b.localeCompare(a)) // Most recent first
                        .map(([period, periodData]) => {
                          const displayLabel = analysisType === 'weekly' 
                            ? (() => {
                                const weekStart = period.split(' - ')[0];
                                const weekNumber = getWeekNumber(new Date(weekStart));
                                return `W${weekNumber}`;
                              })()
                            : period;
                          
                          return (
                            <th key={period} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              <div 
                                className="font-medium cursor-help" 
                                title={period}
                              >
                                {displayLabel}
                              </div>
                              <div className="text-xs text-gray-400 font-normal">
                                {periodData.total} total
                              </div>
                            </th>
                          );
                        })}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.keys(data.summary.sourceBreakdown)
                      .filter(source => source !== 'Unknown')
                      .sort((a, b) => data.summary.sourceBreakdown[b].count - data.summary.sourceBreakdown[a].count)
                      .slice(0, 6) // Show top 6 sources
                      .map((source, index) => (
                        <tr key={source} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-4 text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: COLORS[source as keyof typeof COLORS] || '#6C757D' }}
                              />
                              <span>{source}</span>
                            </div>
                          </td>
                          {Object.entries((analysisType === 'weekly' ? data.summary.weeklyTrends : data.summary.monthlyTrends) || {})
                            .sort(([a], [b]) => b.localeCompare(a))
                            .map(([period, periodData]) => (
                              <td key={period} className="px-4 py-4 text-sm text-center text-gray-900">
                                <div className="font-semibold">
                                  {periodData.sources[source] || 0}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {periodData.total > 0 
                                    ? `${(((periodData.sources[source] || 0) / periodData.total) * 100).toFixed(1)}%`
                                    : '0%'
                                  }
                                </div>
                              </td>
                            ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              // Regular top sources table
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Source</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Count</th>
                    <th className="border border-gray-300 px-4 py-2 text-right">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {topSources.map(([source, data]) => (
                    <tr key={source} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[source as keyof typeof COLORS] || '#6C757D' }}
                          />
                          <span>{source}</span>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right font-semibold">
                        {data.count.toLocaleString()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-right">
                        {data.percentage.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}