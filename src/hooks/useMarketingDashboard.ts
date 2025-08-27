import { useState, useEffect, useCallback } from 'react';

interface MarketingKPIs {
  totalSpend: number;
  totalSpendChange: number;
  totalImpressions: number;
  totalImpressionsChange: number;
  totalClicks: number;
  totalClicksChange: number;
  averageCtr: number;
  averageCtrChange: number;
  totalNewCustomers: number;
  totalNewCustomersChange: number;
  cac: number;
  cacChange: number;
  roas: number;
  roasChange: number;
  customerLifetimeValue: number;
  customerLifetimeValueChange: number;
  googleSpend: number;
  metaSpend: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
}

interface WeeklyPerformance {
  period: string;
  weekStart: string;
  weekEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleConversions: number;
  metaConversions: number;
  totalConversions: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
  weekOverWeekSpendChange: number;
  weekOverWeekConversionsChange: number;
  weekOverWeekNewCustomersChange: number;
}

interface Rolling7DayPerformance {
  period: string;
  periodStart: string;
  periodEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
  periodOverPeriodSpendChange: number;
  periodOverPeriodNewCustomersChange: number;
}

interface ChartData {
  spendTrend: any[];
  platformComparison: any[];
  conversionFunnel: any[];
  cacTrend: any[];
  roasByPlatform: any[];
}

interface MonthlyPerformance {
  period: string;
  monthStart: string;
  monthEnd: string;
  googleSpend: number;
  metaSpend: number;
  totalSpend: number;
  googleImpressions: number;
  metaImpressions: number;
  totalImpressions: number;
  googleClicks: number;
  metaClicks: number;
  totalClicks: number;
  googleCtr: number;
  metaCtr: number;
  averageCtr: number;
  googleNewCustomers: number;
  metaNewCustomers: number;
  totalNewCustomers: number;
  cac: number;
  roas: number;
}

interface MarketingDashboardData {
  kpis: MarketingKPIs | null;
  performance: (WeeklyPerformance | Rolling7DayPerformance)[];
  monthlyPerformance: MonthlyPerformance[];
  charts: ChartData | null;
}

interface UseMarketingDashboardOptions {
  timeRange?: string;
  usePeriodType?: 'rolling' | 'weekly';
  referenceDate?: string;
  refreshInterval?: number;
  enabled?: boolean;
}

interface UseMarketingDashboardReturn {
  data: MarketingDashboardData;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | null;
  mutate: () => Promise<void>;
  refresh: () => Promise<void>;
}

