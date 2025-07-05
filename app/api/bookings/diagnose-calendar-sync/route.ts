import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getServiceAccountAuth } from '@/lib/google-auth';
import { getCalendarEventDetails } from '@/lib/google-calendar';

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();
    
    console.log(`Diagnosing calendar sync issues${bookingId ? ` for booking: ${bookingId}` : ' for all cancelled bookings with events'}`);

    let query = refacSupabaseAdmin
      .from('bookings')
      .select('id, name, status, bay, date, start_time, google_calendar_sync_status, calendar_events, created_at, cancelled_by_identifier')
      .eq('status', 'cancelled')
      .not('calendar_events', 'is', null);

    if (bookingId) {
      query = query.eq('id', bookingId);
    } else {
      query = query.limit(5); // Limit to 5 for testing
    }

    const { data: cancelledBookings, error: bookingError } = await query;

    if (bookingError) {
      console.error('Error fetching cancelled bookings:', bookingError);
      return NextResponse.json({ 
        error: 'Failed to fetch cancelled bookings', 
        details: bookingError.message 
      }, { status: 500 });
    }

    if (!cancelledBookings || cancelledBookings.length === 0) {
      return NextResponse.json({ 
        message: bookingId ? 'Booking not found or has no calendar events' : 'No cancelled bookings with calendar events found',
        bookings: []
      });
    }

    console.log(`Found ${cancelledBookings.length} cancelled bookings with calendar events`);

    // Check each booking's calendar events in Google Calendar
    const results = [];
    
    try {
      const auth = await getServiceAccountAuth();
      
      for (const booking of cancelledBookings) {
        const bookingResult = {
          bookingId: booking.id,
          customerName: booking.name,
          bay: booking.bay,
          date: booking.date,
          startTime: booking.start_time,
          syncStatus: booking.google_calendar_sync_status,
          cancelledBy: booking.cancelled_by_identifier,
          calendarEvents: [] as any[],
          issues: [] as string[]
        };

        if (booking.calendar_events && Array.isArray(booking.calendar_events)) {
          for (const event of booking.calendar_events) {
            try {
              console.log(`Checking event ${event.eventId} in calendar ${event.calendarId} for booking ${booking.id}`);
              const eventDetails = await getCalendarEventDetails(auth, event.calendarId, event.eventId);
              
              const eventResult = {
                eventId: event.eventId,
                calendarId: event.calendarId,
                existsInGoogle: !!eventDetails,
                googleStatus: eventDetails?.status || 'NOT_FOUND',
                summary: eventDetails?.summary || null,
                shouldBeDeleted: true // Since booking is cancelled
              };

              // Identify issues
              if (eventDetails) {
                if (eventDetails.status === 'confirmed') {
                  bookingResult.issues.push(`Event ${event.eventId} still exists and is CONFIRMED in Google Calendar`);
                } else if (eventDetails.status === 'cancelled') {
                  bookingResult.issues.push(`Event ${event.eventId} exists but is marked as CANCELLED in Google Calendar (should be deleted)`);
                }
              }

              bookingResult.calendarEvents.push(eventResult);
              
            } catch (error: any) {
              console.error(`Error checking event ${event.eventId}:`, error);
              bookingResult.calendarEvents.push({
                eventId: event.eventId,
                calendarId: event.calendarId,
                existsInGoogle: false,
                googleStatus: 'ERROR',
                error: error.message || String(error),
                shouldBeDeleted: true
              });
            }
          }
        }

        // Summary analysis
        (bookingResult as any).summary = {
          totalEvents: bookingResult.calendarEvents.length,
          eventsStillInGoogle: bookingResult.calendarEvents.filter(e => e.existsInGoogle).length,
          confirmedEvents: bookingResult.calendarEvents.filter(e => e.googleStatus === 'confirmed').length,
          cancelledEvents: bookingResult.calendarEvents.filter(e => e.googleStatus === 'cancelled').length,
          deletedEvents: bookingResult.calendarEvents.filter(e => e.googleStatus === 'NOT_FOUND').length,
          hasIssues: bookingResult.issues.length > 0
        };

        results.push(bookingResult);
      }
      
    } catch (authError) {
      console.error('Google auth error:', authError);
      return NextResponse.json({
        error: 'Failed to authenticate with Google Calendar',
        authError: authError instanceof Error ? authError.message : String(authError),
        bookings: cancelledBookings.map(b => ({ 
          bookingId: b.id, 
          syncStatus: b.google_calendar_sync_status,
          hasEvents: !!b.calendar_events 
        }))
      });
    }

    // Overall summary
    const overallSummary = {
      totalBookingsChecked: results.length,
      bookingsWithIssues: results.filter((r: any) => r.summary.hasIssues).length,
      totalEventsStillInGoogle: results.reduce((sum: number, r: any) => sum + r.summary.eventsStillInGoogle, 0),
      totalConfirmedEvents: results.reduce((sum: number, r: any) => sum + r.summary.confirmedEvents, 0),
      totalCancelledEvents: results.reduce((sum: number, r: any) => sum + r.summary.cancelledEvents, 0)
    };

    return NextResponse.json({
      overallSummary,
      results,
      recommendations: overallSummary.bookingsWithIssues > 0 ? [
        "Some cancelled bookings still have active Google Calendar events",
        "Consider running a cleanup process to delete these orphaned events",
        "Review the cancellation process to ensure proper event deletion"
      ] : [
        "All cancelled bookings have properly deleted Google Calendar events"
      ]
    });

  } catch (error) {
    console.error('Diagnosis error:', error);
    return NextResponse.json({ 
      error: 'Diagnosis failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 