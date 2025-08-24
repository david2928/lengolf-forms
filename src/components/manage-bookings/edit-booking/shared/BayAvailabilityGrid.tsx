/**
 * Bay Availability Grid Component
 * Shows availability status for all bays at selected time
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import type { BayAvailability } from '../utils/types';

interface BayAvailabilityGridProps {
  bayAvailabilityData: BayAvailability[];
  isCheckingAllBays: boolean;
  selectedBay: string;
  onBaySelect: (bay: string) => void;
  onRefresh: () => void;
  showRefreshButton?: boolean;
}

export function BayAvailabilityGrid({
  bayAvailabilityData,
  isCheckingAllBays,
  selectedBay,
  onBaySelect,
  onRefresh,
  showRefreshButton = true
}: BayAvailabilityGridProps) {
  if (bayAvailabilityData.length === 0 && !isCheckingAllBays) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          Bay Availability for Selected Time
        </h4>
        {showRefreshButton && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isCheckingAllBays}
            className="gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isCheckingAllBays ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {isCheckingAllBays ? (
          // Loading state
          Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-gray-50"
            >
              <span className="text-sm font-medium">Bay {i + 1}</span>
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ))
        ) : (
          // Bay availability data
          bayAvailabilityData.map((bay) => (
            <Button
              key={bay.name}
              type="button"
              variant={selectedBay === bay.name ? "default" : "outline"}
              className={`
                flex items-center justify-between p-3 h-auto
                ${bay.isAvailable 
                  ? selectedBay === bay.name 
                    ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100' 
                    : 'border-green-300 hover:border-green-400 hover:bg-green-50'
                  : 'border-red-300 bg-red-50 text-red-700 opacity-75 cursor-not-allowed hover:bg-red-50'
                }
              `}
              onClick={() => bay.isAvailable && onBaySelect(bay.name)}
              disabled={!bay.isAvailable}
            >
              <span className="text-sm font-medium">{bay.name}</span>
              {bay.isAvailable ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </Button>
          ))
        )}
      </div>
      
      {bayAvailabilityData.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Available
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-red-500" />
            Unavailable
          </div>
        </div>
      )}
    </div>
  );
}