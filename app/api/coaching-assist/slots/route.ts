import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

/**
 * Get coaching slots structured by coach and date for LINE broadcasts
 * GET /api/coaching-assist/slots
 */
export async function GET(request: NextRequest) {
  // Allow internal server calls from cron jobs
  const internalSecret = request.headers.get('x-internal-secret');
  const isInternalCall = internalSecret === process.env.CRON_SECRET;

  // Check authentication for external calls
  if (!isInternalCall) {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || new Date().toISOString().split('T')[0];
    const toDate = searchParams.get('toDate') || (() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    })();

    // Fetch availability data
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/coaching-assist/availability?fromDate=${fromDate}&toDate=${toDate}`,
      { headers: { cookie: request.headers.get('cookie') || '' } }
    );

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    const data = await response.json();

    // Get coach names map
    const coachMap = new Map();
    if (data.availability_slots) {
      data.availability_slots.forEach((slot: any) => {
        coachMap.set(slot.coach_id, slot.coach_name);
      });
    }

    // Structure data by coach → date → slots
    const slotsByCoach = new Map<string, any>();

    if (data.weekly_availability) {
      Object.entries(data.weekly_availability).forEach(([date, coaches]: [string, any]) => {
        Object.entries(coaches).forEach(([coachId, schedule]: [string, any]) => {
          // Skip unavailable coaches
          if (schedule.status === 'unavailable') return;

          const coachName = coachMap.get(coachId) || 'Coach';

          if (!slotsByCoach.has(coachId)) {
            slotsByCoach.set(coachId, {
              coach_id: coachId,
              coach_name: coachName,
              dates: []
            });
          }

          // Only process if there are available or partially booked slots
          if (schedule.status === 'available' || schedule.status === 'partially_booked') {
            const startTime = schedule.start_time;
            const endTime = schedule.end_time;
            const bookedSlots = schedule.bookings || [];

            if (startTime && endTime) {
              const availableSlots: string[] = [];
              const [startHour] = startTime.split(':').map(Number);
              const [endHour] = endTime.split(':').map(Number);

              for (let hour = startHour; hour < endHour; hour++) {
                const timeStr = `${hour.toString().padStart(2, '0')}:00`;

                const isBooked = bookedSlots.some((booking: any) => {
                  const bookingHour = parseInt(booking.start_time.split(':')[0]);
                  return hour >= bookingHour && hour < bookingHour + booking.duration;
                });

                if (!isBooked) {
                  availableSlots.push(timeStr);
                }
              }

              if (availableSlots.length > 0) {
                slotsByCoach.get(coachId).dates.push({
                  date,
                  date_display: new Date(date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                  }),
                  slots: availableSlots
                });
              }
            }
          }
        });
      });
    }

    // Convert to array and sort
    const coaches = Array.from(slotsByCoach.values())
      .filter(coach => coach.dates.length > 0)
      .map(coach => ({
        ...coach,
        dates: coach.dates.sort((a: any, b: any) =>
          new Date(a.date).getTime() - new Date(b.date).getTime()
        )
      }));

    return NextResponse.json({
      success: true,
      coaches,
      date_range: { from: fromDate, to: toDate }
    });

  } catch (error) {
    console.error('Failed to fetch coaching slots:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
