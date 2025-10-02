import type { FormData } from '../types';
import type { Booking } from '@/types/booking';
import { format, parse, differenceInHours, getDate } from 'date-fns';
import { generateBookingId } from '@/lib/booking-utils';
import { parseISO } from 'date-fns';

interface SubmitResponse {
  success: boolean;
  error?: string;
  bookingId?: string;
}

function formatTime(date: Date | string): string {
  if (typeof date === 'string') {
    // If it's already in HH:mm format, append :00
    if (date.match(/^\d{2}:\d{2}$/)) {
      return `${date}:00`;
    }
    return date;
  }
  return format(date, 'HH:mm:ss');
}

function formatBookingData(formData: FormData): Booking {
  // Ensure formData is defined and has the necessary properties
  if (!formData || typeof formData !== 'object') {
    throw new Error('Invalid formData provided to formatBookingData.');
  }
  // Explicitly check required fields are not null/undefined
  if (!formData.bookingDate || formData.startTime === undefined || formData.startTime === null || formData.endTime === undefined || formData.endTime === null) {
      throw new Error('Missing required date/time fields in formData.');
  }


  // Ensure bookingDate is a valid Date or parseable string
  let bookingDateObj: Date;
  if (typeof formData.bookingDate === 'object' && formData.bookingDate !== null && typeof formData.bookingDate.getMonth === 'function') {
      bookingDateObj = formData.bookingDate as Date; // Use type assertion after check
  } else if (typeof formData.bookingDate === 'string') {
      try {
          bookingDateObj = parse(formData.bookingDate, 'yyyy-MM-dd', new Date());
          if (isNaN(bookingDateObj.getTime())) throw new Error('Parsed date is invalid');
      } catch (e) {
          throw new Error(`Invalid booking date format or type: ${formData.bookingDate}. Expected yyyy-MM-dd string or Date object. Error: ${e}`);
      }
  } else {
      throw new Error(`Invalid booking date type: ${typeof formData.bookingDate}. Expected Date object or yyyy-MM-dd string.`);
  }
  const dateStr = format(bookingDateObj, 'yyyy-MM-dd');

  // Ensure startTime and endTime are parsed correctly
  let startTimeObj: Date;
  let endTimeObj: Date;

  // Handle startTime - Check if it looks like a Date object by checking for a method
  if (typeof formData.startTime === 'object' && typeof (formData.startTime as any).getHours === 'function') {
      startTimeObj = formData.startTime as Date; // Use assertion
  } else if (typeof formData.startTime === 'string' && formData.startTime.match(/^\d{2}:\d{2}$/)) {
      startTimeObj = parse(formData.startTime, 'HH:mm', new Date());
      if (isNaN(startTimeObj.getTime())) throw new Error('Parsed start time is invalid');
  } else {
      throw new Error(`Invalid start time format or type: ${formData.startTime}. Expected HH:mm string or Date object.`);
  }

  // Handle endTime - Check if it looks like a Date object by checking for a method
  if (typeof formData.endTime === 'object' && typeof (formData.endTime as any).getHours === 'function') {
      endTimeObj = formData.endTime as Date; // Use assertion
  } else if (typeof formData.endTime === 'string' && formData.endTime.match(/^\d{2}:\d{2}$/)) {
      endTimeObj = parse(formData.endTime, 'HH:mm', new Date());
      if (isNaN(endTimeObj.getTime())) throw new Error('Parsed end time is invalid');
  } else {
      throw new Error(`Invalid end time format or type: ${formData.endTime}. Expected HH:mm string or Date object.`);
  }

  // Now calculate duration using the parsed Date objects
  const startDateTime = parse(`${dateStr}T${format(startTimeObj, 'HH:mm:ss')}`, "yyyy-MM-dd'T'HH:mm:ss", new Date());
  const endDateTime = parse(`${dateStr}T${format(endTimeObj, 'HH:mm:ss')}`, "yyyy-MM-dd'T'HH:mm:ss", new Date());

  // Adjust for potential overnight scenario if endTime < startTime
  if (endDateTime <= startDateTime && !(formData.duration && formData.duration >= 24 * 60)) { // also check formData.duration if available and not indicating a multi-day booking
      console.warn('End time is on or before start time. Assuming simple same-day calculation. Review if multi-day bookings are needed.');
  }

  // Use formData.duration (in minutes) as the source of truth for duration
  if (formData.duration === undefined || formData.duration === null || typeof formData.duration !== 'number' || formData.duration <= 0) {
    console.error(`Invalid formData.duration: ${formData.duration}`);
    throw new Error('Duration is missing or invalid in form data. It must be a positive number of minutes.');
  }

  const durationInMinutes = formData.duration;

  const durationHours = durationInMinutes / 60;

  // Allow fractional hours, just ensure it's positive.
  if (durationHours <= 0) {
    // This specific error message might be hit if durationInMinutes was valid but somehow durationHours isn't positive.
    console.error(`Calculated durationHours (${durationHours}) is not positive. Original minutes: ${durationInMinutes}. Start: ${format(startTimeObj, 'HH:mm')}, End: ${format(endTimeObj, 'HH:mm')}`);
    throw new Error('Calculated duration must be a positive number of hours.');
  }

  // 2. Map Bay Name
  let bayId: string | null;
  switch (formData.bayNumber) {
      case 'Bay 1':
          bayId = 'Bay 1';
          break;
      case 'Bay 2':
          bayId = 'Bay 2';
          break;
      case 'Bay 3':
          bayId = 'Bay 3';
          break;
      case 'Bay 4':
          bayId = 'Bay 4';
          break;
      default:
          console.warn(`Unknown bay display name: ${formData.bayNumber}. Setting bay to null.`);
          bayId = null;
  }

  // 3. Generate Booking ID
  const bookingId = generateBookingId();

  // 4. Format Start Time (HH:mm) using the parsed startTimeObj
  const formattedStartTime = format(startTimeObj, 'HH:mm');

  // 5. Assemble the Booking object for DB insertion
  const formattedDate = format(bookingDateObj, 'yyyy-MM-dd'); // Use bookingDateObj

  const bookingForDb: Booking & { 
    isNewCustomer?: boolean;
    customer_id?: string;
  } = {
    id: bookingId,
    user_id: '059090f8-2d76-4f10-81de-5efe4d2d0fd8',
    name: formData.customerName || 'Unknown Customer',
    email: 'info@len.golf',
    phone_number: formData.customerPhone || 'N/A',
    date: formattedDate,
    start_time: formattedStartTime,
    duration: durationHours,
    number_of_people: formData.numberOfPax || 1,
    status: 'confirmed',
    bay: bayId,
    customer_notes: formData.notes || null,
    booking_type: formData.bookingType || null,
    package_name: formData.packageName || null,
    stable_hash_id: formData.customerStableHashId || undefined,
    package_id: formData.packageId || null,
    // New fields for customer management integration
    isNewCustomer: formData.isNewCustomer ?? false,
    customer_id: formData.customerId || undefined,
  };

  return bookingForDb;
}

