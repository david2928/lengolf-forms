import { NextResponse } from 'next/server';
import { refacSupabase } from '@/lib/refac-supabase';
import type { Booking } from '@/types/booking'; 
import { 
    isTimeSlotAvailable, 
    formatCalendarEvent, 
    getRelevantCalendarIds, 
    createCalendarEvents, 
    updateCalendarEvent, 
    deleteCalendarEvent, 
    initializeCalendar,
    getBayAvailability,
    type CalendarFormatInput, // Import this type
    type CalendarEventResult,
    getCalendarEventDetails // Added import
} from '@/lib/google-calendar';
import { getServiceAccountAuth } from '@/lib/google-auth';
import { parse as parseDateFns, addMinutes, format as formatDateFns, parseISO, startOfDay, endOfDay, isBefore, isEqual } from 'date-fns';
import { formatLineModificationMessage } from '@/lib/line-formatting';
// We will need types for the payload and booking
// import { getRelevantCalendarIds, formatCalendarEvent, updateCalendarEvent, deleteCalendarEvent, findCalendarEventsByBookingId, initializeCalendar } from '@/lib/google-calendar';
// import { getGoogleAuthClient } from '@/lib/google-auth'; // Assuming this exists for server-side auth

// Define the expected payload structure for validation
interface UpdateBookingPayload {
  bay?: 'Bay 1' | 'Bay 2' | 'Bay 3' | null;
  date?: string; // YYYY-MM-DD
  start_time?: string; // HH:mm
  end_time?: string; // HH:mm
  duration?: number; // in minutes
  customer_notes?: string | null;
  number_of_people?: number;
  employee_name: string; // Mandatory for staff changes
}

// Helper to map simple bay names to the format expected by the availability API
function mapSimpleBayToApiBayName(simpleBay: 'Bay 1' | 'Bay 2' | 'Bay 3' | null): string | null {
  if (simpleBay === 'Bay 1') return 'Bay 1 (Bar)';
  if (simpleBay === 'Bay 2') return 'Bay 2';
  if (simpleBay === 'Bay 3') return 'Bay 3 (Entrance)';
  return null;
}

// Helper to calculate end time string (HH:mm) from start time (HH:mm) and duration (minutes)
function calculateEndTime(dateStr: string, startTimeStr: string, durationMinutes: number): string {
  const startDateTime = parseDateFns(`${dateStr}T${startTimeStr}`, "yyyy-MM-dd'T'HH:mm", new Date());
  const endDateTime = addMinutes(startDateTime, durationMinutes);
  return formatDateFns(endDateTime, 'HH:mm');
}

// Helper to generate a summary of changes
function generateChangesSummary(oldBooking: Booking, newBookingData: Partial<Booking>, payload: UpdateBookingPayload): string {
  const changes: string[] = [];
  const oldEndTime = calculateEndTime(oldBooking.date, oldBooking.start_time, oldBooking.duration * 60);
  const newProposedDate = newBookingData.date || oldBooking.date;
  const newProposedStartTime = newBookingData.start_time || oldBooking.start_time;
  const newProposedDurationMinutes = newBookingData.duration ? newBookingData.duration * 60 : oldBooking.duration * 60; 
  const newProposedEndTime = calculateEndTime(newProposedDate, newProposedStartTime, newProposedDurationMinutes);
  const newProposedBay = newBookingData.bay !== undefined ? newBookingData.bay : oldBooking.bay;

  if (newBookingData.date && oldBooking.date !== newBookingData.date) {
    changes.push(`Date from ${oldBooking.date} to ${newBookingData.date}`);
  }
  if (newBookingData.start_time && oldBooking.start_time !== newBookingData.start_time) {
    changes.push(`Start time from ${oldBooking.start_time} to ${newBookingData.start_time}`);
  }
  // Check end time / duration change based on calculated new proposed end time
  if (newProposedEndTime !== oldEndTime) {
      changes.push(`End time/Duration from ${oldEndTime} (duration ${oldBooking.duration}h) to ${newProposedEndTime} (duration ${newProposedDurationMinutes/60}h)`);
  }
  if (newBookingData.bay !== undefined && oldBooking.bay !== newBookingData.bay) {
    changes.push(`Bay from ${oldBooking.bay || 'N/A'} to ${newBookingData.bay || 'N/A'}`);
  }
  if (newBookingData.number_of_people !== undefined && oldBooking.number_of_people !== newBookingData.number_of_people) {
    changes.push(`Pax from ${oldBooking.number_of_people} to ${newBookingData.number_of_people}`);
  }
  if (newBookingData.customer_notes !== undefined && oldBooking.customer_notes !== newBookingData.customer_notes) {
    changes.push(`Notes changed`); // Keep it simple for notes
  }
  // Add other fields from UpdateBookingPayload as needed for summary

  if (changes.length === 0) return 'No direct field changes detected (audit fields updated).';
  return changes.join(', ') + ` by ${payload.employee_name}.`;
}

