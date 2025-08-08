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
    <div className="grid grid-cols-3 gap-2 tablet:gap-4 mb-3 tablet:mb-4">
      <Card className="p-2 tablet:p-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 tablet:h-5 tablet:w-5 text-blue-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm tablet:text-lg font-bold text-blue-600">{packageHoursRemaining.toFixed(1)}h</div>
            <div className="text-xs text-gray-600 hidden tablet:block">Package Hours</div>
          </div>
        </div>
      </Card>

      <Card className="p-2 tablet:p-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 tablet:h-5 tablet:w-5 text-green-600 flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm tablet:text-lg font-bold text-green-600">{totalAvailableSlots}</div>
            <div className="text-xs text-gray-600 hidden tablet:block">Available Slots</div>
          </div>
        </div>
      </Card>

      <div className="relative">
        <Card 
          className="p-2 tablet:p-3 cursor-help hover:bg-gray-50 transition-colors"
          onMouseEnter={() => setHoveredCard('missing-schedule')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 tablet:h-5 tablet:w-5 text-red-600 flex-shrink-0" />
            <div className="min-w-0">
              <div className="text-sm tablet:text-lg font-bold text-red-600">{coachesWithoutSchedule}</div>
              <div className="text-xs text-gray-600 hidden tablet:block">Missing Schedule</div>
            </div>
          </div>
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