import { google } from 'googleapis';
import { parse, addHours, format, getDay, differenceInMinutes, addMinutes, compareAsc, parseISO, formatISO } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { BAY_CALENDARS, COACHING_CALENDARS, BAY_COLORS } from './constants';
import type { calendar_v3 } from 'googleapis';
import type { FormData } from '@/components/booking-form/types';
import type { BayName, BookingType } from './constants';

export interface CalendarEventResult {
  eventId: string;
  calendarId: string;
  status: string;
}

export interface CalendarFormatInput {
  id: string;
  name: string;
  phone_number: string;
  date: string;
  start_time: string;
  duration: number;
  number_of_people: number;
  bay: string | null;
  bayDisplayName?: string | null;
  customer_notes: string | null;
  employeeName: string;
  bookingType: string;
  packageName?: string;
}

const TIMEZONE = 'Asia/Bangkok';

export function formatCalendarEvent(inputData: CalendarFormatInput): calendar_v3.Schema$Event {
  const startDateTimeStr = `${inputData.date}T${inputData.start_time}:00`;
  let localParsedDate: Date;
  try {
      localParsedDate = parse(startDateTimeStr, "yyyy-MM-dd'T'HH:mm:ss", new Date());
      if (isNaN(localParsedDate.getTime())) throw new Error('Parsed start date is invalid');
  } catch(e) {
      console.error(`Error parsing start date/time string: ${startDateTimeStr}`, e);
      throw new Error(`Failed to parse start date/time: ${startDateTimeStr}`);
  }

  const startDateTimeUTC = fromZonedTime(localParsedDate, TIMEZONE);

  const endDateTimeUTC = addHours(startDateTimeUTC, inputData.duration);

  const packageInfo = inputData.packageName
    ? `${inputData.bookingType} (${inputData.packageName})`
    : inputData.bookingType;

  const bayDisplay = inputData.bayDisplayName || inputData.bay || 'Unknown Bay';
  const colorId = bayDisplay && bayDisplay in BAY_COLORS
    ? BAY_COLORS[bayDisplay as BayName]
    : undefined;

  const summary = `${inputData.name} (${inputData.phone_number}) (${inputData.number_of_people}) - ${packageInfo} at ${bayDisplay}`;

  const description = `Customer Name: ${inputData.name}
Booking Name: ${inputData.name}
Contact: ${inputData.phone_number}
Type: ${packageInfo}
Pax: ${inputData.number_of_people}
Bay: ${bayDisplay}
Date: ${formatInTimeZone(startDateTimeUTC, TIMEZONE, 'EEEE, MMMM d')}
Time: ${formatInTimeZone(startDateTimeUTC, TIMEZONE, 'HH:mm')} - ${formatInTimeZone(endDateTimeUTC, TIMEZONE, 'HH:mm')}
Via: Backoffice
Booking ID: ${inputData.id}
Booked By: ${inputData.employeeName}
${inputData.customer_notes ? `\nNotes: ${inputData.customer_notes}` : ''}`.trim();

  const startDateTimeISO = formatInTimeZone(startDateTimeUTC, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const endDateTimeISO = formatInTimeZone(endDateTimeUTC, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");

  return {
    summary,
    description,
    start: {
      dateTime: startDateTimeISO,
      timeZone: TIMEZONE
    },
    end: {
      dateTime: endDateTimeISO,
      timeZone: TIMEZONE
    },
    colorId
  };
}

export function getRelevantCalendarIds(inputData: CalendarFormatInput): string[] {
  const calendarIds: string[] = [];
  const simpleBayName = inputData.bay;

  let calendarKey: BayName | undefined;
  if (simpleBayName === 'Bay 1') {
      calendarKey = 'Bay 1 (Bar)';
  } else if (simpleBayName === 'Bay 2') {
      calendarKey = 'Bay 2';
  } else if (simpleBayName === 'Bay 3') {
      calendarKey = 'Bay 3 (Entrance)';
  }

  if (calendarKey && calendarKey in BAY_CALENDARS) {
    const bayCalendarId = BAY_CALENDARS[calendarKey];
    if (bayCalendarId) {
        calendarIds.push(bayCalendarId);
    } else {
        console.warn(`Calendar ID for bay key '${calendarKey}' is empty or missing in environment variables.`);
    }
  } else {
    if (simpleBayName) {
      console.warn(`Could not find a valid calendar key or calendar ID for simple bay name: ${simpleBayName}. Mapped key: ${calendarKey}`);
    } else {
      console.log('Input data did not contain a bay name.');
    }
  }

  if (inputData.bookingType in COACHING_CALENDARS) {
    const coachingCalendarId = COACHING_CALENDARS[inputData.bookingType as BookingType];
    if (coachingCalendarId) {
        if (!calendarIds.includes(coachingCalendarId)) {
            calendarIds.push(coachingCalendarId);
        }
    } else {
        console.warn(`Calendar ID for coaching type '${inputData.bookingType}' is empty or missing in environment variables.`);
    }
  }

  console.log('Retrieved calendar IDs:', {
    bayName: simpleBayName,
    mappedBayKey: calendarKey,
    bookingType: inputData.bookingType,
    calendarIds
  });

  return calendarIds;
}

export async function createCalendarEvents(
  calendar: calendar_v3.Calendar,
  inputData: CalendarFormatInput
): Promise<CalendarEventResult[]> {
  const eventData = formatCalendarEvent(inputData);
  const calendarIds = getRelevantCalendarIds(inputData);
  const results: CalendarEventResult[] = [];

  console.log('Creating calendar events with data:', {
    eventData,
    calendarIds,
    bayName: inputData.bay,
    bookingType: inputData.bookingType
  });

  for (const calendarId of calendarIds) {
    try {
      if (!calendarId) {
        console.error('Skipping invalid calendar ID during event creation.');
        continue;
      }

      console.log(`Attempting to create event in calendar: ${calendarId}`);
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData,
      });

      if (response?.data?.id && response?.data?.status) {
        results.push({
          eventId: response.data.id,
          calendarId,
          status: response.data.status,
        });
      } else {
         console.error('Google Calendar API insert response missing id or status:', response?.data);
      }
    } catch (error) {
      console.error(`Error creating event in calendar ${calendarId}:`, {
        errorMessage: error instanceof Error ? error.message : String(error),
        bayName: inputData.bay,
        bookingType: inputData.bookingType,
      });
    }
  }

  if (results.length === 0 && calendarIds.length > 0) {
      console.error('No calendar events were successfully created despite having target calendar IDs.');
  }

  return results;
}

