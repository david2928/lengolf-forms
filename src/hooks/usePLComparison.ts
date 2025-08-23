import useSWR from 'swr';
import { useMemo } from 'react';
import { PLData } from './useFinanceDashboard';

interface PLComparisonOptions {
  months: string[];
  includeRunRate?: boolean;
  enabled?: boolean;
}

interface PLComparisonData {
  data: Record<string, PLData>;
  isLoading: boolean;
  error: any;
}

// Fetcher function for multiple months
const fetchMultiplePLStatements = async (months: string[], includeRunRate: boolean): Promise<Record<string, PLData>> => {
  const promises = months.map(async (month) => {
    const url = `/api/finance/pl-statement?month=${month}${includeRunRate ? '&includeRunRate=true' : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch P&L data for ${month}: ${response.statusText}`);
    }
    const data = await response.json();
    return { month, data };
  });

  const results = await Promise.allSettled(promises);
  const dataMap: Record<string, PLData> = {};

  results.forEach((result, index) => {
    const month = months[index];
    if (result.status === 'fulfilled') {
      dataMap[month] = result.value.data;
    } else {
      console.error(`Failed to fetch data for ${month}:`, result.reason);
      // Don't add to dataMap, will be undefined in the record
    }
  });

  return dataMap;
};

export function usePLComparison(options: PLComparisonOptions): PLComparisonData {
  const { months, includeRunRate = false, enabled = true } = options;

  // Create a cache key that includes all months and settings
  const cacheKey = enabled ? 
    `pl-comparison-${months.join(',')}-runrate:${includeRunRate}` : 
    null;

  const { data, error, isLoading } = useSWR(
    cacheKey,
    () => fetchMultiplePLStatements(months, includeRunRate),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      // Cache for 5 minutes since this is comparison data
      dedupingInterval: 300000
    }
  );

  return {
    data: data || {},
    isLoading,
    error
  };
}

// Helper hook to generate default months (last 6 months including current)
export function useDefaultComparisonMonths(): string[] {
  return useMemo(() => {
    const months = [];
    const currentMonth = getCurrentMonth(); // Use the same function as getCurrentMonth
    const [year, month] = currentMonth.split('-').map(Number);
    
    // Always include current month and previous 5 months
    for (let i = 0; i <= 5; i++) {
      const targetDate = new Date(year, month - (5 - i), 1); // month is 1-based but we subtract 5-i
      months.push(targetDate.toISOString().slice(0, 7));
    }
    
    return months;
  }, []);
}

// Helper to get current month string
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}