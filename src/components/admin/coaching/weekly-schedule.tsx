'use client';

import { useState } from 'react';
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
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [mobileView, setMobileView] = useState<'coach' | 'day'>('coach');
  const dayNames = getDayNames();

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const filteredCoaches = coaches.filter(coach => 
    selectedCoach === 'all' || coach.coach_id === selectedCoach
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg sm:text-xl">Weekly Schedule Overview</CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              Coach availability for the week of {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onWeekNavigate('prev')} className="p-1 sm:p-2">
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCurrentWeek} className="text-xs sm:text-sm px-2 sm:px-3">
              Current Week
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onWeekNavigate('next')} className="p-1 sm:p-2">
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
        
        {/* Mobile View Toggle */}
        <div className="mt-4 sm:hidden">
          <div className="flex gap-2">
            <Button
              variant={mobileView === 'coach' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMobileView('coach')}
              className="flex-1 text-xs"
            >
              By Coach
            </Button>
            <Button
              variant={mobileView === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMobileView('day')}
              className="flex-1 text-xs"
            >
              By Day
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Desktop View - Table */}
        <div className="hidden sm:block overflow-x-auto">
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
                          onMouseMove={handleMouseMove}
                        >
                          <div className="bg-gray-100 rounded-lg p-2 border border-gray-200">
                            <div className="text-xs text-gray-500">No Data</div>
                          </div>
                          {/* Hover Details for No Data */}
                          {hoveredSlot === slotId && (
                            <div className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-48 max-w-64 pointer-events-none" 
                                 style={{
                                   left: Math.min(mousePosition.x, window.innerWidth - 256) + 'px',
                                   top: Math.max(mousePosition.y - 120, 10) + 'px',
                                   transform: 'translateX(-50%)'
                                 }}>
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
                        onMouseMove={handleMouseMove}
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
                            <div className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-48 max-w-64 pointer-events-none"
                                 style={{
                                   left: Math.min(mousePosition.x, window.innerWidth - 256) + 'px',
                                   top: Math.max(mousePosition.y - 120, 10) + 'px',
                                   transform: 'translateX(-50%)'
                                 }}>
                              <div className="text-sm font-medium mb-2">
                                {coach.coach_display_name} - {formatDate(date)}
                              </div>
                              {dayData.slots && dayData.slots.length > 0 ? (
                                <div className="space-y-1">
                                  {dayData.slots.slice(0, 4).map(slot => (
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
                                  {dayData.slots.length > 4 && (
                                    <div className="text-xs text-gray-500 text-center">
                                      +{dayData.slots.length - 4} more slots
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

        {/* Mobile View - By Coach */}
        {mobileView === 'coach' && (
          <div className="sm:hidden space-y-4">
            {filteredCoaches.map(coach => (
              <Card key={coach.coach_id} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <h3 className="font-medium text-sm">{coach.coach_display_name}</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {weekDates.map((date, index) => {
                    const dateString = date.toLocaleDateString('en-CA');
                    const dayData = weeklySchedule[dateString]?.[coach.coach_id];
                    
                    return (
                      <div key={dateString} className={`p-3 rounded-lg border ${isToday(date) ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-xs font-medium">
                            {dayNames[index]}, {formatDate(date)}
                            {isToday(date) && <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">Today</Badge>}
                          </div>
                          {dayData && getStatusIcon(dayData.status)}
                        </div>
                        
                        {dayData ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium capitalize">
                                {dayData.status.replace('_', ' ')}
                              </span>
                              {dayData.total_hours > 0 && (
                                <span className="text-xs text-gray-600">
                                  ({dayData.total_hours - dayData.booked_hours}/{dayData.total_hours} slots)
                                </span>
                              )}
                            </div>
                            {dayData.next_available && (
                              <div className="text-xs font-medium text-green-600">
                                Next: {dayData.next_available}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500">No schedule configured</div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Mobile View - By Day */}
        {mobileView === 'day' && (
          <div className="sm:hidden space-y-4">
            {weekDates.map((date, index) => {
              const dateString = date.toLocaleDateString('en-CA');
              const daySchedule = weeklySchedule[dateString] || {};
              const coachesForDay = filteredCoaches.filter(coach => daySchedule[coach.coach_id]);
              
              return (
                <Card key={dateString} className={isToday(date) ? 'border-2 border-amber-200' : ''}>
                  <CardHeader className={`pb-3 ${isToday(date) ? 'bg-amber-50' : 'bg-gray-50'}`}>
                    <div className="text-sm font-medium">
                      {dayNames[index]}, {formatDate(date)}
                      {isToday(date) && <Badge variant="secondary" className="ml-2 text-[10px] px-1 py-0">Today</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-4">
                    {coachesForDay.length > 0 ? (
                      coachesForDay.map(coach => {
                        const dayData = daySchedule[coach.coach_id];
                        
                        return (
                          <div key={coach.coach_id} className="p-3 rounded-lg bg-gray-50 border">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-gray-500" />
                                <span className="text-xs font-medium">{coach.coach_display_name}</span>
                              </div>
                              {getStatusIcon(dayData.status)}
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs capitalize">
                                  {dayData.status.replace('_', ' ')}
                                </span>
                                {dayData.total_hours > 0 && (
                                  <span className="text-xs text-gray-600">
                                    ({dayData.total_hours - dayData.booked_hours}/{dayData.total_hours})
                                  </span>
                                )}
                              </div>
                              {dayData.next_available && (
                                <div className="text-xs font-medium text-green-600">
                                  Next: {dayData.next_available}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-500">
                        No coaches have availability for this day
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-1 sm:gap-2">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
            <span className="text-xs sm:text-sm">Available</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
            <span className="text-xs sm:text-sm">Partially</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
            <span className="text-xs sm:text-sm">Fully Booked</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            <span className="text-xs sm:text-sm">Unavailable</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}