'use client';

import React, { useState } from 'react';
import { Filter, X, ChevronDown, Check } from 'lucide-react';

export interface SearchFiltersProps {
  onFiltersChange: (filters: SearchFilters) => void;
  initialFilters?: SearchFilters;
  availableCategories?: Array<{ id: string; name: string; productCount?: number }>;
  className?: string;
}

export interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  category?: string;
  sortBy?: 'relevance' | 'name' | 'price_asc' | 'price_desc';
  inStock?: boolean;
}

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' }
];

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  availableCategories = [],
  className = ''
}) => {
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Update filters and notify parent
  const updateFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Handle price range change
  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : parseFloat(value);
    updateFilters({
      ...filters,
      [type === 'min' ? 'minPrice' : 'maxPrice']: numValue
    });
  };

  // Handle category change
  const handleCategoryChange = (categoryId: string | null) => {
    updateFilters({
      ...filters,
      category: categoryId || undefined
    });
    setShowCategoryDropdown(false);
  };

  // Handle sort change
  const handleSortChange = (sortBy: string) => {
    updateFilters({
      ...filters,
      sortBy: sortBy as SearchFilters['sortBy']
    });
    setShowSortDropdown(false);
  };

  // Toggle in stock filter
  const toggleInStock = () => {
    updateFilters({
      ...filters,
      inStock: !filters.inStock
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    updateFilters({});
  };

  // Count active filters
  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  // Get selected category name
  const selectedCategory = availableCategories.find(cat => cat.id === filters.category);

  // Get selected sort option
  const selectedSort = SORT_OPTIONS.find(opt => opt.value === filters.sortBy) || SORT_OPTIONS[0];

  return (
    <div className={`search-filters ${className}`}>
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="
            flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg
            hover:bg-gray-50 transition-colors duration-200
          "
        >
          <Filter className="h-4 w-4" />
          <span className="font-medium">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-indigo-500 text-white text-xs rounded-full px-2 py-1">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={`h-4 w-4 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice || ''}
                onChange={(e) => handlePriceChange('min', e.target.value)}
                className="
                  flex-1 px-3 py-2 border border-gray-300 rounded-md
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  text-sm
                "
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={(e) => handlePriceChange('max', e.target.value)}
                className="
                  flex-1 px-3 py-2 border border-gray-300 rounded-md
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  text-sm
                "
              />
            </div>
          </div>

          {/* Category Filter */}
          {availableCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative">
                <button
                  onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                  className="
                    w-full px-3 py-2 border border-gray-300 rounded-md bg-white
                    text-left focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    flex items-center justify-between
                  "
                >
                  <span className="text-sm">
                    {selectedCategory ? selectedCategory.name : 'All Categories'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                </button>

                {showCategoryDropdown && (
                  <div className="
                    absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                    rounded-md shadow-lg max-h-48 overflow-y-auto z-10
                  ">
                    <button
                      onClick={() => handleCategoryChange(null)}
                      className="
                        w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between
                        text-sm
                      "
                    >
                      <span>All Categories</span>
                      {!filters.category && <Check className="h-4 w-4 text-indigo-500" />}
                    </button>
                    
                    {availableCategories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id)}
                        className="
                          w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between
                          text-sm
                        "
                      >
                        <div className="flex items-center space-x-2">
                          <span>{category.name}</span>
                          {category.productCount !== undefined && (
                            <span className="text-gray-400">({category.productCount})</span>
                          )}
                        </div>
                        {filters.category === category.id && (
                          <Check className="h-4 w-4 text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sort By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="
                  w-full px-3 py-2 border border-gray-300 rounded-md bg-white
                  text-left focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                  flex items-center justify-between
                "
              >
                <span className="text-sm">{selectedSort.label}</span>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {showSortDropdown && (
                <div className="
                  absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200
                  rounded-md shadow-lg z-10
                ">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className="
                        w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center justify-between
                        text-sm
                      "
                    >
                      <span>{option.label}</span>
                      {filters.sortBy === option.value && (
                        <Check className="h-4 w-4 text-indigo-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* In Stock Filter */}
          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.inStock || false}
                onChange={toggleInStock}
                className="
                  h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded
                "
              />
              <span className="text-sm font-medium text-gray-700">
                Show only available products
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {filters.minPrice && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Min: ฿{filters.minPrice}
              <button
                onClick={() => handlePriceChange('min', '')}
                className="ml-1 hover:text-indigo-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.maxPrice && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              Max: ฿{filters.maxPrice}
              <button
                onClick={() => handlePriceChange('max', '')}
                className="ml-1 hover:text-indigo-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedCategory && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
              {selectedCategory.name}
              <button
                onClick={() => handleCategoryChange(null)}
                className="ml-1 hover:text-indigo-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {filters.inStock && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Available only
              <button
                onClick={toggleInStock}
                className="ml-1 hover:text-green-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};