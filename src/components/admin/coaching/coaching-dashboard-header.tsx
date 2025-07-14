'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CoachingDashboardHeaderProps {
  onNewBooking: () => void;
}

export function CoachingDashboardHeader({ onNewBooking }: CoachingDashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Coaching Booking Assistant</h1>
        <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Help students find available coaching slots</p>
      </div>
      <div className="flex gap-2">
        <Button 
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          onClick={onNewBooking}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>
    </div>
  );
}