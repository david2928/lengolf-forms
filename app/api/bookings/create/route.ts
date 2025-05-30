import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { Booking } from '@/types/booking';

export async function POST(req: Request) {
  try {
    const bookingDataForDb: Booking = await req.json();

    console.log('Received booking data for insertion:', bookingDataForDb);

    if (!bookingDataForDb.id || !bookingDataForDb.user_id || !bookingDataForDb.name || !bookingDataForDb.email || !bookingDataForDb.phone_number || !bookingDataForDb.date || !bookingDataForDb.start_time || !bookingDataForDb.duration || !bookingDataForDb.number_of_people || !bookingDataForDb.status) {
      console.error('Validation Error: Missing required fields in booking data', bookingDataForDb);
      return NextResponse.json(
        { success: false, error: 'Missing required booking fields.' },
        { status: 400 }
      );
    }

    const { data: insertedData, error: insertError } = await refacSupabaseAdmin
      .from('bookings')
      .insert(bookingDataForDb)
      .select()
      .single();

    if (insertError) {
      console.error('Supabase insert error:', insertError);
      throw new Error(`Database insert error: ${insertError.message} (Code: ${insertError.code})`);
    }

    if (!insertedData) {
        console.error('Insert operation completed without error, but no data was returned.');
        throw new Error('Database insert failed: No data returned after insert.');
    }

    console.log('Successfully inserted booking with ID:', insertedData.id);

    return NextResponse.json({ 
      success: true, 
      bookingId: insertedData.id
    });

  } catch (error) {
    console.error('Booking creation API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during booking creation.';
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: error instanceof Error && error.message.startsWith('Validation Error') ? 400 : 500 }
    );
  }
}