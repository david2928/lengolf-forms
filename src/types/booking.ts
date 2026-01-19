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
  // Calendar integration fields removed - calendar events now managed by automated sync system
  booking_type?: string | null; // TEXT, nullable, Added for storing booking type
  package_name?: string | null; // TEXT, nullable, Added for storing package name
  stable_hash_id?: string | null; // TEXT, nullable, Stores the stable_hash_id of the CRM customer
  // Phase 1 booking enhancement fields
  package_id?: string | null; // uuid, nullable, Foreign key to backoffice.packages(id)
  referral_source?: string | null; // text, nullable, Where customer heard about us
  is_new_customer?: boolean; // boolean, nullable, Auto-detected via trigger
  customer_id?: string | null; // uuid, nullable, Foreign key to public.customers(id)
  customer_code?: string | null; // varchar, nullable, Customer reference code (CUS-001, CUS-002, etc.)
  customer?: CustomerInfo | null; // Customer information from customers table
  // Phone confirmation tracking fields
  phone_confirmed?: boolean; // Whether booking has been confirmed via phone call
  phone_confirmed_at?: string; // Timestamp when phone confirmation was made
  phone_confirmed_by?: string; // Name of staff who made the confirmation call
}

// Customer information interface for bookings
export interface CustomerInfo {
  customer_code: string;
  customer_name: string;
  contact_number: string | null;
  email: string | null;
  address: string | null;
  date_of_birth: string | null;
  preferred_contact_method: 'Phone' | 'LINE' | 'Email' | null;
  total_lifetime_value: number;
  total_visits: number;
  last_visit_date: string | null;
}

export interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
  colorId: string;
}