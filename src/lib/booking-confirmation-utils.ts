import type { Booking } from '@/types/booking';
import type { BookingFormData } from '@/types/booking-form';

/**
 * Transform booking data from the database to BookingFormData format
 * for use with the confirmation message generator
 */
export function transformBookingToFormData(booking: Booking): BookingFormData {
  // Parse the date and time
  const bookingDate = new Date(booking.date);
  const startTime = booking.start_time;
  
  // Calculate end time based on duration
  const [startHours, startMinutes] = startTime.split(':').map(Number);
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = startTotalMinutes + (booking.duration * 60);
  const endHours = Math.floor(endTotalMinutes / 60);
  const endMinutes = endTotalMinutes % 60;
  const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

  return {
    employeeName: null,
    customerContactedVia: null,
    bookingType: booking.booking_type || null,
    isNewCustomer: booking.is_new_customer || false,
    bookingDate: bookingDate,
    startTime: startTime,
    endTime: endTime,
    duration: booking.duration,
    isManualMode: false,
    bayNumber: booking.bay || undefined,
    notes: booking.customer_notes || '',
    numberOfPax: booking.number_of_people,
    customerId: booking.customer_id || undefined,
    customerName: booking.customer?.customer_name || booking.name,
    customerPhone: booking.customer?.contact_number || booking.phone_number,
    customerStableHashId: booking.stable_hash_id || null,
    packageId: booking.package_id || undefined,
    packageName: booking.package_name || undefined,
    referralSource: booking.referral_source as any || null,
    isSubmitted: false
  };
}

/**
 * Generate confirmation messages from booking data
 */
export function generateConfirmationMessages(booking: Booking) {
  const formData = transformBookingToFormData(booking);
  
  // Import the message generator dynamically to avoid circular imports
  const { generateMessages } = require('@/components/booking-form/submit/booking-messages');
  
  return generateMessages(formData);
}