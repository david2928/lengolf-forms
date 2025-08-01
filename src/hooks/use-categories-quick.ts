import { useState, useEffect, useCallback } from 'react';

interface CategoryQuick {
  id: string;
  name: string;
  display_order: number;
  color_code: string;
  product_count: number;
  totalProductCount: number;
  children: CategoryQuick[];
}

interface CategoriesState {
  categories: CategoryQuick[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Cache categories in memory for 5 minutes
let categoriesCache: { data: CategoryQuick[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useCategoriesQuick = () => {
  const [state, setState] = useState<CategoriesState>({
    categories: [],
    loading: true,
    error: null,
    lastUpdated: null
  });

  const loadCategories = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && categoriesCache && 
        Date.now() - categoriesCache.timestamp < CACHE_DURATION) {
      setState({
        categories: categoriesCache.data,
        loading: false,
        error: null,
        lastUpdated: new Date(categoriesCache.timestamp)
      });
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch('/api/pos/categories/quick', {
        headers: {
          'Cache-Control': 'max-age=300' // 5 minute client cache
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Update cache
      categoriesCache = {
        data: data.categories,
        timestamp: Date.now()
      };

      setState({
        categories: data.categories,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });

    } catch (error) {
      console.error('Failed to load categories:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load categories'
      }));
    }
  }, []);

  const refresh = useCallback(() => {
    loadCategories(true);
  }, [loadCategories]);

  const clearCache = useCallback(() => {
    categoriesCache = null;
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    ...state,
    refresh,
    clearCache,
    isStale: categoriesCache ? Date.now() - categoriesCache.timestamp > CACHE_DURATION : true
  };
};