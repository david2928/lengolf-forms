import { useState, useEffect, useCallback } from 'react';

export interface TrafficKPIs {
  sessions: number;
  sessionsChange: number;
  users: number;
  usersChange: number;
  newUsers: number;
  newUsersChange: number;
  pageViews: number;
  pageViewsChange: number;
  bounceRate: number;
  bounceRateChange: number;
  avgDuration: number;
  avgDurationChange: number;
  conversions: number;
  conversionsChange: number;
  conversionRate: number;
  conversionRateChange: number;
}

export interface TopPage {
  path: string;
  title: string;
  pageViews: number;
  uniquePageViews: number;
  entrances: number;
  bounceRate: number;
  avgTimeOnPage: number;
  exitRate: number;
  bookingConversions: number;
  property: string;
  section: string;
}

export interface FunnelDataItem {
  channel: string;
  stage1Users: number;
  stage2Users: number;
  stage3Users: number;
  stage4Users: number;
  stage5Users: number;
  stage6Users: number;
  overallConversionRate: number;
}

export interface ChannelBreakdownItem {
  channel: string;
  sessions: number;
  users: number;
  conversions: number;
  conversionRate: number;
  sessionsChange: number;
  conversionRateChange: number;
}

export interface DeviceBreakdownItem {
  device: string;
  sessions: number;
  percentage: number;
  conversionRate: number;
}

export interface DailyTrendItem {
  date: string;
  sessions: number;
  users: number;
  conversions: number;
  conversionRate: number;
}

export interface PageDailyTrendItem {
  date: string;
  pageViews: number;
  uniquePageViews: number;
  entrances: number;
  conversions: number;
}

export interface TrafficAnalyticsData {
  kpis: TrafficKPIs | null;
  topPages: TopPage[];
  pageDailyTrends: Record<string, PageDailyTrendItem[]>;
  funnelData: FunnelDataItem[];
  channelBreakdown: ChannelBreakdownItem[];
  deviceBreakdown: DeviceBreakdownItem[];
  dailyTrends: DailyTrendItem[];
  propertyFilter: string;
}

interface UseTrafficAnalyticsOptions {
  timeRange?: string;
  referenceDate?: string;
  property?: string;
  enabled?: boolean;
}

interface UseTrafficAnalyticsReturn {
  data: TrafficAnalyticsData;
  isLoading: boolean;
  isValidating: boolean;
  isError: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

// Simple cache
class SimpleCache {
  public cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  set(key: string, data: any, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

const trafficCache = new SimpleCache();

const emptyData: TrafficAnalyticsData = {
  kpis: null,
  topPages: [],
  pageDailyTrends: {},
  funnelData: [],
  channelBreakdown: [],
  deviceBreakdown: [],
  dailyTrends: [],
  propertyFilter: 'all',
};

export const useTrafficAnalytics = (options: UseTrafficAnalyticsOptions = {}): UseTrafficAnalyticsReturn => {
  const {
    timeRange = '30',
    referenceDate,
    property = 'all',
    enabled = true,
  } = options;

  const [data, setData] = useState<TrafficAnalyticsData>(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = `traffic-analytics-${timeRange}-${property}-${referenceDate}`;

  const fetchData = useCallback(async (showValidating = false) => {
    if (!enabled) return;

    // Check cache
    const cached = trafficCache.get(cacheKey);
    if (cached && !showValidating) {
      setData(cached);
      setIsLoading(false);
      return;
    }

    try {
      if (showValidating) {
        setIsValidating(true);
      } else {
        setIsLoading(true);
      }
      setIsError(false);
      setError(null);

      const params = new URLSearchParams({
        days: timeRange,
        property,
        ...(referenceDate ? { referenceDate } : {}),
      });

      const response = await fetch(`/api/traffic-analytics?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch traffic analytics: ${response.statusText}`);
      }

      const result = await response.json();
      trafficCache.set(cacheKey, result);
      setData(result);
    } catch (err) {
      console.error('Error fetching traffic analytics:', err);
      setIsError(true);
      setError(err as Error);
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [enabled, cacheKey, timeRange, property, referenceDate]);

  const refresh = useCallback(async () => {
    trafficCache.cache.delete(cacheKey);
    await fetchData(true);
  }, [fetchData, cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, isValidating, isError, error, refresh };
};
