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
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-medium">
            Week of {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h3>
          <Button variant="outline" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" onClick={goToCurrentWeek}>
          <CalendarIcon className="h-4 w-4 mr-2" />
          Current Week
        </Button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
        <span className="text-sm font-medium text-gray-700">Legend:</span>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span className="text-xs text-gray-600">Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
          <span className="text-xs text-gray-600">Unavailable</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-orange-100 border border-orange-300 rounded"></div>
          <span className="text-xs text-gray-600">Blocked</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span className="text-xs text-gray-600">Override Unavailable</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
          <span className="text-xs text-gray-600">Override Available</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Day Headers */}
        <div className="grid grid-cols-8 bg-gray-50 border-b">
          <div className="p-3 text-sm font-medium text-gray-700 border-r">Time</div>
          {dayAvailabilities.map((day, index) => {
            const date = weekDates[index];
            return (
              <div key={day.date} className={`p-3 text-center border-r last:border-r-0 ${day.isToday ? 'bg-blue-50' : ''}`}>
                <div className="text-sm font-medium text-gray-900">
                  {DAYS_OF_WEEK[day.dayOfWeek]}
                </div>
                <div className={`text-xs ${day.isToday ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
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

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-2">Weekly Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-600">Available Hours:</span>
            <div className="font-medium">
              {dayAvailabilities.reduce((total, day) => 
                total + day.timeSlots.filter(s => s.status === 'available' || s.status === 'override-available').length, 0
              )} hours
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Blocked Hours:</span>
            <div className="font-medium">
              {dayAvailabilities.reduce((total, day) => 
                total + day.timeSlots.filter(s => s.status === 'blocked' || s.status === 'override-unavailable').length, 0
              )} hours
            </div>
          </div>
          <div>
            <span className="text-sm text-gray-600">Override Changes:</span>
            <div className="font-medium">
              {dayAvailabilities.reduce((total, day) => 
                total + day.timeSlots.filter(s => s.status.startsWith('override')).length, 0
              )} slots
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}