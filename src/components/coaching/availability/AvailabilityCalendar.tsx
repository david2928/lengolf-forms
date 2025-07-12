'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface RecurringBlock {
  title: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface DateOverride {
  override_date: string;
  start_time?: string;
  end_time?: string;
  override_type: 'unavailable' | 'available' | 'custom';
  title?: string;
}

interface TimeSlot {
  time: string;
  status: 'available' | 'unavailable' | 'blocked' | 'override-unavailable' | 'override-available';
  title?: string;
}

interface DayAvailability {
  date: string;
  dayOfWeek: number;
  isToday: boolean;
  timeSlots: TimeSlot[];
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

interface AvailabilityCalendarProps {
  coachId: string;
}

export function AvailabilityCalendar({ coachId }: AvailabilityCalendarProps) {
  const [weeklySchedules, setWeeklySchedules] = useState<WeeklySchedule[]>([]);
  const [recurringBlocks, setRecurringBlocks] = useState<RecurringBlock[]>([]);
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Start week on Monday
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    return monday;
  });

  // Generate week dates starting from Monday
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  // Fetch all availability data
  const fetchAvailabilityData = async () => {
    setLoading(true);
    try {
      const [weeklyRes, blocksRes, overridesRes] = await Promise.all([
        fetch(`/api/coaching/availability/weekly-schedule?coach_id=${coachId}`),
        fetch(`/api/coaching/availability/recurring-blocks?coach_id=${coachId}`),
        fetch(`/api/coaching/availability/date-overrides?coach_id=${coachId}&start_date=${weekDates[0].toISOString().split('T')[0]}&end_date=${weekDates[6].toISOString().split('T')[0]}`)
      ]);

      if (weeklyRes.ok) {
        const weeklyData = await weeklyRes.json();
        setWeeklySchedules(weeklyData.weeklySchedule || []);
      }

      if (blocksRes.ok) {
        const blocksData = await blocksRes.json();
        setRecurringBlocks(blocksData.recurringBlocks || []);
      }

      if (overridesRes.ok) {
        const overridesData = await overridesRes.json();
        setDateOverrides(overridesData.dateOverrides || []);
      }
    } catch (error) {
      console.error('Error fetching availability data:', error);
      toast.error('Error loading availability data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailabilityData();
  }, [currentWeekStart]);

  // Calculate availability for each day
  const dayAvailabilities = useMemo((): DayAvailability[] => {
    const today = new Date().toDateString();
    
    return weekDates.map(date => {
      const dayOfWeek = date.getDay();
      const dateString = date.toISOString().split('T')[0];
      const isToday = date.toDateString() === today;

      // Get weekly schedule for this day
      const weeklySchedule = weeklySchedules.find(s => s.day_of_week === dayOfWeek);
      
      // Get recurring blocks for this day
      const dayBlocks = recurringBlocks.filter(b => b.day_of_week === dayOfWeek);
      
      // Get date overrides for this specific date
      const dayOverrides = dateOverrides.filter(o => o.override_date === dateString);

      // Calculate time slots
      const timeSlots: TimeSlot[] = TIME_SLOTS.map(time => {
        // Check if this time falls within weekly schedule
        let status: TimeSlot['status'] = 'unavailable';
        let title: string | undefined;

        if (weeklySchedule?.is_available) {
          const startTime = weeklySchedule.start_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
          const endTime = weeklySchedule.end_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
          if (time >= startTime && time < endTime) {
            status = 'available';
          }
        }

        // Apply recurring blocks (all are unavailable now)
        for (const block of dayBlocks) {
          const blockStartTime = block.start_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
          const blockEndTime = block.end_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
          if (time >= blockStartTime && time < blockEndTime) {
            status = 'blocked';
            title = block.title;
            break;
          }
        }

        // Apply date overrides (highest priority)
        for (const override of dayOverrides) {
          if (override.start_time && override.end_time) {
            const overrideStartTime = override.start_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
            const overrideEndTime = override.end_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
            if (time >= overrideStartTime && time < overrideEndTime) {
              status = override.override_type === 'unavailable' ? 'override-unavailable' : 'override-available';
              title = override.title;
              break;
            }
          } else if (override.override_type === 'custom') {
            // Custom overrides affect the whole day display but not individual time slots
            if (time === TIME_SLOTS[0]) {
              title = override.title;
            }
          }
        }

        return { time, status, title };
      });

      return {
        date: dateString,
        dayOfWeek,
        isToday,
        timeSlots
      };
    });
  }, [weekDates, weeklySchedules, recurringBlocks, dateOverrides]);

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  // Go to current week
  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    setCurrentWeekStart(monday);
  };

  // Get status styling
  const getStatusStyling = (status: TimeSlot['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'unavailable':
        return 'bg-gray-100 text-gray-600';
      case 'override-unavailable':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'override-available':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'blocked':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  // Get status label
  const getStatusLabel = (status: TimeSlot['status']) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'unavailable':
        return 'Unavailable';
      case 'override-unavailable':
        return 'Override: Unavailable';
      case 'override-available':
        return 'Override: Available';
      case 'blocked':
        return 'Blocked';
      default:
        return 'Unavailable';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p>Loading availability calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Calendar Header - Mobile Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center justify-center sm:justify-start gap-2 sm:gap-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-base sm:text-lg font-medium text-center">
            <span className="hidden sm:inline">Week of </span>
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
          <CalendarIcon className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Current Week</span>
        </Button>
      </div>

      {/* Legend - Mobile Responsive */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
        <span className="col-span-2 sm:col-span-1 text-sm font-medium text-gray-700 mb-2 sm:mb-0">Legend:</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-xs text-gray-600">Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span className="text-xs text-gray-600">Unavailable</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-100 border border-orange-300 rounded"></div>
          <span className="text-xs text-gray-600">Blocked</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-xs text-gray-600">Override Off</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-xs text-gray-600">Override On</span>
        </div>
      </div>

      {/* Desktop Grid View - Hidden on mobile */}
      <div className="hidden lg:block">
        <div className="border rounded-lg overflow-hidden bg-white">
          {/* Day Headers */}
          <div className="grid grid-cols-8 bg-gray-50 border-b">
            <div className="p-3 text-sm font-medium text-gray-700 border-r">Time</div>
            {dayAvailabilities.map((day, index) => {
              const date = weekDates[index];
              return (
                <div key={day.date} className={`p-3 text-center border-r last:border-r-0 ${day.isToday ? 'bg-amber-50' : ''}`}>
                  <div className="text-sm font-medium text-gray-900">
                    {DAYS_OF_WEEK[day.dayOfWeek]}
                  </div>
                  <div className={`text-xs ${day.isToday ? 'text-amber-600 font-medium' : 'text-gray-600'}`}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Slots */}
          {TIME_SLOTS.map((time) => (
            <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
              <div className="p-3 text-sm text-gray-700 border-r bg-gray-50 flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {time}
              </div>
              {dayAvailabilities.map((day) => {
                const slot = day.timeSlots.find(s => s.time === time)!;
                return (
                  <div
                    key={`${day.date}-${time}`}
                    className={`p-2 border-r last:border-r-0 min-h-[48px] flex items-center justify-center ${getStatusStyling(slot.status)}`}
                    title={slot.title ? `${getStatusLabel(slot.status)}: ${slot.title}` : getStatusLabel(slot.status)}
                  >
                    {slot.title && (
                      <div className="text-xs text-center truncate w-full">
                        {slot.title}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Card View - Shown on mobile/tablet */}
      <div className="lg:hidden space-y-3">
        {dayAvailabilities.map((day, index) => {
          const date = weekDates[index];
          const availableSlots = day.timeSlots.filter(s => s.status === 'available');
          const blockedSlots = day.timeSlots.filter(s => s.status === 'blocked' || s.status === 'override-unavailable');
          const overrideSlots = day.timeSlots.filter(s => s.status.startsWith('override'));
          const regularAvailableCount = availableSlots.length;
          const overrideAvailableCount = day.timeSlots.filter(s => s.status === 'override-available').length;
          const totalAvailableCount = regularAvailableCount + overrideAvailableCount;
          
          return (
            <div key={day.date} className={`border rounded-lg bg-white overflow-hidden ${day.isToday ? 'ring-2 ring-amber-200 bg-amber-50' : ''}`}>
              {/* Day Header */}
              <div className={`px-4 py-3 border-b ${day.isToday ? 'bg-amber-100 border-amber-200' : 'bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-semibold ${day.isToday ? 'text-amber-900' : 'text-gray-900'}`}>
                      {DAYS_OF_WEEK[day.dayOfWeek]}
                    </h4>
                    <p className={`text-sm ${day.isToday ? 'text-amber-700' : 'text-gray-600'}`}>
                      {date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      {day.isToday && <span className="ml-1 text-xs">(Today)</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${day.isToday ? 'text-amber-900' : 'text-gray-900'}`}>
                      {totalAvailableCount}h
                    </div>
                    <div className={`text-xs ${day.isToday ? 'text-amber-700' : 'text-gray-600'}`}>
                      Available
                    </div>
                  </div>
                </div>
              </div>

              {/* Day Content */}
              <div className="p-4 space-y-4">
                {/* Regular Available Hours */}
                {regularAvailableCount > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-green-900 mb-2 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      Available ({regularAvailableCount} hours)
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {availableSlots.map((slot) => (
                        <span 
                          key={slot.time} 
                          className={`px-2 py-1 text-xs rounded ${getStatusStyling(slot.status)}`}
                          title={slot.title || getStatusLabel(slot.status)}
                        >
                          {slot.time}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Override Available Hours */}
                {overrideAvailableCount > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                      Override Available ({overrideAvailableCount} hours)
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {day.timeSlots.filter(s => s.status === 'override-available').map((slot) => (
                        <span 
                          key={slot.time} 
                          className={`px-2 py-1 text-xs rounded ${getStatusStyling(slot.status)}`}
                          title={slot.title || getStatusLabel(slot.status)}
                        >
                          {slot.time} {slot.title && `(${slot.title})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Blocked Hours */}
                {blockedSlots.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-red-900 mb-2 flex items-center">
                      <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                      Blocked ({blockedSlots.length} hours)
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {blockedSlots.map((slot) => (
                        <span 
                          key={slot.time} 
                          className={`px-2 py-1 text-xs rounded ${getStatusStyling(slot.status)}`}
                          title={slot.title || getStatusLabel(slot.status)}
                        >
                          {slot.time} {slot.title && `(${slot.title})`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {totalAvailableCount === 0 && blockedSlots.length === 0 && overrideSlots.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No availability set for this day</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary - Mobile Responsive */}
      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
        <h4 className="font-medium mb-3">Weekly Summary</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white rounded p-3 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-900">
              {dayAvailabilities.reduce((total, day) => 
                total + day.timeSlots.filter(s => s.status === 'available' || s.status === 'override-available').length, 0
              )}
            </div>
            <div className="text-xs sm:text-sm text-green-700">Available Hours</div>
          </div>
          <div className="bg-white rounded p-3 text-center">
            <div className="text-xl sm:text-2xl font-bold text-red-900">
              {dayAvailabilities.reduce((total, day) => 
                total + day.timeSlots.filter(s => s.status === 'blocked' || s.status === 'override-unavailable').length, 0
              )}
            </div>
            <div className="text-xs sm:text-sm text-red-700">Blocked Hours</div>
          </div>
          <div className="bg-white rounded p-3 text-center">
            <div className="text-xl sm:text-2xl font-bold text-blue-900">
              {dayAvailabilities.reduce((total, day) => 
                total + day.timeSlots.filter(s => s.status.startsWith('override')).length, 0
              )}
            </div>
            <div className="text-xs sm:text-sm text-blue-700">Override Slots</div>
          </div>
        </div>
      </div>
    </div>
  );
}