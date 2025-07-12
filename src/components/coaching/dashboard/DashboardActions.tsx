'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface DashboardActionsProps {
  onShowStudents: () => void;
  onShowBookings: () => void;
  onShowEarnings: () => void;
  selectedCoachId?: string;
}

export function DashboardActions({ onShowStudents, onShowBookings, onShowEarnings, selectedCoachId }: DashboardActionsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <Button 
        onClick={onShowStudents}
        variant="outline" 
        className="h-16 sm:h-20 text-left justify-start p-3 sm:p-4 hover:bg-blue-50 hover:border-blue-300 transition-colors"
      >
        <div className="min-w-0 w-full">
          <div className="font-semibold text-sm sm:text-base truncate">My Students</div>
          <div className="text-xs sm:text-sm text-muted-foreground truncate">
            View students & packages
          </div>
        </div>
      </Button>

      <Button 
        onClick={onShowBookings}
        variant="outline" 
        className="h-16 sm:h-20 text-left justify-start p-3 sm:p-4 hover:bg-green-50 hover:border-green-300 transition-colors"
      >
        <div className="min-w-0 w-full">
          <div className="font-semibold text-sm sm:text-base truncate">All Bookings</div>
          <div className="text-xs sm:text-sm text-muted-foreground truncate">
            View session history
          </div>
        </div>
      </Button>

      <Button 
        onClick={onShowEarnings}
        variant="outline" 
        className="h-16 sm:h-20 text-left justify-start p-3 sm:p-4 hover:bg-emerald-50 hover:border-emerald-300 transition-colors"
      >
        <div className="min-w-0 w-full">
          <div className="font-semibold text-sm sm:text-base truncate">All Earnings</div>
          <div className="text-xs sm:text-sm text-muted-foreground truncate">
            View earnings history
          </div>
        </div>
      </Button>

      <Link href={selectedCoachId ? `/coaching/availability?coach_id=${selectedCoachId}` : '/coaching/availability'}>
        <Button 
          variant="outline" 
          className="h-16 sm:h-20 text-left justify-start w-full p-3 sm:p-4 hover:bg-purple-50 hover:border-purple-300 transition-colors"
        >
          <div className="min-w-0 w-full">
            <div className="font-semibold text-sm sm:text-base truncate">Availability</div>
            <div className="text-xs sm:text-sm text-muted-foreground truncate">
              Manage schedule
            </div>
          </div>
        </Button>
      </Link>
    </div>
  );
} 