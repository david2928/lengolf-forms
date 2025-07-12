'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar, momentLocalizer, Views, Event } from 'react-big-calendar';
import moment from 'moment';
import { DateTime } from 'luxon';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './BigCalendarStyles.css';

// Set up the localizer with moment.js (more reliable for timezone handling)
const localizer = momentLocalizer(moment);

// Types for the processed booking data (keeping compatibility with your existing structure)
interface ProcessedBooking {
  id: string;
  customer_name: string;
  customer_code?: string | null;
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
  is_new_customer?: boolean;
  referral_source?: string;
}

interface BigCalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    booking: ProcessedBooking;
    bay: string;
  };
  resourceId: string;
}

interface BigCalendarViewProps {
  bookings: ProcessedBooking[];
  selectedDate?: Date;
  onEditClick?: (bookingId: string) => void;
  onDateChange?: (date: Date) => void;
}

export function BigCalendarView({
  bookings,
  selectedDate,
  onEditClick,
  onDateChange
}: BigCalendarViewProps) {
  const [date, setDate] = useState(() => {
    const today = selectedDate || new Date();
    return today;
  });

  // Touch/swipe handling for mobile
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Handle touch start
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  // Handle touch move
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  // Handle touch end - detect swipe
  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Swipe left - next day
      const nextDay = moment(date).add(1, 'day').toDate();
      setDate(nextDay);
      if (onDateChange) onDateChange(nextDay);
    } else if (isRightSwipe) {
      // Swipe right - previous day
      const prevDay = moment(date).subtract(1, 'day').toDate();
      setDate(prevDay);
      if (onDateChange) onDateChange(prevDay);
    }
  }, [touchStart, touchEnd, date, onDateChange]);

  // Update internal date when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      setDate(selectedDate);
    }
  }, [selectedDate]);

  // Convert bookings to react-big-calendar events with proper timezone handling
  const events: BigCalendarEvent[] = useMemo(() => {
    
    const convertedEvents = bookings.map((booking) => {
      // Parse the ISO strings with Luxon to get the Bangkok timezone
      const startTime = DateTime.fromISO(booking.start, { zone: 'Asia/Bangkok' });
      const endTime = DateTime.fromISO(booking.end, { zone: 'Asia/Bangkok' });
      
      // Create moment objects for the calendar date and booking times
      // This approach creates timezone-naive dates that react-big-calendar can handle properly
      const calendarMoment = moment(date).startOf('day');
      
      const startDate = calendarMoment.clone()
        .hour(startTime.hour)
        .minute(startTime.minute)
        .second(startTime.second)
        .toDate();
      
      const endDate = calendarMoment.clone()
        .hour(endTime.hour)
        .minute(endTime.minute)
        .second(endTime.second)
        .toDate();


      return {
        id: booking.id,
        title: booking.customer_name,
        start: startDate,
        end: endDate,
        resource: {
          booking,
          bay: booking.bay,
        },
        resourceId: booking.bay,
      };
    });

    return convertedEvents;
  }, [bookings, date]); // Include date in dependencies

  // Event style getter - provides the color coding and booking type differentiation
  const eventStyleGetter = useCallback((event: BigCalendarEvent) => {
    const booking = event.resource.booking;
    
    // Check if booking is in the past
    const now = new Date();
    const bookingEnd = new Date(event.end);
    const isPast = bookingEnd < now;
    
    // Updated bay-based color scheme: Bay 1 blue, Bay 2 red, Bay 3 green
    const bayColors = {
      "Bay 1 (Bar)": "#3b82f6", // blue-500
      "Bay 2": "#ef4444", // red-500  
      "Bay 3 (Entrance)": "#10b981", // emerald-500
    };

    let backgroundColor = bayColors[booking.bay as keyof typeof bayColors] || "#6b7280";
    
    // Differentiate booking types with borders and patterns
    let borderStyle = '0px';
    let opacity = isPast ? 0.4 : 0.9; // Make past bookings more transparent
    let backgroundImage = 'none';
    let textDecoration = 'none';
    let fontWeight = '500';
    
    // Check if this is a coaching booking (case-insensitive)
    const isCoaching = booking.booking_type?.toLowerCase().includes('coaching');
    
    // Check if this is a package booking (case-insensitive or has package_name)
    const isPackage = booking.package_name || booking.booking_type?.toLowerCase() === 'package';
    
    // Check if this is a new customer
    const isNewCustomer = booking.is_new_customer;
    
    if (isCoaching) {
      // Keep the bay color but add distinctive striped pattern and border
      borderStyle = '3px solid #fbbf24'; // thick amber border
      backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.3) 3px, rgba(255,255,255,0.3) 6px)';
      opacity = isPast ? 0.4 : 1;
      fontWeight = 'bold';
    } else if (isPackage) {
      // Package bookings get amber border and subtle pattern
      borderStyle = '2px solid #fbbf24'; // amber border for packages
      backgroundImage = 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)';
      fontWeight = '600';
    }
    
    // New customer styling: add green border
    if (isNewCustomer && !isCoaching) {
      borderStyle = '2px solid #10b981'; // green border for new customers
    } else if (isNewCustomer && isCoaching) {
      borderStyle = '3px solid #10b981'; // thicker green border for new customer coaching
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity,
        color: 'white',
        border: borderStyle,
        backgroundImage,
        display: 'block',
        fontSize: '12px',
        fontWeight,
        textDecoration,
        padding: '2px 4px',
      }
    };
  }, []);

  // Handle event selection (click)
  const handleSelectEvent = useCallback((event: BigCalendarEvent) => {
    if (onEditClick) {
      onEditClick(event.resource.booking.id);
    }
  }, [onEditClick]);

  // Custom event component to show customer name and booking type
  const EventComponent = ({ event }: { event: BigCalendarEvent }) => {
    const booking = event.resource.booking;
    
    // Use the same logic as styling to detect booking types
    const isCoaching = booking.booking_type?.toLowerCase().includes('coaching');
    const isPackage = booking.package_name || booking.booking_type?.toLowerCase() === 'package';
    const isNewCustomer = booking.is_new_customer;

    return (
      <div className="truncate">
        <div className="font-medium text-xs">
          <span className="truncate">
            {booking.customer_name}
            {booking.customer_code && (
              <span className="ml-1 text-[10px] opacity-70">({booking.customer_code})</span>
            )}
          </span>
          {isNewCustomer && <span className="ml-1 text-xs">⭐</span>}
          {isCoaching && <span className="ml-1 text-xs">🏌️</span>}
          {isPackage && !isCoaching && <span className="ml-1 text-xs">📦</span>}
        </div>
      </div>
    );
  };

  // Resource list for bay columns
  const resources = useMemo(() => {
    const bays = ["Bay 1 (Bar)", "Bay 2", "Bay 3 (Entrance)"];
    return bays.map((bay) => ({
      resourceId: bay,
      resourceTitle: bay.replace(' (Bar)', '').replace(' (Entrance)', ''),
    }));
  }, []);


  return (
    <div className="flex flex-col h-full">
      <div 
        className="flex-1 bg-white rounded-lg border min-h-0"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <Calendar
          localizer={localizer}
          events={events}
          resources={resources}
          resourceIdAccessor="resourceId"
          resourceTitleAccessor="resourceTitle"
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          view={Views.DAY}
          date={date}
          onNavigate={setDate}
          eventPropGetter={eventStyleGetter}
          onSelectEvent={handleSelectEvent}
          components={{
            event: EventComponent,
          }}
          min={new Date(2024, 0, 1, 10, 0)} // 10:00 AM
          max={new Date(2024, 0, 1, 23, 59)} // 11:59 PM
          step={60} // 60-minute intervals
          timeslots={1} // 1 slot per step
          defaultView={Views.DAY}
          views={[Views.DAY]}
          toolbar={false}
          popup={false}
          dayLayoutAlgorithm="no-overlap"
          showMultiDayTimes={false}
          formats={{
            timeGutterFormat: 'HH:mm',
            eventTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
            agendaTimeFormat: 'HH:mm',
            agendaTimeRangeFormat: ({ start, end }: { start: Date; end: Date }) =>
              `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`,
          }}
        />
      </div>
      
      {/* Booking Type Legend - moved to bottom */}
      <div className="bg-gray-50 p-2 rounded-lg border mt-3 flex-shrink-0">
        <div className="flex items-center justify-center">
          <div className="flex flex-wrap gap-4 text-xs justify-center">
            <div className="flex items-center gap-1">
              <span>Normal Rate</span>
              <div className="w-4 h-3 bg-blue-500 rounded"></div>
            </div>
            <div className="flex items-center gap-1">
              <span>Coaching</span>
              <div className="w-4 h-3 bg-blue-500 rounded border-2 border-dashed border-white"></div>
            </div>
            <div className="flex items-center gap-1">
              <span>Package</span>
              <div className="w-4 h-3 bg-blue-500 rounded border-2 border-amber-400" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(255,255,255,0.2) 1px, rgba(255,255,255,0.2) 2px)'
              }}></div>
            </div>
            <div className="flex items-center gap-1">
              <span>New Customer ⭐</span>
              <div className="w-4 h-3 bg-blue-500 rounded border-2 border-green-500"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 