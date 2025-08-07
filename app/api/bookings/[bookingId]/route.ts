import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { Booking } from '@/types/booking'; 
// Google Calendar imports removed - calendar events are now handled by automated sync system
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
  // New fields from Phase 3 enhancements
  phone_number?: string;
  package_id?: string | null;
  booking_type?: string;
  referral_source?: string | null;
}

// Helper to map simple bay names to the format expected by Google Calendar API (for event creation only)
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
async function generateChangesSummary(oldBooking: Booking, newBookingData: Partial<Booking>, payload: UpdateBookingPayload): Promise<string> {
  const changes: string[] = [];
  const oldEndTime = calculateEndTime(oldBooking.date, oldBooking.start_time, oldBooking.duration * 60);
  const newProposedDate = newBookingData.date || oldBooking.date;
  const newProposedStartTime = newBookingData.start_time || oldBooking.start_time;
  
  // Fix: newBookingData.duration is already in hours (from database), not minutes
  const newProposedDurationMinutes = newBookingData.duration ? newBookingData.duration * 60 : oldBooking.duration * 60; 
  const newProposedEndTime = calculateEndTime(newProposedDate, newProposedStartTime, newProposedDurationMinutes);
  const newProposedBay = newBookingData.bay !== undefined ? newBookingData.bay : oldBooking.bay;

  if (newBookingData.date && oldBooking.date !== newBookingData.date) {
    changes.push(`Date from ${oldBooking.date} to ${newBookingData.date}`);
  }
  if (newBookingData.start_time && oldBooking.start_time !== newBookingData.start_time) {
    changes.push(`Start time from ${oldBooking.start_time} to ${newBookingData.start_time}`);
  }
  // Check end time / duration change - only show if duration actually changed
  if (newBookingData.duration !== undefined && oldBooking.duration !== newBookingData.duration) {
      changes.push(`Duration: ${oldBooking.duration}h → ${newBookingData.duration}h`);
  }
  if (newBookingData.bay !== undefined && oldBooking.bay !== newBookingData.bay) {
    changes.push(`Bay from ${oldBooking.bay || 'N/A'} to ${newBookingData.bay || 'N/A'}`);
  }
  if (newBookingData.number_of_people !== undefined && oldBooking.number_of_people !== newBookingData.number_of_people) {
    changes.push(`Pax from ${oldBooking.number_of_people} to ${newBookingData.number_of_people}`);
  }
  if (newBookingData.customer_notes !== undefined && oldBooking.customer_notes !== newBookingData.customer_notes) {
    changes.push(`Notes updated`);
  }
  if (newBookingData.phone_number !== undefined && oldBooking.phone_number !== newBookingData.phone_number) {
    changes.push(`Phone from ${oldBooking.phone_number || 'N/A'} to ${newBookingData.phone_number || 'N/A'}`);
  }
  if (newBookingData.package_id !== undefined && oldBooking.package_id !== newBookingData.package_id) {
    // Fetch package names to show meaningful change description
    let oldPackageName = 'None';
    let newPackageName = 'None';
    let packageLookupFailed = false;
    
    try {
      if (oldBooking.package_id) {
        const { data: oldPackage } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('packages')
          .select('package_types(display_name)')
          .eq('id', oldBooking.package_id)
          .single();
        if (oldPackage?.package_types?.display_name) {
          oldPackageName = oldPackage.package_types.display_name;
        }
      }
      
      if (newBookingData.package_id) {
        const { data: newPackage } = await refacSupabaseAdmin
          .schema('backoffice')
          .from('packages')
          .select('package_types(display_name)')
          .eq('id', newBookingData.package_id)
          .single();
        if (newPackage?.package_types?.display_name) {
          newPackageName = newPackage.package_types.display_name;
        }
      }
      
      changes.push(`Package: ${oldPackageName} → ${newPackageName}`);
    } catch (error) {
      console.error('Error fetching package names for changes summary:', error);
      // Fallback to generic message if package lookup fails
      changes.push(`Package changed`);
    }
  }
  if (newBookingData.booking_type !== undefined && oldBooking.booking_type !== newBookingData.booking_type) {
    changes.push(`Type: ${oldBooking.booking_type || 'Normal Bay Rate'} → ${newBookingData.booking_type || 'N/A'}`);
  }
  if (newBookingData.referral_source !== undefined && oldBooking.referral_source !== newBookingData.referral_source) {
    changes.push(`Referral: ${oldBooking.referral_source || 'None'} → ${newBookingData.referral_source || 'None'}`);
  }

  if (changes.length === 0) return 'No direct field changes detected (audit fields updated).';
  return changes.join(', ');
}