// Simple cache implementation
class SimpleCache {
  public cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) { // 5 minute default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

// Global cache instance
const marketingCache = new SimpleCache();

export const useMarketingDashboard = (options: UseMarketingDashboardOptions = {}): UseMarketingDashboardReturn => {
  const {
    timeRange = '30',
    usePeriodType = 'rolling',
    referenceDate,
    refreshInterval = 0,
    enabled = true
  } = options;

  const [data, setData] = useState<MarketingDashboardData>({
    kpis: null,
    performance: [],
    monthlyPerformance: [],
    charts: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Generate cache keys based on timeRange, periodType, and referenceDate
  const getCacheKeys = useCallback(() => ({
    kpis: `marketing-kpis-${timeRange}-${usePeriodType}-${referenceDate}`,
    performance: `marketing-performance-${timeRange}-${usePeriodType}-${referenceDate}`,
    monthlyPerformance: `marketing-monthly-performance-${timeRange}-${usePeriodType}-${referenceDate}`,
    charts: `marketing-charts-${timeRange}-${usePeriodType}-${referenceDate}`
  }), [timeRange, usePeriodType, referenceDate]);

  // Fetch KPI data
  const fetchKPIs = useCallback(async (): Promise<MarketingKPIs | null> => {
    const cacheKey = getCacheKeys().kpis;
    
    // Check cache first
    const cached = marketingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const referenceDateParam = referenceDate ? `&referenceDate=${referenceDate}` : '';
      const response = await fetch(`/api/marketing/overview?days=${timeRange}&comparisonDays=${timeRange}${referenceDateParam}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch KPIs: ${response.statusText}`);
      }

      const kpis = await response.json();
      
      // Cache for 5 minutes
      marketingCache.set(cacheKey, kpis, 5 * 60 * 1000);
      
      return kpis;
    } catch (err) {
      console.error('Error fetching KPIs:', err);
      throw err;
    }
  }, [timeRange, referenceDate, getCacheKeys]);

  // Fetch performance data
  const fetchPerformance = useCallback(async (): Promise<(WeeklyPerformance | Rolling7DayPerformance)[]> => {
    const cacheKey = getCacheKeys().performance;
    
    // Check cache first
    const cached = marketingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const referenceDateParam = referenceDate ? `&referenceDate=${referenceDate}` : '';
      let apiUrl;
      
      if (usePeriodType === 'rolling') {
        const periods = Math.max(2, Math.ceil(parseInt(timeRange) / 7)); // Always request at least 2 periods for comparison
        apiUrl = `/api/marketing/performance?format=rolling7day&periods=${periods}${referenceDateParam}`;
      } else {
        const weeks = Math.max(2, Math.ceil(parseInt(timeRange) / 7)); // Always request at least 2 weeks for comparison
        apiUrl = `/api/marketing/performance?weeks=${weeks}${referenceDateParam}`;
      }
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch performance: ${response.statusText}`);
      }

      const result = await response.json();
      const performance = result.data || [];
      
      // Cache for 5 minutes
      marketingCache.set(cacheKey, performance, 5 * 60 * 1000);
      
      return performance;
    } catch (err) {
      console.error('Error fetching performance:', err);
      throw err;
    }
  }, [timeRange, usePeriodType, referenceDate, getCacheKeys]);

  // Fetch monthly performance data
  const fetchMonthlyPerformance = useCallback(async (): Promise<MonthlyPerformance[]> => {
    const cacheKey = getCacheKeys().monthlyPerformance;
    
    // Check cache first
    const cached = marketingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`/api/marketing/performance?format=monthly`);
      if (!response.ok) {
        throw new Error(`Failed to fetch monthly performance: ${response.statusText}`);
      }

      const result = await response.json();
      const monthlyPerformance = result.data || [];
      
      // Cache for 5 minutes
      marketingCache.set(cacheKey, monthlyPerformance, 5 * 60 * 1000);
      
      return monthlyPerformance;
    } catch (err) {
      console.error('Error fetching monthly performance:', err);
      throw err;
    }
  }, [getCacheKeys]);

  // Fetch chart data
  const fetchCharts = useCallback(async (): Promise<ChartData | null> => {
    const cacheKey = getCacheKeys().charts;
    
    // Check cache first
    const cached = marketingCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const referenceDateParam = referenceDate ? `&referenceDate=${referenceDate}` : '';
      const response = await fetch(`/api/marketing/charts?days=${timeRange}${referenceDateParam}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch charts: ${response.statusText}`);
      }

      const charts = await response.json();
      
      // Cache for 5 minutes
      marketingCache.set(cacheKey, charts, 5 * 60 * 1000);
      
      return charts;
    } catch (err) {
      console.error('Error fetching charts:', err);
      throw err;
    }
  }, [timeRange, referenceDate, getCacheKeys]);

  // Load all data
  const loadData = useCallback(async (showValidating = false) => {
    if (!enabled) return;

    try {
      if (showValidating) {
        setIsValidating(true);
      } else {
        setIsLoading(true);
      }
      
      setIsError(false);
      setError(null);

      // Check if we have all data in cache
      const cacheKeys = getCacheKeys();
      const hasAllCached = 
        marketingCache.has(cacheKeys.kpis) &&
        marketingCache.has(cacheKeys.performance) &&
        marketingCache.has(cacheKeys.monthlyPerformance) &&
        marketingCache.has(cacheKeys.charts);

      if (hasAllCached && !showValidating) {
        // Load from cache immediately
        const cachedKpis = marketingCache.get(cacheKeys.kpis);
        const cachedPerformance = marketingCache.get(cacheKeys.performance);
        const cachedMonthlyPerformance = marketingCache.get(cacheKeys.monthlyPerformance);
        const cachedCharts = marketingCache.get(cacheKeys.charts);

        setData({
          kpis: cachedKpis,
          performance: cachedPerformance,
          monthlyPerformance: cachedMonthlyPerformance,
          charts: cachedCharts
        });

        setIsLoading(false);
        setIsValidating(false);
        return;
      }

      // Fetch all data in parallel
      const [kpis, performance, monthlyPerformance, charts] = await Promise.all([
        fetchKPIs(),
        fetchPerformance(),
        fetchMonthlyPerformance(),
        fetchCharts()
      ]);

      setData({ kpis, performance, monthlyPerformance, charts });
    } catch (err) {
      console.error('Error loading marketing dashboard data:', err);
      setIsError(true);
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [enabled, getCacheKeys, fetchKPIs, fetchPerformance, fetchMonthlyPerformance, fetchCharts]);

  // Refresh function (bypasses cache)
  const refresh = useCallback(async () => {
    // Clear cache for current timeRange
    const cacheKeys = getCacheKeys();
    Object.values(cacheKeys).forEach(key => {
      marketingCache.cache.delete(key);
    });

    await loadData(true);
  }, [loadData, getCacheKeys]);

  // Mutate function (alias for refresh)
  const mutate = useCallback(async () => {
    await refresh();
  }, [refresh]);

  // Initial load and timeRange changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0 && enabled) {
      const interval = setInterval(() => {
        loadData(true);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, enabled, loadData]);

  return {
    data,
    isLoading,
    isValidating,
    isError,
    error,
    mutate,
    refresh
  };
};

// Export cache for external access if needed
export const clearMarketingCache = () => {
  marketingCache.clear();
};

// Pre-fetch function for eager loading
export const prefetchMarketingData = async (timeRange: string = '30') => {
  const cacheKeys = {
    kpis: `marketing-kpis-${timeRange}`,
    performance: `marketing-performance-${timeRange}`,
    charts: `marketing-charts-${timeRange}`
  };

  // Only fetch if not already cached
  const promises: Promise<any>[] = [];

  if (!marketingCache.has(cacheKeys.kpis)) {
    promises.push(
      fetch(`/api/marketing/overview?days=${timeRange}&comparisonDays=${timeRange}`)
        .then(res => res.json())
        .then(data => marketingCache.set(cacheKeys.kpis, data))
    );
  }

  if (!marketingCache.has(cacheKeys.performance)) {
    const weeks = Math.ceil(parseInt(timeRange) / 7);
    promises.push(
      fetch(`/api/marketing/performance?weeks=${weeks}`)
        .then(res => res.json())
        .then(data => marketingCache.set(cacheKeys.performance, data.data || []))
    );
  }

  if (!marketingCache.has(cacheKeys.charts)) {
    promises.push(
      fetch(`/api/marketing/charts?days=${timeRange}`)
        .then(res => res.json())
        .then(data => marketingCache.set(cacheKeys.charts, data))
    );
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
};