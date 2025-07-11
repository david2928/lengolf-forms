import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { buildOptimizedTimeEntryQuery } from '@/lib/payroll-performance';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthYear = searchParams.get('month') || '2025-05';
    
    console.log(`🔍 Debug: Tracing daily hours calculation for ${monthYear}`);
    
    // Get time entries using the same method as calculateDailyHours
    const queryOptions = buildOptimizedTimeEntryQuery({ monthYear });
    
    const { data: timeEntries, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('id, staff_id, timestamp, action, photo_url')
      .gte('timestamp', queryOptions.filters.timestamp_gte)
      .lte('timestamp', queryOptions.filters.timestamp_lte)
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch time entries: ${error.message}`);
    }

    // Filter for Dolly only (staff_id = 9)
    const dollyEntries = (timeEntries || []).filter(entry => entry.staff_id === 9);
    
    // Manual daily hours calculation with detailed debugging
    const dailyGroups = new Map<string, any[]>();
    
    console.log(`Processing ${dollyEntries.length} Dolly entries...`);
    
    for (const entry of dollyEntries) {
      const entryDate = new Date(entry.timestamp);
      const dateStr = entryDate.toISOString().split('T')[0];
      const key = `${entry.staff_id}-${dateStr}`;
      
      if (!dailyGroups.has(key)) {
        dailyGroups.set(key, []);
      }
      dailyGroups.get(key)!.push(entry);
    }
    
    console.log(`Grouped into ${dailyGroups.size} days`);
    
    // Process each day with detailed debugging
    const debugDays = [];
    
    for (const [key, entries] of Array.from(dailyGroups.entries())) {
      const dashIndex = key.indexOf('-');
      const staffId = key.substring(0, dashIndex);
      const date = key.substring(dashIndex + 1);
      
      // Sort entries by timestamp
      entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Pair clock_in and clock_out entries with debugging
      const sessions = [];
      let clockInEntry = null;
      let totalHours = 0;
      let hasMissingClockout = false;
      let processingLog = [];

      for (const entry of entries) {
        if (entry.action === 'clock_in') {
          if (clockInEntry) {
            processingLog.push(`WARNING: Found clock_in without matching clock_out: ${clockInEntry.timestamp}`);
            hasMissingClockout = true;
          }
          clockInEntry = entry;
          processingLog.push(`Clock in: ${entry.timestamp}`);
        } else if (entry.action === 'clock_out' && clockInEntry) {
          const clockIn = new Date(clockInEntry.timestamp);
          const clockOut = new Date(entry.timestamp);
          
          const durationMs = clockOut.getTime() - clockIn.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          
          processingLog.push(`Clock out: ${entry.timestamp}, Duration: ${durationHours.toFixed(2)} hours`);
          
          // Only add positive duration hours
          if (durationHours > 0) {
            sessions.push({
              clock_in: clockInEntry.timestamp,
              clock_out: entry.timestamp,
              duration_hours: durationHours
            });
            
            totalHours += durationHours;
          } else {
            processingLog.push(`WARNING: Negative duration: ${durationHours}`);
          }
          
          clockInEntry = null;
        } else if (entry.action === 'clock_out' && !clockInEntry) {
          processingLog.push(`WARNING: Found clock_out without matching clock_in: ${entry.timestamp}`);
        }
      }

      // Check for missing clock-out
      if (clockInEntry) {
        hasMissingClockout = true;
        processingLog.push(`WARNING: Missing clock_out for clock_in: ${clockInEntry.timestamp}`);
      }

      debugDays.push({
        date,
        staff_id: parseInt(staffId),
        total_hours: totalHours,
        sessions_count: sessions.length,
        raw_entries_count: entries.length,
        has_missing_clockout: hasMissingClockout,
        processing_log: processingLog,
        raw_entries: entries.map(e => ({ timestamp: e.timestamp, action: e.action })),
        sessions: sessions
      });
    }
    
    // Summary stats
    const totalCalculatedHours = debugDays.reduce((sum, day) => sum + day.total_hours, 0);
    const totalSessions = debugDays.reduce((sum, day) => sum + day.sessions_count, 0);
    const daysWithIssues = debugDays.filter(day => day.has_missing_clockout || day.processing_log.some(log => log.includes('WARNING')));
    
    return NextResponse.json({
      debug: {
        monthYear,
        dollyEntriesFound: dollyEntries.length,
        daysGrouped: dailyGroups.size,
        totalCalculatedHours: totalCalculatedHours.toFixed(2),
        totalSessions,
        daysWithIssues: daysWithIssues.length,
        debugDays: debugDays.slice(0, 10), // First 10 days for detailed review
        allDaysCount: debugDays.length,
        summary: {
          expectedHours: '~212',
          actualHours: totalCalculatedHours.toFixed(2),
          difference: (212 - totalCalculatedHours).toFixed(2),
          possibleIssues: daysWithIssues.length > 0 ? daysWithIssues.map(d => d.date) : 'None detected'
        }
      }
    });
    
  } catch (error) {
    console.error('Daily hours debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    );
  }
} 