const getBookingIdFromDescription = (description: string | null | undefined): string | null => {
  if (!description) return null;
  const match = description.match(/Booking ID: (BK[A-Z0-9]+)/i);
  return match ? match[1] : null;
};

export async function PUT(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  const { bookingId } = params;
  let payload: UpdateBookingPayload;

  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID is required in path' }, { status: 400 });
  }

  // Basic payload validation (presence of employee_name for staff)
  if (!payload.employee_name || typeof payload.employee_name !== 'string' || payload.employee_name.trim() === '') {
    return NextResponse.json({ error: 'employee_name is required and must be a non-empty string' }, { status: 400 });
  }

  // More detailed validation for other fields can be added here (e.g., date format, time format, enum values for bay)
  // For example, if date is provided, validate its format
  if (payload.date && !/^\d{4}-\d{2}-\d{2}$/.test(payload.date)) {
    return NextResponse.json({ error: 'Invalid date format. Expected YYYY-MM-DD' }, { status: 400 });
  }
  if (payload.start_time && !/^\d{2}:\d{2}$/.test(payload.start_time)) {
    return NextResponse.json({ error: 'Invalid start_time format. Expected HH:mm' }, { status: 400 });
  }
  if (payload.end_time && !/^\d{2}:\d{2}$/.test(payload.end_time)) {
    return NextResponse.json({ error: 'Invalid end_time format. Expected HH:mm' }, { status: 400 });
  }
  if (payload.bay && !['Bay 1', 'Bay 2', 'Bay 3'].includes(payload.bay)) {
    return NextResponse.json({ error: 'Invalid bay value. Must be one of Bay 1, Bay 2, Bay 3 or null.'}, {status: 400});
  }
  if (payload.number_of_people !== undefined && (typeof payload.number_of_people !== 'number' || payload.number_of_people <= 0)) {
    return NextResponse.json({ error: 'number_of_people must be a positive number'}, {status: 400});
  }
  if (payload.duration !== undefined && (typeof payload.duration !== 'number' || payload.duration <= 0)) {
    return NextResponse.json({ error: 'duration must be a positive number of minutes'}, {status: 400});
  }
  if (payload.end_time && payload.duration) {
    return NextResponse.json({ error: 'Provide either end_time or duration, not both.'}, {status: 400});
  }
  
  // Placeholder for the rest of the logic
  console.log(`PUT /api/bookings/${bookingId} called with payload:`, payload);

  try {
    // Authentication & Authorization is handled by middleware for staff access
    // TODO: Add more granular authorization if/when customer self-service is implemented

    // Fetch Current Booking from Supabase
    const { data: currentBookingUntyped, error: fetchError } = await refacSupabase
      .from('bookings')
      .select('*') // Select all fields to have full data for comparison and GCal formatting
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error(`Supabase error fetching booking ${bookingId}:`, fetchError);
      // Differentiate between 'not found' and other errors
      if (fetchError.code === 'PGRST116') { // PostgREST error code for "Fetched N rows, expected 1"
        return NextResponse.json({ error: `Booking with ID ${bookingId} not found.` }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch current booking', details: fetchError.message }, { status: 500 });
    }

    if (!currentBookingUntyped) {
      // This case should ideally be caught by fetchError.code === 'PGRST116', but as a safeguard:
      return NextResponse.json({ error: `Booking with ID ${bookingId} not found.` }, { status: 404 });
    }

    const currentBooking = currentBookingUntyped as Booking;
    console.log('Current booking data:', currentBooking);

    // Determine proposed new slot details
    const proposedDate = payload.date || currentBooking.date;
    const proposedStartTime = payload.start_time || currentBooking.start_time;
    let proposedDurationMinutes = payload.duration;
    let proposedEndTime: string;

    if (payload.end_time) {
        proposedEndTime = payload.end_time;
        // Calculate duration if end_time is provided and start_time is known
        const startDateObj = parseDateFns(`${proposedDate}T${proposedStartTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
        const endDateObj = parseDateFns(`${proposedDate}T${proposedEndTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
        proposedDurationMinutes = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60);
        if (proposedDurationMinutes <=0) {
            return NextResponse.json({ error: 'End time must be after start time.'}, {status: 400});
        }
    } else if (proposedDurationMinutes) { // duration is from payload
        proposedEndTime = calculateEndTime(proposedDate, proposedStartTime, proposedDurationMinutes);
    } else { // Neither end_time nor payload.duration is provided, use current booking's duration
        proposedDurationMinutes = currentBooking.duration * 60; // currentBooking.duration is in hours
        proposedEndTime = calculateEndTime(proposedDate, proposedStartTime, proposedDurationMinutes);
    }

    const proposedBay = payload.bay !== undefined ? payload.bay : currentBooking.bay;
    const currentEndTime = calculateEndTime(currentBooking.date, currentBooking.start_time, currentBooking.duration * 60);

    const slotChanged = 
      proposedDate !== currentBooking.date ||
      proposedStartTime !== currentBooking.start_time ||
      proposedEndTime !== currentEndTime || // Compare calculated end times
      proposedBay !== currentBooking.bay;

    if (slotChanged) {
      console.log('Slot changed. Checking availability...');
      const apiBayName = mapSimpleBayToApiBayName(proposedBay as 'Bay 1' | 'Bay 2' | 'Bay 3' | null);
      if (!apiBayName) {
        return NextResponse.json({ error: 'Invalid bay for availability check.' }, { status: 400 });
      }

      try {
        const auth = await getServiceAccountAuth();
        const calendar = initializeCalendar(auth);

        const proposedDayStart = startOfDay(parseDateFns(proposedDate, "yyyy-MM-dd", new Date()));
        const proposedDayEnd = endOfDay(parseDateFns(proposedDate, "yyyy-MM-dd", new Date()));
        
        const calendarIdForBay = getRelevantCalendarIds({ bay: proposedBay } as CalendarFormatInput)[0]; // Assuming first is the bay calendar
        if (!calendarIdForBay) {
            console.error(`No calendar ID found for bay: ${proposedBay}`);
            return NextResponse.json({ error: 'Configuration error: Bay calendar ID not found.' }, { status: 500 });
        }

        const eventsResponse = await calendar.events.list({
            calendarId: calendarIdForBay,
            timeMin: proposedDayStart.toISOString(),
            timeMax: proposedDayEnd.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            timeZone: 'Asia/Bangkok', // Explicitly set timezone, though ISO strings should be unambiguous
        });

        const events = eventsResponse.data?.items;
        let isProposedSlotActuallyAvailable = true;

        const slotStartDateTime = parseDateFns(`${proposedDate}T${proposedStartTime}`, "yyyy-MM-dd'T'HH:mm", new Date());
        const slotEndDateTime = parseDateFns(`${proposedDate}T${proposedEndTime}`, "yyyy-MM-dd'T'HH:mm", new Date());

        if (events) {
          for (const event of events) {
            if (event.status === 'cancelled') continue;

            const eventBookingId = getBookingIdFromDescription(event.description);
            if (eventBookingId === bookingId) { // bookingId is from params
              continue; // This is the event associated with the booking being modified, skip it.
            }

            const eventStartStr = event.start?.dateTime;
            const eventEndStr = event.end?.dateTime;

            if (eventStartStr && eventEndStr) {
              // Google Calendar events are often in ISO format. date-fns parseISO can handle this.
              const eventStart = parseISO(eventStartStr);
              const eventEnd = parseISO(eventEndStr);

              // Check for overlap: (ProposedStart < EventEnd) and (ProposedEnd > EventStart)
              // isBefore(slotStartDateTime, eventEnd) && isBefore(eventStart, slotEndDateTime)
              if (isBefore(slotStartDateTime, eventEnd) && isBefore(eventStart, slotEndDateTime)) {
                isProposedSlotActuallyAvailable = false;
                break; 
              }
            }
          }
        }

        if (!isProposedSlotActuallyAvailable) {
          return NextResponse.json({ error: 'The proposed new time slot is not available.' }, { status: 409 });
        }
        console.log('Proposed slot is available after checking existing calendar events.');

      } catch (availabilityError: any) {
        console.error('Availability check failed using events.list:', availabilityError);
        return NextResponse.json({ error: 'Failed to check availability for the new slot.', details: availabilityError.message }, { status: 500 });
      }
    }
    
    // Store the state of booking before any potential modifications for the audit log
    const originalBookingSnapshot = { ...currentBooking }; 

    // Construct the data to update in Supabase
    const updateData: Partial<Booking> & { updated_by_type?: string; updated_by_identifier?: string; updated_at?: string } = {};
    
    // Apply payload values to updateData if they exist
    if (payload.bay !== undefined) updateData.bay = payload.bay;
    if (payload.date !== undefined) updateData.date = payload.date;
    if (payload.start_time !== undefined) updateData.start_time = payload.start_time;
    if (proposedDurationMinutes !== undefined) { // This is from payload.duration or calculated from payload.end_time
        updateData.duration = proposedDurationMinutes / 60; 
    }
    if (payload.customer_notes !== undefined) updateData.customer_notes = payload.customer_notes;
    if (payload.number_of_people !== undefined) updateData.number_of_people = payload.number_of_people;

    // If slot changed, ensure all proposed values from availability check are used for consistency
    if (slotChanged) {
        updateData.date = proposedDate;
        updateData.start_time = proposedStartTime;
        updateData.bay = proposedBay;
        // updateData.duration is already set based on proposedDurationMinutes (derived from payload or current if no change)
    }

    // Add audit fields for the main update query
    updateData.updated_by_type = 'staff';
    updateData.updated_by_identifier = payload.employee_name;
    updateData.updated_at = new Date().toISOString();

    let bookingAfterUpdate: Booking = { ...currentBooking }; // Initialize with current, will be overlaid by DB result or just audit fields

    const fieldsToUpdateDirectly = Object.keys(updateData).filter(k => !['updated_by_type', 'updated_by_identifier', 'updated_at'].includes(k));

    if (fieldsToUpdateDirectly.length > 0) {
        console.log('Updating booking in Supabase with data:', updateData);
        const { data: dbUpdatedBooking, error: updateError } = await refacSupabase
            .from('bookings')
            .update(updateData) // updateData includes audit fields like updated_at
            .eq('id', bookingId)
            .select()
            .single();

        if (updateError) {
            console.error(`Supabase error updating booking ${bookingId}:`, updateError);
            return NextResponse.json({ error: 'Failed to update booking in database', details: updateError.message }, { status: 500 });
        }
        console.log('Successfully updated booking in Supabase:', dbUpdatedBooking);
        bookingAfterUpdate = dbUpdatedBooking as Booking; // Use the actual data returned from DB
    } else {
        console.log('No direct field changes to update in Supabase. Audit information will be logged.');
        // Apply audit fields to bookingAfterUpdate if no direct DB update was made, for consistency in history log
        bookingAfterUpdate.updated_by_type = updateData.updated_by_type;
        bookingAfterUpdate.updated_by_identifier = updateData.updated_by_identifier;
        bookingAfterUpdate.updated_at = updateData.updated_at;
    }

    // Create Audit Log Entry
    const changesSummary = generateChangesSummary(originalBookingSnapshot, updateData, payload);
    const historyEntry = {
      booking_id: bookingId,
      action_type: 'UPDATE_BOOKING_STAFF',
      changed_by_type: 'staff',
      changed_by_identifier: payload.employee_name,
      changes_summary: changesSummary,
      old_booking_snapshot: originalBookingSnapshot,
      new_booking_snapshot: bookingAfterUpdate, // This is the state after update (or with just audit fields if no direct update)
      notes: `Updated by staff: ${payload.employee_name}`
    };

    try {
      const { error: historyError } = await refacSupabase.from('booking_history').insert(historyEntry);
      if (historyError) {
        console.error('Failed to create booking history entry:', historyError);
        // MVP: Log error and continue. Future: consider transactionality.
      }
    } catch (historyCatchError) {
        console.error('Unexpected error creating booking history entry:', historyCatchError);
    }
    
    // --- Google Calendar Update Logic ---
    console.log('Starting Google Calendar update process...');
    let finalCalendarEventsForDB: CalendarEventResult[] | null | undefined = bookingAfterUpdate.calendar_events;

    try {
      const auth = await getServiceAccountAuth();
      const calendar = initializeCalendar(auth);

      // Prepare CalendarFormatInput based on bookingAfterUpdate
      const calendarInput: CalendarFormatInput = {
        id: bookingAfterUpdate.id,
        name: bookingAfterUpdate.name,
        phone_number: bookingAfterUpdate.phone_number,
        date: bookingAfterUpdate.date, 
        start_time: bookingAfterUpdate.start_time, 
        duration: bookingAfterUpdate.duration, 
        number_of_people: bookingAfterUpdate.number_of_people,
        bay: bookingAfterUpdate.bay, 
        bayDisplayName: mapSimpleBayToApiBayName(bookingAfterUpdate.bay as 'Bay 1' | 'Bay 2' | 'Bay 3' | null), 
        customer_notes: bookingAfterUpdate.customer_notes,
        employeeName: payload.employee_name, // Staff member making the change
        bookingType: bookingAfterUpdate.booking_type || 'Unknown Type', // Use from DB
        packageName: bookingAfterUpdate.package_name || undefined, // Use from DB
      };
      
      const newGCalEventObjectProperties = formatCalendarEvent(calendarInput);

      if (slotChanged) {
        console.log('Slot changed, replacing Google Calendar events...');
        const newLinkedEvents: CalendarEventResult[] = [];

        // 1. Delete all old events
        if (originalBookingSnapshot.calendar_events && originalBookingSnapshot.calendar_events.length > 0) {
          console.log('Deleting old calendar events:', originalBookingSnapshot.calendar_events);
          for (const oldEvent of originalBookingSnapshot.calendar_events) {
            try {
              await deleteCalendarEvent(auth, oldEvent.calendarId, oldEvent.eventId);
            } catch (delError) {
              console.warn(`Failed to delete old GCal event ${oldEvent.eventId} from calendar ${oldEvent.calendarId}:`, delError);
              // Log and continue, don't let one deletion failure stop the whole process
            }
          }
        }

        // 2. Create new events for the new slot
        // createCalendarEvents internally calls getRelevantCalendarIds and formatCalendarEvent
        // Since calendarInput omits bookingType, this will likely only create bay events
        const creationResults = await createCalendarEvents(calendar, calendarInput);
        if (creationResults && creationResults.length > 0) {
          newLinkedEvents.push(...creationResults);
          console.log('Successfully created new GCal events:', newLinkedEvents);
        } else {
          console.warn('No new GCal events were created for the new slot.');
        }
        finalCalendarEventsForDB = newLinkedEvents;

        // 3. Update Supabase with the new calendar_events array
        const { error: updateCalendarLinksError } = await refacSupabase
          .from('bookings')
          .update({ calendar_events: finalCalendarEventsForDB, google_calendar_sync_status: 'synced' })
          .eq('id', bookingId);

        if (updateCalendarLinksError) {
          console.error('Failed to update booking with new calendar_events links:', updateCalendarLinksError);
          // This is a divergence, flag it
          await refacSupabase.from('bookings').update({ google_calendar_sync_status: 'error_syncing' }).eq('id', bookingId);
        } else {
           bookingAfterUpdate.calendar_events = finalCalendarEventsForDB; // reflect in current object for response
           bookingAfterUpdate.google_calendar_sync_status = 'synced';
        }

      } else {
        console.log('Slot not changed, updating existing Google Calendar events in place...');
        if (bookingAfterUpdate.calendar_events && bookingAfterUpdate.calendar_events.length > 0) {
          for (const eventToUpdate of bookingAfterUpdate.calendar_events) {
            try {
              await updateCalendarEvent(auth, eventToUpdate.calendarId, eventToUpdate.eventId, newGCalEventObjectProperties);
            } catch (updError) {
              console.warn(`Failed to update GCal event ${eventToUpdate.eventId} in calendar ${eventToUpdate.calendarId}:`, updError);
              // Update sync status for this booking to 'error_syncing'
              await refacSupabase.from('bookings').update({ google_calendar_sync_status: 'error_syncing' }).eq('id', bookingId);
              bookingAfterUpdate.google_calendar_sync_status = 'error_syncing'; 
            }
          }
          if(bookingAfterUpdate.google_calendar_sync_status !== 'error_syncing'){
             await refacSupabase.from('bookings').update({ google_calendar_sync_status: 'synced' }).eq('id', bookingId);
             bookingAfterUpdate.google_calendar_sync_status = 'synced';
          }
        } else {
          console.warn('No calendar_events found on booking to update, though slot did not change.');
          // Potentially try to find events via fallback if this is an old booking? For now, mark as pending_link or error.
          await refacSupabase.from('bookings').update({ google_calendar_sync_status: 'pending_link' }).eq('id', bookingId);
          bookingAfterUpdate.google_calendar_sync_status = 'pending_link';
        }
      }
    } catch (gcalError) {
      console.error('Overall error during Google Calendar update process:', gcalError);
      await refacSupabase.from('bookings').update({ google_calendar_sync_status: 'error_syncing' }).eq('id', bookingId);
      bookingAfterUpdate.google_calendar_sync_status = 'error_syncing';
    }
    // --- End Google Calendar Update Logic ---

    // // Send LINE Notification for Modification - MOVED TO CLIENT-SIDE
    // try {
    //   const lineMessage = formatLineModificationMessage(bookingAfterUpdate, originalBookingSnapshot);
    //   const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'; // Fallback for local dev
    //   
    //   const notifyResponse = await fetch(`${appUrl}/api/notify`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, 
    //     body: JSON.stringify({ message: lineMessage, bookingType: originalBookingTypeFromGCal })
    //   });

    //   const contentType = notifyResponse.headers.get("content-type");
    //   if (!notifyResponse.ok) {
    //     let errorDetails = `Response status: ${notifyResponse.status}`;
    //     if (contentType && contentType.includes("application/json")) {
    //       const notifyErrorBody = await notifyResponse.json();
    //       errorDetails += `, Body: ${JSON.stringify(notifyErrorBody)}`;
    //     } else {
    //       const notifyErrorText = await notifyResponse.text();
    //       errorDetails += `, Body: ${notifyErrorText.substring(0, 200)}...`;
    //     }
    //     console.error('Update booking: Failed to send LINE notification via /api/notify:', errorDetails);
    //   } else if (contentType && contentType.includes("application/json")) {
    //     console.log('Update booking: LINE notification for modification sent successfully via /api/notify.');
    //   } else {
    //     const responseText = await notifyResponse.text();
    //     console.warn(`Update booking: LINE notification - /api/notify did not return JSON. Status: ${notifyResponse.status}. Response: ${responseText.substring(0,200)}...`);
    //   }
    // } catch (lineError) {
    //   console.error('Error sending LINE notification for modification:', lineError);
    //   // Do not fail the entire request, just log it.
    // }

    return NextResponse.json({ 
        message: `Booking ${bookingId} updated successfully.`, 
        booking: bookingAfterUpdate 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing the request:', error);
    return NextResponse.json({ error: 'An error occurred while processing the request', details: error.message }, { status: 500 });
  }
}