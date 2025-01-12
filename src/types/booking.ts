export interface Booking {
  employee_name: string;
  customer_name: string;
  contact_number?: string;
  booking_type: string;
  package_name?: string;
  number_of_pax: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  bay_number: string;
  notes?: string;
  booking_source: string;
  is_new_customer: boolean;
  package_id?: string;
}

export interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string };
  end: { dateTime: string };
  colorId: string;
}