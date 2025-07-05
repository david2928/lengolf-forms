import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getServiceAccountAuth } from '@/lib/google-auth';
import { initializeCalendar, getCalendarEventDetails } from '@/lib/google-calendar';

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();
    
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    console.log(`Investigating booking: ${bookingId}`);

    // 1. Get booking details from database
    const { data: booking, error: bookingError } = await refacSupabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching booking:', bookingError);
      return NextResponse.json({ 
        error: 'Failed to fetch booking', 
        details: bookingError.message 
      }, { status: 500 });
    }

    if (!booking) {
      return NextResponse.json({ 
        error: 'Booking not found' 
      }, { status: 404 });
    }

    console.log('Booking data:', booking);

    // 2. Check Google Calendar events if they exist in the booking
    let calendarEventStatuses = [];
    
    if (booking.calendar_events && booking.calendar_events.length > 0) {
      try {
        const auth = await getServiceAccountAuth();
        const calendar = initializeCalendar(auth);
        
        for (const event of booking.calendar_events) {
          try {
            console.log(`Checking event ${event.eventId} in calendar ${event.calendarId}`);
            const eventDetails = await getCalendarEventDetails(auth, event.calendarId, event.eventId);
            
            calendarEventStatuses.push({
              eventId: event.eventId,
              calendarId: event.calendarId,
              exists: !!eventDetails,
              status: eventDetails?.status || 'NOT_FOUND',
              summary: eventDetails?.summary || null,
              description: eventDetails?.description || null
            });
            
          } catch (error: any) {
            calendarEventStatuses.push({
              eventId: event.eventId,
              calendarId: event.calendarId,
              exists: false,
              status: 'ERROR',
              error: error.message || String(error)
            });
          }
        }
        
      } catch (authError) {
        console.error('Google auth error:', authError);
        return NextResponse.json({
          booking,
          calendarEventStatuses: [],
          error: 'Failed to authenticate with Google Calendar',
          authError: authError instanceof Error ? authError.message : String(authError)
        });
      }
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        customer_name: booking.customer_name,
        status: booking.status,
        bay_id: booking.bay_id,
        start_time: booking.start_time,
        end_time: booking.end_time,
        calendar_events: booking.calendar_events,
        google_calendar_sync_status: booking.google_calendar_sync_status,
        created_at: booking.created_at,
        cancelled_at: booking.cancelled_at,
        cancelled_by_type: booking.cancelled_by_type,
        cancelled_by_identifier: booking.cancelled_by_identifier,
        cancellation_reason: booking.cancellation_reason
      },
      calendarEventStatuses,
      analysis: {
        bookingCancelled: booking.status === 'cancelled',
        hasCalendarEvents: booking.calendar_events && booking.calendar_events.length > 0,
        eventsStillExistInGoogle: calendarEventStatuses.some(e => e.exists && e.status !== 'cancelled'),
        eventsCancelledInGoogle: calendarEventStatuses.filter(e => e.status === 'cancelled').length,
        eventsDeletedFromGoogle: calendarEventStatuses.filter(e => !e.exists || e.status === 'NOT_FOUND').length
      }
    });

  } catch (error) {
    console.error('Investigation error:', error);
    return NextResponse.json({ 
      error: 'Investigation failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 