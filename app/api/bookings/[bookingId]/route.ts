import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
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
  availability_overridden?: boolean; // Add this field
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
    const { data: currentBookingUntyped, error: fetchError } = await refacSupabaseAdmin
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

    // Determine proposed new slot details
    const proposedDate = payload.date || currentBooking.date;
    const proposedStartTime = payload.start_time || currentBooking.start_time;
    let proposedDurationInMinutes: number; // Duration in minutes for calculations

    if (payload.end_time && payload.start_time) { // if both end_time and start_time are in payload
        const startDateObj = parseDateFns(`${payload.date || currentBooking.date}T${payload.start_time}`, "yyyy-MM-dd'T'HH:mm", new Date());
        const endDateObj = parseDateFns(`${payload.date || currentBooking.date}T${payload.end_time}`, "yyyy-MM-dd'T'HH:mm", new Date());
        proposedDurationInMinutes = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60);
    } else if (payload.end_time && !payload.start_time) { // if end_time is in payload but start_time is from current booking
        const startDateObj = parseDateFns(`${payload.date || currentBooking.date}T${currentBooking.start_time}`, "yyyy-MM-dd'T'HH:mm", new Date());
        const endDateObj = parseDateFns(`${payload.date || currentBooking.date}T${payload.end_time}`, "yyyy-MM-dd'T'HH:mm", new Date());
        proposedDurationInMinutes = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60);
    } else if (payload.duration) { // duration is explicitly provided in payload (in minutes)
        proposedDurationInMinutes = payload.duration;
    } else { // Neither end_time nor payload.duration is provided, use current booking's duration (which is in hours)
        proposedDurationInMinutes = currentBooking.duration * 60;
    }

    if (proposedDurationInMinutes <= 0 && (payload.end_time || payload.duration)) {
        return NextResponse.json({ error: 'Calculated or provided duration must be positive.' }, { status: 400 });
    }
    
    const proposedEndTime = calculateEndTime(proposedDate, proposedStartTime, proposedDurationInMinutes);
    const proposedBay = payload.bay !== undefined ? payload.bay : currentBooking.bay;
    const currentEndTime = calculateEndTime(currentBooking.date, currentBooking.start_time, currentBooking.duration * 60); // currentBooking.duration is in hours

    const slotChanged = 
      proposedDate !== currentBooking.date ||
      proposedStartTime !== currentBooking.start_time ||
      // Compare based on proposedDurationInMinutes to avoid floating point issues with proposedEndTime comparison
      (payload.duration ? proposedDurationInMinutes !== (currentBooking.duration * 60) : proposedEndTime !== currentEndTime) ||
      proposedBay !== currentBooking.bay;

    let isProposedSlotActuallyAvailable = true; // Assume available if not checking or overridden

    // Skip availability check if availability_overridden is true in payload (coming from EditBookingModal)
    // The payload from the logs has: availability_overridden: false
    const availabilityOverridden = payload.availability_overridden === true; // Fix: check payload instead of request

    if (slotChanged && !availabilityOverridden) {
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

        const slotStartDateTime = parseISO(`${proposedDate}T${proposedStartTime}:00+07:00`); // Use parseISO with explicit offset
        const slotEndDateTime = parseISO(`${proposedDate}T${proposedEndTime}:00+07:00`);   // Use parseISO with explicit offset

        console.log(`Constructed Slot for Check: Start=${slotStartDateTime.toISOString()}, End=${slotEndDateTime.toISOString()}`);

        if (events) {
          for (const event of events) {
            if (event.status === 'cancelled') continue;

            const eventBookingId = getBookingIdFromDescription(event.description);
            if (eventBookingId === bookingId) { // bookingId is from params
              console.log(`Skipping event for current booking ID: ${eventBookingId}`);
              continue; // This is the event associated with the booking being modified, skip it.
            }

            const eventStartStr = event.start?.dateTime;
            const eventEndStr = event.end?.dateTime;

            if (eventStartStr && eventEndStr) {
              const eventStart = parseISO(eventStartStr);
              const eventEnd = parseISO(eventEndStr);

              console.log(`Comparing with Event: Summary=${event.summary}, Start=${eventStart.toISOString()}, End=${eventEnd.toISOString()}`);

              // Check for overlap: (SlotStart < EventEnd) and (SlotEnd > EventStart)
              if (isBefore(slotStartDateTime, eventEnd) && isBefore(eventStart, slotEndDateTime)) {
                isProposedSlotActuallyAvailable = false;
                console.log(`Conflict detected with event: ${event.summary} (ID: ${event.id})`);
                break; 
              }
            }
          }
        }
        if (!isProposedSlotActuallyAvailable) {
          return NextResponse.json({ error: 'The proposed time slot is not available.' }, { status: 409 }); // 409 Conflict
        }
        console.log('Proposed slot is available.');
      } catch (availabilityError: any) {
        console.error('Error checking slot availability:', availabilityError);
        return NextResponse.json({ error: 'Failed to check slot availability', details: availabilityError.message }, { status: 500 });
      }
    } else if (slotChanged && availabilityOverridden) {
        console.log('Availability check skipped due to override.');
        isProposedSlotActuallyAvailable = true; // Proceed as if available
    }
    
    // Store the state of booking before any potential modifications for the audit log
    const originalBookingSnapshot = { ...currentBooking }; 

    // Construct the object for Supabase update
    const updateDataForSupabase: Partial<Booking> & { updated_by_type: string; updated_by_identifier: string } = {
      updated_by_type: 'staff', // Assuming update is by staff
      updated_by_identifier: payload.employee_name,
    };

    if (payload.date) updateDataForSupabase.date = payload.date;
    if (payload.start_time) updateDataForSupabase.start_time = payload.start_time;
    
    // Handle duration: Convert minutes from payload/calculation to hours for DB
    if (payload.duration || payload.end_time) { // If duration was explicitly set by payload.duration or calculated from payload.end_time
        if (proposedDurationInMinutes && proposedDurationInMinutes > 0) {
            updateDataForSupabase.duration = proposedDurationInMinutes / 60; // Convert to hours
        } else if (payload.duration && payload.duration > 0) { // Fallback if proposedDurationInMinutes somehow not set but payload.duration exists
             updateDataForSupabase.duration = payload.duration / 60;
        }
    }

    if (payload.bay !== undefined) updateDataForSupabase.bay = payload.bay; // handles null assignment for bay
    if (payload.customer_notes !== undefined) updateDataForSupabase.customer_notes = payload.customer_notes;
    if (payload.number_of_people) updateDataForSupabase.number_of_people = payload.number_of_people;
    
    // Audit: Add previous values if they changed significantly (optional)
    // For example, if (payload.date && payload.date !== currentBooking.date) updateDataForSupabase.previous_date = currentBooking.date;
    
    console.log('Data for Supabase update:', updateDataForSupabase);

    // Update booking in Supabase
    const { data: updatedBookingUntyped, error: updateError } = await refacSupabaseAdmin
      .from('bookings')
      .update(updateDataForSupabase)
      .eq('id', bookingId)
      .select() // Select all fields from the updated record
      .single();

    if (updateError) {
      console.error(`Supabase error updating booking ${bookingId}:`, updateError);
      return NextResponse.json({ error: 'Failed to update booking in database', details: updateError.message }, { status: 500 });
    }

    // Create Audit Log Entry
    const changesSummary = generateChangesSummary(originalBookingSnapshot, updateDataForSupabase, payload);
    const historyEntry = {
      booking_id: bookingId,
      action_type: 'UPDATE_BOOKING_STAFF',
      changed_by_type: 'staff',
      changed_by_identifier: payload.employee_name,
      changes_summary: changesSummary,
      old_booking_snapshot: originalBookingSnapshot,
      new_booking_snapshot: updatedBookingUntyped as Booking, // This is the state after update (or with just audit fields if no direct update)
      notes: `Updated by staff: ${payload.employee_name}`
    };

    try {
      const { error: historyError } = await refacSupabaseAdmin.from('booking_history').insert(historyEntry);
      if (historyError) {
        console.error('Failed to create booking history entry:', historyError);
        // MVP: Log error and continue. Future: consider transactionality.
      }
    } catch (historyCatchError) {
        console.error('Unexpected error creating booking history entry:', historyCatchError);
    }
    
    // --- Google Calendar Update Logic ---
    console.log('Starting Google Calendar update process...');
    let finalCalendarEventsForDB: CalendarEventResult[] | null | undefined = updatedBookingUntyped.calendar_events;

    try {
      const auth = await getServiceAccountAuth();
      const calendar = initializeCalendar(auth);

      // Prepare CalendarFormatInput based on updatedBookingUntyped
      const calendarInput: CalendarFormatInput = {
        id: updatedBookingUntyped.id,
        name: updatedBookingUntyped.name,
        phone_number: updatedBookingUntyped.phone_number,
        date: updatedBookingUntyped.date, 
        start_time: updatedBookingUntyped.start_time, 
        duration: updatedBookingUntyped.duration, 
        number_of_people: updatedBookingUntyped.number_of_people,
        bay: updatedBookingUntyped.bay, 
        bayDisplayName: mapSimpleBayToApiBayName(updatedBookingUntyped.bay as 'Bay 1' | 'Bay 2' | 'Bay 3' | null), 
        customer_notes: updatedBookingUntyped.customer_notes,
        employeeName: payload.employee_name, // Staff member making the change
        bookingType: updatedBookingUntyped.booking_type || 'Unknown Type', // Use from DB
        packageName: updatedBookingUntyped.package_name || undefined, // Use from DB
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
        } else {
          console.warn('No new GCal events were created for the new slot.');
        }
        finalCalendarEventsForDB = newLinkedEvents;

        // 3. Update Supabase with the new calendar_events array
        const { error: updateCalendarLinksError } = await refacSupabaseAdmin
          .from('bookings')
          .update({ calendar_events: finalCalendarEventsForDB, google_calendar_sync_status: 'synced' })
          .eq('id', bookingId);

        if (updateCalendarLinksError) {
          console.error('Failed to update booking with new calendar_events links:', updateCalendarLinksError);
          // This is a divergence, flag it
          await refacSupabaseAdmin.from('bookings').update({ google_calendar_sync_status: 'error_syncing' }).eq('id', bookingId);
        } else {
           updatedBookingUntyped.calendar_events = finalCalendarEventsForDB; // reflect in current object for response
           updatedBookingUntyped.google_calendar_sync_status = 'synced';
        }

      } else {
        console.log('Slot not changed, updating existing Google Calendar events in place...');
        if (updatedBookingUntyped.calendar_events && updatedBookingUntyped.calendar_events.length > 0) {
          for (const eventToUpdate of updatedBookingUntyped.calendar_events) {
            try {
              await updateCalendarEvent(auth, eventToUpdate.calendarId, eventToUpdate.eventId, newGCalEventObjectProperties);
            } catch (updError) {
              console.warn(`Failed to update GCal event ${eventToUpdate.eventId} in calendar ${eventToUpdate.calendarId}:`, updError);
              // Update sync status for this booking to 'error_syncing'
              await refacSupabaseAdmin.from('bookings').update({ google_calendar_sync_status: 'error_syncing' }).eq('id', bookingId);
              updatedBookingUntyped.google_calendar_sync_status = 'error_syncing'; 
            }
          }
          if(updatedBookingUntyped.google_calendar_sync_status !== 'error_syncing'){
             await refacSupabaseAdmin.from('bookings').update({ google_calendar_sync_status: 'synced' }).eq('id', bookingId);
             updatedBookingUntyped.google_calendar_sync_status = 'synced';
          }
        } else {
          console.warn('No calendar_events found on booking to update, though slot did not change.');
          // Potentially try to find events via fallback if this is an old booking? For now, mark as pending_link or error.
          await refacSupabaseAdmin.from('bookings').update({ google_calendar_sync_status: 'pending_link' }).eq('id', bookingId);
          updatedBookingUntyped.google_calendar_sync_status = 'pending_link';
        }
      }
    } catch (gcalError) {
      console.error('Overall error during Google Calendar update process:', gcalError);
      await refacSupabaseAdmin.from('bookings').update({ google_calendar_sync_status: 'error_syncing' }).eq('id', bookingId);
      updatedBookingUntyped.google_calendar_sync_status = 'error_syncing';
    }
    // --- End Google Calendar Update Logic ---

    // // Send LINE Notification for Modification - MOVED TO CLIENT-SIDE
    // try {
    //   const lineMessage = formatLineModificationMessage(updatedBookingUntyped, originalBookingSnapshot);
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
        booking: updatedBookingUntyped 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error processing the request:', error);
    return NextResponse.json({ error: 'An error occurred while processing the request', details: error.message }, { status: 500 });
  }
}