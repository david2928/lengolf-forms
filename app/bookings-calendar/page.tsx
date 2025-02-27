'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { DateTime } from 'luxon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock, Package2 } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';

// Define the bay types with simplified names for mobile
const BAYS = ["Bay 1 (Bar)", "Bay 2", "Bay 3 (Entrance)"];
const BAYS_MOBILE = ["Bay 1", "Bay 2", "Bay 3"];

// Define the booking event type
interface BookingEvent {
  id: string;
  start: string;
  end: string;
  customer_name: string;
  booking_type: string;
  package_name?: string;
  number_of_pax: string;
  color?: string;
  summary?: string;
}

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

// Constants for time calculations
const START_HOUR = 10; // Calendar starts at 10:00
const END_HOUR = 24; // Calendar ends at 00:00 (24:00)
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TOTAL_SLOTS = 15; // Number of hour slots in the calendar

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

  // Add media query for mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
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

  // Fetch bookings for all bays
  useEffect(() => {
    async function fetchBayBookings() {
      setIsLoading(true);
      
      try {
        const dateString = selectedDate.toISODate();
        const allBookings: ProcessedBooking[] = [];
        
        // Fetch bookings for each bay
        for (const bay of BAYS) {
          try {
            const response = await fetch('/api/bookings/calendar/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bayNumber: bay, date: dateString }),
            });
            
            if (!response.ok) {
              continue;
            }
            
            const data = await response.json();
            
            if (data.success && Array.isArray(data.events)) {
              // Process events to include bay information and proper time formatting
              const processedEvents = data.events.map((event: BookingEvent) => {
                // Keep track of the full summary for later parsing
                const summary = event.summary || '';
                
                const startTime = DateTime.fromISO(event.start);
                const endTime = DateTime.fromISO(event.end);
                
                // Calculate duration in hours
                const durationHours = endTime.diff(startTime, 'hours').hours;
                
                return {
                  ...event,
                  summary,
                  customer_name: event.customer_name,
                  bay,
                  // Keep the original times
                  start: event.start,
                  end: event.end,
                  // Store exact hour values for positioning
                  start_hour: startTime.hour + (startTime.minute / 60),
                  end_hour: endTime.hour + (endTime.minute / 60),
                  duration_hours: durationHours,
                };
              });
              
              allBookings.push(...processedEvents);
            }
          } catch (error) {
            console.error(`Exception fetching bookings for ${bay}:`, error);
          }
        }
        
        // Consolidate bookings from the same customer in the same bay
        const consolidatedBookings = consolidateBookings(allBookings);
        setBookings(consolidatedBookings);
      } catch (error) {
        console.error('Error fetching bookings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchBayBookings();
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

  // Format time from ISO to readable time
  const formatTime = (isoTime: string) => {
    return DateTime.fromISO(isoTime).toFormat('HH:mm');
  };

  // Generate time slots for the day (10:00 - 00:00)
  const generateTimeSlots = () => {
    return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
      const hour = START_HOUR + i;
      return hour < 24 
        ? `${hour.toString().padStart(2, '0')}:00` 
        : '00:00';
    });
  };

  // Calculate position percentage for a specific hour
  const getPositionForHour = (hour: number): number => {
    // This is the unified calculation for both grid lines and bookings
    // It calculates percentage position based on hour distance from start (10:00)
    return ((hour - START_HOUR) / TOTAL_HOURS) * 100;
  };

  // Consolidate bookings from the same customer into a single booking
  const consolidateBookings = (events: ProcessedBooking[]): ProcessedBooking[] => {
    if (!events.length) return [];
    
    // Group events by customer name, bay, and adjacent times
    const groupedByCustomerAndBay: Record<string, ProcessedBooking[]> = {};
    
    events.forEach(event => {
      if (!event.start || !event.end) return;
      
      const key = `${event.customer_name}_${event.bay}`;
      if (!groupedByCustomerAndBay[key]) {
        groupedByCustomerAndBay[key] = [];
      }
      groupedByCustomerAndBay[key].push(event);
    });
    
    // Process each customer's bookings by bay
    const processedBookings: ProcessedBooking[] = [];
    
    Object.values(groupedByCustomerAndBay).forEach(customerEvents => {
      if (!customerEvents.length) return;
      
      // Sort events by start time
      customerEvents.sort((a, b) => {
        return new Date(a.start).getTime() - new Date(b.start).getTime();
      });
      
      // Merge adjacent bookings
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

  // Calculate position and height for a booking in the grid
  const getBookingStyle = (booking: ProcessedBooking) => {
    // Get hours as numbers
    const startHourRaw = booking.start_hour;
    const endHourRaw = booking.end_hour;
    
    // Calculate positions using our unified positioning function
    const startPosition = getPositionForHour(startHourRaw);
    const endPosition = getPositionForHour(endHourRaw);
    
    // Calculate height as difference between end and start positions
    const height = Math.max(3.5, endPosition - startPosition);
    
    return {
      top: `${startPosition}%`,
      height: `${height}%`,
      width: 'calc(100% - 8px)'
    };
  };

  // Get background color based on booking bay
  const getBayBackgroundColor = (bay: string) => {
    switch(bay) {
      case 'Bay 1 (Bar)': return 'bg-blue-100 border-blue-300';
      case 'Bay 2': return 'bg-green-100 border-green-300';
      case 'Bay 3 (Entrance)': return 'bg-purple-100 border-purple-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };
  
  // Get icon for booking type
  const getBookingTypeIcon = (bookingType: string, packageName?: string) => {
    // If no booking type provided, default to clock
    if (!bookingType) {
      return <Clock className="h-4 w-4" />;
    }
    
    const lowerType = bookingType.toLowerCase();
    
    // Check for coaching first (prioritize coaching over package)
    if (lowerType.includes('coaching')) {
      return <Users className="h-4 w-4" />;
    } 
    // Then check for package
    else if (packageName || lowerType.includes('package')) {
      return <Package2 className="h-4 w-4" />;
    }
    // Check for voucher or classpass
    else if (lowerType.includes('voucher') || lowerType.includes('classpass')) {
      return <Clock className="h-4 w-4" />;
    }
    // Check for bay rate
    else if (lowerType.includes('rate') || lowerType.includes('bay')) {
      return <Clock className="h-4 w-4" />;
    } 
    // Default to clock for any other type
    else {
      return <Clock className="h-4 w-4" />;
    }
  };

  // Parse the display info from summary, handling website bookings correctly
  const parseDisplayInfo = (booking: ProcessedBooking) => {
    // Check if this is a website booking by looking at the summary
    if (booking.summary) {
      // Format: "Name (phone) (pax) - Type at Bay"
      // We want to extract everything up to the dash
      const dashIndex = booking.summary.indexOf(' - ');
      if (dashIndex > 0) {
        // Return everything before the dash
        return {
          displayText: booking.summary.substring(0, dashIndex),
          pax: booking.number_of_pax
        };
      }
    }
    
    // For internal bookings, just use the customer name and pax
    return {
      displayText: `${booking.customer_name} (${booking.number_of_pax} pax)`,
      pax: booking.number_of_pax
    };
  };

  // Generate all time slots
  const timeSlots = generateTimeSlots();

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className={`${isMobile ? "text-2xl" : "text-3xl"} font-bold`}>
          {isMobile ? "Calendar" : "Bookings Calendar"}
        </h1>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={goToPreviousDay}>
            <ChevronLeft className="h-4 w-4" />
            {!isMobile && <span className="ml-2">Previous Day</span>}
          </Button>
          
          <div className="flex items-center bg-muted px-3 py-1 rounded-md">
            {!isMobile && <Calendar className="h-4 w-4 mr-2" />}
            <span className={`font-medium ${isMobile ? "text-xs" : ""}`}>
              {isMobile 
                ? selectedDate.toFormat('MM/dd/yyyy')
                : selectedDate.toFormat('EEEE, MMMM d, yyyy')}
            </span>
          </div>
          
          <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={goToNextDay}>
            {!isMobile && <span className="mr-2">Next Day</span>}
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div>
          {/* Desktop view */}
          {!isMobile && (
            <div className="flex flex-col">
              {/* Bay headers row - separate from the grid */}
              <div className="flex mb-0.5">
                <div className="w-16"></div> {/* Empty space above time column */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                  {BAYS.map((bay) => (
                    <div key={bay} className="bg-muted p-2 rounded-t-md">
                      <h3 className="text-base font-semibold">{bay}</h3>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Main calendar grid with times */}
              <div className="flex">
                {/* Time column */}
                <div className="w-16 pr-2 relative h-[750px] bg-gray-50 border-r">
                  {timeSlots.map((time, index) => {
                    const hour = index + START_HOUR;
                    const position = getPositionForHour(hour);
                    return (
                      <div 
                        key={time} 
                        className="absolute right-2 text-xs text-gray-500 flex items-center"
                        style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
                      >
                        {time}
                      </div>
                    );
                  })}
                </div>
                
                {/* Calendar grid */}
                <div className="flex-1 grid grid-cols-3 gap-4">
                  {BAYS.map((bay) => (
                    <div key={bay} className="shadow-lg bg-white rounded-b-md min-h-[750px] relative border">
                      {/* Time grid lines */}
                      {timeSlots.map((time, index) => {
                        const hour = index + START_HOUR;
                        const position = getPositionForHour(hour);
                        return (
                          <div 
                            key={`grid-${time}`} 
                            className="absolute w-full border-t border-gray-200"
                            style={{ top: `${position}%` }}
                          />
                        );
                      })}
                      
                      {/* Bookings */}
                      {bookings
                        .filter(booking => booking.bay === bay)
                        .map((booking) => {
                          const bookingStyle = getBookingStyle(booking);
                          const bayBackground = getBayBackgroundColor(booking.bay);
                          const contentClass = booking.duration_hours < 1 
                            ? "scale-90 origin-top" 
                            : "";
                          const displayInfo = parseDisplayInfo(booking);
                          const icon = getBookingTypeIcon(booking.booking_type, booking.package_name);
                          
                          return (
                            <div 
                              key={booking.id} 
                              className={`absolute left-1 right-1 p-2 rounded-md text-sm border ${bayBackground} overflow-hidden`}
                              style={bookingStyle}
                            >
                              <div className={contentClass}>
                                <div className="flex justify-between items-start">
                                  <div className="font-medium truncate pr-1">
                                    {displayInfo.displayText}
                                  </div>
                                  <div className="flex-shrink-0 mt-0.5">
                                    {icon}
                                  </div>
                                </div>
                                <div className="text-xs text-gray-600">
                                  {formatTime(booking.start)} - {formatTime(booking.end)}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mobile view */}
          {isMobile && (
            <div className="space-y-6">
              {BAYS.map((bay, bayIndex) => (
                <div key={bay} className="shadow-lg rounded-md overflow-hidden">
                  {/* Bay header */}
                  <div className="bg-muted py-2 px-4">
                    <h3 className="text-base font-semibold">{BAYS_MOBILE[bayIndex]}</h3>
                  </div>
                  
                  {/* Calendar grid */}
                  <div className="bg-white relative border min-h-[350px]">
                    {/* Time labels on the left */}
                    <div className="absolute left-0 top-0 bottom-0 w-10 z-10 bg-gray-50 border-r">
                      {timeSlots.map((time, index) => {
                        const hour = index + START_HOUR;
                        const position = getPositionForHour(hour);
                        // Skip 00:00 in mobile view
                        if (time === '00:00') return null;
                        
                        return (
                          <div 
                            key={time} 
                            className="absolute left-0 text-[10px] text-gray-500 px-1 flex items-center"
                            style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
                          >
                            {time}
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Content area - shifted to the right */}
                    <div className="absolute left-10 right-0 top-0 bottom-0">
                      {/* Time grid lines */}
                      {timeSlots.map((time, index) => {
                        const hour = index + START_HOUR;
                        const position = getPositionForHour(hour);
                        return (
                          <div 
                            key={`grid-${time}`} 
                            className="absolute w-full border-t border-gray-200"
                            style={{ top: `${position}%`, left: 0 }}
                          />
                        );
                      })}
                      
                      {/* Bookings - now positioned relative to content area */}
                      {bookings
                        .filter(booking => booking.bay === bay)
                        .map((booking) => {
                          const bookingStyle = getBookingStyle(booking);
                          const bayBackground = getBayBackgroundColor(booking.bay);
                          const displayInfo = parseDisplayInfo(booking);
                          const isShortBooking = booking.duration_hours <= 1;
                          
                          // For mobile view, simplify customer name if needed
                          // Don't truncate unless really necessary - only for very long names
                          const displayText = displayInfo.displayText.length > 35
                            ? displayInfo.displayText.substring(0, 35) + '...' 
                            : displayInfo.displayText;
                          
                          // Only show times for bookings longer than 1 hour
                          const timeDisplay = !isShortBooking 
                            ? `${formatTime(booking.start)} - ${formatTime(booking.end)}`
                            : "";
                          
                          // Get the appropriate icon but use the same small size for all
                          const icon = getBookingTypeIcon(booking.booking_type, booking.package_name);
                          
                          return (
                            <div 
                              key={booking.id} 
                              className={`absolute rounded-md text-xs border ${bayBackground}`}
                              style={{ 
                                ...bookingStyle, 
                                left: '2px', // Small margin from the left inside content area
                                right: '4px',
                                width: 'auto'
                              }}
                            >
                              <div className="flex justify-between p-1.5">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-[11px]">
                                    {displayText}
                                  </div>
                                  {!isShortBooking && (
                                    <div className="text-[10px] text-gray-600">
                                      {timeDisplay}
                                    </div>
                                  )}
                                </div>
                                <div className="flex-shrink-0 ml-1">
                                  {React.cloneElement(icon, { className: "h-3 w-3" })}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 