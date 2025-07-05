'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, User, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { type Coach, type WeeklySchedule } from '@/types/coaching';
import { formatDate, isToday, getDayNames, getAvailabilityStatusColor } from '@/lib/coachingUtils';

interface WeeklyScheduleProps {
  coaches: Coach[];
  weeklySchedule: WeeklySchedule;
  selectedCoach: string;
  weekDates: Date[];
  hoveredSlot: string | null;
  onWeekNavigate: (direction: 'prev' | 'next') => void;
  onCurrentWeek: () => void;
  onSlotHover: (slotId: string | null) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'available':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'partially_booked':
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case 'fully_booked':
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <XCircle className="h-4 w-4 text-gray-400" />;
  }
};

export function WeeklySchedule({
  coaches,
  weeklySchedule,
  selectedCoach,
  weekDates,
  hoveredSlot,
  onWeekNavigate,
  onCurrentWeek,
  onSlotHover
}: WeeklyScheduleProps) {
  const dayNames = getDayNames();

  const filteredCoaches = coaches.filter(coach => 
    selectedCoach === 'all' || coach.coach_id === selectedCoach
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Weekly Schedule Overview</CardTitle>
            <CardDescription>
              Coach availability for the week of {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onWeekNavigate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onCurrentWeek}>
              Current Week
            </Button>
            <Button variant="outline" size="sm" onClick={() => onWeekNavigate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 font-medium text-gray-900 w-32">Coach</th>
                {weekDates.map((date, index) => (
                  <th key={date.toISOString()} className="text-center p-3 font-medium text-gray-900 min-w-32">
                    <div className="space-y-1">
                      <div className={`text-sm ${isToday(date) ? 'text-blue-600 font-semibold' : ''}`}>
                        {dayNames[index]}
                      </div>
                      <div className={`text-xs ${isToday(date) ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                        {formatDate(date)}
                      </div>
                      {isToday(date) && (
                        <Badge variant="secondary" className="text-xs">Today</Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredCoaches.map(coach => (
                <tr key={coach.coach_id} className="border-t">
                  <td className="p-3 font-medium bg-gray-50">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      {coach.coach_display_name}
                    </div>
                  </td>
                  {weekDates.map(date => {
                    const dateString = date.toLocaleDateString('en-CA');
                    const dayData = weeklySchedule[dateString]?.[coach.coach_id];
                    const slotId = `${coach.coach_id}-${dateString}`;
                    
                    if (!dayData) {
                      return (
                        <td 
                          key={dateString} 
                          className="p-3 text-center relative"
                          onMouseEnter={() => onSlotHover(slotId)}
                          onMouseLeave={() => onSlotHover(null)}
                        >
                          <div className="bg-gray-100 rounded-lg p-2 border border-gray-200">
                            <div className="text-xs text-gray-500">No Data</div>
                          </div>
                          {/* Hover Details for No Data */}
                          {hoveredSlot === slotId && (
                            <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 mb-2 bottom-full left-1/2 transform -translate-x-1/2 min-w-48 max-w-64">
                              <div className="text-sm font-medium mb-2">
                                {coach.coach_display_name} - {formatDate(date)}
                              </div>
                              <div className="text-xs text-gray-500">
                                <div className="mb-1">No schedule configured for this day</div>
                                <div className="text-xs text-gray-400">
                                  No weekly schedule or date override found for {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    }

                    return (
                      <td 
                        key={dateString} 
                        className="p-3 text-center relative"
                        onMouseEnter={() => onSlotHover(slotId)}
                        onMouseLeave={() => onSlotHover(null)}
                      >
                        <div className={`rounded-lg p-3 border transition-all duration-200 cursor-pointer ${getAvailabilityStatusColor(dayData.status)}`}>
                          <div className="flex items-center justify-center gap-1 mb-2">
                            {getStatusIcon(dayData.status)}
                            <span className="text-xs font-medium capitalize">
                              {dayData.status.replace('_', ' ')}
                            </span>
                          </div>
                          
                          {dayData.total_hours > 0 && (
                            <div className="space-y-1">
                              <div className="text-xs text-gray-600">
                                {dayData.total_hours - dayData.booked_hours}/{dayData.total_hours} slots
                              </div>
                              {dayData.next_available && (
                                <div className="text-xs font-medium text-green-600">
                                  Next: {dayData.next_available}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Hover Details */}
                          {hoveredSlot === slotId && (
                            <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 mb-2 bottom-full left-1/2 transform -translate-x-1/2 min-w-48 max-w-64">
                              <div className="text-sm font-medium mb-2">
                                {coach.coach_display_name} - {formatDate(date)}
                              </div>
                              {dayData.slots && dayData.slots.length > 0 ? (
                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                  {dayData.slots.slice(0, 6).map(slot => (
                                    <div 
                                      key={slot.start_time}
                                      className={`flex justify-between text-xs p-1 rounded ${
                                        slot.is_booked ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                                      }`}
                                    >
                                      <span>{slot.start_time}</span>
                                      <span>{slot.is_booked ? 'Booked' : 'Available'}</span>
                                    </div>
                                  ))}
                                  {dayData.slots.length > 6 && (
                                    <div className="text-xs text-gray-500 text-center">
                                      +{dayData.slots.length - 6} more slots
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500">
                                  {dayData.status === 'unavailable' ? (
                                    <div>
                                      <div className="mb-1">No schedule configured</div>
                                      <div className="text-xs text-gray-400">
                                        Coach has no availability set for {new Date(date).toLocaleDateString('en-US', { weekday: 'long' })}
                                      </div>
                                    </div>
                                  ) : 'No slots available'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-6 mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm">Partially Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm">Fully Booked</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-gray-400" />
            <span className="text-sm">Unavailable</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}