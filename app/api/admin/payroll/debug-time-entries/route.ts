import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { buildOptimizedTimeEntryQuery } from '@/lib/payroll-performance';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const monthYear = searchParams.get('month') || '2025-05';
    
    console.log(`🔍 Debug: Checking raw time entries for ${monthYear}`);
    
    // 1. Check total time entries in database
    const { count: totalCount, error: totalError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('*', { count: 'exact', head: true });
    
    if (totalError) {
      console.error('Error getting total count:', totalError);
    }
    
    // 2. Check time entries for specific month using the same query as payroll
    const queryOptions = buildOptimizedTimeEntryQuery({ monthYear });
    
    const { data: monthEntries, error: monthError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('id, staff_id, timestamp, action, photo_url')
      .gte('timestamp', queryOptions.filters.timestamp_gte)
      .lte('timestamp', queryOptions.filters.timestamp_lte)
      .order('timestamp', { ascending: true });
    
    if (monthError) {
      console.error('Error getting month entries:', monthError);
    }
    
    // 3. Check what months actually have data
    const { data: monthsData, error: monthsError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    if (monthsError) {
      console.error('Error getting months data:', monthsError);
    }
    
    // 4. Group by month to see data distribution
    const monthGroups = new Map<string, number>();
    if (monthsData) {
      monthsData.forEach((entry: any) => {
        const month = entry.timestamp.substring(0, 7); // YYYY-MM
        monthGroups.set(month, (monthGroups.get(month) || 0) + 1);
      });
    }
    
    // 5. Check specific staff (Dolly = staff_id 9)
    const { data: dollyEntries, error: dollyError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select('id, staff_id, timestamp, action')
      .eq('staff_id', 9)
      .gte('timestamp', queryOptions.filters.timestamp_gte)
      .lte('timestamp', queryOptions.filters.timestamp_lte)
      .order('timestamp', { ascending: true });
    
    if (dollyError) {
      console.error('Error getting Dolly entries:', dollyError);
    }
    
    // 6. Check staff table to see if Dolly exists
    const { data: staffData, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .select('id, staff_name, is_active')
      .eq('is_active', true);
    
    if (staffError) {
      console.error('Error getting staff data:', staffError);
    }
    
    return NextResponse.json({
      debug: {
        monthYear,
        queryFilters: queryOptions.filters,
        totalTimeEntries: totalCount || 0,
        monthTimeEntries: monthEntries?.length || 0,
        dollyTimeEntries: dollyEntries?.length || 0,
        availableMonths: Array.from(monthGroups.entries()).sort().reverse(),
        sampleDollyEntries: dollyEntries?.slice(0, 10) || [],
        sampleMonthEntries: monthEntries?.slice(0, 10) || [],
        allStaff: staffData || [],
        errors: {
          totalError: totalError?.message,
          monthError: monthError?.message,
          dollyError: dollyError?.message,
          staffError: staffError?.message
        }
      }
    });
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Debug endpoint failed' },
      { status: 500 }
    );
  }
} 