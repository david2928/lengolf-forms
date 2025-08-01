'use client';

import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CustomerFilters } from '@/types/pos';

export interface CustomerSearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filters: CustomerFilters;
  onFiltersChange: (filters: Partial<CustomerFilters>) => void;
  loading?: boolean;
  placeholder?: string;
}

export const CustomerSearchBar: React.FC<CustomerSearchBarProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  loading = false,
  placeholder = 'Search customers by name, phone, or customer code...'
}) => {
  // Local search state - only updates parent on submit/clear
  const [localSearch, setLocalSearch] = useState(searchTerm);

  // Handle search input with immediate local update
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  // Submit search to parent
  const handleSearchSubmit = () => {
    onSearchChange(localSearch);
  };

  // Handle Enter key in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // Clear search
  const handleClearSearch = () => {
    setLocalSearch('');
    onSearchChange('');
  };

  return (
    <div className="w-full">
      {/* Search Bar */}
      <div className="flex gap-3">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={placeholder}
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="pl-10 pr-10 h-12 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              disabled={loading}
            />
            {/* Clear button inside input */}
            {localSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100 rounded-full"
              >
                <X className="h-3 w-3 text-gray-400 hover:text-gray-600" />
              </Button>
            )}
          </div>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearchSubmit} 
          disabled={loading}
          variant="outline"
          className="h-12 px-6"
        >
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Active Search Display */}
      {searchTerm && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-500">Searching for:</span>
          <span className="text-sm font-medium text-gray-900">&ldquo;{searchTerm}&rdquo;</span>
        </div>
      )}
    </div>
  );
};