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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Button 
        onClick={onShowStudents}
        variant="outline" 
        className="h-20 text-left justify-start"
      >
        <div>
          <div className="font-semibold">My Students</div>
          <div className="text-sm text-muted-foreground">View students and packages</div>
        </div>
      </Button>

      <Button 
        onClick={onShowBookings}
        variant="outline" 
        className="h-20 text-left justify-start"
      >
        <div>
          <div className="font-semibold">All Bookings</div>
          <div className="text-sm text-muted-foreground">View session history</div>
        </div>
      </Button>

      <Button 
        onClick={onShowEarnings}
        variant="outline" 
        className="h-20 text-left justify-start"
      >
        <div>
          <div className="font-semibold">All Earnings</div>
          <div className="text-sm text-muted-foreground">View earnings history</div>
        </div>
      </Button>

      <Link href={selectedCoachId ? `/coaching/availability?coach_id=${selectedCoachId}` : '/coaching/availability'}>
        <Button 
          variant="outline" 
          className="h-20 text-left justify-start w-full"
        >
          <div>
            <div className="font-semibold">Availability</div>
            <div className="text-sm text-muted-foreground">Manage schedule</div>
          </div>
        </Button>
      </Link>
    </div>
  );
} 