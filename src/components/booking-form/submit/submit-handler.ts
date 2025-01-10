import { LINE_TOKENS } from '@/lib/constants';
import type { FormData } from '../types';
import type { Booking } from '@/types/booking';
import { format } from 'date-fns';

interface SubmitResponse {
  success: boolean;
  error?: string;
  calendarEvents?: any[];
  bookingId?: string;
}

function formatTime(date: Date | string): string {
  return typeof date === 'string' ? date : format(date, 'HH:mm:ss');
}

function formatBookingData(formData: FormData): Booking {
  if (!formData.bayNumber) {
    throw new Error('Bay number is required');
  }

  console.log('Formatting booking data from:', formData);
  const getTimeString = (date: Date | string) => {
    if (typeof date === 'string') {
      const [hours, minutes] = date.split(':');
      const time = new Date();
      time.setHours(parseInt(hours), parseInt(minutes), 0);
      return formatTime(time);
    }
    return formatTime(date);
  };

  // Convert bay number to display format
  const bayDisplay = formData.bayNumber === 'Bay 1' ? 'Bay 1 (Bar)' :
                    formData.bayNumber === 'Bay 3' ? 'Bay 3 (Entrance)' : 
                    formData.bayNumber;

  // Handle package name for both selected package and "will buy" case
  let packageName = formData.packageName;
  if (formData.bookingType === 'Package' && !formData.packageId && packageName) {
    // If it's "will buy package" case, make sure we use the entered package name
    packageName = packageName.trim();
  }

  const booking: Booking = {
    employee_name: formData.employeeName!,
    customer_name: formData.customerName!,
    contact_number: formData.customerPhone,
    booking_type: formData.bookingType!,
    package_name: packageName,  // Use the processed package name
    number_of_pax: formData.numberOfPax!,
    booking_date: format(formData.bookingDate!, 'yyyy-MM-dd'),
    start_time: getTimeString(formData.startTime!),
    end_time: getTimeString(formData.endTime!),
    bay_number: bayDisplay,
    notes: formData.notes,
    booking_source: formData.customerContactedVia!,
    is_new_customer: formData.isNewCustomer!,
    package_id: formData.packageId
  };
  
  console.log('Formatted booking:', booking);
  return booking;
}

function formatLineMessage(booking: Booking): string {
  console.log('Formatting LINE message for booking:', booking);
  const customerStatus = booking.is_new_customer ? 'New Customer' : 'Existing Customer';
  
  const [year, month, day] = booking.booking_date.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12);
  
  const dateStr = dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  // Format booking type to match Google Calendar format
  const bookingType = booking.package_name 
    ? `${booking.booking_type} (${booking.package_name})`
    : booking.booking_type;

  const notesInfo = booking.notes ? ` (${booking.notes})` : '';

  return `New Booking: ${customerStatus} ${booking.customer_name} (${booking.contact_number}), ${bookingType}, ${booking.number_of_pax} PAX at ${booking.bay_number} on ${dateStr} from ${booking.start_time.slice(0,5)} - ${booking.end_time.slice(0,5)}${notesInfo}. Customer contacted via ${booking.booking_source}, submitted by ${booking.employee_name}.`;
}

export async function handleFormSubmit(formData: FormData): Promise<SubmitResponse> {
  try {
    console.log('Starting form submission with data:', formData);
    const booking = formatBookingData(formData);
    console.log('Booking data for submission:', booking);
    
    // Create booking record
    const bookingResponse = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(booking)
    });

    if (!bookingResponse.ok) {
      throw new Error('Failed to create booking record');
    }

    const { bookingId } = await bookingResponse.json();

    // Format dates for calendar
    const date = format(formData.bookingDate!, 'yyyy-MM-dd');
    const calendarBooking = {
      ...booking,
      start_date: date,
      end_date: date
    };
    console.log('Calendar booking data:', calendarBooking);

    // Create calendar events
    const calendarResponse = await fetch('/api/bookings/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'create',
        booking: calendarBooking
      })
    });

    if (!calendarResponse.ok) {
      console.error('Calendar response:', await calendarResponse.text());
      throw new Error('Failed to create calendar events');
    }

    const calendarEvents = await calendarResponse.json();

    // Format and send LINE notification
    const message = formatLineMessage(booking);
    console.log('Sending LINE notification with message:', message);
    
    const notifyResponse = await fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        bookingType: booking.booking_type
      })
    });

    if (!notifyResponse.ok) {
      console.error('Notification response:', await notifyResponse.text());
      throw new Error('Failed to send LINE notification');
    }

    return {
      success: true,
      calendarEvents: calendarEvents.data,
      bookingId
    };
  } catch (error) {
    console.error('Form submission error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    };
  }
}