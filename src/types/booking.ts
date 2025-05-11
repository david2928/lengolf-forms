export interface Booking {
  id: string;                 // text, PK, not nullable
  user_id: string;            // uuid, not nullable
  name: string;               // text, not nullable
  email: string;              // text, not nullable (will be placeholder)
  phone_number: string;       // text, not nullable
  date: string;               // date, not nullable (format YYYY-MM-DD)
  start_time: string;         // text, not nullable (format HH:mm)
  duration: number;           // integer, not nullable (hours)
  number_of_people: number;   // integer, not nullable
  status: 'confirmed' | 'cancelled'; // text, not nullable (initially 'confirmed')
  bay: string | null;         // text, nullable (format 'Bay 1', 'Bay 2', etc.)
  customer_notes: string | null; // text, nullable
  created_at?: string;        // timestamptz, nullable (DB default)
  updated_at?: string;        // timestamptz, nullable (DB default)
  updated_by_type?: string | null;      // TEXT, nullable
  updated_by_identifier?: string | null; // TEXT, nullable
  cancelled_by_type?: string | null;    // TEXT, nullable
  cancelled_by_identifier?: string | null; // TEXT, nullable
  cancellation_reason?: string | null;  // TEXT, nullable
  google_calendar_sync_status?: string | null; // TEXT, nullable
  calendar_event_id?: string | null; // Google Calendar event ID (to be deprecated)
  calendar_events?: { eventId: string; calendarId: string; status: string }[] | null; // JSONB from P0
  booking_type?: string | null; // TEXT, nullable, Added for storing booking type
  package_name?: string | null; // TEXT, nullable, Added for storing package name
}

export interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
  colorId: string;
}