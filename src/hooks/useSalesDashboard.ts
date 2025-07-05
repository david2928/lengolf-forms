// Sales Dashboard Data Hook
// SWR-based hook for consolidated dashboard data fetching with intelligent caching

'use client';

import useSWR from 'swr';
import { useCallback, useMemo } from 'react';
import { 
  DashboardSummary, 
  DashboardCharts, 
  DashboardSummaryResponse,
  DashboardChartsResponse,
  DashboardError,
  UseSalesDashboardOptions,
  UseSalesDashboardReturn,
  DashboardFilters 
} from '@/types/sales-dashboard';
import { 
  formatApiDate, 
  getDateRangeForPreset, 
  getComparisonDateRange,
  getDefaultFilters 
} from '@/lib/dashboard-utils';

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const FAST_REFRESH_INTERVAL = 30 * 1000; // 30 seconds for real-time mode

// =============================================================================
// FETCHER FUNCTIONS
// =============================================================================

/**
 * Fetcher for dashboard summary data
 */
const fetchDashboardSummary = async (url: string): Promise<DashboardSummary> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      error: errorData.error || 'Failed to fetch dashboard summary',
      code: errorData.code || response.status.toString(),
      details: errorData.details,
      timestamp: new Date().toISOString()
    } as DashboardError;
  }

  const data: DashboardSummaryResponse = await response.json();
  return data.data;
};

/**
 * Fetcher for dashboard charts data
 */
const fetchDashboardCharts = async (url: string): Promise<DashboardCharts> => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw {
      error: errorData.error || 'Failed to fetch dashboard charts',
      code: errorData.code || response.status.toString(),
      details: errorData.details,
      timestamp: new Date().toISOString()
    } as DashboardError;
  }

  const data: DashboardChartsResponse = await response.json();
  return data.data;
};

// =============================================================================
// URL BUILDERS
// =============================================================================

/**
 * Build URL for dashboard summary API
 */
const buildSummaryUrl = (filters: DashboardFilters): string => {
  const { dateRange, comparisonPeriod } = filters;
  const { start: comparisonStart, end: comparisonEnd } = getComparisonDateRange(
    dateRange.start,
    dateRange.end,
    comparisonPeriod
  );

  const params = new URLSearchParams({
    start_date: formatApiDate(dateRange.start),
    end_date: formatApiDate(dateRange.end),
    comparison_period: comparisonPeriod,
    comparison_start_date: formatApiDate(comparisonStart),
    comparison_end_date: formatApiDate(comparisonEnd)
  });

  return `/api/dashboard/summary?${params.toString()}`;
};

/**
 * Build URL for dashboard charts API
 */
const buildChartsUrl = (filters: DashboardFilters): string => {
  const params = new URLSearchParams({
    start_date: formatApiDate(filters.dateRange.start),
    end_date: formatApiDate(filters.dateRange.end)
  });

  // Add optional filters
  if (filters.categoryFilter) {
    params.append('category_filter', filters.categoryFilter);
  }
  if (filters.paymentFilter) {
    params.append('payment_filter', filters.paymentFilter);
  }

  return `/api/dashboard/charts?${params.toString()}`;
};

// =============================================================================
// MAIN HOOK
// =============================================================================

/**
 * Main hook for sales dashboard data management
 * Provides consolidated data fetching with intelligent caching and error handling
 */
