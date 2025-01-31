export type BookingSource = 'LINE' | 'Facebook' | 'Instagram' | 'Walk-in' | 'Phone';

export type BookingType = 'Normal Bay Rate' | 'Package' | 'Event' | 'Class';

export interface BookingFormData {
  employeeName: string | null;
  customerContactedVia: string | null;
  bookingType: string | null;
  isNewCustomer: boolean;
  bookingDate: Date | null;
  startTime: string | null;
  endTime: string | null;
  duration: number;
  isManualMode: boolean;
  bayNumber?: string;
  notes: string;
  numberOfPax: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
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