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
  if (!bayCalendarId) {
    console.error('Bay calendar ID not found:', {
      bayNumber: booking.bay_number,
      availableBays: Object.keys(BAY_CALENDARS)
    });
  } else {
    calendarIds.push(bayCalendarId);
  }

  // Add coaching calendar if applicable
  if (booking.booking_type in COACHING_CALENDARS) {
    const coachingCalendarId = COACHING_CALENDARS[booking.booking_type as BookingType];
    if (!coachingCalendarId) {
      console.error('Coaching calendar ID not found:', {
        bookingType: booking.booking_type,
        availableTypes: Object.keys(COACHING_CALENDARS)
      });
    } else {
      calendarIds.push(coachingCalendarId);
    }
  }

  // Log all calendar IDs for debugging
  console.log('Retrieved calendar IDs:', {
    bayNumber: booking.bay_number,
    bookingType: booking.booking_type,
    calendarIds
  });

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

  console.log('Creating calendar events with data:', {
    eventData,
    calendarIds,
    bayNumber: booking.bay_number,
    bookingType: booking.booking_type
  });

  for (const calendarId of calendarIds) {
    try {
      if (!calendarId) {
        console.error('Invalid calendar ID:', {
          bayNumber: booking.bay_number,
          bookingType: booking.booking_type,
          calendarId
        });
        continue;
      }

      console.log(`Attempting to create event in calendar: ${calendarId}`);
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
      console.error(`Error creating event in calendar ${calendarId}:`, {
        error,
        bayNumber: booking.bay_number,
        bookingType: booking.booking_type,
        eventData
      });
      throw error;
    }
  }

  if (results.length === 0) {
    throw new Error('No calendar events were created. Check calendar IDs and permissions.');
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

// Fetch events for a bay on a specific date
export async function fetchBayEvents(
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
    const response = await calendar.events.list({
      calendarId,
      timeMin: startOfDay,
      timeMax: endOfDay,
      singleEvents: true,
      orderBy: 'startTime',
    } as calendar_v3.Params$Resource$Events$List);

    const events = response.data?.items || [];
    
    // Transform events to a simpler format
    return events.map((event: calendar_v3.Schema$Event) => {
      // Parse event description to extract customer information
      const description = event.description || '';
      const nameLine = description.match(/Name: ([^\n]+)/);
      const contactLine = description.match(/Contact: ([^\n]+)/);
      const typeLine = description.match(/Type: ([^\n]+)/);
      const paxLine = description.match(/Pax: ([^\n]+)/);
      
      const customerName = nameLine ? nameLine[1] : 'Unknown';
      
      // Parse booking type and package if present
      let bookingType = '';
      let packageName = '';
      
      if (typeLine) {
        const typeMatch = typeLine[1].match(/^(.+?)( \((.+)\))?$/);
        if (typeMatch) {
          bookingType = typeMatch[1];
          packageName = typeMatch[3] || '';
        } else {
          bookingType = typeLine[1];
        }
      }

      return {
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start?.dateTime,
        end: event.end?.dateTime,
        customer_name: customerName,
        contact_number: contactLine ? contactLine[1] : '',
        booking_type: bookingType,
        package_name: packageName,
        number_of_pax: paxLine ? paxLine[1] : '',
        color: event.colorId
      };
    });
  } catch (error) {
    console.error(`Error fetching events for bay ${bayNumber}:`, error);
    throw error;
  }
}