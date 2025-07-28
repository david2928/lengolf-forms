import { NextRequest, NextResponse } from 'next/server';
import { calculateWeeklyHours, calculateDailyHours } from '@/lib/payroll-calculations';

export const dynamic = 'force-dynamic';

// Test getWeekStart function
function getWeekStart(date: Date): string {
  const d = new Date(date.getTime()); // Create a proper copy to avoid mutation
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  d.setDate(d.getDate() - day); // Subtract the day number to get to Sunday
  return d.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const month = searchParams.get('month') || '2025-05';
    
    console.log(`Debug: Calculating weekly hours for ${month}`);
    
    // Get daily hours first
    const dailyHours = await calculateDailyHours(month);
    console.log(`Debug: Found ${dailyHours.length} daily hour records`);
    
    // First, let's see what staff IDs exist
    const uniqueStaffIds = Array.from(new Set(dailyHours.map((d: any) => d.staff_id)));
    console.log(`Debug: Found staff IDs: ${uniqueStaffIds.join(', ')}`);
    
    // Let's also check what staff names we have in the system
    const { refacSupabaseAdmin } = await import('@/lib/refac-supabase');
    const { data: allStaff } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, is_active')
      .eq('is_active', true);
    
    console.log('All active staff:', allStaff);
    
    // Find Dolly's actual staff_id
    const dollyStaff = allStaff?.find((s: any) => s.staff_name?.toLowerCase().includes('dolly'));
    console.log('Found Dolly staff record:', dollyStaff);
    
    const dollyStaffId = dollyStaff?.id;
    
    // Find Dolly's records using her actual staff_id
    const dollyRecords = dollyStaffId ? dailyHours.filter((d: any) => d.staff_id === dollyStaffId) : [];
    console.log(`Debug: Found ${dollyRecords.length} records for Dolly (staff_id: ${dollyStaffId})`);
    
    // Group Dolly's records by week
    const weeklyGroups = new Map<string, typeof dollyRecords>();
    
    if (dollyStaffId) {
      for (const daily of dollyRecords) {
        // Parse date properly - daily.date should be in 'YYYY-MM-DD' format
        const date = new Date(daily.date + 'T12:00:00'); // Add time to avoid timezone issues
        const weekStart = getWeekStart(date);
        const key = `${daily.staff_id}-${weekStart}`;
        
        console.log(`Date: ${daily.date}, Parsed: ${date.toISOString()}, Week start: ${weekStart}`);
        
        if (!weeklyGroups.has(key)) {
          weeklyGroups.set(key, []);
        }
        weeklyGroups.get(key)!.push(daily);
      }
    }
    
    console.log(`Debug: Grouped into ${weeklyGroups.size} weeks`);
    
    const weeklyBreakdown = [];
    for (const [key, days] of Array.from(weeklyGroups.entries())) {
      const dashIndex = key.indexOf('-');
      const staffId = key.substring(0, dashIndex);
      const weekStart = key.substring(dashIndex + 1);
      const totalHours = days.reduce((sum: any, day: any) => sum + day.total_hours, 0);
      const overtimeHours = Math.max(0, totalHours - 48);
      
      weeklyBreakdown.push({
        week_start: weekStart,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        days: days.length,
        daily_breakdown: days.map((d: any) => ({
          date: d.date,
          hours: d.total_hours
        }))
      });
    }
    
    // Calculate actual weekly hours using the function
    const weeklyHours = await calculateWeeklyHours(month);
    const dollyWeekly = dollyStaffId ? weeklyHours.filter((w: any) => w.staff_id === dollyStaffId) : [];
    
    // Debug date parsing
    const dateParsingDebug = dollyRecords.slice(0, 10).map((daily: any) => {
      const originalDate = daily.date;
      const parsedDate = new Date(daily.date + 'T12:00:00');
      const weekStart = getWeekStart(parsedDate);
      
      return {
        original: originalDate,
        parsed: parsedDate.toISOString(),
        day_of_week: parsedDate.getDay(),
        week_start: weekStart
      };
    });

    return NextResponse.json({
      month,
      debug: {
        total_daily_records: dailyHours.length,
        dolly_daily_records: dollyRecords.length,
        dolly_weekly_groups: weeklyGroups.size,
        all_staff: allStaff,
        dolly_staff_record: dollyStaff,
        dolly_staff_id: dollyStaffId,
        unique_staff_ids: uniqueStaffIds,
        sample_daily_records: dailyHours.slice(0, 5), // Show first 5 records
        dolly_sample_records: dollyRecords.slice(0, 5), // Show Dolly's records
        date_parsing_debug: dateParsingDebug
      },
      dolly_manual_calculation: weeklyBreakdown,
      dolly_function_result: dollyWeekly,
      total_ot_manual: weeklyBreakdown.reduce((sum: any, w: any) => sum + w.overtime_hours, 0),
      total_ot_function: dollyWeekly.reduce((sum: any, w: any) => sum + w.overtime_hours, 0)
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 