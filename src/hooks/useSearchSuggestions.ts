'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { productSearchEngine } from '@/services/ProductSearchEngine';
import { SearchSuggestion } from '@/components/pos/product-catalog/SearchSuggestions';
import { useDebounce } from './useDebounce';

export interface UseSearchSuggestionsOptions {
  debounceMs?: number;
  minQueryLength?: number;
  maxSuggestions?: number;
  includeRecent?: boolean;
  includeTrending?: boolean;
  category?: string;
}

export interface SearchSuggestionsState {
  suggestions: SearchSuggestion[];
  isLoading: boolean;
  error: string | null;
  recentSearches: string[];
  trendingSearches: string[];
}

export const useSearchSuggestions = (options: UseSearchSuggestionsOptions = {}) => {
  const {
    debounceMs = 150,
    minQueryLength = 2,
    maxSuggestions = 8,
    includeRecent = true,
    includeTrending = true,
    category
  } = options;

  const [state, setState] = useState<SearchSuggestionsState>({
    suggestions: [],
    isLoading: false,
    error: null,
    recentSearches: [],
    trendingSearches: []
  });

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, debounceMs);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial data (recent and trending searches)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [recent, trending] = await Promise.all([
          includeRecent ? productSearchEngine.getRecentQueries() : [],
          includeTrending ? productSearchEngine.getTrendingSearches(5) : []
        ]);

        setState(prev => ({
          ...prev,
          recentSearches: recent,
          trendingSearches: trending
        }));
      } catch (error) {
        console.error('Failed to load initial suggestion data:', error);
      }
    };

    loadInitialData();
  }, [includeRecent, includeTrending]);

  // Generate suggestions based on query
  const generateSuggestions = useCallback(async (searchQuery: string): Promise<SearchSuggestion[]> => {
    const suggestions: SearchSuggestion[] = [];

    if (searchQuery.length < minQueryLength) {
      // Show recent and trending when no query
      if (includeRecent && state.recentSearches.length > 0) {
        state.recentSearches.slice(0, 3).forEach(recent => {
          suggestions.push({
            text: recent,
            type: 'recent'
          });
        });
      }

      if (includeTrending && state.trendingSearches.length > 0) {
        state.trendingSearches.slice(0, 3).forEach((trending, index) => {
          suggestions.push({
            text: trending,
            type: 'trending',
            metadata: {
              popularity: 5 - index // Higher index = lower popularity
            }
          });
        });
      }

      return suggestions.slice(0, maxSuggestions);
    }

    try {
      // Get product suggestions from search engine
      const productSuggestions = await productSearchEngine.getSuggestions(searchQuery, category);
      
      // Add product suggestions
      productSuggestions.forEach(suggestion => {
        suggestions.push({
          text: suggestion,
          type: 'product'
        });
      });

      // Add matching recent searches
      if (includeRecent) {
        const matchingRecent = state.recentSearches.filter(recent => 
          recent.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !productSuggestions.includes(recent)
        );

        matchingRecent.slice(0, 2).forEach(recent => {
          suggestions.push({
            text: recent,
            type: 'recent'
          });
        });
      }

      // Add matching trending searches
      if (includeTrending) {
        const matchingTrending = state.trendingSearches.filter(trending => 
          trending.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !productSuggestions.includes(trending) &&
          !suggestions.some(s => s.text === trending)
        );

        matchingTrending.slice(0, 1).forEach(trending => {
          suggestions.push({
            text: trending,
            type: 'trending',
            metadata: {
              popularity: 4
            }
          });
        });
      }

      return suggestions.slice(0, maxSuggestions);

    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      return suggestions.slice(0, maxSuggestions);
    }
  }, [
    minQueryLength,
    maxSuggestions,
    includeRecent,
    includeTrending,
    category,
    state.recentSearches,
    state.trendingSearches
  ]);

  // Update suggestions when debounced query changes
  useEffect(() => {
    const updateSuggestions = async () => {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null
      }));

      try {
        const newSuggestions = await generateSuggestions(debouncedQuery);

        // Check if request was aborted
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setState(prev => ({
          ...prev,
          suggestions: newSuggestions,
          isLoading: false
        }));

      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) {
          return;
        }

        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to load suggestions',
          isLoading: false,
          suggestions: []
        }));
      }
    };

    updateSuggestions();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedQuery, generateSuggestions]);

  // Update query
  const updateQuery = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setState(prev => ({
      ...prev,
      suggestions: [],
      error: null
    }));
  }, []);

  // Add to recent searches
  const addToRecentSearches = useCallback((searchTerm: string) => {
    setState(prev => ({
      ...prev,
      recentSearches: [
        searchTerm,
        ...prev.recentSearches.filter(term => term !== searchTerm)
      ].slice(0, 10) // Keep only last 10
    }));
  }, []);

  // Get suggestions by type
  const getSuggestionsByType = useCallback((type: SearchSuggestion['type']) => {
    return state.suggestions.filter(suggestion => suggestion.type === type);
  }, [state.suggestions]);

  // Check if has suggestions of type
  const hasSuggestionsOfType = useCallback((type: SearchSuggestion['type']) => {
    return state.suggestions.some(suggestion => suggestion.type === type);
  }, [state.suggestions]);

  // Get suggestion types available
  const getAvailableTypes = useCallback(() => {
    const types = new Set(state.suggestions.map(s => s.type));
    return Array.from(types);
  }, [state.suggestions]);

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
    query,
    
    // Actions
    updateQuery,
    clearSuggestions,
    addToRecentSearches,
    
    // Computed values
    hasSuggestions: state.suggestions.length > 0,
    hasRecentSearches: state.recentSearches.length > 0,
    hasTrendingSearches: state.trendingSearches.length > 0,
    
    // Type-specific getters
    getSuggestionsByType,
    hasSuggestionsOfType,
    getAvailableTypes,
    
    // Metrics
    suggestionCount: state.suggestions.length,
    recentCount: state.recentSearches.length,
    trendingCount: state.trendingSearches.length,
    
    // Configuration
    config: {
      debounceMs,
      minQueryLength,
      maxSuggestions,
      includeRecent,
      includeTrending,
      category
    }
  };
};