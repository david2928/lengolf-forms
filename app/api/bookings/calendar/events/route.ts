import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Valid bay names - only the 3 actual bays
const VALID_BAYS = [
  "Bay 1",
  "Bay 2", 
  "Bay 3"
];

// Helper function to calculate end time
function calculateEndTime(startTime: string, duration: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startMinutes = hours * 60 + minutes;
  const endMinutes = startMinutes + (duration * 60);
  const endHours = Math.floor(endMinutes / 60);
  const endMins = endMinutes % 60;
  
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

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

    // Get booking events from database
    const { data: bookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('date', date)
      .eq('bay', bayNumber)
      .eq('status', 'confirmed')
      .order('start_time');

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch calendar events'
      }, { status: 500 });
    }

    // Transform bookings to calendar event format
    const events = (bookings || []).map(booking => {
      const startTime = booking.start_time;
      const endTime = calculateEndTime(startTime, booking.duration);
      
      // Format as ISO datetime strings with Bangkok timezone
      const startDateTime = `${booking.date}T${startTime}:00.000+07:00`;
      const endDateTime = `${booking.date}T${endTime}:00.000+07:00`;

      return {
        id: booking.id,
        summary: `${booking.name} (${booking.number_of_people} people) - ${booking.bay}`,
        description: `Name: ${booking.name}\nContact: ${booking.phone_number}\nEmail: ${booking.email}\nPax: ${booking.number_of_people}\nBooking ID: ${booking.id}`,
        start: startDateTime,
        end: endDateTime,
        customer_name: booking.name,
        booking_type: 'Golf Simulator', // Default since not stored in DB
        package_name: undefined,
        number_of_pax: booking.number_of_people.toString(),
        color: undefined,
      };
    });

    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('Error in calendar events API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 