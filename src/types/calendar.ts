import type { Booking } from './booking';

export type CalendarOperation = 'create' | 'update' | 'delete';

export interface CalendarRequest {
  operation: CalendarOperation;
  booking: Booking;
  eventId?: string;  // Required for update/delete operations
}

export interface CalendarResponse {
  success: boolean;
  data?: {
    eventId: string;
    calendarId: string;
    status: string;
  }[];
  error?: string;
}