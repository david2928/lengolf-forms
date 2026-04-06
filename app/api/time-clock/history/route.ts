import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { DateTime } from 'luxon';
import { timeClockRateLimit } from '@/lib/rate-limiter';

export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/history?staff_id=123
 * Returns today's time entries + scheduled shift for a staff member.
 * Called after successful punch to show clock history.
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limit to prevent enumeration
    const rateLimitResult = timeClockRateLimit(request);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ success: false, message: 'Too many requests' }, { status: 429 });
    }

    const staffId = request.nextUrl.searchParams.get('staff_id');
    if (!staffId) {
      return NextResponse.json({ success: false, message: 'staff_id is required' }, { status: 400 });
    }

    const staffIdNum = parseInt(staffId, 10);
    if (isNaN(staffIdNum) || staffIdNum <= 0) {
      return NextResponse.json({ success: false, message: 'Invalid staff_id' }, { status: 400 });
    }

    const todayDt = DateTime.now().setZone('Asia/Bangkok');
    const today = todayDt.toFormat('yyyy-MM-dd');
    const tomorrow = todayDt.plus({ days: 1 }).toFormat('yyyy-MM-dd');

    // Fetch today's time entries and scheduled shift in parallel
    const [entriesResult, scheduleResult] = await Promise.all([
      refacSupabaseAdmin
        .schema('backoffice')
        .from('time_entries')
        .select('id, action, timestamp, photo_captured')
        .eq('staff_id', staffIdNum)
        .gte('timestamp', `${today}T00:00:00+07:00`)
        .lt('timestamp', `${tomorrow}T00:00:00+07:00`)
        .order('timestamp', { ascending: true }),
      refacSupabaseAdmin
        .schema('backoffice')
        .from('staff_schedules')
        .select('start_time, end_time, location')
        .eq('staff_id', staffIdNum)
        .eq('schedule_date', today)
        .limit(1)
    ]);

    if (entriesResult.error) {
      console.error('Error fetching time entries:', entriesResult.error);
      return NextResponse.json({ success: false, message: 'Failed to fetch entries' }, { status: 500 });
    }

    // Format entries with Bangkok time
    const entries = (entriesResult.data || []).map((entry: { id: number; action: string; timestamp: string; photo_captured: boolean }) => ({
      id: entry.id,
      action: entry.action,
      time: DateTime.fromISO(entry.timestamp).setZone('Asia/Bangkok').toFormat('h:mm a'),
      timestamp: entry.timestamp,
    }));

    // Pair entries into shifts
    const shifts: { clock_in: string; clock_out: string | null; hours: number | null }[] = [];
    let i = 0;
    while (i < entries.length) {
      if (entries[i].action === 'clock_in') {
        const clockIn = entries[i];
        const clockOut = (i + 1 < entries.length && entries[i + 1].action === 'clock_out')
          ? entries[i + 1]
          : null;

        const hours = clockOut
          ? Math.round(
              (DateTime.fromISO(clockOut.timestamp).toMillis() - DateTime.fromISO(clockIn.timestamp).toMillis())
              / 3600000 * 100
            ) / 100
          : null;

        shifts.push({
          clock_in: clockIn.time,
          clock_out: clockOut?.time || null,
          hours,
        });
        i += clockOut ? 2 : 1;
      } else {
        // Orphan clock_out (no matching clock_in)
        shifts.push({
          clock_in: '?',
          clock_out: entries[i].time,
          hours: null,
        });
        i++;
      }
    }

    // Calculate total hours worked today
    const totalHours = shifts.reduce((sum, s) => sum + (s.hours || 0), 0);

    // Get scheduled shift info
    const scheduledShift = scheduleResult.data?.[0] || null;
    let scheduledHours: number | null = null;
    if (scheduledShift) {
      const [startH, startM] = scheduledShift.start_time.split(':').map(Number);
      const [endH, endM] = scheduledShift.end_time.split(':').map(Number);
      let totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (totalMinutes < 0) totalMinutes += 24 * 60;
      scheduledHours = Math.round(totalMinutes / 60 * 100) / 100;
    }

    return NextResponse.json({
      success: true,
      date: today,
      entries,
      shifts,
      total_hours: Math.round(totalHours * 100) / 100,
      scheduled_shift: scheduledShift ? {
        start_time: scheduledShift.start_time,
        end_time: scheduledShift.end_time,
        location: scheduledShift.location,
        scheduled_hours: scheduledHours,
      } : null,
    });
  } catch (error) {
    console.error('Error in GET /api/time-clock/history:', error);
    return NextResponse.json({ success: false, message: 'System error' }, { status: 500 });
  }
}
