export type BookingSource = 'LINE' | 'Walk-in' | 'Phone' | 'Whatsapp' | 'Instagram/Facebook' | 'Website / ResOS' | 'ClassPass' | 'Other';

export type BookingType = 'Package' | 'Coaching (Boss)' | 'Coaching (Boss - Ratchavin)' | 'Normal Bay Rate' | 'ClassPass' | 'VR' | 'Others (e.g. Events)';

export interface BookingFormData {
  employeeName: string | null;
  customerContactedVia: string | null;
  bookingType: string | null;
  isNewCustomer: boolean;
  customerId?: string;
  customerName?: string;
  customerPhone?: string | undefined;
  packageId?: string;
  packageName?: string;
  errors?: {[key: string]: string};
  bookingDate: Date | null;
  numberOfPax: number | null;
  isManualMode?: boolean;
  startTime: Date | string | null;
  endTime: string | null;
  duration?: number;
  bayNumber?: string;
  notes?: string;
}