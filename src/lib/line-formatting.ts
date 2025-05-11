import type { Booking } from '@/types/booking';
import { format, parse, getDate, parseISO, addMinutes } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

const TIMEZONE = 'Asia/Bangkok'; // Consistent with google-calendar.ts

function getOrdinalSuffix(day: number): string {
  const j = day % 10, k = day % 100;
  if (j == 1 && k != 11) { return "st"; }
  if (j == 2 && k != 12) { return "nd"; }
  if (j == 3 && k != 13) { return "rd"; }
  return "th";
}

// Helper to get display bay name (assuming booking.bay stores simple names like 'Bay 1')
function getDisplayBayName(simpleBayName: string | null): string {
    if (simpleBayName === 'Bay 1') return 'Bay 1 (Bar)';
    if (simpleBayName === 'Bay 2') return 'Bay 2';
    if (simpleBayName === 'Bay 3') return 'Bay 3 (Entrance)';
    return simpleBayName || 'N/A';
}

export function formatLineModificationMessage(
  updatedBooking: Booking,
  originalBooking: Booking // For potential future use to highlight changes
): string {
  console.log('Formatting LINE modification message for booking ID:', updatedBooking.id);

  let formattedDate: string;
  try {
    const dateObj = parse(updatedBooking.date, 'yyyy-MM-dd', new Date());
    const day = getDate(dateObj);
    const weekday = formatInTimeZone(dateObj, TIMEZONE, 'EEE');
    const month = formatInTimeZone(dateObj, TIMEZONE, 'MMMM');
    formattedDate = `${weekday}, ${day}${getOrdinalSuffix(day)} ${month}`;
  } catch (e) {
    console.error('Error formatting date for LINE modification message:', updatedBooking.date, e);
    formattedDate = updatedBooking.date; // Fallback to raw date
  }

  // Assuming updatedBooking.start_time is HH:mm and duration is in hours
  const startTimeStr = updatedBooking.start_time; // HH:mm
  const endTimeDate = addMinutes(parse(`${updatedBooking.date}T${startTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date()), updatedBooking.duration * 60);
  const endTimeStr = format(endTimeDate, 'HH:mm');

  // Booking type and package name are not on the Booking type currently as per user instruction.
  // If they were, they could be displayed here.
  // const bookingTypeDisplay = updatedBooking.bookingType ? `${updatedBooking.bookingType} (${updatedBooking.packageName || ''})` : (updatedBooking.bookingType || 'N/A');
  const bookingTypeDisplay = 'N/A'; // Placeholder
  const packageNameDisplay = 'N/A'; // Placeholder

  const customerNameDisplay = updatedBooking.name;
  const bayDisplay = getDisplayBayName(updatedBooking.bay);

  // Determine who made the change for the message
  const changedBy = updatedBooking.updated_by_identifier || 'System';

  let message = `🔄 BOOKING UPDATED (ID: ${updatedBooking.id}) 🔄`;
  message += `\n----------------------------------`;
  message += `\n👤 Customer: ${customerNameDisplay}`;
  message += `\n📞 Phone: ${updatedBooking.phone_number}`;
  message += `\n🗓️ Date: ${formattedDate}`;
  message += `\n⏰ Time: ${startTimeStr} - ${endTimeStr} (${updatedBooking.duration}h)`;
  message += `\n⛳ Bay: ${bayDisplay}`;
  // message += `\n🏷️ Type: ${bookingTypeDisplay}`;
  // message += `\n🎁 Package: ${packageNameDisplay}`;
  message += `\n🧑‍🤝‍🧑 Pax: ${updatedBooking.number_of_people}`;
  if (updatedBooking.customer_notes) {
    message += `\n📝 Notes: ${updatedBooking.customer_notes}`;
  }
  message += `\n----------------------------------`;
  message += `\n🛠️ Modified By: ${changedBy}`;
  
  // Optionally, highlight changes by comparing with originalBooking - for future enhancement
  // Example:
  // if (originalBooking.date !== updatedBooking.date) {
  //   message += `\n❗ Date changed from ${originalBooking.date}`;
  // }

  console.log('Formatted LINE modification message:', message);
  return message.trim();
}

export function formatLineCancellationMessage(
  cancelledBooking: Booking
): string {
  console.log('Formatting LINE cancellation message for booking ID:', cancelledBooking.id);

  let formattedDate: string;
  try {
    const dateObj = parse(cancelledBooking.date, 'yyyy-MM-dd', new Date());
    const day = getDate(dateObj);
    const weekday = formatInTimeZone(dateObj, TIMEZONE, 'EEE');
    const month = formatInTimeZone(dateObj, TIMEZONE, 'MMMM');
    formattedDate = `${weekday}, ${day}${getOrdinalSuffix(day)} ${month}`;
  } catch (e) {
    console.error('Error formatting date for LINE cancellation message:', cancelledBooking.date, e);
    formattedDate = cancelledBooking.date; // Fallback to raw date
  }

  const startTimeStr = cancelledBooking.start_time; // HH:mm
  const endTimeDate = addMinutes(parse(`${cancelledBooking.date}T${startTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date()), cancelledBooking.duration * 60);
  const endTimeStr = format(endTimeDate, 'HH:mm');

  const customerNameDisplay = cancelledBooking.name;
  const bayDisplay = getDisplayBayName(cancelledBooking.bay);
  const cancelledBy = cancelledBooking.cancelled_by_identifier || 'System';
  const reasonDisplay = cancelledBooking.cancellation_reason ? `\nReason: ${cancelledBooking.cancellation_reason}` : '';

  let message = `🚫 BOOKING CANCELLED (ID: ${cancelledBooking.id}) 🚫`;
  message += `\n----------------------------------`;
  message += `\n👤 Customer: ${customerNameDisplay}`;
  message += `\n📞 Phone: ${cancelledBooking.phone_number}`;
  message += `\n🗓️ Date: ${formattedDate}`;
  message += `\n⏰ Time: ${startTimeStr} - ${endTimeStr} (${cancelledBooking.duration}h)`;
  message += `\n⛳ Bay: ${bayDisplay}`;
  message += `\n🧑‍🤝‍🧑 Pax: ${cancelledBooking.number_of_people}`;
  message += `\n----------------------------------`;
  message += `\n🗑️ Cancelled By: ${cancelledBy}`;
  message += reasonDisplay;
  
  console.log('Formatted LINE cancellation message:', message);
  return message.trim();
} 