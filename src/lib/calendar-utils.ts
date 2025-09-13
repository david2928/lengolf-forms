import { DateTime } from 'luxon';
import type { Booking } from '@/types/booking';

// Calendar event format expected by the current bookings-calendar component
export interface CalendarEvent {
  id: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  customer_name: string;
  customer_code?: string | null;
  customer_id?: string | null;
  booking_type: string;
  package_name?: string;
  number_of_pax: string;
  color?: string;
  summary?: string;
  is_new_customer?: boolean;
  referral_source?: string;
}

// Bay color mapping (matching current calendar implementation)
const BAY_COLORS = {
  'Bay 1 (Bar)': 'bg-blue-100 border-blue-300',
  'Bay 2': 'bg-green-100 border-green-300', 
  'Bay 3 (Entrance)': 'bg-purple-100 border-purple-300',
  'Bay 4': 'bg-violet-100 border-violet-300',
} as const;

// Convert simple bay names to API bay names (matching Google Calendar format)
const BAY_NAME_MAPPING = {
  'Bay 1': 'Bay 1 (Bar)',
  'Bay 2': 'Bay 2',
  'Bay 3': 'Bay 3 (Entrance)',
  'Bay 4': 'Bay 4',
} as const;

/**
 * Calculate end time from start time and duration
 */
export function calculateEndTime(date: string, startTime: string, durationHours: number): string {
  const startDateTime = DateTime.fromISO(`${date}T${startTime}:00`, { zone: 'Asia/Bangkok' });
  const endDateTime = startDateTime.plus({ hours: durationHours });
  return endDateTime.toISO() || '';
}

/**
 * Get bay color for calendar display
 */
export function getBayColor(bay: string | null): string {
  if (!bay) return 'bg-gray-100 border-gray-300';
  
  // Convert simple bay name to API bay name if needed
  const apiBayName = (BAY_NAME_MAPPING as any)[bay] || bay;
  return (BAY_COLORS as any)[apiBayName] || 'bg-gray-100 border-gray-300';
}

/**
 * Get API bay name (with parenthetical) from simple bay name
 */
export function getApiBayName(bay: string | null): string {
  if (!bay) return '';
  return (BAY_NAME_MAPPING as any)[bay] || bay;
}

/**
 * Convert database Booking object to calendar display format
 */
export function formatBookingForCalendar(booking: Booking): CalendarEvent {
  const apiBayName = getApiBayName(booking.bay);
  
  // Create start datetime with consistent timezone
  const startDateTime = DateTime.fromISO(`${booking.date}T${booking.start_time}:00`, { zone: 'Asia/Bangkok' });
  const endDateTime = startDateTime.plus({ hours: booking.duration });
  
  // Create summary similar to Google Calendar format
  const summary = `${booking.name} (${booking.phone_number}) (${booking.number_of_people}) - ${booking.booking_type || 'Bay Rate'}`;
  
  return {
    id: booking.id,
    start: startDateTime.toISO() || '',
    end: endDateTime.toISO() || '',
    customer_name: booking.name,
    customer_code: booking.customer_code || null,
    customer_id: booking.customer_id || null,
    booking_type: booking.booking_type || 'Bay Rate',
    package_name: booking.package_name || undefined,
    number_of_pax: booking.number_of_people.toString(),
    color: getBayColor(booking.bay),
    summary: summary,
    is_new_customer: booking.is_new_customer,
    referral_source: booking.referral_source || undefined
  };
}

/**
 * Convert array of database bookings to calendar events, grouped by bay
 */
export function formatBookingsForCalendar(bookings: Booking[]): Record<string, CalendarEvent[]> {
  const eventsByBay: Record<string, CalendarEvent[]> = {};
  
  // Initialize bay arrays
  const bayNames = ['Bay 1 (Bar)', 'Bay 2', 'Bay 3 (Entrance)', 'Bay 4'];
  bayNames.forEach(bay => {
    eventsByBay[bay] = [];
  });
  
  // Convert bookings to events and group by bay
  bookings
    .filter(booking => booking.status === 'confirmed' && booking.bay)
    .forEach(booking => {
      const apiBayName = getApiBayName(booking.bay);
      if (apiBayName && eventsByBay[apiBayName]) {
        eventsByBay[apiBayName].push(formatBookingForCalendar(booking));
      }
    });
    
  return eventsByBay;
} 