'use client';

import React, { useState, Suspense, useEffect } from 'react';
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
  BarChart3, 
  RefreshCw, 
  Calendar,
  Download,
  Settings,
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';

// Import our dashboard components
import KPICards from '@/components/sales-dashboard/KPICards';
import SimUtilizationChart from '@/components/sales-dashboard/SimUtilizationChart';
import RevenueTrendsChart from '@/components/sales-dashboard/RevenueTrendsChart';
import CategoryBreakdownChart from '@/components/sales-dashboard/CategoryBreakdownChart';
import PaymentMethodsChart from '@/components/sales-dashboard/PaymentMethodsChart';
import CustomerGrowthChart from '@/components/sales-dashboard/CustomerGrowthChart';
import FlexibleChart from '@/components/sales-dashboard/FlexibleChart';

// Import loading and error components
import { 
  DashboardLoading, 
  KPICardsLoading,
  LoadingSpinner 
} from '@/components/sales-dashboard/DashboardLoading';
import { 
  DashboardErrorBoundary,
  NetworkError,
  EmptyState 
} from '@/components/sales-dashboard/DashboardErrorBoundary';

// Import our data hook
import { useSalesDashboard } from '@/hooks/useSalesDashboard';

// Import types
import { DatePreset } from '@/types/sales-dashboard';
import { formatDisplayDate, getDateRangeForPreset } from '@/lib/dashboard-utils';

interface DashboardFilters {
  datePreset: DatePreset;
  comparisonPeriod: 'previousPeriod' | 'previousMonth' | 'previousYear';
}

