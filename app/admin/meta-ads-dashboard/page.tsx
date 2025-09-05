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
  ArrowLeft
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import Link from 'next/link';

// Import Meta Ads dashboard components
import MetaAdsKPICards from '@/components/meta-ads-dashboard/MetaAdsKPICards';
import MetaAdsPlatformBreakdown from '@/components/meta-ads-dashboard/MetaAdsPlatformBreakdown';
import MetaAdsPerformanceChart from '@/components/meta-ads-dashboard/MetaAdsPerformanceChart';
import MetaAdsCampaignComparison from '@/components/meta-ads-dashboard/MetaAdsCampaignComparison';
import MetaAdsCreativeGallery from '@/components/meta-ads-dashboard/MetaAdsCreativeGallery';
import MetaAdsCreativeCalendar from '@/components/meta-ads-dashboard/MetaAdsCreativeCalendar';
import MetaAdsBudgetOptimizer from '@/components/meta-ads-dashboard/MetaAdsBudgetOptimizer';
import MetaAdsPerformanceBreakdownTable from '@/components/meta-ads-dashboard/MetaAdsPerformanceBreakdownTable';

// Import the Meta Ads dashboard hook
import { useMetaAdsDashboard } from '@/hooks/useMetaAdsDashboard';

type DashboardTab = 'overview' | 'campaigns' | 'creatives' | 'calendar';

export default function MetaAdsDashboardPage() {
  // Dashboard state
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [timeRange, setTimeRange] = useState<string>('30');
  const [referenceDate, setReferenceDate] = useState<Date>(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  });
  
  // Use the Meta Ads dashboard hook
  const {
    data: { 
      kpis: kpiData,
      campaigns: campaignsData
    },
    isLoading,
    isValidating: isRefreshing,
    isError,
    error,
    refresh
  } = useMetaAdsDashboard({
    timeRange,
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
    console.log('Export functionality coming soon for tab:', activeTab);
  };

  const getDateRangeText = () => {
    const days = parseInt(timeRange);
    const endDate = referenceDate;
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - days + 1);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    };
    
    return `${days} Days: ${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-red-800 mb-2">
                Failed to load Meta Ads data
              </h2>
              <p className="text-red-600 mb-4">
                {error?.message || 'Unknown error occurred'}
              </p>
              <Button onClick={handleRefresh} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link 
              href="/admin/marketing-dashboard"
              className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Marketing
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📱</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Meta Ads Dashboard
              </span>
            </div>
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
            <Badge variant="outline" className="text-xs text-purple-600">
              Facebook + Instagram
            </Badge>
          </div>
        </div>

        {/* Dashboard Controls */}
        <div className="flex flex-wrap items-center gap-3">
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
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab('creatives')}
            className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'creatives'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Creative Performance
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-2 px-3 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Creative Calendar
          </button>
        </nav>
      </div>

      {/* Main Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">

          {/* KPI Cards Section */}
          <section>
            {kpiData ? (
              <MetaAdsKPICards 
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

          {/* Platform Breakdown Section */}
          <section>
            {kpiData ? (
              <MetaAdsPlatformBreakdown 
                data={kpiData}
                isLoading={isLoading}
              />
            ) : (
              <Card className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-48 mx-auto"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-full"></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-20 bg-gray-200 rounded"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Performance Chart Section */}
          <section>
            <MetaAdsPerformanceChart 
              timeRange={timeRange}
              referenceDate={referenceDate.toISOString().split('T')[0]}
              isLoading={isLoading}
            />
          </section>
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <div className="space-y-8">
          {/* Performance Breakdown Table */}
          <MetaAdsPerformanceBreakdownTable 
            timeRange={timeRange}
            referenceDate={referenceDate.toISOString().split('T')[0]}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Creative Performance Tab */}
      {activeTab === 'creatives' && (
        <div className="space-y-8">
          <MetaAdsCreativeGallery 
            timeRange={timeRange}
            referenceDate={referenceDate.toISOString().split('T')[0]}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Creative Calendar Tab */}
      {activeTab === 'calendar' && (
        <div className="space-y-8">
          <MetaAdsCreativeCalendar 
            timeRange={timeRange}
            referenceDate={referenceDate.toISOString().split('T')[0]}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Status Footer */}
      <section className="mt-12">
        <Card className="bg-gray-50 border-gray-200">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-4">
                <span>Meta Ads Dashboard Status:</span>
                <Badge variant="outline" className="text-xs">
                  {isLoading ? 'Loading...' : 'Ready'}
                </Badge>
                {kpiData && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                    Live Data
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span>Facebook + Instagram Combined</span>
                <span>•</span>
                <span>Platform Breakdown: ✅ Fixed</span>
                <span>•</span>
                <span>Data via Meta Marketing API</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}