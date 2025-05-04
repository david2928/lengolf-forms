import { NextResponse } from 'next/server';
import { getServiceAccountAuth } from '@/lib/google-auth';
import { initializeCalendar, getBayAvailability } from '@/lib/google-calendar';
import { BAY_CALENDARS } from '@/lib/constants';
import type { BayName } from '@/lib/constants';
import { DateTime } from 'luxon';

export async function POST(request: Request) {
  try {
    const { bayNumber, date } = await request.json();

    // Validate inputs
    if (!bayNumber || !date || !BAY_CALENDARS[bayNumber as BayName]) {
      return NextResponse.json(
        { error: 'Invalid bay number or date' },
        { status: 400 }
      );
    }

    // Get authenticated client
    const auth = await getServiceAccountAuth();
    const calendar = initializeCalendar(auth);

    try {
      // Use the getBayAvailability function (renamed)
      // Note: getBayAvailability returns busy times, not all events.
      // Renaming the variable for clarity.
      const busyTimes = await getBayAvailability(calendar, bayNumber, date);
      
      return NextResponse.json({
        success: true,
        // Return busy times, the client can interpret these
        busyTimes: busyTimes 
      });
    } catch (error) {
      console.error('Error fetching bay availability:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch bay availability'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in bay availability API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 