import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { DateTime } from 'luxon';
import { getServiceAccountAuth } from '@/lib/google-auth';

// Bay calendar IDs
const BAY_CALENDARS = {
  "Bay 1 (Bar)": "a6234ae4e57933edb48a264fff4c5d3d3653f7bedce12cfd9a707c6c0ff092e4@group.calendar.google.com",
  "Bay 2": "3a700346dd902abd4aa448ee63e184a62f05d38bb39cb19a8fc27116c6df3233@group.calendar.google.com",
  "Bay 3 (Entrance)": "092757d971c313c2986b43f4c8552382a7e273b183722a44a1c4e1a396568ca3@group.calendar.google.com"
} as const;

export async function POST(request: Request) {
  try {
    const { bayNumber, date } = await request.json();

    // Validate inputs
    if (!bayNumber || !date || !BAY_CALENDARS[bayNumber as keyof typeof BAY_CALENDARS]) {
      return NextResponse.json(
        { error: 'Invalid bay number or date' },
        { status: 400 }
      );
    }

    // Get calendar ID
    const calendarId = BAY_CALENDARS[bayNumber as keyof typeof BAY_CALENDARS];

    // Get authenticated client
    const auth = await getServiceAccountAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    // Set up time range for the specified date (in Bangkok timezone)
    const startOfDay = DateTime.fromISO(`${date}T00:00:00`, { zone: 'Asia/Bangkok' }).toUTC().toISO();
    const endOfDay = DateTime.fromISO(`${date}T23:59:59`, { zone: 'Asia/Bangkok' }).toUTC().toISO();

    // Query free/busy information
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startOfDay,
        timeMax: endOfDay,
        items: [{ id: calendarId }],
      },
    });

    // Extract busy times
    const busyTimes = response.data.calendars?.[calendarId]?.busy || [];

    // Convert times back to Bangkok timezone
    const formattedBusyTimes = busyTimes.map(time => ({
      start: DateTime.fromISO(time.start as string).setZone('Asia/Bangkok').toISO(),
      end: DateTime.fromISO(time.end as string).setZone('Asia/Bangkok').toISO(),
    }));

    return NextResponse.json({ busyTimes: formattedBusyTimes });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Error checking availability' },
      { status: 500 }
    );
  }
}
