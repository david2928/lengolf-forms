import type { FormData } from '../types';
import type { Booking } from '@/types/booking';
import { format, parse, differenceInHours, getDate } from 'date-fns';
import { generateBookingId } from '@/lib/booking-utils';
import type { CalendarFormatInput } from '@/lib/google-calendar';
import { parseISO } from 'date-fns';

interface SubmitResponse {
  success: boolean;
  error?: string;
  calendarEvents?: any[];
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

  console.log('Formatting booking data for DB insert from:', formData);

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
  if (endDateTime <= startDateTime) {
      console.warn('End time is on or before start time. Assuming simple same-day calculation. Review if multi-day bookings are needed.');
  }

  const durationHours = differenceInHours(endDateTime, startDateTime);
  if (!Number.isInteger(durationHours) || durationHours <= 0) {
    console.error(`Invalid duration calculated: ${durationHours} hours from ${format(startTimeObj, 'HH:mm')} to ${format(endTimeObj, 'HH:mm')}`);
    throw new Error('Calculated duration is invalid. Must be a positive whole number of hours.');
  }

  // 2. Map Bay Name
  let bayId: string | null;
  switch (formData.bayNumber) {
      case 'Bay 1 (Bar)':
          bayId = 'Bay 1';
          break;
      case 'Bay 3 (Entrance)':
          bayId = 'Bay 3';
          break;
      case 'Bay 2':
          bayId = 'Bay 2';
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

  const bookingForDb: Booking = {
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
  };

  console.log('Formatted booking for DB insertion:', bookingForDb);
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
  console.log('Formatting LINE message from formData:', formData);

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

  const customerNameDisplay = formData.isNewCustomer ? `${formData.customerName} (New Customer)` : formData.customerName;

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

  console.log('Formatted LINE message:', message);
  return message.trim();
}

export async function handleFormSubmit(formData: FormData): Promise<SubmitResponse> {
  let bookingId: string | undefined = undefined;
  try {
    console.log('Starting form submission with data:', formData);
    
    // 1. Format data SPECIFICALLY for the database insert using the refactored function
    const dbBookingData = formatBookingData(formData); 
    bookingId = dbBookingData.id;
    console.log('Data formatted for DB insert:', dbBookingData);
    
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
      try { errorBody = await bookingResponse.text(); } catch (_) { /* Ignore */ }
      console.error('Failed to create booking record. Status:', bookingResponse.status, 'Body:', errorBody);
      throw new Error(`Failed to create booking record: ${bookingResponse.statusText}`);
    }

    // We expect the new endpoint (BKM-T4) to return { success: true, bookingId: data.id }
    const bookingResult = await bookingResponse.json(); 
    if (bookingResult.bookingId !== bookingId) {
      console.warn(`API returned bookingId ${bookingResult.bookingId} which differs from generated ID ${bookingId}`);
    }
    console.log('Booking record created successfully. Booking ID:', bookingId);

    // --- Step 3: Prepare Data for Calendar Formatting ---
    // Construct the CalendarFormatInput object required by formatCalendarEvent (BKM-T6)
    const calendarInputData: CalendarFormatInput = {
      id: dbBookingData.id,
      name: dbBookingData.name,
      phone_number: dbBookingData.phone_number,
      date: dbBookingData.date, // yyyy-MM-dd
      start_time: dbBookingData.start_time, // HH:mm
      duration: dbBookingData.duration, // hours (number)
      number_of_people: dbBookingData.number_of_people,
      bay: dbBookingData.bay, // Simple bay name/ID or null
      bayDisplayName: formData.bayNumber, // Pass the original display name
      customer_notes: dbBookingData.customer_notes, // Notes or null
      employeeName: formData.employeeName || 'Unknown Employee', // Ensure non-null
      bookingType: formData.bookingType || 'Unknown Type', // Ensure non-null
      packageName: formData.packageName,
    };
    console.log('Data prepared for calendar API:', calendarInputData);

    // --- Step 4: Create Calendar Events via API ---
    let calendarResultData: any = null; // Variable to store calendar API response data
    console.log('Attempting to create calendar event(s)...');
    const calendarResponse = await fetch('/api/bookings/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        operation: 'create',
        booking: calendarInputData
      })
    });

    if (!calendarResponse.ok) {
      let errorBody = '';
      try { errorBody = await calendarResponse.text(); } catch (_) { /* Ignore */ }
      // Log as warning, don't necessarily fail the whole submission
      console.warn('Failed to create calendar event(s). Status:', calendarResponse.status, 'Body:', errorBody);
    } else {
      try {
        calendarResultData = await calendarResponse.json();
        console.log('Calendar event creation request successful. Response:', calendarResultData);
        
        // --- Step 4.1: Update Booking with Event ID ---
        // Extract the first eventId if available
        const eventId = calendarResultData?.data?.[0]?.eventId;
        
        if (bookingId && eventId) {
            console.log(`Attempting to update booking ${bookingId} with eventId ${eventId}...`);
            const updateResponse = await fetch('/api/bookings/update-calendar-id', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bookingId, eventId })
            });

            if (!updateResponse.ok) {
                let updateErrorBody = '';
                try { updateErrorBody = await updateResponse.text(); } catch (_) { /* Ignore */ }
                // Log as warning, the main booking & calendar might still be ok
                console.warn(`Failed to update booking ${bookingId} with eventId ${eventId}. Status:`, updateResponse.status, 'Body:', updateErrorBody);
            } else {
                const updateResult = await updateResponse.json();
                console.log(`Successfully sent update request for booking ${bookingId}. Response:`, updateResult);
            }
        } else {
            console.warn('Could not update booking with eventId: Missing bookingId or eventId.', { bookingId, eventId });
        }
        // --- End Step 4.1 ---

      } catch (parseError) {
         console.error('Error parsing calendar API response:', parseError);
      }
    }

    // --- Step 5: Format LINE Notification ---
    const message = formatLineMessage(formData, bookingId);
    console.log('Sending LINE notification...');
    
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
        console.log('LINE notification request successful.');
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