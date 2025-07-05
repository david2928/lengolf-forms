'use client';

import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetchData();
  }, [selectedWeek, selectedStartDate, selectedEndDate]);

  useEffect(() => {
    if (coaches.length > 0) {
      fetchAllStudentsData();
    }
  }, [coaches]);

  const fetchAllStudentsData = async () => {
    try {
      setLoadingStudents(true);
      const studentsData: { [coachId: string]: StudentsData } = {};
      
      for (const coach of coaches) {
        const response = await fetch(`/api/coaching/students?coach_id=${coach.coach_id}`);
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
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First fetch coaches data
      const coachesRes = await fetch('/api/admin/coaching/coaches');
      let coachesData = [];
      
      if (coachesRes.ok) {
        const data = await coachesRes.json();
        coachesData = data.coaches || [];
        setCoaches(coachesData);
      }

      // Then fetch availability and package data in parallel
      const startDateStr = selectedStartDate.toLocaleDateString('en-CA');
      const endDateStr = selectedEndDate.toLocaleDateString('en-CA');
      const weekStr = selectedWeek.toLocaleDateString('en-CA');
      
      const availabilityUrl = (startDateStr !== weekStr || endDateStr !== weekStr) ?
        `/api/admin/coaching/availability?fromDate=${startDateStr}&toDate=${endDateStr}` :
        `/api/admin/coaching/availability?date=${weekStr}`;
      
      console.log('Fetching availability with URL:', availabilityUrl);
      
      const [availabilityRes, packageHoursRes] = await Promise.all([
        fetch(availabilityUrl),
        fetch('/api/admin/coaching/package-hours')
      ]);

      if (availabilityRes.ok) {
        const availabilityData = await availabilityRes.json();
        processAvailabilityData(availabilityData, coachesData);
      }

      if (packageHoursRes.ok) {
        const packageData = await packageHoursRes.json();
        setPackageHoursRemaining(packageData.total_hours_remaining || 0);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load coaching data');
    } finally {
      setLoading(false);
    }
  };

  const processAvailabilityData = (data: any, coachesData: Coach[]) => {
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
          const coachSchedule = typeof availabilityData === 'object' ? availabilityData.schedule : null;
          
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
  };

  const generateTimeSlotsForDate = (coach: Coach, dateString: string, status: string): AvailableSlot[] => {
    const slots: AvailableSlot[] = [];
    const timeSlots = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    
    // Only generate slots if coach has some availability
    if (status !== 'unavailable') {
      timeSlots.forEach(time => {
        // Determine if slot is booked based on status
        let isBooked = false;
        if (status === 'fully_booked') {
          isBooked = true;
        } else if (status === 'partially_booked') {
          // For partially booked, randomly assign some slots as booked
          isBooked = Math.random() > 0.5;
        }
        // For 'available' status, isBooked remains false
        
        slots.push({
          coach_id: coach.coach_id,
          coach_name: coach.coach_display_name,
          date: dateString,
          start_time: time,
          end_time: `${parseInt(time.split(':')[0]) + 1}:00`,
          duration_hours: 1,
          is_today: dateString === new Date().toLocaleDateString('en-CA'),
          is_booked: isBooked,
          booking_customer: isBooked ? 'Student' : undefined
        });
      });
    }

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
    refetch: fetchData
  };
}