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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  TrendingUp, 
  RefreshCw, 
  Calendar,
  CalendarDays,
  Download,
  BarChart3,
  Target,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

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
  const [usePeriodType, setUsePeriodType] = useState<'rolling' | 'weekly'>('rolling');
  const [referenceDate, setReferenceDate] = useState<Date>(new Date());
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  
  // Use the marketing dashboard hook with caching
  const {
    data: { kpis: kpiData, performance: performanceData, monthlyPerformance: monthlyData, charts: chartData },
    isLoading,
    isValidating: isRefreshing,
    isError,
    error,
    refresh
  } = useMarketingDashboard({
    timeRange,
    usePeriodType,
    referenceDate: referenceDate.toISOString().split('T')[0],
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

    const csvData = performanceData.map(row => {
      const startDate = 'weekStart' in row ? row.weekStart : row.periodStart;
      const endDate = 'weekEnd' in row ? row.weekEnd : row.periodEnd;
      const spendChange = 'weekOverWeekSpendChange' in row ? row.weekOverWeekSpendChange : row.periodOverPeriodSpendChange;
      const newCustomersChange = 'weekOverWeekNewCustomersChange' in row ? row.weekOverWeekNewCustomersChange : row.periodOverPeriodNewCustomersChange;

      return {
        Period: row.period,
        'Start Date': startDate,
        'End Date': endDate,
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
        'Google New Customers': row.googleNewCustomers,
        'Meta New Customers': row.metaNewCustomers,
        'Total New Customers': row.totalNewCustomers,
        'CAC': row.cac,
        'ROAS': row.roas,
        'Spend Change': spendChange,
        'New Customers Change': newCustomersChange
      };
    });

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
    const endDate = referenceDate;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days + 1);
    
    // Use consistent date formatting to avoid hydration errors
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    };
    
    const periodType = usePeriodType === 'rolling' ? 'Rolling' : 'Weekly';
    return `${periodType} ${days} Days: ${formatDate(startDate)} - ${formatDate(endDate)}`;
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
          {/* Period Type Selector */}
          <Select value={usePeriodType} onValueChange={(value: 'rolling' | 'weekly') => setUsePeriodType(value)}>
            <SelectTrigger className="w-32">
              <BarChart3 className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rolling">Rolling</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
            </SelectContent>
          </Select>

          {/* Time Range Selector */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 Days</SelectItem>
              <SelectItem value="30">30 Days</SelectItem>
              <SelectItem value="60">60 Days</SelectItem>
              <SelectItem value="90">90 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Date Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-48 justify-start text-left font-normal",
                  !referenceDate && "text-muted-foreground"
                )}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                {referenceDate ? format(referenceDate, "PPP") : <span>Pick end date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={referenceDate}
                onSelect={(date) => date && setReferenceDate(date)}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>

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

            {!collapsedSections.has('summary') && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(() => {
                  // Helper functions to handle both data types (same as MarketingPerformanceTable)
                  const getStartDate = (item: any): string => {
                    return 'weekStart' in item ? item.weekStart : item.periodStart;
                  };
                  const getEndDate = (item: any): string => {
                    return 'weekEnd' in item ? item.weekEnd : item.periodEnd;
                  };

                  // Sort data by period (most recent first) - same logic as MarketingPerformanceTable
                  const sortedData = performanceData && performanceData.length > 0 
                    ? [...performanceData].sort((a, b) => new Date(getEndDate(b)).getTime() - new Date(getEndDate(a)).getTime())
                    : [];
                  
                  const currentPeriod = sortedData[0];
                  const previousPeriod = sortedData[1];

                  return (
                    <>
                      {/* Current Period Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            {parseInt(timeRange) > 7 ? 'Current Period' : (usePeriodType === 'rolling' ? 'Current Period' : 'This Week')}
                          </CardTitle>
                          <p className="text-xs text-gray-500">
                            {parseInt(timeRange) > 7 
                              ? `Rolling ${timeRange} Days` 
                              : currentPeriod && 'weekStart' in currentPeriod 
                                ? `${new Date(currentPeriod.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(currentPeriod.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                : currentPeriod && 'periodStart' in currentPeriod
                                  ? `${new Date(currentPeriod.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(currentPeriod.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                  : ''
                            }
                          </p>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            // Use KPI data for timeRange > 7 days (aggregated totals)
                            // Use performance data for timeRange <= 7 days (individual periods)
                            const useKpiData = parseInt(timeRange) > 7 && kpiData;
                            const data = useKpiData ? kpiData : currentPeriod;
                            
                            if (!data) return null;
                            
                            return (
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">Total Spend:</span>
                                  <span className="font-semibold">
                                    ฿{useKpiData 
                                      ? Math.round(data.totalSpend).toLocaleString('th-TH') 
                                      : Math.round(data.totalSpend).toLocaleString('th-TH')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">New Customers:</span>
                                  <span className="font-semibold">
                                    {useKpiData ? data.totalNewCustomers : data.totalNewCustomers}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">CAC:</span>
                                  <span className="font-semibold">
                                    ฿{useKpiData 
                                      ? Math.round(data.cac).toLocaleString('th-TH') 
                                      : Math.round(data.cac).toLocaleString('th-TH')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm text-gray-600">ROAS:</span>
                                  <span className="font-semibold">
                                    {useKpiData ? data.roas.toFixed(1) : data.roas.toFixed(1)}x
                                  </span>
                                </div>
                              </div>
                            );
                          })()}
                        </CardContent>
                      </Card>

                      {/* Previous Period Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Previous Period</CardTitle>
                          <p className="text-xs text-gray-500">
                            {parseInt(timeRange) > 7 
                              ? `Previous ${timeRange} Days` 
                              : previousPeriod && 'weekStart' in previousPeriod 
                                ? `${new Date(previousPeriod.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(previousPeriod.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                : previousPeriod && 'periodStart' in previousPeriod
                                  ? `${new Date(previousPeriod.periodStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(previousPeriod.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                                  : ''
                            }
                          </p>
                        </CardHeader>
                        <CardContent>
                          {(() => {
                            // For > 7 days, calculate previous period values from current values and change percentages
                            // For <= 7 days, use performance data directly
                            const useKpiData = parseInt(timeRange) > 7 && kpiData;
                            
                            if (useKpiData) {
                              // Calculate previous period values from current values and percentage changes
                              const calculatePreviousValue = (current: number, changePercent: number) => {
                                if (changePercent === 0) return current;
                                return current / (1 + changePercent / 100);
                              };
                              
                              const prevSpend = calculatePreviousValue(kpiData.totalSpend, kpiData.totalSpendChange);
                              const prevCustomers = calculatePreviousValue(kpiData.totalNewCustomers, kpiData.totalNewCustomersChange);
                              const prevCac = calculatePreviousValue(kpiData.cac, kpiData.cacChange);
                              const prevRoas = calculatePreviousValue(kpiData.roas, kpiData.roasChange);
                              
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Spend:</span>
                                    <span className="font-semibold">฿{Math.round(prevSpend).toLocaleString('th-TH')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">New Customers:</span>
                                    <span className="font-semibold">{Math.round(prevCustomers)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">CAC:</span>
                                    <span className="font-semibold">฿{Math.round(prevCac).toLocaleString('th-TH')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">ROAS:</span>
                                    <span className="font-semibold">{prevRoas.toFixed(1)}x</span>
                                  </div>
                                </div>
                              );
                            } else if (previousPeriod) {
                              // Use performance data for 7-day periods
                              return (
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Total Spend:</span>
                                    <span className="font-semibold">฿{Math.round(previousPeriod.totalSpend).toLocaleString('th-TH')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">New Customers:</span>
                                    <span className="font-semibold">{previousPeriod.totalNewCustomers}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">CAC:</span>
                                    <span className="font-semibold">฿{Math.round(previousPeriod.cac).toLocaleString('th-TH')}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">ROAS:</span>
                                    <span className="font-semibold">{previousPeriod.roas.toFixed(1)}x</span>
                                  </div>
                                </div>
                              );
                            } else {
                              // No previous period data available
                              return (
                                <div className="space-y-2">
                                  <div className="text-sm text-gray-500 text-center">
                                    Previous period data not available
                                  </div>
                                  <div className="text-xs text-gray-400 text-center">
                                    Try refreshing or check data source
                                  </div>
                                </div>
                              );
                            }
                          })()}
                        </CardContent>
                      </Card>

                      {/* Period Average Card */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Period Average</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">{usePeriodType === 'rolling' ? 'Avg Period Spend:' : 'Avg Weekly Spend:'}</span>
                              <span className="font-semibold">
                                ฿{sortedData.length > 0 ? ((sortedData.reduce((sum, week) => sum + week.totalSpend, 0) / sortedData.length)).toLocaleString('th-TH') : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Avg New Customers:</span>
                              <span className="font-semibold">
                                {sortedData.length > 0 ? (sortedData.reduce((sum, week) => sum + week.totalNewCustomers, 0) / sortedData.length).toFixed(0) : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Avg CAC:</span>
                              <span className="font-semibold">
                                ฿{sortedData.length > 0 ? Math.round((sortedData.reduce((sum, week) => sum + week.cac, 0) / sortedData.length)).toLocaleString('th-TH') : '0'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Avg ROAS:</span>
                              <span className="font-semibold">
                                {sortedData.length > 0 ? (sortedData.reduce((sum, week) => sum + week.roas, 0) / sortedData.length).toFixed(1) : '0.0'}x
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  );
                })()}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'performance' && (
        <MarketingPerformanceTable 
          data={performanceData}
          monthlyData={monthlyData}
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