import { NextResponse } from 'next/server';
import { refacSupabase } from '@/lib/refac-supabase'; // Assuming this is the correct path to the client initialized with Anon key

export async function POST(request: Request) {
  console.warn("DEPRECATION WARNING: The endpoint POST /api/bookings/update-calendar-id is deprecated. Please use PUT /api/bookings/{bookingId}/link-calendar-events instead.");
  try {
    const body = await request.json();
    const { bookingId, eventId } = body;

    if (!bookingId || !eventId) {
      return NextResponse.json(
        { success: false, error: 'Missing bookingId or eventId' },
        { status: 400 }
      );
    }

    console.log(`Attempting to update booking ${bookingId} with eventId ${eventId}`);

    // Use the existing refacSupabase client (Anon Key) as per user confirmation (no RLS assumed)
    const { data, error } = await refacSupabase
      .from('bookings')
      .update({ calendar_event_id: eventId })
      .eq('id', bookingId)
      .select('id') // Select something to confirm update happened on a row
      .single(); // Expect only one row to be updated

    if (error) {
      console.error(`Supabase update error for booking ${bookingId}:`, error);
      // Consider more specific error checking if needed (e.g., row not found vs. other DB errors)
      return NextResponse.json(
        { success: false, error: `Failed to update booking: ${error.message}` },
        { status: 500 }
      );
    }
    
    if (!data) {
         console.error(`Supabase update failed for booking ${bookingId}: No data returned, row likely not found.`);
         return NextResponse.json(
             { success: false, error: `Failed to update booking: Row not found or no change needed.` },
             { status: 404 } // Or 500 depending on how you want to treat this
         );
    }

    console.log(`Successfully updated booking ${bookingId} with eventId ${eventId}. Result data:`, data);
    return NextResponse.json({ success: true, updatedBookingId: data.id });

  } catch (error) {
    console.error('Error in /api/bookings/update-calendar-id:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown server error' },
      { status: 500 }
    );
  }
} 