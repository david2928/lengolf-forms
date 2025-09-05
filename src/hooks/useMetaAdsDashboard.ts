import { useState, useEffect, useCallback } from 'react';

interface MetaAdsKPIs {
  totalSpend: number;
  metaBookings: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  leads: number;
  costPerBooking: number;
  costPerLead: number;
  
  // Platform breakdown
  facebookSpend: number;
  instagramSpend: number;
  facebookBookings: number;
  instagramBookings: number;
  facebookImpressions: number;
  instagramImpressions: number;
  facebookClicks: number;
  instagramClicks: number;
  
  spendChange: number;
  bookingsChange: number;
  impressionsChange: number;
  clicksChange: number;
  ctrChange: number;
  leadsChange: number;
  costPerBookingChange: number;
  costPerLeadChange: number;
}

interface MetaAdsPerformanceChart {
  dates: string[];
  spend: number[];
  bookings: number[];
  impressions: number[];
  clicks: number[];
}

interface MetaAdsPlatformBreakdown {
  facebook: {
    spend: number;
    bookings: number;
    impressions: number;
    clicks: number;
    ctr: number;
    leads: number;
  };
  instagram: {
    spend: number;
    bookings: number;
    impressions: number;
    clicks: number;
    ctr: number;
    leads: number;
  };
  comparison: {
    spendSplit: { facebook: number; instagram: number };
    bookingSplit: { facebook: number; instagram: number };
  };
}

interface MetaAdsCampaignData {
  campaigns: any[];
  total: number;
  hasMore: boolean;
}

interface MetaAdsCreativeData {
  creatives: any[];
  total: number;
  hasMore: boolean;
}

interface MetaAdsCalendarData {
  [date: string]: any[];
}

interface MetaAdsDashboardData {
  kpis: MetaAdsKPIs | null;
  performanceChart: MetaAdsPerformanceChart | null;
  platformBreakdown: MetaAdsPlatformBreakdown | null;
  campaigns: MetaAdsCampaignData | null;
  creatives: MetaAdsCreativeData | null;
  calendar: MetaAdsCalendarData | null;
}

interface UseMetaAdsDashboardOptions {
  timeRange: string;
  referenceDate: string;
  refreshInterval?: number;
  enabled?: boolean;
}

export const useMetaAdsDashboard = (options: UseMetaAdsDashboardOptions) => {
  const { timeRange, referenceDate, refreshInterval = 0, enabled = true } = options;
  
  const [data, setData] = useState<MetaAdsDashboardData>({
    kpis: null,
    performanceChart: null,
    platformBreakdown: null,
    campaigns: null,
    creatives: null,
    calendar: null
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!enabled) return;
    
    try {
      if (isRefresh) {
        setIsValidating(true);
      } else {
        setIsLoading(true);
      }
      setIsError(false);
      setError(null);

      // Fetch data in parallel for better performance
      const [kpisResponse, campaignsResponse] = await Promise.all([
        fetch(`/api/meta-ads/overview-metrics?days=${timeRange}&referenceDate=${referenceDate}`),
        fetch(`/api/meta-ads/campaigns?days=${timeRange}&referenceDate=${referenceDate}&limit=10`)
      ]);

      if (!kpisResponse.ok) {
        throw new Error(`KPIs fetch failed: ${kpisResponse.status}`);
      }
      
      if (!campaignsResponse.ok) {
        throw new Error(`Campaigns fetch failed: ${campaignsResponse.status}`);
      }

      const [kpisData, campaignsData] = await Promise.all([
        kpisResponse.json(),
        campaignsResponse.json()
      ]);

      setData(prevData => ({
        ...prevData,
        kpis: kpisData,
        campaigns: campaignsData,
        // Other endpoints will be added later
        performanceChart: null,
        platformBreakdown: null,
        creatives: null,
        calendar: null
      }));

    } catch (err) {
      console.error('Meta Ads dashboard fetch error:', err);
      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
      setIsValidating(false);
    }
  }, [enabled, timeRange, referenceDate]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh (if enabled)
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        fetchData(true);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    isLoading,
    isValidating,
    isError,
    error,
    refresh
  };
};