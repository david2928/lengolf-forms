/**
 * Customer Filters Component
 * CMS-010: Customer List UI - Filtering Interface
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SimpleCalendar } from '@/components/ui/simple-calendar';
import type { CustomerFilters as CustomerFiltersType } from '@/hooks/useCustomerManagement';
import { Search, X, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface CustomerFiltersProps {
  filters: CustomerFiltersType;
  onFiltersChange: (filters: Partial<CustomerFiltersType>) => void;
  loading: boolean;
}

export function CustomerFilters({ filters, onFiltersChange, loading }: CustomerFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search || '');

  // Handle search input with debounce effect
  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
  };

  const handleSearchSubmit = () => {
    onFiltersChange({ search: localSearch });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearchSubmit();
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setLocalSearch('');
    onFiltersChange({
      search: '',
      isActive: undefined,
      registrationDateFrom: undefined,
      registrationDateTo: undefined,
      lastVisitFrom: undefined,
      lastVisitTo: undefined,
      preferredContactMethod: undefined,
      page: 1
    });
  };

  // Check if any filters are active
  const hasActiveFilters = !!(
    filters.search ||
    filters.isActive !== undefined ||
    filters.registrationDateFrom ||
    filters.registrationDateTo ||
    filters.lastVisitFrom ||
    filters.lastVisitTo ||
    (filters.preferredContactMethod && filters.preferredContactMethod !== 'all')
  );

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Search and basic controls */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers by name, phone, email, or customer code..."
                value={localSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {/* Search button */}
          <Button onClick={handleSearchSubmit} disabled={loading}>
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>

          {/* Advanced filters toggle */}
          <Button
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {/* Customer Status */}
            <div className="space-y-2">
              <Label>Customer Status</Label>
              <Select
                value={filters.isActive?.toString() || 'all'}
                onValueChange={(value) => 
                  onFiltersChange({ 
                    isActive: value === 'all' ? undefined : value === 'true' 
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="true">Active Only</SelectItem>
                  <SelectItem value="false">Inactive Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Contact Method */}
            <div className="space-y-2">
              <Label>Contact Method</Label>
              <Select
                value={filters.preferredContactMethod || 'all'}
                onValueChange={(value) => 
                  onFiltersChange({ 
                    preferredContactMethod: value === 'all' ? undefined : value as any
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="All methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="LINE">LINE</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Registration Date From */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Registered From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.registrationDateFrom ? format(new Date(filters.registrationDateFrom), 'PPP') : 'Select date...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <SimpleCalendar
                    mode="single"
                    selected={filters.registrationDateFrom ? new Date(filters.registrationDateFrom) : undefined}
                    onSelect={(date) =>
                      onFiltersChange({
                        registrationDateFrom: date?.toISOString().split('T')[0] || undefined
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Registration Date To */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Registered To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.registrationDateTo ? format(new Date(filters.registrationDateTo), 'PPP') : 'Select date...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <SimpleCalendar
                    mode="single"
                    selected={filters.registrationDateTo ? new Date(filters.registrationDateTo) : undefined}
                    onSelect={(date) =>
                      onFiltersChange({
                        registrationDateTo: date?.toISOString().split('T')[0] || undefined
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Last Visit From */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Last Visit From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.lastVisitFrom ? format(new Date(filters.lastVisitFrom), 'PPP') : 'Select date...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <SimpleCalendar
                    mode="single"
                    selected={filters.lastVisitFrom ? new Date(filters.lastVisitFrom) : undefined}
                    onSelect={(date) =>
                      onFiltersChange({
                        lastVisitFrom: date?.toISOString().split('T')[0] || undefined
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Last Visit To */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Last Visit To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.lastVisitTo ? format(new Date(filters.lastVisitTo), 'PPP') : 'Select date...'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <SimpleCalendar
                    mode="single"
                    selected={filters.lastVisitTo ? new Date(filters.lastVisitTo) : undefined}
                    onSelect={(date) =>
                      onFiltersChange({
                        lastVisitTo: date?.toISOString().split('T')[0] || undefined
                      })
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Active filters summary */}
        {hasActiveFilters && (
          <div className="text-sm text-muted-foreground">
            Active filters: {[
              filters.search && 'Search',
              filters.isActive !== undefined && 'Status',
              filters.preferredContactMethod && filters.preferredContactMethod !== 'all' && 'Contact Method',
              filters.registrationDateFrom && 'Registration From',
              filters.registrationDateTo && 'Registration To',
              filters.lastVisitFrom && 'Last Visit From',
              filters.lastVisitTo && 'Last Visit To'
            ].filter(Boolean).join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}