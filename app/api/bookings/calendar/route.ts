import { NextResponse } from 'next/server';
import { getServiceAccountAuth } from '@/lib/google-auth';
import { createCalendarEvents, initializeCalendar } from '@/lib/google-calendar';
import type { CalendarEventResult } from '@/lib/google-calendar';

interface CalendarRequest {
  operation: 'create' | 'update' | 'delete';
  booking: any;
  eventId?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CalendarRequest;
    console.log('Calendar request body:', body);

    const auth = await getServiceAccountAuth();
    const calendar = initializeCalendar(auth);

    let result;
    switch (body.operation) {
      case 'create':
        result = await createCalendarEvents(calendar, body.booking);
        console.log('Calendar events created:', result);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result
    });
    
  } catch (error) {
    console.error('Calendar operation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}