export const useSalesDashboard = (options: UseSalesDashboardOptions = {}): UseSalesDashboardReturn => {
  const {
    filters = getDefaultFilters(),
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    enabled = true
  } = options;

  // Build API URLs
  const summaryUrl = useMemo(() => buildSummaryUrl(filters), [filters]);
  const chartsUrl = useMemo(() => buildChartsUrl(filters), [filters]);

  // SWR configuration
  const swrConfig = useMemo(() => ({
    refreshInterval,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // 30 seconds deduplication
    errorRetryCount: 3,
    errorRetryInterval: 5000,
    shouldRetryOnError: (error: DashboardError) => {
      // Don't retry on client errors (4xx)
      return !error.code?.startsWith('4');
    }
  }), [refreshInterval]);

  // Fetch dashboard summary
  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
    isValidating: summaryValidating,
    mutate: mutateSummary
  } = useSWR<DashboardSummary, DashboardError>(
    enabled ? summaryUrl : null,
    fetchDashboardSummary,
    swrConfig
  );

  // Fetch dashboard charts
  const {
    data: charts,
    error: chartsError,
    isLoading: chartsLoading,
    isValidating: chartsValidating,
    mutate: mutateCharts
  } = useSWR<DashboardCharts, DashboardError>(
    enabled ? chartsUrl : null,
    fetchDashboardCharts,
    swrConfig
  );

  // Combined loading state
  const isLoading = summaryLoading || chartsLoading;
  const isValidating = summaryValidating || chartsValidating;

  // Combined error state
  const error = summaryError || chartsError || null;
  const isError = !!error;

  // Refresh function
  const refresh = useCallback(async () => {
    const promises = [];
    
    if (summary !== undefined) {
      promises.push(mutateSummary());
    }
    
    if (charts !== undefined) {
      promises.push(mutateCharts());
    }

    await Promise.all(promises);
  }, [summary, charts, mutateSummary, mutateCharts]);

  // Mutate function (for manual cache updates)
  const mutate = useCallback(() => {
    mutateSummary();
    mutateCharts();
  }, [mutateSummary, mutateCharts]);

  return {
    summary: summary || null,
    charts: charts || null,
    isLoading,
    isValidating,
    isError,
    error,
    mutate,
    refresh
  };
};

// =============================================================================
// SPECIALIZED HOOKS
// =============================================================================

/**
 * Hook for real-time dashboard updates (faster refresh rate)
 */
export const useSalesDashboardRealtime = (
  options: Omit<UseSalesDashboardOptions, 'refreshInterval'> = {}
): UseSalesDashboardReturn => {
  return useSalesDashboard({
    ...options,
    refreshInterval: FAST_REFRESH_INTERVAL
  });
};

/**
 * Hook for dashboard data with custom date range
 */
export const useSalesDashboardWithDateRange = (
  startDate: Date,
  endDate: Date,
  comparisonPeriod: 'previousPeriod' | 'previousMonth' | 'previousYear' = 'previousPeriod',
  options: Omit<UseSalesDashboardOptions, 'filters'> = {}
): UseSalesDashboardReturn => {
  const filters: DashboardFilters = useMemo(() => ({
    dateRange: {
      start: startDate,
      end: endDate,
      preset: 'custom'
    },
    comparisonPeriod
  }), [startDate, endDate, comparisonPeriod]);

  return useSalesDashboard({
    ...options,
    filters
  });
};

/**
 * Hook for dashboard data with preset date range
 */
export const useSalesDashboardWithPreset = (
  preset: 'last7days' | 'last30days' | 'last3months' | 'monthToDate' | 'yearToDate',
  options: Omit<UseSalesDashboardOptions, 'filters'> = {}
): UseSalesDashboardReturn => {
  const filters: DashboardFilters = useMemo(() => {
    const { start, end } = getDateRangeForPreset(preset);
    return {
      dateRange: { start, end, preset },
      comparisonPeriod: 'previousPeriod'
    };
  }, [preset]);

  return useSalesDashboard({
    ...options,
    filters
  });
};

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Hook to check if dashboard data is cached
 */
export const useDashboardCacheStatus = (filters: DashboardFilters) => {
  const summaryUrl = useMemo(() => buildSummaryUrl(filters), [filters]);
  const chartsUrl = useMemo(() => buildChartsUrl(filters), [filters]);

  return {
    summaryCached: !!summaryUrl && typeof window !== 'undefined',
    chartsCached: !!chartsUrl && typeof window !== 'undefined'
  };
};

/**
 * Hook for dashboard performance metrics
 */
export const useDashboardPerformance = () => {
  return useMemo(() => {
    if (typeof window === 'undefined') return null;

    const getPerformanceEntry = (name: string) => {
      const entries = performance.getEntriesByName(name, 'measure');
      return entries.length > 0 ? Math.round(entries[entries.length - 1].duration) : null;
    };

    return {
      summaryFetchTime: getPerformanceEntry('dashboard-summary-fetch'),
      chartsFetchTime: getPerformanceEntry('dashboard-charts-fetch'),
      totalRenderTime: getPerformanceEntry('dashboard-render')
    };
  }, []);
};

// =============================================================================
// EXPORTS
// =============================================================================

export default useSalesDashboard; 