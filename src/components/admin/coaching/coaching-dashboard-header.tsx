'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CoachingDashboardHeaderProps {
  onNewBooking: () => void;
}

export function CoachingDashboardHeader({ onNewBooking }: CoachingDashboardHeaderProps) {
  return (
    <div className="flex flex-col tablet:flex-row tablet:justify-between tablet:items-center mb-3 tablet:mb-4 gap-2 tablet:gap-4">
      <div>
        <h1 className="text-xl tablet:text-2xl font-bold text-gray-900">Coaching Booking Assistant</h1>
        <p className="text-gray-600 mt-1 text-xs tablet:text-sm">Help students find available coaching slots</p>
      </div>
      <div className="flex gap-2">
        <Button 
          className="bg-blue-600 hover:bg-blue-700 w-full tablet:w-auto text-sm"
          onClick={onNewBooking}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>
    </div>
  );
}