'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import { formatBookingsForCalendar, type CalendarEvent } from '@/lib/calendar-utils';
import type { Booking } from '@/types/booking';
import { BigCalendarView } from '@/components/calendar/BigCalendarView';
import { ViewBookingModal } from '@/components/calendar/ViewBookingModal';
import { useToast } from '@/components/ui/use-toast';
import { DayPicker } from 'react-day-picker';
import { format, parse, isValid, subHours, isBefore } from 'date-fns';
import 'react-day-picker/dist/style.css';

// Use CalendarEvent type from utils (keeping BookingEvent as alias for compatibility)
type BookingEvent = CalendarEvent;

// Processed booking with consolidated time slots
interface ProcessedBooking {
  id: string;
  customer_name: string;
  start: string;
  end: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  bay: string;
  booking_type: string;
  package_name?: string;
  number_of_pax: string;
  color?: string;
  displayName?: string;
  summary?: string;
}

export default function BookingsCalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get the date from query params or use current date
  const dateParam = searchParams.get('date');
  const [selectedDate, setSelectedDate] = useState<DateTime>(
    dateParam 
      ? DateTime.fromISO(dateParam)
      : DateTime.now().setZone('Asia/Bangkok')
  );
  
  const [isLoading, setIsLoading] = useState(true);
  const [bookings, setBookings] = useState<ProcessedBooking[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add media query for mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // Modal state management
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedBookingForView, setSelectedBookingForView] = useState<Booking | null>(null);
  const { toast } = useToast();
  
  // Check for mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Initial check
    checkMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkMobile);
    
    // Clean up
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Consolidate bookings from the same customer into a single booking
  const consolidateBookings = (events: ProcessedBooking[]): ProcessedBooking[] => {
    if (!events.length) return [];
    
    // Group events by customer name, bay, and booking type to keep different booking types separate
    const groupedByCustomerAndBay: Record<string, ProcessedBooking[]> = {};
    
    events.forEach(event => {
      if (!event.start || !event.end) return;
      
      // Include booking_type in the key to prevent merging different booking types
      const key = `${event.customer_name}_${event.bay}_${event.booking_type || 'default'}`;
      if (!groupedByCustomerAndBay[key]) {
        groupedByCustomerAndBay[key] = [];
      }
      groupedByCustomerAndBay[key].push(event);
    });
    
    // Process each customer's bookings by bay and booking type
    const processedBookings: ProcessedBooking[] = [];
    
    Object.values(groupedByCustomerAndBay).forEach(customerEvents => {
      if (!customerEvents.length) return;
      
      // Sort events by start time
      customerEvents.sort((a, b) => {
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
      
      // Merge adjacent bookings of the same type only
      const mergedBookings: ProcessedBooking[] = [];
      let currentBooking = { ...customerEvents[0] };
      
      for (let i = 1; i < customerEvents.length; i++) {
        const nextBooking = customerEvents[i];
        const currentEndTime = DateTime.fromISO(currentBooking.end);
        const nextStartTime = DateTime.fromISO(nextBooking.start);
        
        // If bookings are adjacent or overlapping, merge them
        if (Math.abs(currentEndTime.diff(nextStartTime, 'minutes').minutes) <= 10) {
          currentBooking.end = nextBooking.end;
          currentBooking.end_hour = nextBooking.end_hour;
          currentBooking.duration_hours += nextBooking.duration_hours;
        } else {
          mergedBookings.push(currentBooking);
          currentBooking = { ...nextBooking };
        }
      }
      
      mergedBookings.push(currentBooking);
      processedBookings.push(...mergedBookings);
    });
    
    return processedBookings;
  };

  // Fetch bookings from database
  useEffect(() => {
    async function fetchBookingsFromDatabase() {
      setIsLoading(true);
      setError(null);
      
      try {
        const dateString = selectedDate.toISODate();
        
        // Fetch all bookings for the date from database
        const response = await fetch(`/api/bookings/list-by-date?date=${dateString}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch bookings: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        if (data.bookings && Array.isArray(data.bookings)) {
          // Convert database bookings to calendar format
          const eventsByBay = formatBookingsForCalendar(data.bookings as Booking[]);
          
          // Process all events from all bays into unified format
          const allBookings: ProcessedBooking[] = [];
          
          Object.entries(eventsByBay).forEach(([bay, events]) => {
            events.forEach((event: BookingEvent) => {
              const startTime = DateTime.fromISO(event.start, { zone: 'Asia/Bangkok' });
              const endTime = DateTime.fromISO(event.end, { zone: 'Asia/Bangkok' });
              
              // Calculate duration in hours (allowing for fractional hours)
              const durationInMinutes = endTime.diff(startTime, 'minutes').minutes;
              const durationHours = durationInMinutes / 60;
              

              
              allBookings.push({
                ...event,
                bay,
                // Store exact hour values for positioning
                start_hour: startTime.hour + (startTime.minute / 60),
                end_hour: endTime.hour + (endTime.minute / 60),
                duration_hours: durationHours,
              });
            });
          });
          
          // Consolidate bookings from the same customer in the same bay
          const consolidatedBookings = consolidateBookings(allBookings);
          setBookings(consolidatedBookings);
        } else {
          // No bookings found, set empty array
          setBookings([]);
        }
      } catch (error) {
        console.error('Error fetching bookings from database:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setError(`Failed to load bookings: ${errorMessage}`);
        setBookings([]); // Set empty bookings on error
      } finally {
        setIsLoading(false);
      }
    }
    
    // Initial fetch
    fetchBookingsFromDatabase();
    
    // Set up auto-refresh every 120 seconds (2 minutes)
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing calendar data...');
      fetchBookingsFromDatabase();
    }, 120000); // 120 seconds = 120,000 milliseconds
    
    // Cleanup interval on unmount or when selectedDate changes
    return () => {
      clearInterval(refreshInterval);
    };
  }, [selectedDate]);

  // Navigate to previous day
  const goToPreviousDay = () => {
    const newDate = selectedDate.minus({ days: 1 });
    setSelectedDate(newDate);
    router.push(`/bookings-calendar?date=${newDate.toISODate()}`);
  };

  // Navigate to next day
  const goToNextDay = () => {
    const newDate = selectedDate.plus({ days: 1 });
    setSelectedDate(newDate);
    router.push(`/bookings-calendar?date=${newDate.toISODate()}`);
  };

  // Handle date change from calendar (swipe gestures)
  const handleDateChange = (newDate: Date) => {
    const luxonDate = DateTime.fromJSDate(newDate).setZone('Asia/Bangkok');
    setSelectedDate(luxonDate);
    router.push(`/bookings-calendar?date=${luxonDate.toISODate()}`);
  };

  // Handle date picker selection
  const handleDatePickerSelect = (date: Date | undefined) => {
    if (date) {
      const luxonDate = DateTime.fromJSDate(date).setZone('Asia/Bangkok');
      setSelectedDate(luxonDate);
      router.push(`/bookings-calendar?date=${luxonDate.toISODate()}`);
    }
  };

  // Format time from ISO to readable time
  const formatTime = (isoTime: string) => {
    return DateTime.fromISO(isoTime, { zone: 'Asia/Bangkok' }).toFormat('HH:mm');
  };

  // Check if booking is in the past (based on end time)
  const isBookingInPast = (booking: Booking): boolean => {
    try {
      // Calculate end time based on start time + duration
      const [hours, minutes] = booking.start_time.split(':').map(Number);
      const startMinutes = hours * 60 + minutes;
      const endMinutes = startMinutes + (booking.duration * 60);
      const endHours = Math.floor(endMinutes / 60);
      const endMins = endMinutes % 60;
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
      
      // Create end datetime using the calculated end time
      const bookingEndDateTime = new Date(`${booking.date}T${endTime}`);
      const now = new Date();
      
      // Booking is in the past only if it has ended
      return bookingEndDateTime < now;
    } catch {
      return false;
    }
  };

  // Modal handlers
  const handleOpenBookingModal = async (bookingId: string) => {
    try {
      // Find the booking data from our current bookings state
      const calendarBooking = bookings.find(b => b.id === bookingId);
      if (!calendarBooking) {
        toast({
          title: "Error",
          description: "Booking not found",
          variant: "destructive"
        });
        return;
      }

      // Fetch the full booking data from the API
      const response = await fetch(`/api/bookings/${bookingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch booking details');
      }
      
      const bookingData = await response.json();
      
      // Always open view modal - it will handle edit/cancel buttons internally
      setSelectedBookingForView(bookingData.booking);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error opening booking modal:', error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive"
      });
    }
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedBookingForView(null);
  };

  const refreshBookingsData = () => {
    const dateString = selectedDate.toISODate();
    if (dateString) {
      // Re-fetch bookings for the current date
      setIsLoading(true);
      fetch(`/api/bookings/list-by-date?date=${dateString}`)
        .then(response => response.json())
        .then(data => {
          if (data.bookings && Array.isArray(data.bookings)) {
            const eventsByBay = formatBookingsForCalendar(data.bookings as Booking[]);
            const allBookings: ProcessedBooking[] = [];
            
            Object.entries(eventsByBay).forEach(([bay, events]) => {
              events.forEach((event: BookingEvent) => {
                const startTime = DateTime.fromISO(event.start, { zone: 'Asia/Bangkok' });
                const endTime = DateTime.fromISO(event.end, { zone: 'Asia/Bangkok' });
                const durationInMinutes = endTime.diff(startTime, 'minutes').minutes;
                const durationHours = durationInMinutes / 60;
                
                allBookings.push({
                  ...event,
                  bay,
                  start_hour: startTime.hour + (startTime.minute / 60),
                  end_hour: endTime.hour + (endTime.minute / 60),
                  duration_hours: durationHours,
                });
              });
            });
            
            const consolidatedBookings = consolidateBookings(allBookings);
            setBookings(consolidatedBookings);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  };

  const handleBookingUpdated = () => {
    refreshBookingsData();
  };

  // Navigate to create booking page
  const handleCreateNewBooking = () => {
    router.push('/create-booking');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <div className="flex-shrink-0 container mx-auto px-4 py-3">
        <div className={`flex justify-between items-center ${isMobile ? 'flex-col space-y-3' : ''}`}>
          <h1 className={`font-bold ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            {isMobile ? 'Calendar' : 'Bookings Calendar'}
          </h1>
          
          <div className={`flex items-center ${isMobile ? 'space-x-2' : 'space-x-4'}`}>
            <Button 
              onClick={handleCreateNewBooking}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              {isMobile ? 'New' : 'New Booking'}
            </Button>
            
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "default"} 
              onClick={goToPreviousDay}
              className={isMobile ? 'px-2' : ''}
            >
              <ChevronLeft className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Previous Day</span>}
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  className={`flex items-center bg-muted px-3 py-1 rounded-md hover:bg-muted/80 ${isMobile ? 'px-2' : ''}`}
                >
                  {!isMobile && <CalendarIcon className="h-4 w-4 mr-2" />}
                  <span className={`font-medium ${isMobile ? 'text-sm' : ''}`}>
                    {isMobile 
                      ? selectedDate.toFormat('MMM d, yyyy')
                      : selectedDate.toFormat('EEEE, MMMM d, yyyy')}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <DayPicker
                  mode="single"
                  selected={selectedDate.toJSDate()}
                  onSelect={handleDatePickerSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            <Button 
              variant="outline" 
              size={isMobile ? "sm" : "default"} 
              onClick={goToNextDay}
              className={isMobile ? 'px-2' : ''}
            >
              {!isMobile && <span className="mr-2">Next Day</span>}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 container mx-auto px-4 pb-4 min-h-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col justify-center items-center h-64 space-y-4">
            <div className="text-red-500 text-center">
              <p className="font-medium">Error loading calendar</p>
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <BigCalendarView
            bookings={bookings}
            selectedDate={selectedDate.toJSDate()}
            onEditClick={handleOpenBookingModal}
            onDateChange={handleDateChange}
          />
        )}
      </div>

      {/* View Booking Modal */}
      <ViewBookingModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        booking={selectedBookingForView}
        onBookingUpdated={handleBookingUpdated}
      />


    </div>
  );
} 