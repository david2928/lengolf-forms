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
  bayDisplayName?: string;
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
  const colorId = inputData.bay ? BAY_COLORS[inputData.bay as BayName]?.toString() : undefined;

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