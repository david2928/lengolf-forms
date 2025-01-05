import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { BAY_CALENDARS, COACHING_CALENDARS, BAY_COLORS, type BayName, type BookingType } from './constants';
import type { Booking } from '@/types/booking';
import type { calendar_v3 } from 'googleapis';

export interface CalendarEventResult {
  eventId: string;
  calendarId: string;
  status: string;
}

export class CalendarService {
  private calendar: calendar_v3.Calendar;

  constructor(auth: any) {
    this.calendar = google.calendar({ version: 'v3', auth });
  }

  private formatEvent(booking: Booking): calendar_v3.Schema$Event {
    const startDateTime = DateTime.fromSQL(`${booking.booking_date} ${booking.start_time}`).setZone('Asia/Bangkok');
    const endDateTime = DateTime.fromSQL(`${booking.booking_date} ${booking.end_time}`).setZone('Asia/Bangkok');
    const bayNumber = booking.bay_number as keyof typeof BAY_COLORS;
    const eventColor = BAY_COLORS[bayNumber] || '1';

    return {
      summary: `${booking.customer_name} - ${booking.booking_type}`,
      description: `Name: ${booking.customer_name}
Contact: ${booking.contact_number}
Type: ${booking.booking_type}
Pax: ${booking.number_of_pax}
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
      colorId: eventColor,
    };
  }

  async create(booking: Booking): Promise<CalendarEventResult[]> {
    const event = this.formatEvent(booking);
    const results: CalendarEventResult[] = [];

    // Add to bay calendar
    const bayCalendarId = BAY_CALENDARS[booking.bay_number as BayName];
    if (bayCalendarId) {
      const { data: calendarEvent } = await this.calendar.events.insert({
        calendarId: bayCalendarId,
        requestBody: event,
      });

      if (calendarEvent.id) {
        results.push({
          eventId: calendarEvent.id,
          calendarId: bayCalendarId,
          status: calendarEvent.status || 'unknown',
        });
      }
    }

    // If it's a coaching session, also add to the relevant coaching calendar
    const bookingType = booking.booking_type as BookingType;
    if (COACHING_CALENDARS[bookingType]) {
      const coachingCalendarId = COACHING_CALENDARS[bookingType];
      const { data: calendarEvent } = await this.calendar.events.insert({
        calendarId: coachingCalendarId,
        requestBody: event,
      });

      if (calendarEvent.id) {
        results.push({
          eventId: calendarEvent.id,
          calendarId: coachingCalendarId,
          status: calendarEvent.status || 'unknown',
        });
      }
    }

    return results;
  }

  async delete(eventIds: string[], calendarId: string): Promise<CalendarEventResult[]> {
    const results = await Promise.all(
      eventIds.map(async (eventId) => {
        try {
          await this.calendar.events.delete({
            calendarId,
            eventId,
          });
          return {
            eventId,
            calendarId,
            status: 'deleted',
          };
        } catch (error) {
          console.error(`Failed to delete event ${eventId}:`, error);
          return {
            eventId,
            calendarId,
            status: 'error',
          };
        }
      })
    );

    return results;
  }
}