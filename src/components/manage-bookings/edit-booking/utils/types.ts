/**
 * EditBookingModal Types
 * Extracted from the original 1,134-line component
 */

import { Booking, CustomerInfo } from '@/types/booking';

export interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: (updatedBooking: Booking) => void;
}

export interface EditBookingFormData {
  bay: string;
  date: Date; // Store date as Date object for DatePicker
  start_time: string; // HH:mm
  duration: number; // in minutes
  number_of_people: number;
  customer_notes: string;
  employee_name: string;
  // Phase 3 enhancements
  package_id: string | null;
  package_name: string | null; // Track package name for notifications
  booking_type: string;
  referral_source: string | null;
}

export interface BayAvailability {
  name: string;
  apiName: string;
  isAvailable: boolean;
}

export interface OriginalSlot {
  date: string;
  start_time: string;
  duration: number;
  bay: string | null;
}

export type AvailabilityStatus = 
  | 'idle' 
  | 'checking' 
  | 'available' 
  | 'unavailable' 
  | 'error' 
  | 'not_applicable' 
  | 'overridden';

export interface Employee {
  value: string;
  label: string;
}