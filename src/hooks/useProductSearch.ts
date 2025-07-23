'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { POSProduct } from '@/types/pos';
import { productSearchEngine, SearchFilters } from '@/services/ProductSearchEngine';
import { useDebounce } from './useDebounce';

export interface UseProductSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  autoSearch?: boolean;
  maxResults?: number;
}

export interface ProductSearchState {
  query: string;
  results: POSProduct[];
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  totalResults: number;
  searchTime: number;
}

export interface ProductSearchActions {
  setQuery: (query: string) => void;
  search: (query: string, filters?: SearchFilters) => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;
  getSuggestions: (query: string) => Promise<string[]>;
  quickSearch: (query: string) => Promise<POSProduct[]>;
}

export const useProductSearch = (options: UseProductSearchOptions = {}) => {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    autoSearch = true,
    maxResults = 50
  } = options;

  const [state, setState] = useState<ProductSearchState>({
    query: '',
    results: [],
    suggestions: [],
    isLoading: false,
    error: null,
    hasSearched: false,
    totalResults: 0,
    searchTime: 0
  });

  const [filters, setFilters] = useState<SearchFilters>({});
  const abortControllerRef = useRef<AbortController | null>(null);
  const debouncedQuery = useDebounce(state.query, debounceMs);

  // Set query
  const setQuery = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      query,
      error: null
    }));
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setState({
      query: '',
      results: [],
      suggestions: [],
      isLoading: false,
      error: null,
      hasSearched: false,
      totalResults: 0,
      searchTime: 0
    });
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  // Perform search
  const search = useCallback(async (query: string, searchFilters?: SearchFilters) => {
    if (query.length < minQueryLength) {
      setState(prev => ({
        ...prev,
        results: [],
        hasSearched: false,
        totalResults: 0
      }));
      return;
    }

    // Cancel any previous search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const startTime = Date.now();
      const searchResult = await productSearchEngine.search(query, {
        ...filters,
        ...searchFilters
      });

      // Check if search was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const searchTime = Date.now() - startTime;

      setState(prev => ({
        ...prev,
        results: searchResult.products.slice(0, maxResults),
        isLoading: false,
        hasSearched: true,
        totalResults: searchResult.products.length,
        searchTime,
        error: null
      }));

    } catch (error) {
      // Don't update state if search was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      console.error('Search failed:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Search failed',
        results: [],
        hasSearched: true,
        totalResults: 0
      }));
    } finally {
      abortControllerRef.current = null;
    }
  }, [minQueryLength, filters, maxResults]);

  // Get suggestions
  const getSuggestions = useCallback(async (query: string): Promise<string[]> => {
    if (query.length < 2) {
      return productSearchEngine.getRecentQueries();
    }

    try {
      return await productSearchEngine.getSuggestions(query, filters.category);
    } catch (error) {
      console.error('Failed to get suggestions:', error);
      return [];
    }
  }, [filters.category]);

  // Quick search (for autocomplete/instant results)
  const quickSearch = useCallback(async (query: string): Promise<POSProduct[]> => {
    if (query.length < minQueryLength) {
      return [];
    }

    try {
      return await productSearchEngine.quickSearch(query, filters.category);
    } catch (error) {
      console.error('Quick search failed:', error);
      return [];
    }
  }, [minQueryLength, filters.category]);

  // Update suggestions when query changes
  useEffect(() => {
    const updateSuggestions = async () => {
      if (state.query.length >= 2) {
        try {
          const newSuggestions = await getSuggestions(state.query);
          setState(prev => ({
            ...prev,
            suggestions: newSuggestions
          }));
        } catch (error) {
          console.error('Failed to update suggestions:', error);
        }
      } else {
        setState(prev => ({
          ...prev,
          suggestions: []
        }));
      }
    };

    const timeoutId = setTimeout(updateSuggestions, 150);
    return () => clearTimeout(timeoutId);
  }, [state.query, getSuggestions]);

  // Auto search when debounced query changes
  useEffect(() => {
    if (autoSearch && debouncedQuery !== state.query) {
      search(debouncedQuery);
    }
  }, [debouncedQuery, autoSearch, search, state.query]);

  // Update filters
  const updateFilters = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
    
    // Re-search with new filters if we have a query
    if (state.query.length >= minQueryLength) {
      search(state.query, newFilters);
    }
  }, [state.query, minQueryLength, search]);

  // Get search analytics
  const getSearchAnalytics = useCallback(() => {
    return productSearchEngine.getSearchAnalytics();
  }, []);

  // Get trending searches
  const getTrendingSearches = useCallback((limit?: number) => {
    return productSearchEngine.getTrendingSearches(limit);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    // State
    ...state,
    filters,
    
    // Actions
    setQuery,
    search,
    clearSearch,
    clearError,
    getSuggestions,
    quickSearch,
    updateFilters,
    
    // Analytics
    getSearchAnalytics,
    getTrendingSearches,
    
    // Computed values
    hasQuery: state.query.length > 0,
    hasResults: state.results.length > 0,
    hasError: !!state.error,
    isSearching: state.isLoading,
    canSearch: state.query.length >= minQueryLength,
    
    // Search metadata
    resultCount: state.results.length,
    searchDuration: state.searchTime,
    hasMoreResults: state.totalResults > state.results.length,
    
    // Utility functions
    isQueryValid: (query: string) => query.length >= minQueryLength,
    formatSearchTime: (time: number) => `${time}ms`,
    
    // Configuration
    config: {
      debounceMs,
      minQueryLength,
      autoSearch,
      maxResults
    }
  };
};