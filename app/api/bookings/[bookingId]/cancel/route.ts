import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { Booking } from '@/types/booking';
// Calendar integration removed - calendar events are now handled by automated sync system
import { formatLineCancellationMessage } from '@/lib/line-formatting';

// Define the expected payload structure for cancellation
interface CancelBookingPayload {
  employee_name: string; // Mandatory for staff-initiated cancellations
  cancellation_reason?: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  const { bookingId } = params;
  let payload: CancelBookingPayload;

  console.log(`POST /api/bookings/${bookingId}/cancel called`);

  if (!bookingId) {
    console.warn('Cancel booking: Booking ID missing');
    return NextResponse.json({ error: 'Booking ID is required in path' }, { status: 400 });
  }

  try {
    payload = await request.json();
    console.log('Cancel booking payload:', payload);
  } catch (error) {
    console.error('Cancel booking: Invalid JSON payload', error);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Validate payload: employee_name is mandatory
  if (!payload.employee_name || typeof payload.employee_name !== 'string' || payload.employee_name.trim() === '') {
    console.warn('Cancel booking: employee_name missing or invalid');
    return NextResponse.json({ error: 'employee_name is required and must be a non-empty string' }, { status: 400 });
  }

  // cancellation_reason is optional, but if provided, should be a string or null
  if (payload.cancellation_reason !== undefined && payload.cancellation_reason !== null && typeof payload.cancellation_reason !== 'string') {
    console.warn('Cancel booking: cancellation_reason invalid type');
    return NextResponse.json({ error: 'cancellation_reason must be a string or null if provided' }, { status: 400 });
  }

  try {
    // 1. Auth & AuthZ (Middleware handles basic auth)
    console.log(`Attempting to cancel booking ${bookingId} by ${payload.employee_name}`);

    // 2. Fetch current booking to ensure it exists and isn't already cancelled
    const { data: currentBookingUntyped, error: fetchError } = await refacSupabaseAdmin
      .from('bookings')
      .select('*') // Select all for audit log and GCal linking later
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error(`Cancel booking: Supabase error fetching booking ${bookingId}:`, fetchError);
      if (fetchError.code === 'PGRST116') { // Not found
        return NextResponse.json({ error: `Booking with ID ${bookingId} not found.` }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch booking details', details: fetchError.message }, { status: 500 });
    }

    if (!currentBookingUntyped) {
      return NextResponse.json({ error: `Booking with ID ${bookingId} not found (safeguard).` }, { status: 404 });
    }

    const currentBooking = currentBookingUntyped as Booking;
    console.log('Current booking state for cancellation:', currentBooking);

    if (currentBooking.status === 'cancelled') {
      console.warn(`Booking ${bookingId} is already cancelled.`);
      // Consider if this should be an error or just return current state. 
      // For idempotent behavior, returning current state might be fine, or a specific message.
      return NextResponse.json({ message: `Booking ${bookingId} is already cancelled.`, booking: currentBooking }, { status: 200 }); // Or 409 Conflict if preferred
    }

    // 3. Supabase update: set status='cancelled', audit fields
    const updatePayload: Partial<Booking> = {
      status: 'cancelled',
      cancelled_by_type: 'staff',
      cancelled_by_identifier: payload.employee_name,
      cancellation_reason: payload.cancellation_reason // Will be null/undefined if not provided, which is fine
    };

    const { data: cancelledBooking, error: updateError } = await refacSupabaseAdmin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error(`Cancel booking: Supabase error updating booking ${bookingId} to cancelled:`, updateError);
      return NextResponse.json({ error: 'Failed to cancel booking in database', details: updateError.message }, { status: 500 });
    }

    console.log(`Booking ${bookingId} successfully cancelled in Supabase:`, cancelledBooking);

    // 4. Booking history insert
    const oldBookingSnapshot = { ...currentBooking }; // State before cancellation
    // cancelledBooking already contains the status: 'cancelled' and audit fields

    let changesSummary = `Booking cancelled by staff: ${payload.employee_name}.`;
    if (payload.cancellation_reason) {
      changesSummary += ` Reason: ${payload.cancellation_reason}`;
    }

    const historyEntry = {
      booking_id: bookingId,
      action_type: 'CANCEL_BOOKING_STAFF',
      changed_by_type: 'staff',
      changed_by_identifier: payload.employee_name,
      changes_summary: changesSummary,
      old_booking_snapshot: oldBookingSnapshot,
      new_booking_snapshot: cancelledBooking, // State after cancellation
      notes: payload.cancellation_reason ? `Cancellation Reason: ${payload.cancellation_reason}` : 'Cancelled by staff'
    };

    try {
      const { error: historyError } = await refacSupabaseAdmin.from('booking_history').insert(historyEntry);
      if (historyError) {
        console.error(`Cancel booking: Failed to create booking history entry for ${bookingId}:`, historyError);
        // MVP: Log error and continue. Future: consider transactionality.
      }
    } catch (historyCatchError) {
        console.error(`Cancel booking: Unexpected error creating booking history entry for ${bookingId}:`, historyCatchError);
    }

    // 5. Calendar Integration Removed - calendar events managed by automated sync system
    /* Calendar deletion code temporarily commented out
    if (currentBooking.calendar_events && currentBooking.calendar_events.length > 0) {
      console.log(`Cancel booking: Deleting ${currentBooking.calendar_events.length} Google Calendar event(s) for booking ${bookingId}.`);
      try {
        const auth = await getServiceAccountAuth();

        let allGCalDeletionsSuccessful = true;
        let deletionErrors = [];
        
        for (const event of currentBooking.calendar_events) {
          try {
            console.log(`Cancel booking: Attempting to delete GCal event ${event.eventId} from calendar ${event.calendarId} for booking ${bookingId}`);
            await deleteCalendarEvent(auth, event.calendarId, event.eventId);
            console.log(`Cancel booking: Successfully deleted GCal event ${event.eventId} from calendar ${event.calendarId} for booking ${bookingId}`);
          } catch (gcalDeleteError: any) {
            allGCalDeletionsSuccessful = false;
            deletionErrors.push({
              eventId: event.eventId,
              calendarId: event.calendarId,
              error: gcalDeleteError.message || String(gcalDeleteError)
            });
            console.error(`Cancel booking: Failed to delete GCal event ${event.eventId} from calendar ${event.calendarId} for booking ${bookingId}:`, gcalDeleteError);
          }
        }

        // Update the booking to clear calendar_events and set appropriate sync status
        let syncStatus = 'cancelled_events_deleted';
        let updateData: any = { calendar_events: [] }; // Clear the events array since they should all be deleted

        if (!allGCalDeletionsSuccessful) {
          console.warn(`Cancel booking: Not all GCal events were deleted successfully for ${bookingId}. Errors:`, deletionErrors);
          syncStatus = 'cancelled_partial_deletion_error';
          // Don't clear the calendar_events array if some deletions failed, so we can retry later
          updateData = { google_calendar_sync_status: syncStatus };
        } else {
          console.log(`Cancel booking: All linked GCal events deleted successfully for ${bookingId}.`);
          updateData.google_calendar_sync_status = syncStatus;
        }
        
        // Update the booking with the new sync status and potentially cleared events
        await refacSupabaseAdmin.from('bookings').update(updateData).eq('id', bookingId);

      } catch (gcalAuthError) {
        console.error(`Cancel booking: Error obtaining Google Auth or initializing calendar for deletion for booking ${bookingId}:`, gcalAuthError);
        // Update sync status to reflect this broader GCal issue
        await refacSupabaseAdmin.from('bookings').update({ google_calendar_sync_status: 'cancelled_gcal_auth_error' }).eq('id', bookingId);
      }
    } else {
      console.log(`Cancel booking: No Google Calendar events linked to booking ${bookingId} to delete.`);
      // Update sync status to indicate successful cancellation with no events to delete
      await refacSupabaseAdmin.from('bookings').update({ google_calendar_sync_status: 'cancelled_no_events' }).eq('id', bookingId);
    }
    */ // End commented out calendar deletion code

    // // 6. LINE notification for cancellation - MOVED TO CLIENT-SIDE
    // try {
    //   const lineMessage = formatLineCancellationMessage(cancelledBooking as Booking);
    //   const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'; // Fallback for local dev
    //   const notifyResponse = await fetch(`${appUrl}/api/notify`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    //     body: JSON.stringify({ message: lineMessage, bookingType: undefined })
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
    //     console.error(`Cancel booking: Failed to send LINE notification for ${bookingId} via /api/notify:`, errorDetails);
    //   } else if (contentType && contentType.includes("application/json")) {
    //     console.log(`Cancel booking: LINE notification for ${bookingId} sent successfully via /api/notify.`);
    //   } else {
    //     const responseText = await notifyResponse.text();
    //     console.warn(`Cancel booking: LINE notification for ${bookingId} - /api/notify did not return JSON. Status: ${notifyResponse.status}. Response: ${responseText.substring(0,200)}...`);
    //   }
    // } catch (lineError) {
    //   console.error(`Cancel booking: Error sending LINE notification for ${bookingId}:`, lineError);
    // }
    
    return NextResponse.json({ 
      message: `Booking ${bookingId} cancelled successfully.`, 
      booking: cancelledBooking 
    }, { status: 200 });

  } catch (error: any) {
    console.error(`Cancel booking: Unexpected error for booking ${bookingId}:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred during cancellation.', details: error.message || String(error) }, { status: 500 });
  }
} 