// Client-side timestamp component to avoid hydration errors
const ClientTimestamp: React.FC = () => {
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    const updateTimestamp = () => {
      setTimestamp(new Date().toLocaleTimeString());
    };
    
    // Set initial timestamp
    updateTimestamp();
    
    // Update every second
    const interval = setInterval(updateTimestamp, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return <span suppressHydrationWarning>Last updated: {timestamp}</span>;
};

export default function SalesDashboardPage() {
  // Dashboard state
  const [filters, setFilters] = useState<DashboardFilters>({
    datePreset: 'last30days',
    comparisonPeriod: 'previousPeriod'
  });

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Map datePreset to valid preset values
  const getValidPreset = (preset: DatePreset): 'last7days' | 'last30days' | 'last3months' | 'monthToDate' | 'yearToDate' | 'custom' => {
    switch (preset) {
      case 'today':
      case 'yesterday':
        return 'custom';
      case 'last7days':
      case 'last30days':
      case 'last3months':
      case 'monthToDate':
      case 'yearToDate':
        return preset;
      default:
        return 'last30days';
    }
  };

  // Data fetching with our custom hook
  const { 
    summary, 
    charts, 
    isLoading, 
    isValidating,
    isError, 
    error, 
    mutate,
    refresh 
  } = useSalesDashboard({
    filters: {
      dateRange: {
        ...getDateRangeForPreset(filters.datePreset),
        preset: getValidPreset(filters.datePreset)
      },
      comparisonPeriod: filters.comparisonPeriod
    },
    refreshInterval: 0, // No auto-refresh
    enabled: true
  });

  // Handle filter changes
  const handleDatePresetChange = (preset: DatePreset) => {
    setFilters(prev => ({ ...prev, datePreset: preset }));
  };

  const handleComparisonChange = (comparison: 'previousPeriod' | 'previousMonth' | 'previousYear') => {
    setFilters(prev => ({ ...prev, comparisonPeriod: comparison }));
  };

  const handleRefresh = async () => {
    await refresh();
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

  const dateRange = getDateRangeForPreset(filters.datePreset);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            Sales Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              {formatDisplayDate(dateRange.start)} - {formatDisplayDate(dateRange.end)}
            </Badge>
            {isValidating && (
              <Badge variant="secondary" className="text-xs flex items-center gap-1">
                <LoadingSpinner size="sm" />
                Updating...
              </Badge>
            )}

          </div>
        </div>

        {/* Dashboard Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range Selector */}
          <Select value={filters.datePreset} onValueChange={handleDatePresetChange}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="last30days">Last 30 Days</SelectItem>
              <SelectItem value="last3months">Last 3 Months</SelectItem>
              <SelectItem value="monthToDate">Month to Date</SelectItem>
              <SelectItem value="yearToDate">Year to Date</SelectItem>
            </SelectContent>
          </Select>

          {/* Comparison Period */}
          <Select value={filters.comparisonPeriod} onValueChange={handleComparisonChange}>
            <SelectTrigger className="w-44">
              <BarChart3 className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previousPeriod">vs Previous Period</SelectItem>
              <SelectItem value="previousMonth">vs Previous Month</SelectItem>
              <SelectItem value="previousYear">vs Previous Year</SelectItem>
            </SelectContent>
          </Select>



          {/* Manual Refresh */}
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={isValidating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isValidating ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Boundary for the entire dashboard */}
      <DashboardErrorBoundary>
        {/* Main Dashboard Content */}
        {isError ? (
          <NetworkError 
            onRetry={handleRefresh}
            message={error?.error || "Failed to load dashboard data. Please try again."}
          />
        ) : (
          <div className="space-y-8">
            {/* KPI Cards Section */}
            <section>
              {!collapsedSections.has('kpis') && (
                <Suspense fallback={<KPICardsLoading />}>
                  {summary ? (
                    <KPICards 
                      data={summary} 
                      isLoading={isLoading}
                      comparisonType={filters.comparisonPeriod}
                      datePreset={filters.datePreset}
                    />
                  ) : isLoading ? (
                    <KPICardsLoading />
                  ) : (
                    <EmptyState 
                      title="No KPI Data"
                      message="Key performance indicators will appear here once data is available."
                    />
                  )}
                </Suspense>
              )}
            </section>

            {/* Charts Grid Section */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Performance Analytics</h2>
                <Button
                  onClick={() => toggleSection('charts')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500"
                >
                  {collapsedSections.has('charts') ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </Button>
              </div>

              {!collapsedSections.has('charts') && (
                <div className="space-y-8">
                  {/* Row 1: Revenue/Profit Trends (Full Width) */}
                  <DashboardErrorBoundary>
                    <RevenueTrendsChart 
                      data={charts?.revenue_trends || []}
                      isLoading={isLoading}
                      periodType="day"
                      simUtilizationData={charts?.sim_utilization || []}
                    />
                  </DashboardErrorBoundary>

                  {/* Row 2: Sim Utilization */}
                  <DashboardErrorBoundary>
                    <SimUtilizationChart 
                      data={charts?.sim_utilization || []}
                      isLoading={isLoading}
                      targetUtilization={45}
                    />
                  </DashboardErrorBoundary>

                  {/* Row 3: Category Breakdown */}
                  <DashboardErrorBoundary>
                    <CategoryBreakdownChart 
                      data={charts?.category_breakdown || []}
                      isLoading={isLoading}
                      showProfit={true}
                    />
                  </DashboardErrorBoundary>

                  {/* Row 4: Payment Methods */}
                  <DashboardErrorBoundary>
                    <PaymentMethodsChart 
                      data={charts?.payment_methods || []}
                      isLoading={isLoading}
                    />
                  </DashboardErrorBoundary>

                  {/* Row 5: Customer Growth */}
                  <DashboardErrorBoundary>
                    <CustomerGrowthChart 
                      data={charts?.customer_growth || []}
                      isLoading={isLoading}
                      showTotal={true}
                    />
                  </DashboardErrorBoundary>

                  {/* Row 6: Flexible Analytics */}
                  <DashboardErrorBoundary>
                    <FlexibleChart 
                      data={charts?.revenue_trends || []}
                      isLoading={isLoading}
                      title="Flexible Analytics"
                    />
                  </DashboardErrorBoundary>
                </div>
              )}
            </section>

            {/* Performance Info Footer */}
            <section className="mt-12">
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-4">
                      <span>Dashboard Performance:</span>
                      <Badge variant="outline" className="text-xs">
                        {isLoading ? 'Loading...' : 'Ready'}
                      </Badge>
                      {summary && (
                        <Badge variant="outline" className="text-xs">
                          Cache: Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <ClientTimestamp />
                      <span>•</span>
                      <span>Auto-refresh: Disabled</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </DashboardErrorBoundary>
    </div>
  );
} 