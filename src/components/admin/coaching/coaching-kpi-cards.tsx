'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, UserX } from 'lucide-react';
import { Coach, WeeklySchedule } from '@/types/coaching';
import { getCoachesWithoutScheduleTooltip } from '@/lib/coachingUtils';

interface CoachingKPICardsProps {
  packageHoursRemaining: number;
  totalAvailableSlots: number;
  coachesWithoutSchedule: number;
  coaches: Coach[];
  weeklySchedule: WeeklySchedule;
}

export function CoachingKPICards({ 
  packageHoursRemaining, 
  totalAvailableSlots, 
  coachesWithoutSchedule,
  coaches,
  weeklySchedule
}: CoachingKPICardsProps) {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-gray-600">Package Hours</CardTitle>
              <div className="text-2xl font-bold text-blue-600">{packageHoursRemaining.toFixed(1)}h</div>
            </div>
            <BookOpen className="h-8 w-8 text-blue-600" />
          </div>
          <CardDescription>Total hours in active packages</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium text-gray-600">Available Slots</CardTitle>
              <div className="text-2xl font-bold text-green-600">{totalAvailableSlots}</div>
            </div>
            <Clock className="h-8 w-8 text-green-600" />
          </div>
          <CardDescription>Available slots in the next 21 days across all coaches</CardDescription>
        </CardHeader>
      </Card>

      <div className="relative">
        <Card 
          className="cursor-help hover:bg-gray-50 transition-colors"
          onMouseEnter={() => setHoveredCard('missing-schedule')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium text-gray-600">Missing Schedule</CardTitle>
                <div className="text-2xl font-bold text-red-600">{coachesWithoutSchedule}</div>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
            <CardDescription>Coaches need availability setup</CardDescription>
          </CardHeader>
        </Card>
        
        {/* Custom Tooltip */}
        {hoveredCard === 'missing-schedule' && (
          <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 mt-2 top-full left-0 min-w-80 max-w-96">
            <div className="text-sm font-medium mb-2">Schedule Status</div>
            <div className="text-xs text-gray-600 whitespace-pre-line">
              {getCoachesWithoutScheduleTooltip(coaches, weeklySchedule)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}