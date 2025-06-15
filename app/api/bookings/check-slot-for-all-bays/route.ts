import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TIMEZONE = 'Asia/Bangkok';

// Define the 3 actual bays
const ALL_BAYS = [
  "Bay 1",
  "Bay 2",
  "Bay 3"
];

export async function POST(request: Request) {
  try {
    const { date, start_time, duration, bookingIdToExclude } = await request.json();

    if (!date || !start_time || typeof duration !== 'number' || duration <= 0) {
      return NextResponse.json({ error: 'Missing or invalid parameters: date, start_time, and duration (number, >0) are required.' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
      process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
    );

    // Convert duration from minutes to hours for Supabase function
    const durationHours = duration / 60;

    const availabilityResults = [];

    for (const bay of ALL_BAYS) {
      try {
        // Check availability using our Supabase function
        const { data: isAvailable, error } = await supabase.rpc('check_availability', {
          p_date: date,
          p_bay: bay,
          p_start_time: start_time,
          p_duration: durationHours,
          p_exclude_booking_id: bookingIdToExclude || null
        });

        if (error) {
          console.error(`Supabase error for ${bay}:`, error);
          // If Supabase fails for a bay, assume it's not available to be safe
          availabilityResults.push({
            name: bay,
            apiName: bay,
            isAvailable: false,
          });
        } else {
          availabilityResults.push({
            name: bay,
            apiName: bay,
            isAvailable: isAvailable,
          });
        }
      } catch (e: any) {
        console.error(`Error checking availability for ${bay}:`, e.message);
        // If there's an error, assume not available to be safe
        availabilityResults.push({
          name: bay,
          apiName: bay,
          isAvailable: false,
        });
      }
    }

    return NextResponse.json(availabilityResults);

  } catch (error: any) {
    console.error('Error in /api/bookings/check-slot-for-all-bays:', error);
    return NextResponse.json(
      { error: 'Failed to check slot availability for all bays', details: error.message },
      { status: 500 }
    );
  }
} 