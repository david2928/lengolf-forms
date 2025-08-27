'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Product {
  id: string;
  name: string;
  category: string;
  quantity_sold: number;
  total_revenue: number | null;
  total_profit: number | null;
  avg_profit_margin: number | null;
  total_cost: number | null;
  units_in_stock: number;
  performance_trend: 'up' | 'down' | 'stable';
  trend_percentage: number | null;
}

interface ProductPerformanceData {
  products: Product[];
  categories: string[];
  summary: {
    total_products: number;
    total_revenue: number;
    total_profit: number;
    avg_profit_margin: number;
    top_performer: string;
    worst_performer: string;
  };
}

interface CacheEntry {
  data: ProductPerformanceData;
  timestamp: number;
  key: string;
}

interface UseProductPerformanceProps {
  dateRange: {
    start: string;
    end: string;
  };
  category?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

export function useProductPerformance({
  dateRange,
  category = '',
  search = '',
  sortBy = 'revenue',
  sortOrder = 'desc'
}: UseProductPerformanceProps) {
  const [data, setData] = useState<ProductPerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generate cache key
  const getCacheKey = useCallback(() => {
    return `${dateRange.start}-${dateRange.end}-${category}-${search}-${sortBy}-${sortOrder}`;
  }, [dateRange.start, dateRange.end, category, search, sortBy, sortOrder]);

  // Check if cache is valid
  const getCachedData = useCallback((key: string): ProductPerformanceData | null => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    if (cached) {
      cache.delete(key); // Remove expired cache
    }
    return null;
  }, []);

  // Set cache data
  const setCacheData = useCallback((key: string, data: ProductPerformanceData) => {
    cache.set(key, {
      data,
      timestamp: Date.now(),
      key
    });
  }, []);

  const fetchData = useCallback(async () => {
    const cacheKey = getCacheKey();
    
    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      setData(cachedData);
      setError(null);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start_date: dateRange.start,
        end_date: dateRange.end,
        category: category || '',
        search: search || '',
        sort_by: sortBy,
        sort_order: sortOrder,
      });

      const response = await fetch(`/api/dashboard/product-performance?${params}`, {
        signal: abortControllerRef.current.signal
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch product performance data');
      }
      
      const result = await response.json();
      
      // Cache the result
      setCacheData(cacheKey, result);
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled, don't update state
      }
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange.start, dateRange.end, category, search, sortBy, sortOrder, getCacheKey, getCachedData, setCacheData]);

  useEffect(() => {
    fetchData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, dateRange.start, dateRange.end, category, search, sortBy, sortOrder]);

  const refresh = () => {
    // Clear cache for current key and refetch
    cache.delete(getCacheKey());
    fetchData();
  };

  const clearCache = () => {
    cache.clear();
  };

  return {
    data,
    isLoading,
    error,
    refresh,
    clearCache,
    isCached: getCachedData(getCacheKey()) !== null
  };
}