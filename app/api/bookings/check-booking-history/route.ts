import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json();
    
    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId is required' }, { status: 400 });
    }

    console.log(`Checking booking history for: ${bookingId}`);

    // Get booking history
    const { data: history, error: historyError } = await refacSupabaseAdmin
      .from('booking_history')
      .select('*')
      .eq('booking_id', bookingId)
      .order('timestamp', { ascending: true });

    if (historyError) {
      console.error('Error fetching booking history:', historyError);
      return NextResponse.json({ 
        error: 'Failed to fetch booking history', 
        details: historyError.message 
      }, { status: 500 });
    }

    // Get current booking state
    const { data: currentBooking, error: bookingError } = await refacSupabaseAdmin
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError) {
      console.error('Error fetching current booking:', bookingError);
      return NextResponse.json({ 
        error: 'Failed to fetch current booking', 
        details: bookingError.message 
      }, { status: 500 });
    }

    // Analyze the history to understand the timeline
    const analysis = {
      totalHistoryEntries: history.length,
      actionTypes: history.map(h => h.action_type),
      timeline: history.map(h => ({
        timestamp: h.created_at,
        action: h.action_type,
        changedBy: h.changed_by_identifier,
        changesSummary: h.changes_summary,
        notes: h.notes,
        hadCalendarEvents: h.old_booking_snapshot?.calendar_events ? h.old_booking_snapshot.calendar_events.length > 0 : false,
        calendarEventsAfter: h.new_booking_snapshot?.calendar_events ? h.new_booking_snapshot.calendar_events.length > 0 : false
      }))
    };

    return NextResponse.json({
      bookingId,
      currentBooking,
      history,
      analysis
    });

  } catch (error) {
    console.error('History check error:', error);
    return NextResponse.json({ 
      error: 'History check failed', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 