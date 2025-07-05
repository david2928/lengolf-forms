'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface AvailabilitySlot {
  time: string;
  status: 'available' | 'unavailable' | 'blocked' | 'override-unavailable' | 'override-available';
}

interface BookingSlot {
  id: string;
  customer_name: string;
  start_time: string;
  end_time: string;
  booking_date: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  package_name?: string;
  bay_number?: string;
  contact_number?: string;
}

interface DayData {
  date: string;
  dayOfWeek: number;
  isToday: boolean;
  availability: AvailabilitySlot[];
  bookings: BookingSlot[];
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_SLOTS = [
  '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', 
  '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'
];

interface CombinedCalendarViewProps {
  coachId?: string;
}

export function CombinedCalendarView({ coachId }: CombinedCalendarViewProps) {
  const [loading, setLoading] = useState(true);
  const [availabilityData, setAvailabilityData] = useState<any>(null);
  const [bookingsData, setBookingsData] = useState<any>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    return monday;
  });

  // Generate week dates
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  // Fetch data for the current week
  const fetchData = async () => {
    setLoading(true);
    try {
      const startDate = weekDates[0].toLocaleDateString('en-CA');
      const endDate = weekDates[6].toLocaleDateString('en-CA');

      // Fetch availability data
      const [weeklyRes, blocksRes, overridesRes] = await Promise.all([
        fetch(`/api/coaching/availability/weekly-schedule${coachId ? `?coach_id=${coachId}` : ''}`),
        fetch(`/api/coaching/availability/recurring-blocks${coachId ? `?coach_id=${coachId}` : ''}`),
        fetch(`/api/coaching/availability/date-overrides?start_date=${startDate}&end_date=${endDate}${coachId ? `&coach_id=${coachId}` : ''}`)
      ]);

      // Fetch bookings data
      const bookingsRes = await fetch(`/api/coaching/bookings?start_date=${startDate}&end_date=${endDate}${coachId ? `&coach_id=${coachId}` : ''}`);

      if (weeklyRes.ok && blocksRes.ok && overridesRes.ok && bookingsRes.ok) {
        const [weeklyData, blocksData, overridesData, bookingsDataRes] = await Promise.all([
          weeklyRes.json(),
          blocksRes.json(),
          overridesRes.json(),
          bookingsRes.json()
        ]);

        setAvailabilityData({
          weekly: weeklyData.weeklySchedule || [],
          blocks: blocksData.recurringBlocks || [],
          overrides: overridesData.dateOverrides || []
        });

        setBookingsData(bookingsDataRes.bookings || []);
      } else {
        toast.error('Failed to load calendar data');
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Error loading calendar data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentWeekStart, coachId]);

  // Calculate combined day data
  const weekData = useMemo((): DayData[] => {
    if (!availabilityData || !bookingsData) return [];

    const today = new Date().toDateString();

    return weekDates.map(date => {
      const dayOfWeek = date.getDay();
      const dateString = date.toLocaleDateString('en-CA'); // Use local date to avoid timezone issues
      const isToday = date.toDateString() === today;

      // Calculate availability for this day
      const weeklySchedule = availabilityData.weekly.find((s: any) => s.day_of_week === dayOfWeek);
      const dayBlocks = availabilityData.blocks.filter((b: any) => b.day_of_week === dayOfWeek);
      const dayOverrides = availabilityData.overrides.filter((o: any) => o.override_date === dateString);

      const availability: AvailabilitySlot[] = TIME_SLOTS.map(time => {
        let status: AvailabilitySlot['status'] = 'unavailable';

        // Apply weekly schedule
        if (weeklySchedule?.is_available) {
          const startTime = weeklySchedule.start_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
          const endTime = weeklySchedule.end_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
          if (time >= startTime && time < endTime) {
            status = 'available';
          }
        }

        // Apply recurring blocks
        for (const block of dayBlocks) {
          const blockStartTime = block.start_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
          const blockEndTime = block.end_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
          if (time >= blockStartTime && time < blockEndTime) {
            status = 'blocked';
            break;
          }
        }

        // Apply date overrides
        for (const override of dayOverrides) {
          if (override.start_time && override.end_time) {
            const overrideStartTime = override.start_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
            const overrideEndTime = override.end_time.substring(0, 5); // Convert HH:MM:SS to HH:MM
            if (time >= overrideStartTime && time < overrideEndTime) {
              status = override.override_type === 'unavailable' ? 'override-unavailable' : 'override-available';
              break;
            }
          }
        }

        return { time, status };
      });

      // Get bookings for this day (only non-cancelled bookings)
      const dayBookings = bookingsData.filter((b: any) => 
        b.booking_date === dateString && b.status !== 'cancelled'
      ).map((b: any) => {
        // Determine if booking is upcoming or completed based on date/time
        const bookingDateTime = new Date(`${b.booking_date}T${b.start_time}`);
        const now = new Date();
        const actualStatus = bookingDateTime > now ? 'upcoming' : 
                            bookingDateTime < now ? 'completed' : 
                            b.status;
        
        return {
          ...b,
          status: actualStatus
        };
      });

      return {
        date: dateString,
        dayOfWeek,
        isToday,
        availability,
        bookings: dayBookings
      };
    });
  }, [weekDates, availabilityData, bookingsData]);

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    setCurrentWeekStart(monday);
  };

  // Get status styling
  const getAvailabilityStyle = (status: AvailabilitySlot['status']) => {
    switch (status) {
      case 'available':
        return 'bg-green-50 border-green-200';
      case 'unavailable':
        return 'bg-gray-50 border-gray-200';
      case 'blocked':
        return 'bg-orange-50 border-orange-200';
      case 'override-unavailable':
        return 'bg-red-50 border-red-200';
      case 'override-available':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getBookingStyle = (booking: BookingSlot) => {
    switch (booking.status) {
      case 'upcoming':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      // Note: 'confirmed' was replaced with 'upcoming' to match BookingSlot interface
      default:
        return 'bg-blue-100 border-blue-300 text-blue-800'; // Default to blue for active bookings
    }
  };

  // Calculate week summary
  const weekSummary = useMemo(() => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const todayString = now.toLocaleDateString('en-CA');
    
    const confirmedBookings = weekData.reduce((sum, day) => 
      sum + day.bookings.filter(b => b.status !== 'cancelled').length, 0
    );
    const upcomingBookings = weekData.reduce((sum, day) => 
      sum + day.bookings.filter(b => b.status === 'upcoming').length, 0
    );
    
    // Only count future available slots (today's future slots + all future days)
    const availableSlots = weekData.reduce((sum, day) => {
      const dayAvailableSlots = day.availability.filter(a => {
        if (a.status !== 'available' && a.status !== 'override-available') return false;
        
        // For today, only count future time slots
        if (day.date === todayString) {
          return a.time >= currentTime;
        }
        // For future days, count all available slots
        return day.date > todayString;
      });
      return sum + dayAvailableSlots.length;
    }, 0);

    return { totalBookings: confirmedBookings, upcomingBookings, availableSlots };
  }, [weekData]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
        <p>Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Navigation and Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-medium">
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
            <CalendarIcon className="h-4 w-4 mr-1" />
            Today
          </Button>
        </div>

        {/* Week Summary */}
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded-full"></div>
            <span>{weekSummary.upcomingBookings} upcoming</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded-full"></div>
            <span>{weekSummary.availableSlots} available slots</span>
          </div>
          <div className="text-gray-600">
            {weekSummary.totalBookings} total bookings
          </div>
        </div>
      </div>

      {/* Combined Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Day Headers */}
        <div className="grid grid-cols-8 bg-gray-50 border-b">
          <div className="p-3 text-sm font-medium text-gray-700 border-r">Time</div>
          {weekData.map((day, index) => {
            const date = weekDates[index];
            return (
              <div key={day.date} className={`p-3 text-center border-r last:border-r-0 ${day.isToday ? 'bg-blue-50' : ''}`}>
                <div className="text-sm font-medium text-gray-900">
                  {DAYS_OF_WEEK[day.dayOfWeek]}
                </div>
                <div className={`text-xs ${day.isToday ? 'text-blue-600 font-medium' : 'text-gray-600'}`}>
                  {date.getDate()}
                </div>
                {day.bookings.length > 0 && (
                  <div className="text-xs text-blue-600 mt-1">
                    {day.bookings.length} booking{day.bookings.length > 1 ? 's' : ''}
                  </div>
                )}
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
            {weekData.map((day) => {
              const availabilitySlot = day.availability.find(a => a.time === time);
              const bookingsInSlot = day.bookings.filter(b => 
                time >= b.start_time && time < b.end_time
              );

              return (
                <div
                  key={`${day.date}-${time}`}
                  className={`relative p-2 border-r last:border-r-0 min-h-[60px] ${getAvailabilityStyle(availabilitySlot?.status || 'unavailable')}`}
                >

                  {/* Bookings Overlay */}
                  {bookingsInSlot.map((booking) => (
                    <div
                      key={booking.id}
                      className={`absolute inset-1 rounded text-xs p-1 border ${getBookingStyle(booking)}`}
                      title={`${booking.customer_name} - ${booking.start_time}-${booking.end_time}${booking.package_name ? ` (${booking.package_name})` : ''}`}
                    >
                      <div className="font-medium truncate">{booking.customer_name}</div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs opacity-75">{booking.start_time}</span>
                        {booking.bay_number && (
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            <span className="text-xs">{booking.bay_number}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Available Slot Indicator */}
                  {(availabilitySlot?.status === 'available' || availabilitySlot?.status === 'override-available') && bookingsInSlot.length === 0 && (
                    <div className="text-center text-green-600 text-xs font-medium mt-4">
                      Available
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-lg text-xs">
        <span className="font-medium text-gray-700">Legend:</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
          <span>Available</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-50 border border-gray-200 rounded"></div>
          <span>Unavailable</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-orange-50 border border-orange-200 rounded"></div>
          <span>Blocked</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
          <span>Upcoming Booking</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
          <span>Completed</span>
        </div>
      </div>
    </div>
  );
}