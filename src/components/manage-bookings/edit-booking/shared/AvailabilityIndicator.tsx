/**
 * Availability Indicator Component
 * Reusable component for showing booking availability status
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { AvailabilityStatus } from '../utils/types';

interface AvailabilityIndicatorProps {
  status: AvailabilityStatus;
  isSlotAvailable: boolean;
  allowOverwrite: boolean;
}

export function AvailabilityIndicator({ 
  status, 
  isSlotAvailable, 
  allowOverwrite 
}: AvailabilityIndicatorProps) {
  const getStatusDisplay = () => {
    switch (status) {
      case 'checking':
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking availability...
          </Badge>
        );
      case 'available':
        return (
          <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Available
          </Badge>
        );
      case 'unavailable':
        return allowOverwrite ? (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Overwriting existing booking
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Not available
          </Badge>
        );
      case 'overridden':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Availability check overridden
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="gap-1 border-orange-300 text-orange-700">
            <AlertCircle className="h-3 w-3" />
            Check failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusDisplay()}
    </div>
  );
}