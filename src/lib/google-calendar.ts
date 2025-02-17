import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { BAY_CALENDARS, COACHING_CALENDARS, BAY_COLORS } from './constants';
import type { calendar_v3 } from 'googleapis';
import type { Booking } from '@/types/booking';
import type { BayName, BookingType } from './constants';

export interface CalendarEventResult {
  eventId: string;
  calendarId: string;
  status: string;
}

// Format event data for Google Calendar
export function formatCalendarEvent(booking: Booking): calendar_v3.Schema$Event {
  const startDateTime = DateTime.fromISO(`${booking.booking_date}T${booking.start_time}`, { zone: 'Asia/Bangkok' });
  const endDateTime = DateTime.fromISO(`${booking.booking_date}T${booking.end_time}`, { zone: 'Asia/Bangkok' });

  // Format event summary with package if available
  const bookingType = booking.package_name 
    ? `${booking.booking_type} (${booking.package_name})`
    : booking.booking_type;

  // Set color based on bay number
  const colorId = BAY_COLORS[booking.bay_number as BayName]?.toString();

  return {
    summary: `${booking.customer_name} (${booking.contact_number}) (${booking.number_of_pax}) - ${bookingType} at ${booking.bay_number}`,
    description: `Name: ${booking.customer_name}
Contact: ${booking.contact_number}
Type: ${bookingType}
Pax: ${booking.number_of_pax}
Bay: ${booking.bay_number}
Date: ${startDateTime.toFormat('cccc, MMMM d')}
Time: ${startDateTime.toFormat('HH:mm')} - ${endDateTime.toFormat('HH:mm')}
Booked by: ${booking.employee_name}
Via: ${booking.booking_source}${booking.notes ? `\n\nNotes: ${booking.notes}` : ''}`.trim(),
    start: { 
      dateTime: startDateTime.toISO(),
      timeZone: 'Asia/Bangkok'
    },
    end: { 
      dateTime: endDateTime.toISO(),
      timeZone: 'Asia/Bangkok'
    },
    colorId
  };
}

// Get calendar IDs based on booking type and bay number
export function getRelevantCalendarIds(booking: Booking): string[] {
  const calendarIds: string[] = [];
  
  // Add bay calendar
  const bayCalendarId = BAY_CALENDARS[booking.bay_number as BayName];
  if (bayCalendarId) {
    calendarIds.push(bayCalendarId);
  }

  // Add coaching calendar if applicable
  if (booking.booking_type in COACHING_CALENDARS) {
    calendarIds.push(COACHING_CALENDARS[booking.booking_type as BookingType]);
  }

  return calendarIds;
}

// Create calendar events
export async function createCalendarEvents(
  calendar: calendar_v3.Calendar,
  booking: Booking
): Promise<CalendarEventResult[]> {
  const eventData = formatCalendarEvent(booking);
  const calendarIds = getRelevantCalendarIds(booking);
  const results: CalendarEventResult[] = [];

  for (const calendarId of calendarIds) {
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData,
      });

      results.push({
        eventId: response.data.id!,
        calendarId,
        status: response.data.status!,
      });
    } catch (error) {
      console.error(`Error creating event in calendar ${calendarId}:`, error);
      throw error;
    }
  }

  return results;
}

// Get bay availability for a specific date
export async function getBayAvailability(
  calendar: calendar_v3.Calendar,
  bayNumber: string,
  date: string
) {
  const calendarId = BAY_CALENDARS[bayNumber as BayName];
  if (!calendarId) {
    throw new Error('Invalid bay number');
  }

  const startOfDay = DateTime.fromISO(`${date}T00:00:00`, { zone: 'Asia/Bangkok' }).toUTC().toISO();
  const endOfDay = DateTime.fromISO(`${date}T23:59:59`, { zone: 'Asia/Bangkok' }).toUTC().toISO();

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay,
        timeMax: endOfDay,
        items: [{ id: calendarId }],
      },
    });

    const busyTimes = response.data.calendars?.[calendarId]?.busy || [];

    return busyTimes.map(time => ({
      start: DateTime.fromISO(time.start as string).setZone('Asia/Bangkok').toISO(),
      end: DateTime.fromISO(time.end as string).setZone('Asia/Bangkok').toISO(),
    }));
  } catch (error) {
    console.error(`Error fetching availability for bay ${bayNumber}:`, error);
    throw error;
  }
}

// Initialize Google Calendar client
export function initializeCalendar(auth: any): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth });
}

// Check if a time slot is available
export function isTimeSlotAvailable(
  startTime: DateTime,
  endTime: DateTime,
  busyTimes: { start: string; end: string }[]
): boolean {
  return !busyTimes.some(busy => {
    const busyStart = DateTime.fromISO(busy.start);
    const busyEnd = DateTime.fromISO(busy.end);
    
    return (
      (startTime >= busyStart && startTime < busyEnd) ||  // Start time within busy period
      (endTime > busyStart && endTime <= busyEnd) ||      // End time within busy period
      (startTime <= busyStart && endTime >= busyEnd)      // Busy period within requested slot
    );
  });
}

// Get available time slots for a specific date
export function getAvailableTimeSlots(
  date: string,
  busyTimes: { start: string; end: string }[],
  intervalMinutes: number = 15
): { start: string; end: string }[] {
  const availableSlots: { start: string; end: string }[] = [];
  
  // Business hours: 10 AM to 11 PM
  const dayStart = DateTime.fromISO(`${date}T10:00:00`, { zone: 'Asia/Bangkok' });
  const dayEnd = DateTime.fromISO(`${date}T23:00:00`, { zone: 'Asia/Bangkok' });
  
  let currentSlot = dayStart;
  
  while (currentSlot < dayEnd) {
    const slotEnd = currentSlot.plus({ minutes: intervalMinutes });
    
    if (isTimeSlotAvailable(currentSlot, slotEnd, busyTimes)) {
      availableSlots.push({
        start: currentSlot.toFormat('HH:mm'),
        end: slotEnd.toFormat('HH:mm'),
      });
    }
    
    currentSlot = slotEnd;
  }
  
  return availableSlots;
}