function getOrdinalSuffix(day: number): string {
  const j = day % 10, k = day % 100;
  if (j == 1 && k != 11) { return "st"; }
  if (j == 2 && k != 12) { return "nd"; }
  if (j == 3 && k != 13) { return "rd"; }
  return "th";
}

function formatLineMessage(formData: FormData, bookingId?: string): string {

  // Check required fields first
  if (!formData.bookingDate || !formData.startTime || !formData.endTime || !formData.bayNumber || !formData.employeeName || !formData.customerName || !formData.customerPhone || !formData.numberOfPax) {
    console.error('Missing required data for LINE message formatting.', formData);
    return 'Error: Could not format booking notification due to missing data.';
  }

  // Format Date
  let formattedDate: string;
  try {
      const dateObj = typeof formData.bookingDate === 'string' ? parseISO(formData.bookingDate) : formData.bookingDate;
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
          throw new Error('Invalid bookingDate type or value');
      }
      const day = getDate(dateObj);
      const weekday = format(dateObj, 'EEE');
      const month = format(dateObj, 'MMMM');
      formattedDate = `${weekday}, ${day}${getOrdinalSuffix(day)} ${month}`;
  } catch (e) {
      console.error('Error formatting date for LINE message:', formData.bookingDate, e);
      formattedDate = 'Invalid Date'; // Provide fallback
  }

  // Format Time (HH:mm)
  let formattedStartTime: string;
  let formattedEndTime: string;

  try {
    // Handle Start Time
    if (typeof formData.startTime === 'object' && typeof (formData.startTime as any).getHours === 'function') {
      formattedStartTime = format(formData.startTime as Date, 'HH:mm');
    } else if (typeof formData.startTime === 'string' && formData.startTime.match(/^\d{2}:\d{2}$/)) {
      formattedStartTime = formData.startTime;
    } else {
      throw new Error(`Invalid start time format or type: ${formData.startTime}`);
    }

    // Handle End Time
    if (typeof formData.endTime === 'object' && typeof (formData.endTime as any).getHours === 'function') {
      formattedEndTime = format(formData.endTime as Date, 'HH:mm');
    } else if (typeof formData.endTime === 'string' && formData.endTime.match(/^\d{2}:\d{2}$/)) {
      formattedEndTime = formData.endTime;
    } else {
      throw new Error(`Invalid end time format or type: ${formData.endTime}`);
    }
  } catch (e) {
    console.error('Error formatting time for LINE message:', { start: formData.startTime, end: formData.endTime }, e);
    // Fallback or rethrow depending on desired strictness
    return `Error: Could not format time for booking notification. ${e instanceof Error ? e.message : 'Unknown error'}`;
  }


  const bookingTypeDisplay = formData.packageName ? `${formData.bookingType} (${formData.packageName})` : formData.bookingType;

  const customerNameDisplay = formData.isNewCustomer 
    ? `${formData.customerName} (New Customer)` 
    : formData.customerName;

  // Use the original bay display name from the form
  const bayDisplay = formData.bayNumber;

  let message = 'Booking Notification';
  if (bookingId) {
    message += ` (ID: ${bookingId})`;
  }
  message += `\nName: ${customerNameDisplay}\nPhone: ${formData.customerPhone}\nDate: ${formattedDate}\nTime: ${formattedStartTime} - ${formattedEndTime}\nBay: ${bayDisplay}\nType: ${bookingTypeDisplay}\nPeople: ${formData.numberOfPax}\nChannel: ${formData.customerContactedVia || 'N/A'}\nCreated by: ${formData.employeeName}`;

  if (formData.notes) {
    message += `\nNotes: ${formData.notes}`;
  }

  return message.trim();
}

