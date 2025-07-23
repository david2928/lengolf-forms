'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { productSearchEngine } from '@/services/ProductSearchEngine';
import { POSProduct } from '@/types/pos';

export interface ProductSearchProps {
  onProductsFound: (products: POSProduct[]) => void;
  onSearchStateChange?: (isSearching: boolean) => void;
  category?: string;
  placeholder?: string;
  showSuggestions?: boolean;
  showHistory?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  onProductsFound,
  onSearchStateChange,
  category,
  placeholder = "Search products by name, SKU, or description...",
  showSuggestions = true,
  showHistory = true,
  autoFocus = false,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 300);

  // Load recent searches on mount
  useEffect(() => {
    if (showHistory) {
      const recent = productSearchEngine.getRecentQueries();
      setRecentSearches(recent);
    }
  }, [showHistory]);

  // Auto focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Perform search when debounced query changes
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.length < 2) {
        onProductsFound([]);
        onSearchStateChange?.(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      onSearchStateChange?.(true);

      try {
        const results = await productSearchEngine.search(debouncedQuery, { category });
        onProductsFound(results.products);
      } catch (error) {
        console.error('Search failed:', error);
        setError('Search failed. Please try again.');
        onProductsFound([]);
      } finally {
        setIsLoading(false);
        onSearchStateChange?.(false);
      }
    };

    performSearch();
  }, [debouncedQuery, category, onProductsFound, onSearchStateChange]);

  // Load suggestions when query changes
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!showSuggestions || query.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        const newSuggestions = await productSearchEngine.getSuggestions(query, category);
        setSuggestions(newSuggestions);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
        setSuggestions([]);
      }
    };

    const timeoutId = setTimeout(loadSuggestions, 150);
    return () => clearTimeout(timeoutId);
  }, [query, category, showSuggestions]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedSuggestionIndex(-1);
    
    if (value.length >= 2) {
      setShowSuggestionsList(true);
    } else {
      setShowSuggestionsList(false);
    }
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestionsList(false);
    setSelectedSuggestionIndex(-1);
    
    // Add to recent searches
    if (showHistory) {
      const updated = [suggestion, ...recentSearches.filter(s => s !== suggestion)].slice(0, 5);
      setRecentSearches(updated);
    }
  }, [recentSearches, showHistory]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!showSuggestionsList) return;

    const totalSuggestions = suggestions.length + (showHistory && query.length < 2 ? recentSearches.length : 0);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < totalSuggestions - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : totalSuggestions - 1
        );
        break;
        
      case 'Enter':
        event.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const allSuggestions = query.length >= 2 ? suggestions : recentSearches;
          const selectedSuggestion = allSuggestions[selectedSuggestionIndex];
          if (selectedSuggestion) {
            handleSuggestionSelect(selectedSuggestion);
          }
        }
        break;
        
      case 'Escape':
        setShowSuggestionsList(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  }, [showSuggestionsList, suggestions, recentSearches, selectedSuggestionIndex, query, showHistory, handleSuggestionSelect]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setShowSuggestionsList(false);
    setSelectedSuggestionIndex(-1);
    onProductsFound([]);
    onSearchStateChange?.(false);
    inputRef.current?.focus();
  }, [onProductsFound, onSearchStateChange]);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestionsList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get suggestions to display
  const getSuggestionsToDisplay = () => {
    if (query.length >= 2) {
      return suggestions.map(s => ({ text: s, type: 'suggestion' as const }));
    } else if (showHistory && recentSearches.length > 0) {
      return recentSearches.map(s => ({ text: s, type: 'recent' as const }));
    }
    return [];
  };

  const displaySuggestions = getSuggestionsToDisplay();

  return (
    <div className={`product-search relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className={`h-5 w-5 ${isLoading ? 'animate-pulse text-indigo-500' : 'text-gray-400'}`} />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestionsList(true)}
          placeholder={placeholder}
          className="
            block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg
            focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
            text-base placeholder-gray-500
            transition-colors duration-200
          "
          style={{ minHeight: '44px' }} // Touch-friendly height
        />
        
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestionsList && displaySuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="
            absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg
            max-h-64 overflow-y-auto z-50
          "
        >
          {/* Suggestions Header */}
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {query.length >= 2 ? 'Suggestions' : 'Recent Searches'}
              </span>
              {query.length >= 2 ? (
                <TrendingUp className="h-4 w-4 text-gray-400" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>

          {/* Suggestions List */}
          <div className="py-1">
            {displaySuggestions.map((item, index) => (
              <button
                key={`${item.type}-${item.text}`}
                onClick={() => handleSuggestionSelect(item.text)}
                className={`
                  w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center space-x-3
                  transition-colors duration-150
                  ${index === selectedSuggestionIndex ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}
                `}
              >
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {item.type === 'recent' ? (
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span className="truncate">{item.text}</span>
                </div>
                
                {item.type === 'recent' && (
                  <span className="text-xs text-gray-400">Recent</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500"></div>
            <span className="text-sm text-gray-600">Searching products...</span>
          </div>
        </div>
      )}
    </div>
  );
};