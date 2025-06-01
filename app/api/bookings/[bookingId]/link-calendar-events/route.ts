import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase'; // Use refacSupabaseAdmin for bookings table

export async function PUT(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  const { bookingId } = params;
  const { calendar_events, google_calendar_sync_status } = await request.json();

  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
  }

  if (!calendar_events || !Array.isArray(calendar_events)) {
    return NextResponse.json({ error: 'Calendar events array is required and must be an array' }, { status: 400 });
  }

  // Basic validation for each calendar event object (only if array is not empty)
  if (calendar_events.length > 0) {
    for (const event of calendar_events) {
      if (!event.eventId || !event.calendarId || !event.status) {
        return NextResponse.json({ error: 'Each calendar event must have eventId, calendarId, and status' }, { status: 400 });
      }
    }
  }

  try {
    // Prepare update data
    const updateData: any = { calendar_events: calendar_events };
    
    // Add sync status if provided
    if (google_calendar_sync_status) {
      updateData.google_calendar_sync_status = google_calendar_sync_status;
    }

    const { data, error } = await refacSupabaseAdmin // Use refacSupabaseAdmin client
      .from('bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select();

    if (error) {
      console.error('Error updating booking with calendar events:', error);
      return NextResponse.json({ error: 'Failed to link calendar events', details: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Booking not found or no update was made' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Calendar events linked successfully', 
      booking: data[0],
      sync_status: google_calendar_sync_status || 'updated'
    }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error linking calendar events:', err);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 