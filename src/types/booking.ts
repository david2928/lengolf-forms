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
}

export interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
  colorId: string;
}