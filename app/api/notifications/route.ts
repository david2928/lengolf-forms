import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/notifications
 *
 * Query notifications with filtering, search, and pagination
 *
 * Query parameters:
 * - type: Filter by notification type (created|cancelled|modified)
 * - status: Filter by status (all|unread|acknowledged)
 * - search: Full-text search across message, notes, customer name
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 * - dateFrom: Filter notifications from this date (YYYY-MM-DD)
 * - dateTo: Filter notifications to this date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type'); // 'created' | 'cancelled' | 'modified'
    const status = searchParams.get('status') || 'all'; // 'all' | 'unread' | 'acknowledged'
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Validate page and limit
    if (page < 1 || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid page or limit parameter' },
        { status: 400 }
      );
    }

    // Start building query
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (type && ['created', 'cancelled', 'modified'].includes(type)) {
      query = query.eq('type', type);
    }

    if (status === 'unread') {
      query = query.eq('read', false);
    } else if (status === 'acknowledged') {
      query = query.eq('read', true);
    }

    if (dateFrom) {
      query = query.gte('booking_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('booking_date', dateTo);
    }

    // Apply full-text search
    if (search && search.trim()) {
      // Use PostgreSQL full-text search
      query = query.textSearch(
        'message,internal_notes,customer_name',
        search.trim(),
        {
          type: 'websearch',
          config: 'english',
        }
      );
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // Execute query
    const { data: notifications, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      );
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    // Calculate pagination metadata
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
      },
      unreadCount: unreadCount || 0,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
