'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

interface CoachingDashboardHeaderProps {
  onNewBooking: () => void;
}

export function CoachingDashboardHeader({ onNewBooking }: CoachingDashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Coaching Booking Assistant</h1>
        <p className="text-gray-600 mt-2">Help students find available coaching slots</p>
      </div>
      <div className="flex gap-2">
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={onNewBooking}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>
    </div>
  );
}