const getBookingIdFromDescription = (description: string | null | undefined): string | null => {
  if (!description) return null;
  const match = description.match(/Booking ID: (BK[A-Z0-9]+)/i);
  return match ? match[1] : null;
};

export async function GET(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  const { bookingId } = params;

  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID is required in path' }, { status: 400 });
  }

  try {
    // Fetch booking from Supabase with complete customer information
    const { data: booking, error: fetchError } = await refacSupabaseAdmin
      .from('bookings')
      .select(`
        *,
        customers(
          customer_code,
          customer_name,
          contact_number,
          email,
          address,
          date_of_birth,
          preferred_contact_method,
          total_lifetime_value,
          total_visits,
          last_visit_date
        )
      `)
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error(`Supabase error fetching booking ${bookingId}:`, fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: `Booking with ID ${bookingId} not found.` }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch booking', details: fetchError.message }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ error: `Booking with ID ${bookingId} not found.` }, { status: 404 });
    }

    // Structure response with booking data and customer information
    const bookingWithCustomerInfo = {
      ...booking,
      // Keep customer information as nested object for proper data structure
      customer: booking.customers || null,
      customers: undefined // Remove the nested customers object
    };

    return NextResponse.json(
      { booking: bookingWithCustomerInfo },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error: any) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({ error: 'An error occurred while fetching the booking', details: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  const { bookingId } = params;
  let payload: UpdateBookingPayload;

  try {
    payload = await request.json();
    console.log('Received payload:', JSON.stringify(payload, null, 2));
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
  
  // Validation for new fields
  if (payload.phone_number !== undefined && (typeof payload.phone_number !== 'string' || payload.phone_number.trim() === '')) {
    return NextResponse.json({ error: 'phone_number must be a non-empty string if provided'}, {status: 400});
  }
  if (payload.package_id !== undefined && payload.package_id !== null && typeof payload.package_id !== 'string') {
    return NextResponse.json({ error: 'package_id must be a string or null if provided'}, {status: 400});
  }
  if (payload.booking_type !== undefined && (typeof payload.booking_type !== 'string' || payload.booking_type.trim() === '')) {
    return NextResponse.json({ error: 'booking_type must be a non-empty string if provided'}, {status: 400});
  }
  if (payload.referral_source !== undefined && payload.referral_source !== null && typeof payload.referral_source !== 'string') {
    return NextResponse.json({ error: 'referral_source must be a string or null if provided'}, {status: 400});
  }
  
  // Process the booking update

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
    const availabilityOverridden = Boolean(payload.availability_overridden);
    
    console.log('Availability check debug:', {
      slotChanged,
      availabilityOverridden,
      payloadFlag: payload.availability_overridden,
      payloadFlagType: typeof payload.availability_overridden,
      proposedSlot: { date: proposedDate, start_time: proposedStartTime, bay: proposedBay, duration: proposedDurationInMinutes }
    });

    // Extra debugging for overwrite logic
    if (slotChanged) {
      console.log('Slot changed detected - checking availability override:', {
        availabilityOverridden,
        willSkipAvailabilityCheck: availabilityOverridden,
        willRunAvailabilityCheck: !availabilityOverridden
      });
    }

    if (slotChanged && !availabilityOverridden) {
      if (!proposedBay) {
        return NextResponse.json({ error: 'Invalid bay for availability check.' }, { status: 400 });
      }

      try {
        // Use native database availability checking instead of Google Calendar
        const proposedDurationInHours = proposedDurationInMinutes / 60;
        
        const { data: isAvailable, error: availabilityError } = await refacSupabaseAdmin.rpc('check_availability', {
          p_date: proposedDate,
          p_bay: proposedBay,
          p_start_time: proposedStartTime,
          p_duration: proposedDurationInHours,
          p_exclude_booking_id: bookingId // Exclude current booking from conflict check
        });

        if (availabilityError) {
          console.error('Database error checking slot availability:', availabilityError);
          return NextResponse.json({ error: 'Failed to check slot availability', details: availabilityError.message }, { status: 500 });
        }

        if (!isAvailable) {
          return NextResponse.json({ error: 'The proposed time slot is not available.' }, { status: 409 }); // 409 Conflict
        }
        
        isProposedSlotActuallyAvailable = true;
      } catch (availabilityError: any) {
        console.error('Error checking slot availability:', availabilityError);
        return NextResponse.json({ error: 'Failed to check slot availability', details: availabilityError.message }, { status: 500 });
      }
    } else if (slotChanged && availabilityOverridden) {
        console.log('Availability check bypassed due to override flag');
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
    
    // Handle duration: Only update if duration actually changed from current booking
    if (payload.duration !== undefined) {
        // Convert payload duration (minutes) to hours for comparison with database value
        const payloadDurationInHours = payload.duration / 60;
        // Use precise comparison to avoid floating point issues
        if (Math.abs(payloadDurationInHours - currentBooking.duration) > 0.001) {
            updateDataForSupabase.duration = payloadDurationInHours;
        }
    } else if (payload.end_time && payload.start_time) {
        // Only update duration if end_time was explicitly provided (not just duration maintenance)
        if (proposedDurationInMinutes && proposedDurationInMinutes > 0) {
            const newDurationInHours = proposedDurationInMinutes / 60;
            if (Math.abs(newDurationInHours - currentBooking.duration) > 0.001) {
                updateDataForSupabase.duration = newDurationInHours;
            }
        }
    }

    if (payload.bay !== undefined) updateDataForSupabase.bay = payload.bay; // handles null assignment for bay
    if (payload.customer_notes !== undefined) updateDataForSupabase.customer_notes = payload.customer_notes;
    if (payload.number_of_people) updateDataForSupabase.number_of_people = payload.number_of_people;
    
    // Update new fields
    if (payload.phone_number !== undefined) updateDataForSupabase.phone_number = payload.phone_number;
    if (payload.package_id !== undefined) updateDataForSupabase.package_id = payload.package_id;
    if (payload.booking_type !== undefined) updateDataForSupabase.booking_type = payload.booking_type;
    if (payload.referral_source !== undefined) updateDataForSupabase.referral_source = payload.referral_source;
    
    // Audit: Add previous values if they changed significantly (optional)
    // For example, if (payload.date && payload.date !== currentBooking.date) updateDataForSupabase.previous_date = currentBooking.date;
    

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
    const changesSummary = await generateChangesSummary(originalBookingSnapshot, updateDataForSupabase, payload);
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
    
    /* --- Google Calendar Update Logic --- (Commented out - handled by automated sync system)
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
        const newLinkedEvents: CalendarEventResult[] = [];

        // 1. Delete all old events
        if (originalBookingSnapshot.calendar_events && originalBookingSnapshot.calendar_events.length > 0) {
          let deletionErrors = [];
          for (const oldEvent of originalBookingSnapshot.calendar_events) {
            try {
              await deleteCalendarEvent(auth, oldEvent.calendarId, oldEvent.eventId);
            } catch (delError: any) {
              deletionErrors.push({
                eventId: oldEvent.eventId,
                calendarId: oldEvent.calendarId,
                error: delError.message || String(delError)
              });
              console.warn(`Failed to delete old GCal event ${oldEvent.eventId} from calendar ${oldEvent.calendarId}:`, delError);
              // Continue with other deletions and new event creation, but log the failure
            }
          }
          
          // If there were deletion errors, update the sync status to indicate partial failure
          if (deletionErrors.length > 0) {
            console.error('Some calendar events failed to delete during bay change:', deletionErrors);
            await refacSupabaseAdmin.from('bookings').update({ 
              google_calendar_sync_status: 'partial_sync_error',
              notes: `Bay change completed but ${deletionErrors.length} old events failed to delete. Manual cleanup may be needed.`
            }).eq('id', bookingId);
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
        // Slot not changed, update existing Google Calendar events in place
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
    --- End Google Calendar Update Logic --- */

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