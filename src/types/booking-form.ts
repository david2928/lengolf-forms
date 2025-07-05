export type BookingSource = 'LINE' | 'Facebook' | 'Instagram' | 'Walk-in' | 'Phone';

export type BookingType = 'Normal Bay Rate' | 'Package' | 'Event' | 'Class';

export interface BookingFormData {
  employeeName: string | null;
  customerContactedVia: string | null;
  bookingType: string | null;
  isNewCustomer: boolean;
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
  errors?: { [key: string]: string };
  isSubmitted?: boolean;
  submissionStatus?: {
    booking: boolean;
    calendar: boolean;
    notification: boolean;
  };
}