import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { format } from 'date-fns';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }

    // Query bookings table for bay blocks on the specified date
    const { data, error } = await refacSupabaseAdmin
      .from('bookings')
      .select('bay, customer_notes, start_time, duration, name')
      .eq('date', date)
      .eq('booking_type', 'Bay Block')
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error fetching blocked bays:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch blocked bays' },
        { status: 500 }
      );
    }

    // Transform the data into the expected format
    const blockedBays = (data || []).map((booking: any) => {
      // Parse the customer_notes to extract blocked by and reason
      const notes = booking.customer_notes || '';
      const blockedByMatch = notes.match(/Bay blocked by ([^:]+):/);
      const blockedBy = blockedByMatch ? blockedByMatch[1] : 'Unknown';
      
      // Extract reason from booking name (remove "BLOCKED - " prefix)
      const reason = booking.name?.replace('BLOCKED - ', '') || 'Unknown reason';
      
      // Calculate end time from start time and duration
      const startTime = booking.start_time;
      const duration = booking.duration || 1;
      const startHour = parseInt(startTime.split(':')[0]);
      const startMinute = parseInt(startTime.split(':')[1]);
      const endHour = Math.floor(startHour + duration);
      const endMinute = startMinute + ((duration % 1) * 60);
      const endTime = `${String(endHour).padStart(2, '0')}:${String(Math.floor(endMinute)).padStart(2, '0')}`;

      return {
        bay: booking.bay,
        reason: reason,
        startTime: startTime,
        endTime: endTime,
        blockedBy: blockedBy
      };
    });

    return NextResponse.json({
      success: true,
      blockedBays: blockedBays
    });

  } catch (error) {
    console.error('Blocked bays API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    );
  }
}