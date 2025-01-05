import type { BookingFormData } from '@/types/booking-form'

export type FormData = BookingFormData;

export interface FormErrors {
  [key: string]: string | undefined;
}