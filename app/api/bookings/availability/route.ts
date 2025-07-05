import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Valid bay names - only the 3 actual bays
const VALID_BAYS = [
  "Bay 1",
  "Bay 2", 
  "Bay 3"
];

export async function POST(request: Request) {
  try {
    const { bayNumber, date } = await request.json();

    // Validate inputs
    if (!bayNumber || !date || !VALID_BAYS.includes(bayNumber)) {
      return NextResponse.json(
        { error: 'Invalid bay number or date' },
        { status: 400 }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
      process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get busy times directly using the bay name from database
    const { data: busyTimes, error } = await supabase.rpc('get_busy_times_gcal_format', {
      p_date: date,
      p_bay_api_name: bayNumber  // Now just pass the bay name directly
    });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Error checking availability' },
        { status: 500 }
      );
    }

    // Return in the same format as before
    return NextResponse.json({ busyTimes: busyTimes || [] });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Error checking availability' },
      { status: 500 }
    );
  }
}
