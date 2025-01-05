import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { Booking } from '@/types/booking';

export async function POST(req: Request) {
  try {
    const booking: Booking = await req.json();

    // Create Supabase record
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single();

    if (bookingError) {
      throw new Error(`Database error: ${bookingError.message}`);
    }

    return NextResponse.json({ 
      success: true, 
      bookingId: bookingData.id
    });

  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create booking'
      },
      { status: 500 }
    );
  }
}