export type BookingSource = 'LINE' | 'Facebook' | 'Instagram' | 'Walk-in' | 'Phone';

export type BookingType = 'Package' | 'Event' | 'Class';

// Phase 1 booking enhancement: Referral source constants
export const REFERRAL_SOURCES = [
  'Instagram',
  'Facebook', 
  'Google',
  'TikTok',
  'Friends',
  'Mall Advertisement',
  'Other'
] as const;

export type ReferralSource = typeof REFERRAL_SOURCES[number];

export interface BookingFormData {
  employeeName: string | null;
  customerContactedVia: string | null;
  bookingType: string | null;
  isNewCustomer: boolean | null; // Allow null for initial state
  bookingDate: Date | null;
  startTime: string | Date | null;
  endTime: string | Date | null;
  duration: number;
  isManualMode: boolean;
  bayNumber?: string;
  notes: string;
  numberOfPax: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerStableHashId?: string | null;
  packageId?: string;
  packageName?: string;
  coach?: string | null; // Added coach field for coaching bookings
  promotion?: string | null; // Added promotion field for special offers
  // Phase 1 booking enhancement fields
  referralSource?: ReferralSource | string | null; // Allow string for "Other" referral values
  customerEmail?: string; // Customer email (optional, collected via self-service or manually)
  errors?: { [key: string]: string };
  isSubmitted?: boolean;
  submissionStatus?: {
    booking: boolean;
    calendar: boolean;
    notification: boolean;
  };
}

// Bay blocking types
export interface BayBlockingData {
  bays: string[];           // ['Bay 1', 'Bay 2']
  date: Date;
  startTime: string;        // '10:00'
  endTime: string;          // '14:00'
  reason: string;           // 'Maintenance - Projector repair'
  employeeName: string;     // From current form context
}

export interface BayBlockingInfo {
  bay: string;
  reason: string;
  startTime: string;
  endTime: string;
  date: string;
  blockedBy: string;
  bookingId: string;
}

export const BAY_BLOCKING_TEMPLATES = [
  'Maintenance - Equipment repair',
  'Private Event',
  'Deep Cleaning',
  'Staff Training',
  'System Update'
] as const;

export type BayBlockingTemplate = typeof BAY_BLOCKING_TEMPLATES[number];