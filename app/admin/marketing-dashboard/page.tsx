'use client';

import React, { useState } from 'react';
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
  Download,
  BarChart3,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';

// Import our marketing dashboard components
import MarketingKPICards from '@/components/marketing-dashboard/MarketingKPICards';
import MarketingPerformanceTable from '@/components/marketing-dashboard/MarketingPerformanceTable';
import MarketingCharts from '@/components/marketing-dashboard/MarketingCharts';

// Import the marketing dashboard hook
import { useMarketingDashboard } from '@/hooks/useMarketingDashboard';

type DashboardTab = 'overview' | 'performance' | 'analytics';

export default function MarketingDashboardPage() {
  // Dashboard state
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [timeRange, setTimeRange] = useState<string>('30');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Use the marketing dashboard hook with caching
  const {
    data: { kpis: kpiData, performance: performanceData, charts: chartData },
    isLoading,
    isValidating: isRefreshing,
    isError,
    error,
    refresh
  } = useMarketingDashboard({
    timeRange,
    refreshInterval: 0, // No auto-refresh, manual only
    enabled: true
  });

  // Handle refresh
  const handleRefresh = () => {
    refresh();
  };

  // Handle export
  const handleExport = () => {
    if (!performanceData.length) return;

    const csvData = performanceData.map(row => ({
      Period: row.period,
      'Week Start': row.weekStart,
      'Week End': row.weekEnd,
      'Google Spend': row.googleSpend,
      'Meta Spend': row.metaSpend,
      'Total Spend': row.totalSpend,
      'Google Impressions': row.googleImpressions,
      'Meta Impressions': row.metaImpressions,
      'Total Impressions': row.totalImpressions,
      'Google Clicks': row.googleClicks,
      'Meta Clicks': row.metaClicks,
      'Total Clicks': row.totalClicks,
      'Google CTR': row.googleCtr,
      'Meta CTR': row.metaCtr,
      'Average CTR': row.averageCtr,
      'Google Conversions': row.googleConversions,
      'Meta Conversions': row.metaConversions,
      'Total Conversions': row.totalConversions,
      'CAC': row.cac,
      'ROAS': row.roas,
      'WoW Spend Change': row.weekOverWeekSpendChange,
      'WoW Conversions Change': row.weekOverWeekConversionsChange
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marketing-performance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  const getDateRangeText = () => {
    const days = parseInt(timeRange);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    // Use consistent date formatting to avoid hydration errors
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    };
    
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Target className="h-8 w-8 text-blue-600" />
            Marketing Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              {getDateRangeText()}
            </Badge>
            {isRefreshing && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Updating...
              </Badge>
            )}
            <Badge variant="outline" className="text-xs text-gray-500">
              Cached Data
            </Badge>
          </div>
        </div>

        {/* Dashboard Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="60">Last 60 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            variant="outline"
            size="sm"
            disabled={!performanceData.length}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>

          {/* Manual Refresh */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'performance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Performance Table
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Analytics & Charts
          </button>
        </nav>
      </div>

      {/* Main Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* KPI Cards Section */}
          <section>
            {kpiData ? (
              <MarketingKPICards 
                data={kpiData}
                isLoading={isLoading}
                dateRange={getDateRangeText()}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 w-4 bg-gray-200 rounded"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* Quick Performance Summary */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Quick Performance Summary</h2>
              <Button
                onClick={() => toggleSection('summary')}
                variant="ghost"
                size="sm"
                className="text-gray-500"
              >
                {collapsedSections.has('summary') ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            </div>

            {!collapsedSections.has('summary') && performanceData.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceData[0] && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Spend:</span>
                          <span className="font-semibold">฿{performanceData[0].totalSpend.toLocaleString('th-TH')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">New Customers:</span>
                          <span className="font-semibold">{performanceData[0].totalNewCustomers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">CAC:</span>
                          <span className="font-semibold">฿{performanceData[0].cac.toLocaleString('th-TH')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ROAS:</span>
                          <span className="font-semibold">{performanceData[0].roas.toFixed(1)}x</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Last Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceData[1] && (
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Spend:</span>
                          <span className="font-semibold">฿{performanceData[1].totalSpend.toLocaleString('th-TH')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">New Customers:</span>
                          <span className="font-semibold">{performanceData[1].totalNewCustomers}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">CAC:</span>
                          <span className="font-semibold">฿{performanceData[1].cac.toLocaleString('th-TH')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">ROAS:</span>
                          <span className="font-semibold">{performanceData[1].roas.toFixed(1)}x</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Period Average</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg Weekly Spend:</span>
                        <span className="font-semibold">
                          ฿{((performanceData.reduce((sum, week) => sum + week.totalSpend, 0) / performanceData.length)).toLocaleString('th-TH')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg New Customers:</span>
                        <span className="font-semibold">
                          {(performanceData.reduce((sum, week) => sum + week.totalNewCustomers, 0) / performanceData.length).toFixed(0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg CAC:</span>
                        <span className="font-semibold">
                          ฿{((performanceData.reduce((sum, week) => sum + week.cac, 0) / performanceData.length)).toLocaleString('th-TH')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Avg ROAS:</span>
                        <span className="font-semibold">
                          {(performanceData.reduce((sum, week) => sum + week.roas, 0) / performanceData.length).toFixed(1)}x
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'performance' && (
        <MarketingPerformanceTable 
          data={performanceData}
          isLoading={isLoading}
          onExport={handleExport}
        />
      )}

      {activeTab === 'analytics' && chartData && (
        <MarketingCharts 
          data={chartData}
          isLoading={isLoading}
        />
      )}

      {/* Performance Info Footer */}
      <section className="mt-12">
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Marketing Dashboard Status:</span>
                <Badge variant="outline" className="text-xs">
                  {isLoading ? 'Loading...' : 'Ready'}
                </Badge>
                {kpiData && (
                  <Badge variant="outline" className="text-xs">
                    Live Data
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span>Google Ads + Meta Ads Combined</span>
                <span>•</span>
                <span>Auto-refresh: Manual</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}