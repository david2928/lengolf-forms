import { NextResponse } from 'next/server';
import { google, calendar_v3 } from 'googleapis';
import { DateTime } from 'luxon';
import { getServiceAccountAuth } from '@/lib/google-auth';

const TIMEZONE = 'Asia/Bangkok';

// Define all bays with their simple names, API names (for GCal event titles/matching), and Calendar IDs
const ALL_BAYS_INFO = [
  { 
    simpleName: 'Bay 1', 
    apiName: 'Bay 1 (Bar)', 
    calendarId: process.env.BAY_1_CALENDAR_ID || "a6234ae4e57933edb48a264fff4c5d3d3653f7bedce12cfd9a707c6c0ff092e4@group.calendar.google.com" 
  },
  { 
    simpleName: 'Bay 2', 
    apiName: 'Bay 2', 
    calendarId: process.env.BAY_2_CALENDAR_ID || "3a700346dd902abd4aa448ee63e184a62f05d38bb39cb19a8fc27116c6df3233@group.calendar.google.com" 
  },
  { 
    simpleName: 'Bay 3', 
    apiName: 'Bay 3 (Entrance)', 
    calendarId: process.env.BAY_3_CALENDAR_ID || "092757d971c313c2986b43f4c8552382a7e273b183722a44a1c4e1a396568ca3@group.calendar.google.com" 
  }
];

const getBookingIdFromDescription = (description: string | null | undefined): string | null => {
  if (!description) return null;
  const match = description.match(/Booking ID: (BK[A-Z0-9]+)/i);
  return match ? match[1] : null;
};

// Helper to convert HH:mm time and date string to a Luxon DateTime object
const getLuxonDateTime = (dateStr: string, timeStr: string): DateTime | null => {
  if (!dateStr || !timeStr) return null;
  try {
    const dateTime = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', { zone: TIMEZONE });
    return dateTime.isValid ? dateTime : null;
  } catch (e) {
    console.error('Error creating Luxon DateTime:', e);
    return null;
  }
};


export async function POST(request: Request) {
  try {
    const { date, start_time, duration, bookingIdToExclude } = await request.json();

    if (!date || !start_time || typeof duration !== 'number' || duration <= 0) {
      return NextResponse.json({ error: 'Missing or invalid parameters: date, start_time, and duration (number, >0) are required.' }, { status: 400 });
    }

    const auth = await getServiceAccountAuth();
    const calendar: calendar_v3.Calendar = google.calendar({ version: 'v3', auth });

    const proposedSlotStart = getLuxonDateTime(date, start_time);
    if (!proposedSlotStart) {
      return NextResponse.json({ error: 'Invalid date or start_time format.' }, { status: 400 });
    }
    const proposedSlotEnd = proposedSlotStart.plus({ minutes: duration * 60 });

    const dayStart = proposedSlotStart.startOf('day');
    const dayEnd = proposedSlotStart.endOf('day');

    const availabilityResults = [];

    for (const bayInfo of ALL_BAYS_INFO) {
      let isBayAvailableForSlot = true;
      try {
        const listParams: calendar_v3.Params$Resource$Events$List = {
          calendarId: bayInfo.calendarId,
          timeMin: dayStart.toISO() ?? undefined,
          timeMax: dayEnd.toISO() ?? undefined,
          singleEvents: true,
          orderBy: 'startTime',
          timeZone: TIMEZONE,
        };
        const eventsResponse = await calendar.events.list(listParams);

        const events = eventsResponse.data?.items;
        if (events) {
          for (const event of events) {
            if (event.status === 'cancelled') continue;

            if (bookingIdToExclude) {
              const eventBookingId = getBookingIdFromDescription(event.description);
              if (eventBookingId === bookingIdToExclude) {
                continue; 
              }
            }

            const eventStartStr = event.start?.dateTime;
            const eventEndStr = event.end?.dateTime;

            if (eventStartStr && eventEndStr) {
              const eventStart = DateTime.fromISO(eventStartStr, { zone: TIMEZONE });
              const eventEnd = DateTime.fromISO(eventEndStr, { zone: TIMEZONE });

              // Check for overlap: (ProposedStart < EventEnd) and (ProposedEnd > EventStart)
              if (proposedSlotStart < eventEnd && proposedSlotEnd > eventStart) {
                isBayAvailableForSlot = false;
                break; // No need to check other events for this bay
              }
            }
          }
        }
      } catch (e: any) {
        console.error(`Error checking GCal for ${bayInfo.simpleName}:`, e.message);
        // If GCal fails for a bay, assume it's not available to be safe, or handle as per requirements
        isBayAvailableForSlot = false; 
      }
      availabilityResults.push({
        name: bayInfo.simpleName,
        apiName: bayInfo.apiName,
        isAvailable: isBayAvailableForSlot,
      });
    }

    return NextResponse.json(availabilityResults);

  } catch (error: any) {
    console.error('Error in /api/bookings/check-slot-for-all-bays:', error);
    return NextResponse.json(
      { error: 'Failed to check slot availability for all bays', details: error.message },
      { status: 500 }
    );
  }
} 