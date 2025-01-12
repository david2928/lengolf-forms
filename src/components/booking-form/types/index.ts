export interface FormData {
  employeeName?: string | null;
  customerContactedVia?: string | null;
  bookingType?: string | null;
  isNewCustomer?: boolean;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  packageId?: string;
  numberOfPax?: number;
  bookingDate?: Date;
  bayNumber?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface FormErrors {
  employeeName?: string;
  customerContactedVia?: string;
  bookingType?: string;
  isNewCustomer?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  packageId?: string;
  numberOfPax?: string;
  bookingDate?: string;
  bay?: string;
  time?: string;
}