export async function handleFormSubmit(formData: FormData): Promise<SubmitResponse> {
  let bookingId: string | undefined = undefined;
  try {
    
    // 1. Format data SPECIFICALLY for the database insert using the refactored function
    const dbBookingData = formatBookingData(formData); 
    bookingId = dbBookingData.id;
    
    // 2. Create booking record using the NEW API endpoint and NEW client (Update in BKM-T4)
    // IMPORTANT: This fetch call needs updating in BKM-T4 to use the new endpoint 
    // and pass dbBookingData.
    const bookingResponse = await fetch('/api/bookings/create', { // TODO: Update URL in BKM-T4
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dbBookingData) // Send the DB-formatted data
    });

    if (!bookingResponse.ok) {
      let errorBody = '';
      let errorMessage = `Failed to create booking record: ${bookingResponse.statusText}`;
      try {
        errorBody = await bookingResponse.text();
        const errorData = JSON.parse(errorBody);
        // Use the detailed error message from the API if available
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (_) { /* Ignore parsing errors */ }
      console.error('Failed to create booking record. Status:', bookingResponse.status, 'Body:', errorBody);
      throw new Error(errorMessage);
    }

    // We expect the new endpoint (BKM-T4) to return { success: true, bookingId: data.id }
    const bookingResult = await bookingResponse.json(); 
    if (bookingResult.bookingId !== bookingId) {
      console.warn(`API returned bookingId ${bookingResult.bookingId} which differs from generated ID ${bookingId}`);
    }

    // --- Step 3: Calendar Integration Removed ---
    // Calendar events are now managed by the automated sync system only
    // Individual booking calendar events are no longer created during booking flow

    // --- Step 5: Format LINE Notification ---
    const message = formatLineMessage(formData, bookingId);
    
    // --- Step 6: Send LINE notification via API ---
    if (message.startsWith('Error:')) {
      console.error('Skipping LINE notification due to formatting error.', message);
    } else {
      const notifyResponse = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          bookingType: formData.bookingType
        })
      });

      if (!notifyResponse.ok) {
        let errorBody = '';
        try { errorBody = await notifyResponse.text(); } catch (_) { /* Ignore */ }
        console.warn('Failed to send LINE notification. Status:', notifyResponse.status, 'Body:', errorBody);
      } else {
      }
    }

    return {
      success: true,
      bookingId
    };
  } catch (error) {
    console.error('Form submission failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred during submission.',
      bookingId
    };
  }
}