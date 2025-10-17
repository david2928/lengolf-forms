'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Coach,
  WeeklySchedule,
  AvailableSlot,
  StudentsData,
  GroupedAvailableSlots,
  CoachGroupedSlots
} from '@/types/coaching';

interface UseCoachingDashboardProps {
  selectedWeek: Date;
  selectedStartDate: Date;
  selectedEndDate: Date;
}

export function useCoachingDashboard({ selectedWeek, selectedStartDate, selectedEndDate }: UseCoachingDashboardProps) {
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({});
  const [nextAvailableSlots, setNextAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [packageHoursRemaining, setPackageHoursRemaining] = useState(0);
  const [allStudentsData, setAllStudentsData] = useState<{ [coachId: string]: StudentsData }>({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [totalAvailableSlots, setTotalAvailableSlots] = useState(0);
  const [coachesWithoutSchedule, setCoachesWithoutSchedule] = useState(0);
  const [groupedSlots, setGroupedSlots] = useState<GroupedAvailableSlots>({});
  const [coachGroupedSlots, setCoachGroupedSlots] = useState<CoachGroupedSlots>({});
  const isInitialLoad = useRef(true);

  const fetchAllStudentsData = useCallback(async () => {
    try {
      setLoadingStudents(true);
      const studentsData: { [coachId: string]: StudentsData } = {};
      
      for (const coach of coaches) {
        const response = await fetch(`/api/coaching-assist/students?coach_id=${coach.coach_id}`);
        if (response.ok) {
          const data = await response.json();
          studentsData[coach.coach_id] = data;
        }
      }
      
      setAllStudentsData(studentsData);
    } catch (error) {
      console.error('Error fetching students data:', error);
    } finally {
      setLoadingStudents(false);
    }
  }, [coaches]);

  const processAvailabilityData = useCallback((data: any, coachesData: Coach[]) => {
    const schedule: WeeklySchedule = {};
    const nextSlots: AvailableSlot[] = [];

    console.log('Processing availability data:', data);
    console.log('Coaches data:', coachesData);
    console.log('Weekly availability keys:', Object.keys(data.weekly_availability || {}));

    // Process weekly availability data from the API
    if (data.weekly_availability) {
      Object.keys(data.weekly_availability).forEach(dateString => {
        schedule[dateString] = {};
        
        Object.keys(data.weekly_availability[dateString]).forEach(coachId => {
          const availabilityData = data.weekly_availability[dateString][coachId];
          const coach = coachesData.find(c => c.coach_id === coachId);
          
          // Handle both old format (string) and new format (object)
          const status = typeof availabilityData === 'string' ? availabilityData : availabilityData.status;
          const coachSchedule = typeof availabilityData === 'object' ? availabilityData : null;
          
          if (coach) {
            // Generate time slots based on the coach's availability status
            const slots = coachSchedule ? 
              generateTimeSlotsFromSchedule(coach, dateString, coachSchedule) :
              generateTimeSlotsForDate(coach, dateString, status);
            const totalHours = slots.length;
            const bookedSlots = slots.filter(slot => slot.is_booked);
            const availableSlots = slots.filter(slot => !slot.is_booked);
            
            // Add all future available slots for this coach (including today's future slots)
            const futureSlots = availableSlots.filter(slot => {
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Reset to beginning of today
              const slotDate = new Date(slot.date);
              slotDate.setHours(0, 0, 0, 0);
              
              // Include slots from today onwards
              return slotDate >= today;
            });

            console.log(`Coach ${coach.coach_display_name} on ${dateString}:`, {
              status,
              coachSchedule,
              slots: slots.length,
              availableSlots: availableSlots.length,
              futureSlots: futureSlots.length
            });

            // Add all future slots (not just the first one)
            futureSlots.forEach(slot => {
              nextSlots.push(slot);
            });

            schedule[dateString][coachId] = {
              status: status === 'available' ? 'available' : 
                     status === 'partially_booked' ? 'partially_booked' :
                     status === 'fully_booked' ? 'fully_booked' : 'unavailable',
              slots,
              total_hours: coachSchedule ? coachSchedule.available_hours : totalHours,
              booked_hours: coachSchedule ? coachSchedule.booked_hours : bookedSlots.length,
              next_available: futureSlots[0]?.start_time
            };
          }
        });
      });
    }

    setWeeklySchedule(schedule);
    
    // Sort and set next available slots
    const sortedSlots = nextSlots.sort((a, b) => {
      const dateTimeA = new Date(`${a.date}T${a.start_time}`);
      const dateTimeB = new Date(`${b.date}T${b.start_time}`);
      return dateTimeA.getTime() - dateTimeB.getTime();
    });
    setNextAvailableSlots(sortedSlots);

    // Group slots by date and time for better organization
    const grouped: GroupedAvailableSlots = {};
    const coachGrouped: CoachGroupedSlots = {};
    
    sortedSlots.forEach(slot => {
      // Group by date/time
      if (!grouped[slot.date]) {
        grouped[slot.date] = {};
      }
      if (!grouped[slot.date][slot.start_time]) {
        grouped[slot.date][slot.start_time] = [];
      }
      grouped[slot.date][slot.start_time].push(slot);

      // Group by coach/date/time
      if (!coachGrouped[slot.coach_id]) {
        coachGrouped[slot.coach_id] = {
          coach_name: slot.coach_name,
          dates: {}
        };
      }
      if (!coachGrouped[slot.coach_id].dates[slot.date]) {
        coachGrouped[slot.coach_id].dates[slot.date] = {};
      }
      if (!coachGrouped[slot.coach_id].dates[slot.date][slot.start_time]) {
        coachGrouped[slot.coach_id].dates[slot.date][slot.start_time] = [];
      }
      coachGrouped[slot.coach_id].dates[slot.date][slot.start_time].push(slot);
    });
    
    setGroupedSlots(grouped);
    setCoachGroupedSlots(coachGrouped);

    // Calculate KPIs
    const totalSlots = Object.values(schedule).reduce((total, daySchedule) => {
      return total + Object.values(daySchedule).reduce((dayTotal, coachData) => {
        return dayTotal + coachData.slots.filter(slot => !slot.is_booked).length;
      }, 0);
    }, 0);
    setTotalAvailableSlots(totalSlots);

    // Count coaches without schedule
    const coachesWithSchedule = new Set();
    Object.values(schedule).forEach(daySchedule => {
      Object.keys(daySchedule).forEach(coachId => {
        if (daySchedule[coachId] && daySchedule[coachId].status !== 'unavailable') {
          coachesWithSchedule.add(coachId);
        }
      });
    });
    setCoachesWithoutSchedule(coachesData.length - coachesWithSchedule.size);
  }, []);

  const fetchStaticData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch coaches and package data that doesn't change with week selection
      const [coachesRes, packageHoursRes] = await Promise.all([
        fetch('/api/coaching-assist/coaches'),
        fetch('/api/coaching-assist/package-hours')
      ]);
      
      if (coachesRes.ok) {
        const data = await coachesRes.json();
        setCoaches(data.coaches || []);
      }

      if (packageHoursRes.ok) {
        const packageData = await packageHoursRes.json();
        setPackageHoursRemaining(packageData.total_hours_remaining || 0);
      }

    } catch (error) {
      console.error('Error fetching static data:', error);
      setError('Failed to load coaching data');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailabilityData = useCallback(async () => {
    try {
      // Only show loading for initial load, not for week changes
      if (isInitialLoad.current) {
        setLoading(true);
      }
      setError(null);

      const startDateStr = selectedStartDate.toLocaleDateString('en-CA');
      const endDateStr = selectedEndDate.toLocaleDateString('en-CA');
      const weekStr = selectedWeek.toLocaleDateString('en-CA');

      const availabilityUrl = (startDateStr !== weekStr || endDateStr !== weekStr) ?
        `/api/coaching-assist/availability?fromDate=${startDateStr}&toDate=${endDateStr}` :
        `/api/coaching-assist/availability?date=${weekStr}`;

      console.log('Fetching availability with URL:', availabilityUrl);

      const availabilityRes = await fetch(availabilityUrl);

      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        processAvailabilityData(availabilityData, coaches);
      }

      isInitialLoad.current = false;

    } catch (error) {
      console.error('Error fetching availability data:', error);
      setError('Failed to load availability data');
    } finally {
      setLoading(false);
    }
  }, [selectedStartDate, selectedEndDate, selectedWeek, coaches, processAvailabilityData]);

  const generateTimeSlotsForDate = (coach: Coach, dateString: string, status: string): AvailableSlot[] => {
    const slots: AvailableSlot[] = [];
    
    // Don't generate any slots for unavailable status
    if (status === 'unavailable') {
      return slots;
    }

    // If we don't have schedule data, we can't generate accurate slots
    // Return empty array to avoid showing incorrect time slots
    console.warn(`No schedule data available for coach ${coach.coach_display_name} on ${dateString}`);
    return slots;
  };

  const generateTimeSlotsFromSchedule = (coach: Coach, dateString: string, schedule: any): AvailableSlot[] => {
    const slots: AvailableSlot[] = [];
    
    if (!schedule || !schedule.start_time || !schedule.end_time) {
      return slots;
    }

    // Parse start and end times
    const startHour = parseInt(schedule.start_time.split(':')[0]);
    const endHour = parseInt(schedule.end_time.split(':')[0]);
    
    // Get booked slots from schedule
    const bookedSlots = new Set();
    if (schedule.bookings) {
      schedule.bookings.forEach((booking: any) => {
        const bookingStartHour = parseInt(booking.start_time.split(':')[0]);
        for (let i = 0; i < (booking.duration || 1); i++) {
          bookedSlots.add(bookingStartHour + i);
        }
      });
    }

    // Generate slots for each hour in the schedule
    for (let hour = startHour; hour < endHour; hour++) {
      const time = `${hour.toString().padStart(2, '0')}:00`;
      const isBooked = bookedSlots.has(hour);
      
      slots.push({
        coach_id: coach.coach_id,
        coach_name: coach.coach_display_name,
        date: dateString,
        start_time: time,
        end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
        duration_hours: 1,
        is_today: dateString === new Date().toLocaleDateString('en-CA'),
        is_booked: isBooked,
        booking_customer: isBooked ? 'Student' : undefined
      });
    }

    return slots;
  };

  // Initial load - fetch coaches and package data
  useEffect(() => {
    fetchStaticData();
  }, []);

  // Fetch availability data when week/date selection changes
  useEffect(() => {
    if (coaches.length > 0) {
      fetchAvailabilityData();
    }
  }, [selectedWeek, selectedStartDate, selectedEndDate, coaches, fetchAvailabilityData]);

  useEffect(() => {
    if (coaches.length > 0) {
      fetchAllStudentsData();
    }
  }, [coaches, fetchAllStudentsData]);

  return {
    coaches,
    weeklySchedule,
    nextAvailableSlots,
    loading,
    error,
    packageHoursRemaining,
    allStudentsData,
    loadingStudents,
    totalAvailableSlots,
    coachesWithoutSchedule,
    groupedSlots,
    coachGroupedSlots,
    refetch: () => {
      fetchStaticData();
      if (coaches.length > 0) {
        fetchAvailabilityData();
      }
    }
  };
}