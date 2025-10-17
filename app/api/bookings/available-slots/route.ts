import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Valid bay names - all 4 bays
const VALID_BAYS = [
  "Bay 1",
  "Bay 2",
  "Bay 3",
  "Bay 4"
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const bay = searchParams.get('bay');
    const duration = parseFloat(searchParams.get('duration') || '1');
    const startHour = parseInt(searchParams.get('startHour') || '10');
    const endHour = parseInt(searchParams.get('endHour') || '22');

    // Validate inputs
    if (!date || !bay || !VALID_BAYS.includes(bay)) {
      return NextResponse.json(
        { error: 'Invalid or missing parameters: date, bay (valid bay name), are required' },
        { status: 400 }
      );
    }

    if (duration <= 0 || duration > 12) {
      return NextResponse.json(
        { error: 'Duration must be between 0.5 and 12 hours' },
        { status: 400 }
      );
    }

    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23 || startHour >= endHour) {
      return NextResponse.json(
        { error: 'Invalid hour range: startHour and endHour must be between 0-23 and startHour < endHour' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
      process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get available slots using our Supabase function
    const { data: slots, error } = await supabase.rpc('get_available_slots', {
      p_date: date,
      p_bay: bay,
      p_duration: duration,
      p_start_hour: startHour,
      p_end_hour: endHour
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Error fetching available slots' },
        { status: 500 }
      );
    }

    // Return the slots data
    return NextResponse.json({ 
      slots: slots || [],
      date,
      bay,
      duration,
      startHour,
      endHour,
      totalSlots: (slots || []).length
    });

  } catch (error) {
    console.error('Error in /api/bookings/available-slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { date, bay, duration = 1, startHour = 10, endHour = 22 } = await request.json();

    // Validate inputs
    if (!date || !bay || !VALID_BAYS.includes(bay)) {
      return NextResponse.json(
        { error: 'Invalid or missing parameters: date, bay (valid bay name), are required' },
        { status: 400 }
      );
    }

    if (duration <= 0 || duration > 12) {
      return NextResponse.json(
        { error: 'Duration must be between 0.5 and 12 hours' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
      process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get available slots using our Supabase function
    const { data: slots, error } = await supabase.rpc('get_available_slots', {
      p_date: date,
      p_bay: bay,
      p_duration: duration,
      p_start_hour: startHour,
      p_end_hour: endHour
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Error fetching available slots' },
        { status: 500 }
      );
    }

    // Return the slots data
    return NextResponse.json({ 
      slots: slots || [],
      date,
      bay,
      duration,
      startHour,
      endHour,
      totalSlots: (slots || []).length
    });

  } catch (error) {
    console.error('Error in /api/bookings/available-slots:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 