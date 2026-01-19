'use client';

import React from 'react';
import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UnconfirmedBookingsCounterProps {
  count: number;
  isLoading: boolean;
  onClick: () => void;
  isMobile?: boolean;
}

export function UnconfirmedBookingsCounter({
  count,
  isLoading,
  onClick,
  isMobile = false
}: UnconfirmedBookingsCounterProps) {
  // Don't show if no unconfirmed bookings and not loading
  if (count === 0 && !isLoading) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size={isMobile ? 'sm' : 'default'}
      onClick={onClick}
      disabled={isLoading || count === 0}
      className={`
        relative flex items-center gap-2
        ${count > 0 ? 'border-amber-500 bg-amber-50 hover:bg-amber-100 text-amber-700' : ''}
        ${isMobile ? 'px-2' : 'px-3'}
      `}
    >
      <Phone className="h-4 w-4" />
      {isLoading ? (
        <span className={isMobile ? 'text-xs' : 'text-sm'}>...</span>
      ) : (
        <>
          <span className={`font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}>
            {count}
          </span>
          {!isMobile && (
            <span className="text-sm">to call</span>
          )}
        </>
      )}
      {/* Badge indicator for high priority */}
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
      )}
    </Button>
  );
}
