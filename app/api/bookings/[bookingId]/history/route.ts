import { NextRequest, NextResponse } from 'next/server';
import { refacSupabase } from '@/lib/refac-supabase';

interface BookingHistoryEntry {
  history_id: string;
  booking_id: string;
  changed_at: string;
  action_type: string;
  changed_by_type: string | null;
  changed_by_identifier: string | null;
  changes_summary: string | null;
  // old_booking_snapshot: any; // Consider if needed for this view, can be large
  // new_booking_snapshot: any; // Consider if needed for this view, can be large
  notes: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  const { bookingId } = params;

  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
  }

  try {
    const { data, error } = await refacSupabase
      .from('booking_history')
      .select(
        'history_id, booking_id, changed_at, action_type, changed_by_type, changed_by_identifier, changes_summary, notes'
      )
      .eq('booking_id', bookingId)
      .order('changed_at', { ascending: false });

    if (error) {
      console.error(`Error fetching booking history for ${bookingId}:`, error);
      return NextResponse.json(
        { error: 'Failed to fetch booking history', details: error.message },
        { status: 500 }
      );
    }

    const history: BookingHistoryEntry[] = data || [];

    return NextResponse.json({ history });

  } catch (e: any) {
    console.error(
      `Unexpected error in GET /api/bookings/${bookingId}/history:`, e
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: e.message },
      { status: 500 }
    );
  }
} 