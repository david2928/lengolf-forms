import { NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { getServiceAccountAuth } from '@/lib/google-auth';
import { initializeCalendar } from '@/lib/google-calendar';
import { BAY_CALENDARS } from '@/lib/constants';
import { format, addDays, parse, addHours } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import type { calendar_v3 } from 'googleapis';

const TIMEZONE = 'Asia/Bangkok';
const SYNC_PERIOD_DAYS = 14; // Sync 2 weeks ahead

interface SyncResult {
  success: boolean;
  message: string;
  stats: {
    bays_processed: number;
    events_created: number;
    events_updated: number;
    events_deleted: number;
    errors: number;
  };
  errors?: string[];
}

interface DayBusyTimes {
  date: string; // YYYY-MM-DD
  consolidatedBusyPeriods: BusyTimeBlock[];
}

interface BusyTimeBlock {
  start: string; // ISO string
  end: string;   // ISO string
  summary: string;
}

export async function POST() {
  console.log('🗓️ Starting calendar sync job...');
  const startTime = Date.now();
  
  try {
    // Initialize Google Calendar
    const auth = await getServiceAccountAuth();
    const calendar = initializeCalendar(auth);
    
    const syncResult: SyncResult = {
      success: false,
      message: '',
      stats: {
        bays_processed: 0,
        events_created: 0,
        events_updated: 0,
        events_deleted: 0,
        errors: 0
      },
      errors: []
    };

    // Define sync date range (today + next 14 days)
    const today = new Date();
    const endDate = addDays(today, SYNC_PERIOD_DAYS);
    const startDateStr = format(today, 'yyyy-MM-dd');
    const endDateStr = format(endDate, 'yyyy-MM-dd');
    
    console.log(`📅 Syncing bookings from ${startDateStr} to ${endDateStr}`);

    // Get all confirmed bookings in the sync period
    const { data: bookings, error: bookingsError } = await refacSupabaseAdmin
      .from('bookings')
      .select('*')
      .eq('status', 'confirmed')
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true });

    if (bookingsError) {
      throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
    }

    console.log(`📋 Found ${bookings?.length || 0} confirmed bookings to sync`);

    // Group bookings by bay calendar and date
    const bayCalendarData: Record<string, DayBusyTimes[]> = {};

    // Group bookings by bay and date first
    const bookingsByBayAndDate: Record<string, Record<string, any[]>> = {};
    
    for (const booking of bookings || []) {
      try {
        if (booking.bay) {
          const bayCalendarId = getBayCalendarId(booking.bay);
          if (bayCalendarId) {
            if (!bookingsByBayAndDate[bayCalendarId]) {
              bookingsByBayAndDate[bayCalendarId] = {};
            }
            if (!bookingsByBayAndDate[bayCalendarId][booking.date]) {
              bookingsByBayAndDate[bayCalendarId][booking.date] = [];
            }
            bookingsByBayAndDate[bayCalendarId][booking.date].push(booking);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing booking ${booking.id}:`, error);
        syncResult.stats.errors++;
        syncResult.errors?.push(`Booking ${booking.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Calculate consolidated busy periods for each bay and date
    for (const [bayCalendarId, dateBookings] of Object.entries(bookingsByBayAndDate)) {
      bayCalendarData[bayCalendarId] = [];
      
      for (const [date, dayBookings] of Object.entries(dateBookings)) {
        try {
          const consolidatedPeriods = calculateConsolidatedBusyPeriods(dayBookings, date);
          bayCalendarData[bayCalendarId].push({
            date,
            consolidatedBusyPeriods: consolidatedPeriods
          });
        } catch (error) {
          console.error(`❌ Error calculating busy periods for ${date}:`, error);
          syncResult.stats.errors++;
          syncResult.errors?.push(`Date ${date}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Sync bay calendars
    for (const [calendarId, dayBusyTimes] of Object.entries(bayCalendarData)) {
      try {
        await syncCalendarDayBusyTimes(calendar, calendarId, dayBusyTimes);
        syncResult.stats.bays_processed++;
        console.log(`✅ Synced ${dayBusyTimes.length} days to bay calendar ${calendarId.substring(0, 20)}...`);
      } catch (error) {
        console.error(`❌ Error syncing bay calendar ${calendarId}:`, error);
        syncResult.stats.errors++;
        syncResult.errors?.push(`Bay calendar ${calendarId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Note: Coaching calendars are not synced since bookings are still created for those

    const duration = Date.now() - startTime;
    const totalCalendars = syncResult.stats.bays_processed;
    
    syncResult.success = syncResult.stats.errors === 0;
    syncResult.message = syncResult.success 
      ? `Successfully synced ${totalCalendars} calendars in ${duration}ms`
      : `Completed with ${syncResult.stats.errors} errors in ${duration}ms`;

    console.log(`🎯 Calendar sync completed: ${syncResult.message}`);
    
    return NextResponse.json(syncResult);

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ Calendar sync failed:', error);
    
    return NextResponse.json({
      success: false,
      message: `Calendar sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      stats: {
        bays_processed: 0,
        events_created: 0,
        events_updated: 0,
        events_deleted: 0,
        errors: 1
      },
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      duration
    }, { status: 500 });
  }
}



function getBayCalendarId(bay: string): string | null {
  // Map simple bay names to calendar keys
  const bayMapping: Record<string, keyof typeof BAY_CALENDARS> = {
    'Bay 1': 'Bay 1 (Bar)',
    'Bay 2': 'Bay 2', 
    'Bay 3': 'Bay 3 (Entrance)'
  };
  
  const calendarKey = bayMapping[bay];
  return calendarKey ? BAY_CALENDARS[calendarKey] : null;
}

function calculateConsolidatedBusyPeriods(bookings: any[], date: string): BusyTimeBlock[] {
  if (bookings.length === 0) return [];
  
  // Convert bookings to time periods and sort by start time
  const timePeriods = bookings.map(booking => {
    const startDateTimeStr = `${booking.date}T${booking.start_time}:00`;
    const localParsedDate = parse(startDateTimeStr, "yyyy-MM-dd'T'HH:mm:ss", new Date());
    const startDateTimeUTC = fromZonedTime(localParsedDate, TIMEZONE);
    const endDateTimeUTC = addHours(startDateTimeUTC, booking.duration);

    return {
      start: formatInTimeZone(startDateTimeUTC, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      end: formatInTimeZone(endDateTimeUTC, TIMEZONE, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      summary: "BUSY"
    };
  }).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  
  // Merge overlapping and adjacent periods
  const consolidated: BusyTimeBlock[] = [];
  let current = { ...timePeriods[0] };
  
  for (let i = 1; i < timePeriods.length; i++) {
    const next = timePeriods[i];
    const currentEnd = new Date(current.end);
    const nextStart = new Date(next.start);
    
    // Check if current period overlaps or is adjacent to next period
    if (currentEnd >= nextStart) {
      // Merge periods - extend current end time if next ends later
      const nextEnd = new Date(next.end);
      if (nextEnd > currentEnd) {
        current.end = next.end;
      }
    } else {
      // No overlap/adjacency - save current period and start new one
      consolidated.push(current);
      current = { ...next };
    }
  }
  
  // Add the last period
  consolidated.push(current);
  
  return consolidated;
}

async function syncCalendarDayBusyTimes(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  dayBusyTimes: DayBusyTimes[]
): Promise<void> {
  
  for (const dayData of dayBusyTimes) {
    try {
      console.log(`🗓️ Processing ${dayData.date} with ${dayData.consolidatedBusyPeriods.length} consolidated busy periods...`);
      
      // Define day boundaries
      const dayStart = formatInTimeZone(
        fromZonedTime(parse(`${dayData.date}T00:00:00`, "yyyy-MM-dd'T'HH:mm:ss", new Date()), TIMEZONE), 
        TIMEZONE, 
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      );
      const dayEnd = formatInTimeZone(
        fromZonedTime(parse(`${dayData.date}T23:59:59`, "yyyy-MM-dd'T'HH:mm:ss", new Date()), TIMEZONE), 
        TIMEZONE, 
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      );

      // Get all existing BUSY events for this day
      const existingEventsResponse = await calendar.events.list({
        calendarId,
        timeMin: dayStart,
        timeMax: dayEnd,
        singleEvents: true,
        q: 'BUSY', // Search for our busy time markers
        maxResults: 1000
      });

      const existingEvents = existingEventsResponse.data.items || [];
      console.log(`📋 Found ${existingEvents.length} existing busy entries for ${dayData.date}`);

      // Delete all existing BUSY events for this day
      for (const event of existingEvents) {
        try {
          await calendar.events.delete({
            calendarId,
            eventId: event.id!
          });
          console.log(`🗑️ Deleted existing busy entry: ${event.id}`);
        } catch (error) {
          console.error(`❌ Error deleting event ${event.id}:`, error);
          // Continue with other deletions
        }
      }

      // Create new consolidated busy time periods for this day
      for (const busyPeriod of dayData.consolidatedBusyPeriods) {
        try {
          await calendar.events.insert({
            calendarId,
            requestBody: {
              summary: busyPeriod.summary,
              description: `Auto-generated busy time for ${dayData.date}`,
              start: { dateTime: busyPeriod.start, timeZone: TIMEZONE },
              end: { dateTime: busyPeriod.end, timeZone: TIMEZONE },
              transparency: 'opaque', // Shows as busy
              visibility: 'private'
            }
          });
          console.log(`➕ Created consolidated busy period: ${busyPeriod.start} - ${busyPeriod.end}`);
        } catch (error) {
          console.error(`❌ Error creating busy period:`, error);
          throw error;
        }
      }
      
      console.log(`✅ Completed sync for ${dayData.date}`);
      
    } catch (error) {
      console.error(`❌ Error processing day ${dayData.date}:`, error);
      throw error;
    }
  }
}

// GET method for manual triggering and status check
export async function GET() {
  return NextResponse.json({
    message: 'Calendar Sync Service',
    status: 'ready',
    description: 'POST to this endpoint to trigger calendar synchronization',
    sync_period_days: SYNC_PERIOD_DAYS,
    timezone: TIMEZONE
  });
} 