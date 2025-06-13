'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Search, X, Filter } from 'lucide-react'

interface InventorySearchFiltersProps {
  searchQuery: string
  selectedCategory: string
  onSearchChange: (query: string) => void
  onCategoryChange: (category: string) => void
  onClearFilters: () => void
  categories: string[]
  resultCounts: {
    total: number
    filtered: number
  }
}

export function InventorySearchFilters({
  searchQuery,
  selectedCategory,
  onSearchChange,
  onCategoryChange,
  onClearFilters,
  categories,
  resultCounts
}: InventorySearchFiltersProps) {
  const hasActiveFilters = searchQuery || selectedCategory !== 'all'

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products by name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-4"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
              onClick={() => onSearchChange('')}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <Select value={selectedCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearFilters}
            className="shrink-0"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      {/* Active Filters and Results Summary */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Active Filter Badges */}
        {searchQuery && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            &quot;{searchQuery}&quot;
            <button
              onClick={() => onSearchChange('')}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-2 w-2" />
            </button>
          </Badge>
        )}

        {selectedCategory !== 'all' && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Filter className="h-3 w-3" />
            {selectedCategory}
            <button
              onClick={() => onCategoryChange('all')}
              className="ml-1 hover:bg-muted rounded-full p-0.5"
            >
              <X className="h-2 w-2" />
            </button>
          </Badge>
        )}

        {/* Results Count */}
        <div className="text-sm text-muted-foreground ml-auto">
          {hasActiveFilters ? (
            <>
              Showing {resultCounts.filtered} of {resultCounts.total} products
            </>
          ) : (
            <>
              {resultCounts.total} products total
            </>
          )}
        </div>
      </div>
    </div>
  )
} 