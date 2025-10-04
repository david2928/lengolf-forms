import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseServiceKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/notifications
 *
 * Query notifications with filtering, search, and pagination
 * Requires staff or admin authentication
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
    // Authentication check
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify staff/admin role
    const { data: user } = await supabase
      .schema('backoffice')
      .from('allowed_users')
      .select('id, is_staff, is_admin')
      .eq('email', session.user.email)
      .single();

    if (!user?.is_staff && !user?.is_admin) {
      return NextResponse.json(
        { error: "Forbidden: Staff or admin access required" },
        { status: 403 }
      );
    }

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

    // Start building query - we'll join staff emails in the app layer
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
    const { data: rawNotifications, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications', details: error.message },
        { status: 500 }
      );
    }

    // Collect unique user IDs to fetch emails
    const userIds = new Set<string>();
    (rawNotifications || []).forEach((n: any) => {
      if (n.acknowledged_by_user_id) userIds.add(n.acknowledged_by_user_id);
      if (n.notes_updated_by_user_id) userIds.add(n.notes_updated_by_user_id);
    });

    // Fetch user emails in bulk
    const userEmailMap = new Map<string, string>();
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('id, email')
        .in('id', Array.from(userIds));

      (users || []).forEach((u: any) => {
        userEmailMap.set(u.id, u.email);
      });
    }

    // Add staff emails to notifications
    const notifications = (rawNotifications || []).map((notification: any) => ({
      ...notification,
      acknowledged_by_email: notification.acknowledged_by_user_id
        ? userEmailMap.get(notification.acknowledged_by_user_id) || null
        : null,
      notes_updated_by_email: notification.notes_updated_by_user_id
        ? userEmailMap.get(notification.notes_updated_by_user_id) || null
        : null,
    }));

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);

    // Calculate pagination metadata
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      notifications,
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
