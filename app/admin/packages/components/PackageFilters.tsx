'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface PackageFilters {
  search: string;
  customer_id?: string;
  package_type_id?: string;
  status?: string;
}

interface PackageType {
  id: number;
  name: string;
  display_name?: string;
}

interface PackageFiltersProps {
  filters: PackageFilters;
  packageTypes: PackageType[];
  onFiltersChange: (filters: Partial<PackageFilters>) => void;
  onClearFilters: () => void;
}

export const PackageFilters: React.FC<PackageFiltersProps> = ({
  filters,
  packageTypes,
  onFiltersChange,
  onClearFilters
}) => {
  const hasActiveFilters = filters.search || filters.package_type_id || filters.status;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Filters</h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-xs h-7 px-2"
          >
            <X className="h-3 w-3 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* All filters in one row */}
      <div className="flex flex-wrap gap-3">
        {/* Customer Name Search */}
        <div className="flex-1 min-w-[200px] max-w-sm">
          <Input
            id="customer-search"
            placeholder="Search by customer name..."
            value={filters.search || ''}
            onChange={(e) => 
              onFiltersChange({ search: e.target.value || undefined })
            }
            className="h-9"
          />
        </div>

        {/* Package Type Filter */}
        <div className="w-[200px]">
          <Select
            value={filters.package_type_id || "all"}
            onValueChange={(value) => 
              onFiltersChange({ package_type_id: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All package types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All package types</SelectItem>
              {packageTypes.map((type) => (
                <SelectItem key={type.id} value={type.id.toString()}>
                  {type.display_name || type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div className="w-[180px]">
          <Select
            value={filters.status || "all"}
            onValueChange={(value) => 
              onFiltersChange({ status: value === "all" ? undefined : value })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter Summary */}
      {hasActiveFilters && (
        <div className="pt-2 border-t">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-sm">
                <span>Customer: {filters.search}</span>
                <button
                  onClick={() => onFiltersChange({ search: undefined })}
                  className="ml-1 hover:bg-purple-100 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.package_type_id && (
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-sm">
                <span>
                  Type: {(() => {
                    const packageType = packageTypes.find(t => t.id.toString() === filters.package_type_id);
                    return packageType?.display_name || packageType?.name || `ID: ${filters.package_type_id}`;
                  })()}
                </span>
                <button
                  onClick={() => onFiltersChange({ package_type_id: undefined })}
                  className="ml-1 hover:bg-blue-100 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.status && (
              <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md text-sm">
                <span>
                  Status: {filters.status === 'active' ? 'Active' : 
                          filters.status === 'expiring' ? 'Expiring Soon' : 
                          filters.status === 'expired' ? 'Expired' : filters.status}
                </span>
                <button
                  onClick={() => onFiltersChange({ status: undefined })}
                  className="ml-1 hover:bg-green-100 rounded p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};