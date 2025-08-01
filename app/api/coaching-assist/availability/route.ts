import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Staff access - all authenticated users can access coaching assistance data
    // No admin check required

    const { searchParams } = new URL(request.url);
    const selectedDate = searchParams.get('date') || new Date().toLocaleDateString('en-CA');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Get all active coaches
    const { data: allCoaches, error: coachesError } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, coach_name, coach_display_name, email')
      .eq('is_coach', true)
      .order('coach_display_name');

    if (coachesError) {
      return NextResponse.json({ error: 'Failed to fetch coaches' }, { status: 500 });
    }

    // Deduplicate coaches by coach_display_name (use the first occurrence)
    const coaches = allCoaches?.reduce((acc, coach) => {
      const displayName = coach.coach_display_name || coach.coach_name;
      if (!acc.find(existing => (existing.coach_display_name || existing.coach_name) === displayName)) {
        acc.push(coach);
      }
      return acc;
    }, [] as typeof allCoaches) || [];

    // OPTIMIZATION: Get all data in batch queries to reduce API calls
    const coachIds = (coaches || []).map(c => c.id);
    // Use the selected date or today if no specific date range is provided
    const targetDate = fromDate || selectedDate;
    const today = targetDate || new Date().toLocaleDateString('en-CA');
    const todayDayOfWeek = new Date(today).getDay();
    
    // Batch fetch all availability data
    const [weeklySchedulesResult, dateOverridesResult, recurringBlocksResult, todayBookingsResult, allStudentBookingsResult] = await Promise.all([
      supabase.from('coach_weekly_schedules').select('*').in('coach_id', coachIds),
      supabase.from('coach_date_overrides').select('*').in('coach_id', coachIds).eq('override_date', today),
      supabase.from('coach_recurring_blocks').select('*').in('coach_id', coachIds).eq('day_of_week', todayDayOfWeek),
      supabase.from('bookings').select('*').eq('date', today).eq('status', 'confirmed'),
      supabase.from('bookings').select('name, booking_type').eq('status', 'confirmed').ilike('booking_type', '%coach%')
    ]);

    // Process availability slots efficiently
    const availabilitySlots = (coaches || []).map((coach) => {
      // Find coach's schedules and blocks
      const weeklySchedule = weeklySchedulesResult.data?.find(s => s.coach_id === coach.id && s.day_of_week === todayDayOfWeek);
      const dateOverride = dateOverridesResult.data?.find(d => d.coach_id === coach.id);
      const recurringBlocks = recurringBlocksResult.data?.filter(b => b.coach_id === coach.id) || [];
      
      // Get today's bookings for this coach (all bookings first)
      const allTodayBookings = todayBookingsResult.data?.filter(b => 
        b.booking_type && b.booking_type.toLowerCase().includes((coach.coach_display_name || coach.coach_name).toLowerCase())
      ) || [];
      
      // Determine availability based on priority: override > weekly schedule
      let isAvailableToday = false;
      let availableHoursActual = 0;
      let nextAvailable = null;
      let scheduleStart = 0;
      let scheduleEnd = 0;

      if (dateOverride) {
        // Date override takes precedence
        isAvailableToday = dateOverride.override_type === 'available';
        if (isAvailableToday && dateOverride.start_time && dateOverride.end_time) {
          scheduleStart = parseInt(dateOverride.start_time.split(':')[0]);
          scheduleEnd = parseInt(dateOverride.end_time.split(':')[0]);
          availableHoursActual = scheduleEnd - scheduleStart;
          nextAvailable = dateOverride.start_time;
        }
      } else if (weeklySchedule && weeklySchedule.is_available) {
        // Use weekly schedule
        isAvailableToday = true;
        scheduleStart = parseInt(weeklySchedule.start_time.split(':')[0]);
        scheduleEnd = parseInt(weeklySchedule.end_time.split(':')[0]);
        availableHoursActual = scheduleEnd - scheduleStart;
        
        // Subtract recurring blocks
        const blockedHours = recurringBlocks.reduce((sum, block) => {
          const blockStart = parseInt(block.start_time.split(':')[0]);
          const blockEnd = parseInt(block.end_time.split(':')[0]);
          return sum + (blockEnd - blockStart);
        }, 0);
        
        availableHoursActual = Math.max(0, availableHoursActual - blockedHours);
      } else {
        // No availability setup - show as unavailable
        isAvailableToday = false;
        availableHoursActual = 0;
      }

      // Filter bookings to only count those within scheduled hours
      const todayBookings = allTodayBookings.filter(booking => {
        if (!isAvailableToday) return false;
        const bookingStartHour = parseInt(booking.start_time.split(':')[0]);
        return bookingStartHour >= scheduleStart && bookingStartHour < scheduleEnd;
      });

      // Calculate utilization and availability
      const bookedHours = todayBookings.reduce((sum, booking) => sum + (booking.duration || 1), 0);
      
      // Get next available slot with filtered bookings
      if (weeklySchedule && weeklySchedule.is_available) {
        nextAvailable = getNextAvailableSlotReal(weeklySchedule, recurringBlocks, todayBookings);
      }

      // Get unique students count from all bookings (not just today)
      const allStudentBookings = allStudentBookingsResult.data?.filter(b => 
        b.booking_type && b.booking_type.toLowerCase().includes((coach.coach_display_name || coach.coach_name).toLowerCase())
      ) || [];
      const uniqueStudents = new Set(allStudentBookings.map(b => b.name)).size;
      
      // Calculate utilization: if no availability configured, show 0%
      // If coach has bookings but no schedule, still show 0% (they shouldn't be working)
      const realUtilizationRate = availableHoursActual > 0 ? (bookedHours / availableHoursActual) * 100 : 0;

      return {
        coach_id: coach.id,
        coach_name: coach.coach_display_name || coach.coach_name,
        next_available: nextAvailable,
        duration_available: Math.max(0, availableHoursActual - bookedHours),
        is_available_today: isAvailableToday,
        total_students: uniqueStudents,
        utilization_rate: realUtilizationRate
      };
    });

    // OPTIMIZATION: Generate weekly schedule data more efficiently
    const weeklyAvailability: { [date: string]: { [coachId: string]: any } } = {};
    
    // Determine date range to process
    let weekDates = [];
    
    if (fromDate && toDate) {
      // Use date range for Next Available tab
      const startDate = new Date(fromDate);
      const endDate = new Date(toDate);
      
      // Generate all dates in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        weekDates.push(currentDate.toLocaleDateString('en-CA'));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // Use week view for Weekly Schedule tab (existing behavior)
      const date = new Date(selectedDate);
      const monday = new Date(date.setDate(date.getDate() - date.getDay() + 1));
      
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDay = new Date(monday);
        currentDay.setDate(monday.getDate() + dayOffset);
        weekDates.push(currentDay.toLocaleDateString('en-CA'));
      }
    }
    
    // Get all bookings for the week in one query
    const { data: weekBookings } = await supabase
      .from('bookings')
      .select('date, start_time, duration, booking_type')
      .in('date', weekDates)
      .eq('status', 'confirmed');
    
    // Get all weekly schedules for all coaches
    const { data: allWeeklySchedules } = await supabase
      .from('coach_weekly_schedules')
      .select('*')
      .in('coach_id', coachIds);
    
    // Get all date overrides for the week
    const { data: allDateOverrides } = await supabase
      .from('coach_date_overrides')
      .select('*')
      .in('coach_id', coachIds)
      .in('override_date', weekDates);
    
    // Get all recurring blocks
    const { data: allRecurringBlocks } = await supabase
      .from('coach_recurring_blocks')
      .select('*')
      .in('coach_id', coachIds);
    
    // Process each day efficiently
    weekDates.forEach((dayString, dayIndex) => {
      const currentDay = new Date(dayString);
      const dayOfWeek = currentDay.getDay();
      
      weeklyAvailability[dayString] = {};
      
      for (const coach of coaches || []) {
        // Get bookings for this coach on this day (initially all bookings)
        const allDayBookings = weekBookings?.filter(b => 
          b.date === dayString && 
          b.booking_type && 
          b.booking_type.toLowerCase().includes((coach.coach_display_name || coach.coach_name).toLowerCase())
        ) || [];

        // Get coach's availability settings for this day
        const weeklySchedule = allWeeklySchedules?.find(s => 
          s.coach_id === coach.id && s.day_of_week === dayOfWeek
        );

        // Check for date overrides
        const dateOverride = allDateOverrides?.find(d => 
          d.coach_id === coach.id && d.override_date === dayString
        );

        // Check recurring blocks
        const recurringBlocks = allRecurringBlocks?.filter(b => 
          b.coach_id === coach.id && b.day_of_week === dayOfWeek
        ) || [];

        // Determine availability for this day
        let isCoachAvailable = false;
        let availableHours = 0;
        let scheduleStart = 0;
        let scheduleEnd = 0;

        if (dateOverride) {
          // Date override takes precedence
          isCoachAvailable = dateOverride.override_type === 'available';
          if (isCoachAvailable && dateOverride.start_time && dateOverride.end_time) {
            scheduleStart = parseInt(dateOverride.start_time.split(':')[0]);
            scheduleEnd = parseInt(dateOverride.end_time.split(':')[0]);
            availableHours = scheduleEnd - scheduleStart;
          }
        } else if (weeklySchedule && weeklySchedule.is_available) {
          // Use weekly schedule
          isCoachAvailable = true;
          scheduleStart = parseInt(weeklySchedule.start_time.split(':')[0]);
          scheduleEnd = parseInt(weeklySchedule.end_time.split(':')[0]);
          availableHours = scheduleEnd - scheduleStart;
          
          // Subtract recurring blocks
          const blockedHours = recurringBlocks.reduce((sum, block) => {
            const blockStart = parseInt(block.start_time.split(':')[0]);
            const blockEnd = parseInt(block.end_time.split(':')[0]);
            return sum + (blockEnd - blockStart);
          }, 0);
          
          availableHours = Math.max(0, availableHours - blockedHours);
        }

        // Filter bookings to only count those within scheduled hours
        const dayBookings = allDayBookings.filter(booking => {
          if (!isCoachAvailable) return false;
          const bookingStartHour = parseInt(booking.start_time.split(':')[0]);
          return bookingStartHour >= scheduleStart && bookingStartHour < scheduleEnd;
        });

        // Calculate booking status
        const totalBookedHours = dayBookings.reduce((sum, booking) => sum + (booking.duration || 1), 0);
        
        // IMPORTANT: If no schedule exists (not dateOverride and not weeklySchedule), show as unavailable
        if (!dateOverride && !weeklySchedule) {
          // No availability configured for this coach on this day
          weeklyAvailability[dayString][coach.id] = {
            status: 'unavailable',
            start_time: null,
            end_time: null,
            available_hours: 0,
            booked_hours: 0,
            bookings: []
          };
        } else if (!isCoachAvailable || availableHours === 0) {
          weeklyAvailability[dayString][coach.id] = {
            status: 'unavailable',
            start_time: null,
            end_time: null,
            available_hours: 0,
            booked_hours: 0,
            bookings: []
          };
        } else {
          // Determine status
          let status = 'available';
          if (totalBookedHours >= availableHours * 0.8) {
            status = 'fully_booked';
          } else if (totalBookedHours > 0) {
            status = 'partially_booked';
          }

          // Include schedule information
          const schedule = dateOverride ? {
            status,
            start_time: dateOverride.start_time,
            end_time: dateOverride.end_time,
            available_hours: availableHours,
            booked_hours: totalBookedHours,
            bookings: dayBookings.map(b => ({ start_time: b.start_time, duration: b.duration }))
          } : {
            status,
            start_time: weeklySchedule.start_time,
            end_time: weeklySchedule.end_time,
            available_hours: availableHours,
            booked_hours: totalBookedHours,
            bookings: dayBookings.map(b => ({ start_time: b.start_time, duration: b.duration }))
          };

          weeklyAvailability[dayString][coach.id] = schedule;
        }
      }
    });

    // Calculate week start for response
    let weekStart;
    if (fromDate && toDate) {
      weekStart = fromDate;
    } else {
      const date = new Date(selectedDate);
      const monday = new Date(date.setDate(date.getDate() - date.getDay() + 1));
      weekStart = monday.toLocaleDateString('en-CA');
    }

    return NextResponse.json({
      availability_slots: availabilitySlots,
      weekly_availability: weeklyAvailability,
      selected_date: selectedDate,
      week_start: weekStart,
      date_range: fromDate && toDate ? { from: fromDate, to: toDate } : null,
      processed_dates: weekDates.length
    });

  } catch (error) {
    console.error('Error in coaching-assist availability API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to find next available slot using real availability data
function getNextAvailableSlotReal(weeklySchedule: any, recurringBlocks: any[], bookings: any[]): string | null {
  if (!weeklySchedule || !weeklySchedule.is_available) return null;
  
  const startHour = parseInt(weeklySchedule.start_time.split(':')[0]);
  const endHour = parseInt(weeklySchedule.end_time.split(':')[0]);
  
  for (let hour = startHour; hour < endHour; hour++) {
    const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
    
    // Check if this time is blocked by recurring blocks
    const isBlocked = recurringBlocks.some(block => {
      const blockStart = parseInt(block.start_time.split(':')[0]);
      const blockEnd = parseInt(block.end_time.split(':')[0]);
      return hour >= blockStart && hour < blockEnd;
    });
    
    if (isBlocked) continue;
    
    // Check if this time is booked
    const isBooked = bookings.some(booking => {
      const bookingStart = parseInt(booking.start_time.split(':')[0]);
      const bookingEnd = bookingStart + (booking.duration || 1);
      return hour >= bookingStart && hour < bookingEnd;
    });
    
    if (!isBooked) {
      return timeSlot;
    }
  }
  
  return null; // No availability
}