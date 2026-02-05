'use client';

// OpportunityFilters component - Filter controls for the opportunities list
// Mobile-optimized with horizontal scroll for status tabs

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  OpportunityFilterState,
  OpportunityStatus,
  OpportunityPriority,
  OpportunityType,
} from '@/types/chat-opportunities';
import type { ChannelType } from '@/types/chat-opportunities';
import { getOpportunityTypeLabel, getStatusLabel } from '@/types/chat-opportunities';

interface OpportunityFiltersProps {
  filters: OpportunityFilterState;
  onFiltersChange: (filters: Partial<OpportunityFilterState>) => void;
  onReset: () => void;
  stats?: {
    pending: number;
    contacted: number;
    converted: number;
    lost: number;
    dismissed: number;
  };
}

const priorityOptions: { value: OpportunityPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const typeOptions: { value: OpportunityType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'coaching_inquiry', label: 'Coaching' },
  { value: 'pricing_inquiry', label: 'Pricing' },
  { value: 'booking_failed', label: 'Booking' },
  { value: 'package_interest', label: 'Package' },
  { value: 'equipment_inquiry', label: 'Equipment' },
  { value: 'general_interest', label: 'General' },
];

export function OpportunityFilters({
  filters,
  onFiltersChange,
  onReset,
  stats,
}: OpportunityFiltersProps) {
  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.priority !== 'all' ||
    filters.type !== 'all' ||
    filters.channel !== 'all';

  const additionalFilterCount = [
    filters.priority !== 'all' ? 1 : 0,
    filters.type !== 'all' ? 1 : 0,
    filters.channel !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-2">
      {/* Status tabs - horizontal scroll on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {['all', 'pending', 'contacted', 'converted', 'dismissed'].map((status) => (
          <Button
            key={status}
            variant={filters.status === status ? 'default' : 'ghost'}
            size="sm"
            className={`h-7 px-2 sm:px-3 text-xs whitespace-nowrap flex-shrink-0 ${
              filters.status === status
                ? 'bg-[#1a4d2e] text-white shadow-sm hover:bg-[#2a6d4e]'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            onClick={() => onFiltersChange({ status: status as OpportunityFilterState['status'] })}
          >
            {status === 'all' ? 'All' : getStatusLabel(status as OpportunityStatus)}
            {status === 'pending' && stats?.pending !== undefined && stats.pending > 0 && (
              <span className="ml-1 text-xs opacity-80">
                {stats.pending}
              </span>
            )}
            {status === 'contacted' && stats?.contacted !== undefined && stats.contacted > 0 && (
              <span className="ml-1 text-xs opacity-80">
                {stats.contacted}
              </span>
            )}
            {status === 'converted' && stats?.converted !== undefined && stats.converted > 0 && (
              <span className="ml-1 text-xs opacity-80">
                {stats.converted}
              </span>
            )}
            {status === 'dismissed' && stats?.dismissed !== undefined && stats.dismissed > 0 && (
              <span className="ml-1 text-xs opacity-80">
                {stats.dismissed}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* More filters dropdown - combines priority, type, channel */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-7 px-2 flex-shrink-0 ${additionalFilterCount > 0 ? 'border-blue-500 bg-blue-50' : ''}`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {additionalFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 w-4 p-0 text-xs flex items-center justify-center rounded-full">
                {additionalFilterCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Priority */}
          <div className="px-2 py-1.5 text-xs font-medium text-gray-500">Priority</div>
          {priorityOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFiltersChange({ priority: option.value })}
              className={filters.priority === option.value ? 'bg-blue-50' : ''}
            >
              {option.label}
              {filters.priority === option.value && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}

          <div className="my-1 border-t" />

          {/* Type */}
          <div className="px-2 py-1.5 text-xs font-medium text-gray-500">Type</div>
          {typeOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onFiltersChange({ type: option.value })}
              className={filters.type === option.value ? 'bg-blue-50' : ''}
            >
              {option.label}
              {filters.type === option.value && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}

          {hasActiveFilters && (
            <>
              <div className="my-1 border-t" />
              <DropdownMenuItem onClick={onReset} className="text-gray-500">
                <RotateCcw className="mr-2 h-3.5 w-3.5" />
                Reset filters
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default OpportunityFilters;
