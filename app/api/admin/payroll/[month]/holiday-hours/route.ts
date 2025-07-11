import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { month: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { month } = params;
    
    // Validate month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/;
    if (!monthRegex.test(month)) {
      return NextResponse.json({ error: 'Invalid month format. Use YYYY-MM' }, { status: 400 });
    }

    console.log(`🔍 Calculating holiday hours for month: ${month}`);

    // Get public holidays for the month
    const startDate = `${month}-01`;
    const endDate = new Date(month + '-01');
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    const endDateStr = endDate.toISOString().split('T')[0];

    const { data: holidays, error: holidaysError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('public_holidays')
      .select('holiday_date, holiday_name')
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDateStr)
      .eq('is_active', true)
      .order('holiday_date');

    if (holidaysError) {
      console.error('Error fetching holidays:', holidaysError);
      return NextResponse.json(
        { error: 'Failed to fetch holidays' },
        { status: 500 }
      );
    }

    if (!holidays || holidays.length === 0) {
      return NextResponse.json({
        holiday_hours: [],
        summary: {
          total_holidays: 0,
          total_hours: 0
        }
      });
    }

    console.log(`📅 Found ${holidays.length} holidays in ${month}`);

    // Get all staff members
    const { data: staff, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name')
      .eq('is_active', true)
      .order('staff_name');

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return NextResponse.json(
        { error: 'Failed to fetch staff' },
        { status: 500 }
      );
    }

    // Calculate holiday hours for each staff member and each holiday
    const holidayHours: any[] = [];
    let totalHours = 0;

    for (const holiday of holidays) {
      console.log(`🏖️ Processing holiday: ${holiday.holiday_name} (${holiday.holiday_date})`);

             // Get time entries for this specific holiday date
       // Convert holiday date to proper timezone range
       const holidayStart = `${holiday.holiday_date}T00:00:00+07:00`
       const holidayEnd = `${holiday.holiday_date}T23:59:59+07:00`
       
       console.log(`🔍 Fetching entries for ${holiday.holiday_name} between ${holidayStart} and ${holidayEnd}`)
       
       const { data: timeEntries, error: entriesError } = await refacSupabaseAdmin
         .schema('backoffice')
         .from('time_entries')
         .select(`
           id,
           staff_id,
           action,
           timestamp,
           staff:staff_id (
             staff_name
           )
         `)
         .gte('timestamp', holidayStart)
         .lte('timestamp', holidayEnd)
         .order('staff_id, timestamp');

      if (entriesError) {
        console.error('Error fetching time entries for holiday:', holiday.holiday_date, entriesError);
        continue;
      }

             if (!timeEntries || timeEntries.length === 0) {
         console.log(`⏰ No time entries found for ${holiday.holiday_name}`);
         continue;
       }

       console.log(`📋 Found ${timeEntries.length} time entries for ${holiday.holiday_name}`);

      // Group entries by staff and calculate hours
      const staffHours = new Map<number, number>();
      const staffNames = new Map<number, string>();

      // Group by staff
      const entriesByStaff = timeEntries.reduce((acc: any, entry: any) => {
        if (!acc[entry.staff_id]) {
          acc[entry.staff_id] = [];
        }
        acc[entry.staff_id].push(entry);
        staffNames.set(entry.staff_id, (entry.staff as any)?.staff_name || 'Unknown');
        return acc;
      }, {});

      // Calculate hours for each staff member
      for (const [staffId, entries] of Object.entries(entriesByStaff)) {
        const staffEntries = entries as any[];
        let totalStaffHours = 0;

        // Sort entries by timestamp
        staffEntries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Calculate hours by pairing clock_in and clock_out
        for (let i = 0; i < staffEntries.length - 1; i++) {
          const currentEntry = staffEntries[i];
          const nextEntry = staffEntries[i + 1];

          if (currentEntry.action === 'clock_in' && nextEntry.action === 'clock_out') {
            const clockInTime = new Date(currentEntry.timestamp);
            const clockOutTime = new Date(nextEntry.timestamp);
            const hours = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
            totalStaffHours += hours;
          }
        }

        if (totalStaffHours > 0) {
          staffHours.set(parseInt(staffId), totalStaffHours);
          totalHours += totalStaffHours;

          holidayHours.push({
            staff_id: parseInt(staffId),
            staff_name: staffNames.get(parseInt(staffId)),
            holiday_date: holiday.holiday_date,
            holiday_name: holiday.holiday_name,
            hours_worked: parseFloat(totalStaffHours.toFixed(2))
          });

          console.log(`👤 ${staffNames.get(parseInt(staffId))}: ${totalStaffHours.toFixed(2)} hours on ${holiday.holiday_name}`);
        }
      }
    }

    console.log(`✅ Total holiday hours calculated: ${totalHours.toFixed(2)} hours`);

    // Ensure we include entries for all staff members and all holidays (even if 0 hours)
    const completeHolidayHours: any[] = [];
    
    for (const holiday of holidays) {
      for (const staffMember of (staff || [])) {
        const existingEntry = holidayHours.find(h => 
          h.staff_id === staffMember.id && h.holiday_date === holiday.holiday_date
        );
        
        if (existingEntry) {
          completeHolidayHours.push(existingEntry);
        } else {
          // Add zero-hour entry for staff who didn't work on this holiday
          completeHolidayHours.push({
            staff_id: staffMember.id,
            staff_name: staffMember.staff_name,
            holiday_date: holiday.holiday_date,
            holiday_name: holiday.holiday_name,
            hours_worked: 0
          });
        }
      }
    }

    return NextResponse.json({
      holiday_hours: completeHolidayHours,
      holidays: holidays,
      staff: staff,
      summary: {
        total_holidays: holidays.length,
        total_hours: parseFloat(totalHours.toFixed(2)),
        staff_count: staff?.length || 0
      }
    });

  } catch (error) {
    console.error('Error calculating holiday hours:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 