import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getServiceAccountAuth } from '@/lib/google-auth';
import { DateTime } from 'luxon';
import { BAY_CALENDARS, COACHING_CALENDARS, BAY_COLORS, type BayName, type BookingType } from '@/lib/constants';

async function createCalendarEvent(calendar: any, calendarId: string, event: any): Promise<CalendarEventResult> {
  console.log('Attempting to create event in calendar:', calendarId, 'with event:', event);
  const response = await calendar.events.insert({
    calendarId,
    requestBody: event,
  });
  console.log('Calendar event created successfully:', response.data);
  return {
    eventId: response.data.id!,
    calendarId,
    status: response.data.status!,
  };
}

async function createEvents(calendar: any, booking: any): Promise<CalendarEventResult[]> {
  const startDateTime = DateTime.fromSQL(`${booking.booking_date} ${booking.start_time}`).setZone('Asia/Bangkok');
  const endDateTime = DateTime.fromSQL(`${booking.booking_date} ${booking.end_time}`).setZone('Asia/Bangkok');
  const results: CalendarEventResult[] = [];

  // Create event summary with package name if available
  const bookingType = booking.package_name 
    ? `${booking.booking_type} (${booking.package_name})`
    : booking.booking_type;

  // Create the basic event object
  const event = {
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
      timeZone: 'Asia/Bangkok',
    },
    end: {
      dateTime: endDateTime.toISO(),
      timeZone: 'Asia/Bangkok',
    },
    colorId: '1',
  };

  // Get Bay Calendar ID
  if (booking.bay_number in BAY_CALENDARS) {
    const bayCalendarId = BAY_CALENDARS[booking.bay_number as BayName];
    try {
      const bayResult = await createCalendarEvent(calendar, bayCalendarId, event);
      results.push(bayResult);
      console.log('Successfully created event in bay calendar');
    } catch (error) {
      console.error('Failed to create event in bay calendar:', error);
    }
  } else {
    console.error('No calendar ID found for bay:', booking.bay_number);
    console.log('Available bay calendars:', Object.keys(BAY_CALENDARS));
  }

  // Create coaching calendar event if applicable
  if (booking.booking_type in COACHING_CALENDARS) {
    const coachingCalendarId = COACHING_CALENDARS[booking.booking_type as BookingType];
    console.log('Creating event in coaching calendar:', coachingCalendarId);
    
    try {
      const coachingResult = await createCalendarEvent(calendar, coachingCalendarId, event);
      results.push(coachingResult);
      console.log('Successfully created event in coaching calendar');
    } catch (error) {
      console.error('Failed to create event in coaching calendar:', error);
    }
  }

  return results;
}

interface CalendarEventResult {
  eventId: string;
  calendarId: string;
  status: string;
}

interface CalendarRequest {
  operation: 'create' | 'update' | 'delete';
  booking: any;
  eventId?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CalendarRequest;
    console.log('Calendar request body:', body);

    const auth = await getServiceAccountAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    let result;
    switch (body.operation) {
      case 'create':
        result = await createEvents(calendar, body.booking);
        console.log('Calendar events created:', result);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Calendar operation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}