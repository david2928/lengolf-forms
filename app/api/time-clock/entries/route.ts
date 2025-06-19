import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { TimeEntriesRequest, TimeEntriesResponse, TimeEntryReport } from '@/types/staff';
import { getTimeClockPhotoUrl } from '@/lib/photo-storage';
import { DateTime } from 'luxon';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/entries - Get time entries for reporting
 * Admin authentication required
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const staffId = searchParams.get('staff_id');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query with direct table access (no RPC functions)
    let query = refacSupabaseAdmin
      .schema('backoffice')
      .from('time_entries')
      .select(`
        id,
        staff_id,
        action,
        timestamp,
        photo_captured,
        photo_url,
        camera_error,
        staff:staff_id (
          staff_name
        )
      `)
      .order('timestamp', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (startDate) {
      query = query.gte('timestamp', `${startDate}T00:00:00.000Z`);
    }

    if (endDate) {
      query = query.lte('timestamp', `${endDate}T23:59:59.999Z`);
    }

    if (staffId) {
      query = query.eq('staff_id', parseInt(staffId));
    }

    const { data: entries, error, count } = await query;

    if (error) {
      console.error('Error fetching time entries:', error);
      return NextResponse.json(
        { error: 'Failed to fetch time entries' },
        { status: 500 }
      );
    }

    // Format response - return photo paths, not full URLs (URLs generated on demand)
    const formattedEntries: TimeEntryReport[] = (entries || []).map((entry: any) => ({
      entry_id: entry.id,
      staff_id: entry.staff_id,
      staff_name: (entry.staff as any)?.staff_name || 'Unknown',
      action: entry.action,
      timestamp: entry.timestamp,
      date_only: DateTime.fromISO(entry.timestamp).toFormat('yyyy-MM-dd'),
      time_only: DateTime.fromISO(entry.timestamp).toFormat('HH:mm:ss'),
      photo_captured: entry.photo_captured,
      photo_url: entry.photo_url, // Return the storage path, not the full URL
      camera_error: entry.camera_error
    }));

    // Calculate summary
    const summary = {
      total_entries: count || formattedEntries.length,
      clock_ins: formattedEntries.filter(e => e.action === 'clock_in').length,
      clock_outs: formattedEntries.filter(e => e.action === 'clock_out').length,
      unique_staff: new Set(formattedEntries.map(e => e.staff_id)).size
    };

    return NextResponse.json({
      entries: formattedEntries,
      summary,
      pagination: {
        total: count || formattedEntries.length,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    } as TimeEntriesResponse);

  } catch (error) {
    console.error('Error in GET /api/time-clock/entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 