export async function getBayAvailability(
  calendar: calendar_v3.Calendar,
  bayNumber: string,
  date: string
): Promise<{ start: string; end: string }[]> {
  if (!(bayNumber in BAY_CALENDARS)) {
      console.error('Invalid bay number for availability check:', bayNumber);
      throw new Error(`Invalid bay number provided: ${bayNumber}`);
  }
  const calendarId = BAY_CALENDARS[bayNumber as BayName];

  const startOfDayISO = formatInTimeZone(parse(`${date}T00:00:00`, "yyyy-MM-dd'T'HH:mm:ss", new Date()), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const endOfDayISO = formatInTimeZone(parse(`${date}T23:59:59`, "yyyy-MM-dd'T'HH:mm:ss", new Date()), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX");

  try {
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDayISO,
        timeMax: endOfDayISO,
        items: [{ id: calendarId }],
        timeZone: TIMEZONE
      },
    });

    const busyTimes = response.data.calendars?.[calendarId]?.busy || [];

    return busyTimes.map(time => {
      if (!time.start || !time.end) return null;
      try {
        const startUTC = parseISO(time.start);
        const endUTC = parseISO(time.end);
        if (isNaN(startUTC.getTime()) || isNaN(endUTC.getTime())) return null;

        return {
             start: formatInTimeZone(startUTC, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
             end: formatInTimeZone(endUTC, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX")
         };
      } catch(parseError) {
        console.error('Error parsing/converting busy time from Google API:', time, parseError);
        return null;
      }
    }).filter((t): t is { start: string; end: string } => t !== null);

  } catch (error) {
    console.error(`Error fetching availability for bay ${bayNumber}:`, error);
    throw error;
  }
}

export function initializeCalendar(auth: any): calendar_v3.Calendar {
  return google.calendar({ version: 'v3', auth });
}

export function isTimeSlotAvailable(
  slotStart: Date,
  slotEnd: Date,
  busyTimes: { start: string; end: string }[]
): boolean {
  return !busyTimes.some(busy => {
    try {
        const busyStart = parseISO(busy.start);
        const busyEnd = parseISO(busy.end);

        if (isNaN(busyStart.getTime()) || isNaN(busyEnd.getTime())) {
            console.error('Invalid date encountered in busyTimes:', busy);
            return true;
        }
        
        return slotStart.getTime() < busyEnd.getTime() && slotEnd.getTime() > busyStart.getTime();
    } catch (parseError) {
        console.error('Error parsing busy time string in isTimeSlotAvailable:', busy, parseError);
        return true;
    }
  });
}

export function getAvailableTimeSlots(
  date: string,
  busyTimes: { start: string; end: string }[],
  intervalMinutes: number = 60,
  businessStartTime: string = '10:00',
  businessEndTime: string = '23:00'
): { start: string; end: string }[] {
  const availableSlots: { start: string; end: string }[] = [];
  
  try {
      const dayStart = parse(`${date}T${businessStartTime}:00`, "yyyy-MM-dd'T'HH:mm:ss", new Date());
      const dayEnd = parse(`${date}T${businessEndTime}:00`, "yyyy-MM-dd'T'HH:mm:ss", new Date());
      
      if (isNaN(dayStart.getTime()) || isNaN(dayEnd.getTime())) {
          throw new Error('Invalid business start/end time parsing.');
      }

      let currentSlotStart = dayStart;
      
      const busyDateTimes = busyTimes.map(bt => ({
          start: parseISO(bt.start),
          end: parseISO(bt.end)
      })).filter(bt => !isNaN(bt.start.getTime()) && !isNaN(bt.end.getTime()));

      while (compareAsc(currentSlotStart, dayEnd) === -1) {
          const currentSlotEnd = addMinutes(currentSlotStart, intervalMinutes);
          
          if (compareAsc(currentSlotEnd, dayEnd) > 0) {
              break;
          }

          const isBusy = busyDateTimes.some(busy => 
              currentSlotStart.getTime() < busy.end.getTime() && currentSlotEnd.getTime() > busy.start.getTime()
          );

          if (!isBusy) {
              availableSlots.push({
                  start: formatInTimeZone(currentSlotStart, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
                  end: formatInTimeZone(currentSlotEnd, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX")
              });
          }
          
          currentSlotStart = currentSlotEnd;
      }
  } catch (error) {
      console.error('Error generating available time slots:', error);
  }
  
  return availableSlots;
}

export async function fetchBayEvents(
  calendar: calendar_v3.Calendar,
  bayNumber: string,
  date: string
) {
  if (!(bayNumber in BAY_CALENDARS)) {
    console.error('Invalid bay number for event fetching:', bayNumber);
    throw new Error(`Invalid bay number provided: ${bayNumber}`);
  }
  const calendarId = BAY_CALENDARS[bayNumber as BayName];

  const parsedDate = parse(date, "yyyy-MM-dd", new Date());
  if (isNaN(parsedDate.getTime())) {
    console.error('Invalid date format for event fetching:', date);
    throw new Error(`Invalid date format provided: ${date}. Expected YYYY-MM-DD.`);
  }

  const startOfDay = fromZonedTime(parsedDate, TIMEZONE);
  const endOfDayDate = addMinutes(addHours(startOfDay, 23), 59);

  const timeMin = formatISO(startOfDay);
  const timeMax = formatISO(endOfDayDate);

  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      timeZone: TIMEZONE,
    } as calendar_v3.Params$Resource$Events$List);

    const events = response.data?.items || [];

    return events.map((event: calendar_v3.Schema$Event) => {
      const description = event.description || '';
      const nameLine = description.match(/Name: ([^\n]+)/) || description.match(/Customer Name: ([^\n]+)/);
      const contactLine = description.match(/Contact: ([^\n]+)/);
      const typeLine = description.match(/Type: ([^\n]+)/);
      const paxLine = description.match(/Pax: ([^\n]+)/);
      const summary = event.summary || '';

      let customerName = 'Unknown';
      if (nameLine && nameLine[1]) {
        customerName = nameLine[1];
      } else {
        const summaryMatch = summary.match(/^([^\(]+)\s*\(/);
        if (summaryMatch && summaryMatch[1]) {
          customerName = summaryMatch[1].trim();
        }
      }

      let bookingType = '';
      let packageName = '';
      if (typeLine && typeLine[1]) {
        const typeFull = typeLine[1];
        const packageMatch = typeFull.match(/^(.*?)\s*\((.*?)\)$/);
        if (packageMatch && packageMatch[1] && packageMatch[2]) {
          bookingType = packageMatch[1].trim();
          packageName = packageMatch[2].trim();
        } else {
          bookingType = typeFull.trim();
        }
      } else {
        const summaryTypeMatch = summary.match(/-\s*(.+?)\s*at\s*/i);
        if (summaryTypeMatch && summaryTypeMatch[1]) {
          const fullTypeFromSummary = summaryTypeMatch[1];
          const packageInSummaryMatch = fullTypeFromSummary.match(/^(.*?)\s*\((.*?)\)$/);
          if (packageInSummaryMatch && packageInSummaryMatch[1] && packageInSummaryMatch[2]) {
            bookingType = packageInSummaryMatch[1].trim();
            packageName = packageInSummaryMatch[2].trim();
          } else {
            bookingType = fullTypeFromSummary.trim();
          }
        }
      }

      return {
        id: event.id || undefined,
        summary: event.summary || undefined,
        description: event.description || undefined,
        start: event.start?.dateTime || undefined,
        end: event.end?.dateTime || undefined,
        customer_name: customerName,
        booking_type: bookingType,
        package_name: packageName || undefined,
        number_of_pax: paxLine && paxLine[1] ? paxLine[1] : '',
        color: event.colorId || undefined,
      };
    });
  } catch (error) {
    console.error(`Error fetching events for bay ${bayNumber} on date ${date}:`, error);
    throw error;
  }
}

export async function findCalendarEventsByBookingId(
  auth: any, // Should be the same auth object used for initializeCalendar
  bookingId: string,
  allPossibleCalendarIds: string[]
): Promise<{ eventId: string; calendarId: string }[]> {
  const calendar = initializeCalendar(auth);
  const foundEvents: { eventId: string; calendarId: string }[] = [];

  console.log(`Searching for calendar events with Booking ID: ${bookingId} in calendars:`, allPossibleCalendarIds);

  for (const calId of allPossibleCalendarIds) {
    if (!calId) {
      console.warn('Skipping search in an undefined or null calendar ID.');
      continue;
    }
    try {
      const response = await calendar.events.list({
        calendarId: calId,
        q: `Booking ID: ${bookingId}`, // Searches within event details (summary, description, etc.)
        singleEvents: true, // Important for recurring events, though likely not used here
        showDeleted: false,
      });

      if (response.data.items) {
        for (const event of response.data.items) {
          if (event.id) {
            // Ensure description contains the booking ID to be more precise, though q should handle it
            if (event.description && event.description.includes(`Booking ID: ${bookingId}`)){
                 foundEvents.push({ eventId: event.id, calendarId: calId });
            } else if (!event.description) {
                // If there's no description, but q matched it, consider it a potential match.
                // This case might be rare if booking ID is always in description.
                console.warn(`Event ${event.id} in calendar ${calId} matched by query "Booking ID: ${bookingId}" but has no description. Adding it based on query match.`);
                foundEvents.push({ eventId: event.id, calendarId: calId });
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error searching for events in calendar ${calId} for booking ID ${bookingId}:`, error);
      // Continue to other calendars instead of failing all
    }
  }
  console.log(`Found ${foundEvents.length} events for Booking ID ${bookingId}:`, foundEvents);
  return foundEvents;
}

export async function updateCalendarEvent(
  auth: any, // Should be the same auth object used for initializeCalendar
  calendarId: string,
  eventId: string,
  eventData: calendar_v3.Schema$Event // This should be the complete event resource
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = initializeCalendar(auth);
  console.log(`Attempting to update event ${eventId} in calendar ${calendarId} with data:`, eventData);
  try {
    const response = await calendar.events.update({
      calendarId: calendarId,
      eventId: eventId,
      requestBody: eventData,
    });
    console.log(`Successfully updated event ${eventId} in calendar ${calendarId}. Response:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`Error updating event ${eventId} in calendar ${calendarId}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

export async function deleteCalendarEvent(
  auth: any, // Should be the same auth object used for initializeCalendar
  calendarId: string,
  eventId: string
): Promise<void> { // Google API delete typically returns empty or 204 No Content
  const calendar = initializeCalendar(auth);
  try {
    await calendar.events.delete({
      calendarId: calendarId,
      eventId: eventId,
    });
    console.log(`Successfully deleted GCal event ${eventId} from calendar ${calendarId}`);
  } catch (error) {
    console.error(`Error deleting GCal event ${eventId} from calendar ${calendarId}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
}

export async function getCalendarEventDetails(
  auth: any, // Should be the same auth object used for initializeCalendar
  calendarId: string,
  eventId: string
): Promise<calendar_v3.Schema$Event | null> {
  const calendar = initializeCalendar(auth);
  try {
    const response = await calendar.events.get({
      calendarId: calendarId,
      eventId: eventId,
    });
    if (response.data) {
      console.log(`Successfully fetched GCal event ${eventId} from calendar ${calendarId}`);
      return response.data;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching GCal event ${eventId} from calendar ${calendarId}:`, error);
    // Depending on how critical this is, you might want to re-throw or handle differently
    // For now, returning null indicates failure to fetch for any reason including not found.
    return null;
  }
}