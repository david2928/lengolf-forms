import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { DateTime } from 'luxon';
import type { Booking } from '@/types/booking';

/**
 * POST /api/bookings/[bookingId]/confirm-call
 *
 * Marks a booking as confirmed via phone call.
 * Sets phone_confirmed=true, phone_confirmed_at=NOW(), phone_confirmed_by=employee_name
 * Appends confirmation note to customer_notes
 *
 * Request body:
 * - employee_name: string (required) - Name of staff who made the call
 */

interface ConfirmCallPayload {
  employee_name: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const { bookingId } = await params;
  let payload: ConfirmCallPayload;

  console.log(`POST /api/bookings/${bookingId}/confirm-call called`);

  if (!bookingId) {
    console.warn('Confirm call: Booking ID missing');
    return NextResponse.json({ error: 'Booking ID is required in path' }, { status: 400 });
  }

  try {
    payload = await request.json();
    console.log('Confirm call payload:', payload);
  } catch (error) {
    console.error('Confirm call: Invalid JSON payload', error);
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  // Validate payload: employee_name is mandatory
  if (!payload.employee_name || typeof payload.employee_name !== 'string' || payload.employee_name.trim() === '') {
    console.warn('Confirm call: employee_name missing or invalid');
    return NextResponse.json(
      { error: 'employee_name is required and must be a non-empty string' },
      { status: 400 }
    );
  }

  const employeeName = payload.employee_name.trim();

  try {
    // 1. Fetch current booking to ensure it exists and is still 'confirmed'
    const { data: currentBookingUntyped, error: fetchError } = await refacSupabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (fetchError) {
      console.error(`Confirm call: Supabase error fetching booking ${bookingId}:`, fetchError);
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: `Booking with ID ${bookingId} not found.` }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'Failed to fetch booking details', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!currentBookingUntyped) {
      return NextResponse.json({ error: `Booking with ID ${bookingId} not found.` }, { status: 404 });
    }

    const currentBooking = currentBookingUntyped as Booking;
    console.log('Current booking state for confirmation:', currentBooking);

    // Check if booking is still in 'confirmed' status
    if (currentBooking.status === 'cancelled') {
      console.warn(`Booking ${bookingId} is cancelled. Cannot confirm via phone.`);
      return NextResponse.json(
        { error: 'Cannot confirm a cancelled booking' },
        { status: 400 }
      );
    }

    // Check if already phone confirmed
    if (currentBooking.phone_confirmed) {
      console.log(`Booking ${bookingId} is already phone confirmed.`);
      return NextResponse.json(
        {
          message: `Booking ${bookingId} is already confirmed via phone.`,
          booking: currentBooking
        },
        { status: 200 }
      );
    }

    // 2. Prepare confirmation timestamp
    const confirmationTimestamp = DateTime.now().setZone('Asia/Bangkok');
    const formattedTimestamp = confirmationTimestamp.toFormat('dd/MM/yyyy HH:mm');

    // 3. Prepare customer_notes update (append confirmation note)
    const confirmationNote = `[Confirmed via phone by ${employeeName} at ${formattedTimestamp}]`;
    const existingNotes = currentBooking.customer_notes || '';
    const updatedNotes = existingNotes
      ? `${existingNotes}\n${confirmationNote}`
      : confirmationNote;

    // 4. Update booking with phone confirmation details
    const updatePayload = {
      phone_confirmed: true,
      phone_confirmed_at: confirmationTimestamp.toISO(),
      phone_confirmed_by: employeeName,
      customer_notes: updatedNotes,
      updated_by_type: 'staff',
      updated_by_identifier: employeeName
    };

    const { data: updatedBooking, error: updateError } = await refacSupabaseAdmin
      .from('bookings')
      .update(updatePayload)
      .eq('id', bookingId)
      .select()
      .single();

    if (updateError) {
      console.error(`Confirm call: Supabase error updating booking ${bookingId}:`, updateError);
      return NextResponse.json(
        { error: 'Failed to update booking', details: updateError.message },
        { status: 500 }
      );
    }

    console.log(`Booking ${bookingId} successfully confirmed via phone by ${employeeName}`);

    // 5. Create booking history entry
    const historyEntry = {
      booking_id: bookingId,
      action_type: 'PHONE_CONFIRMATION',
      changed_by_type: 'staff',
      changed_by_identifier: employeeName,
      changes_summary: `Booking confirmed via phone call by ${employeeName}`,
      old_booking_snapshot: currentBooking,
      new_booking_snapshot: updatedBooking,
      notes: confirmationNote
    };

    try {
      const { error: historyError } = await refacSupabaseAdmin
        .from('booking_history')
        .insert(historyEntry);

      if (historyError) {
        console.error(`Confirm call: Failed to create booking history entry for ${bookingId}:`, historyError);
        // Non-critical error - continue with success response
      }
    } catch (historyCatchError) {
      console.error(`Confirm call: Unexpected error creating history entry for ${bookingId}:`, historyCatchError);
    }

    return NextResponse.json(
      {
        message: `Booking ${bookingId} confirmed via phone successfully.`,
        booking: updatedBooking
      },
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
    console.error(`Confirm call: Unexpected error for booking ${bookingId}:`, error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.', details: error.message || String(error) },
      { status: 500 }
    );
  }
}
