'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  X, 
  Settings,
  DollarSign,
  Package,
  Eye,
  TrendingUp
} from 'lucide-react';
import { 
  ProductFilters, 
  Category, 
  PRICE_RANGES,
  PROFIT_MARGIN_RANGES 
} from '@/types/product-management';
import { cn } from '@/lib/utils';

interface ProductFiltersComponentProps {
  filters: ProductFilters;
  onFiltersChange: (filters: Partial<ProductFilters>) => void;
  onClearFilters: () => void;
  categories: Category[];
  className?: string;
}

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <Badge variant="secondary" className="gap-1">
      {label}
      <Button
        variant="ghost"
        size="sm"
        className="h-auto p-0 hover:bg-transparent"
        onClick={onRemove}
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function SearchBar({ value, onChange, placeholder = "Search products...", className }: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10"
      />
    </div>
  );
}

export function ProductFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  categories,
  className
}: ProductFiltersComponentProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Get hierarchical categories for the dropdown
  const topLevelCategories = categories.filter(c => !c.parent_id);
  const getCategoryWithChildren = (parentId: string) => 
    categories.filter(c => c.parent_id === parentId);
  
  // Get sub-categories for selected category
  const selectedTopCategory = categories.find(c => c.id === filters.category_id);
  const subCategories = selectedTopCategory?.parent_id 
    ? categories.filter(c => c.parent_id === selectedTopCategory.parent_id)
    : categories.filter(c => c.parent_id === filters.category_id);

  // Count active filters
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search' && value) return true;
    if (key === 'category_id' && value) return true;
    if (key === 'is_active' && value !== undefined) return true;
    if (key === 'is_sim_usage' && value !== undefined) return true;
    if (key === 'is_custom_product' && value !== undefined) return true;
    if (key === 'show_in_staff_ui' && value !== undefined) return true;
    if (key === 'price_min' && value !== undefined) return true;
    if (key === 'price_max' && value !== undefined) return true;
    if (key === 'has_cost' && value !== undefined) return true;
    return false;
  }).length;

  // Generate filter chips
  const getFilterChips = () => {
    const chips = [];
    
    if (filters.search) {
      chips.push({
        label: `Search: "${filters.search}"`,
        onRemove: () => onFiltersChange({ search: '' })
      });
    }
    
    if (filters.category_id) {
      const category = categories.find(c => c.id === filters.category_id);
      if (category) {
        chips.push({
          label: `Category: ${category.name}`,
          onRemove: () => onFiltersChange({ category_id: undefined })
        });
      }
    }
    
    if (filters.is_active === false) {
      chips.push({
        label: 'Status: Inactive',
        onRemove: () => onFiltersChange({ is_active: undefined })
      });
    }
    
    if (filters.is_sim_usage === true) {
      chips.push({
        label: 'Simulator Usage',
        onRemove: () => onFiltersChange({ is_sim_usage: undefined })
      });
    }
    
    if (filters.is_custom_product === true) {
      chips.push({
        label: 'Custom Products',
        onRemove: () => onFiltersChange({ is_custom_product: undefined })
      });
    }
    
    if (filters.show_in_staff_ui === false) {
      chips.push({
        label: 'Hidden from Staff',
        onRemove: () => onFiltersChange({ show_in_staff_ui: undefined })
      });
    }
    
    if (filters.price_min !== undefined || filters.price_max !== undefined) {
      const min = filters.price_min || 0;
      const max = filters.price_max || '∞';
      chips.push({
        label: `Price: ฿${min} - ฿${max}`,
        onRemove: () => onFiltersChange({ price_min: undefined, price_max: undefined })
      });
    }
    
    if (filters.has_cost === false) {
      chips.push({
        label: 'Missing Cost Data',
        onRemove: () => onFiltersChange({ has_cost: undefined })
      });
    }
    
    return chips;
  };

  const filterChips = getFilterChips();

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search and Quick Filters */}
      <div className="space-y-3">
        {/* Search Bar - Full Width */}
        <SearchBar
          value={filters.search || ''}
          onChange={(value) => onFiltersChange({ search: value })}
          className="w-full"
        />
        
        {/* Quick Filters - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Select
            value={filters.category_id || 'all'}
            onValueChange={(value) => onFiltersChange({ 
              category_id: value === 'all' ? undefined : value 
            })}
          >
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {topLevelCategories
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((parentCategory) => {
                const children = getCategoryWithChildren(parentCategory.id);
                return [
                  <SelectItem key={parentCategory.id} value={parentCategory.id}>
                    {parentCategory.name}
                  </SelectItem>,
                  ...children
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((childCategory) => (
                    <SelectItem key={childCategory.id} value={childCategory.id}>
                      ├─ {childCategory.name}
                    </SelectItem>
                  ))
                ];
              }).flat()}
            </SelectContent>
          </Select>

          <Select
            value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
            onValueChange={(value) => onFiltersChange({ 
              is_active: value === 'all' ? undefined : value === 'active'
            })}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Popover open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative w-full sm:w-auto">
                <Filter className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Advanced</span>
                <span className="sm:hidden">More Filters</span>
                {activeFiltersCount > 0 && (
                  <Badge 
                    variant="default" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm sm:text-base">Advanced Filters</h4>
                  <Button variant="ghost" size="sm" onClick={onClearFilters} className="text-xs sm:text-sm">
                    Clear All
                  </Button>
                </div>

                {/* Price Range */}
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                    Price Range
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs text-gray-500">Min Price</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={filters.price_min || ''}
                        onChange={(e) => onFiltersChange({ 
                          price_min: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Max Price</Label>
                      <Input
                        type="number"
                        placeholder="∞"
                        value={filters.price_max || ''}
                        onChange={(e) => onFiltersChange({ 
                          price_max: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        className="text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Product Properties */}
                <div className="space-y-3">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                    Product Properties
                  </Label>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sim_usage"
                        checked={filters.is_sim_usage === true}
                        onCheckedChange={(checked) => onFiltersChange({ 
                          is_sim_usage: checked ? true : undefined 
                        })}
                      />
                      <Label htmlFor="sim_usage" className="text-xs sm:text-sm">Simulator Usage</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="custom_product"
                        checked={filters.is_custom_product === true}
                        onCheckedChange={(checked) => onFiltersChange({ 
                          is_custom_product: checked ? true : undefined 
                        })}
                      />
                      <Label htmlFor="custom_product" className="text-xs sm:text-sm">Custom Products</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="missing_cost"
                        checked={filters.has_cost === false}
                        onCheckedChange={(checked) => onFiltersChange({ 
                          has_cost: checked ? false : undefined 
                        })}
                      />
                      <Label htmlFor="missing_cost" className="text-xs sm:text-sm">Missing Cost Data</Label>
                    </div>
                  </div>
                </div>

                {/* Visibility */}
                <div className="space-y-3">
                  <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    Visibility
                  </Label>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hidden_from_staff"
                      checked={filters.show_in_staff_ui === false}
                      onCheckedChange={(checked) => onFiltersChange({ 
                        show_in_staff_ui: checked ? false : undefined 
                      })}
                    />
                    <Label htmlFor="hidden_from_staff" className="text-xs sm:text-sm">Hidden from Staff</Label>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filter Chips */}
      {filterChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          {filterChips.map((chip, index) => (
            <FilterChip key={index} {...chip} />
          ))}
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Clear all
          </Button>
        </div>
      )}
    </div>
  );
}