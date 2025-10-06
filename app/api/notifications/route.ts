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

    // Collect unique user IDs, customer IDs, and booking IDs
    const userIds = new Set<string>();
    const customerIds = new Set<string>();
    const bookingIds = new Set<string>();
    (rawNotifications || []).forEach((n: any) => {
      if (n.acknowledged_by_user_id) userIds.add(n.acknowledged_by_user_id);
      if (n.notes_updated_by_user_id) userIds.add(n.notes_updated_by_user_id);
      if (n.customer_id) customerIds.add(n.customer_id);
      // Also collect booking IDs from metadata
      if (n.metadata?.bookingId) bookingIds.add(n.metadata.bookingId);
    });

    // Fetch user display names in bulk
    const userDisplayNameMap = new Map<string, string>();
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .schema('backoffice')
        .from('allowed_users')
        .select('id, display_name')
        .in('id', Array.from(userIds));

      (users || []).forEach((u: any) => {
        userDisplayNameMap.set(u.id, u.display_name);
      });
    }

    // Fetch customer IDs and duration from bookings for notifications that don't have customer_id
    const bookingToCustomerMap = new Map<string, string>();
    const bookingToDurationMap = new Map<string, number>();
    if (bookingIds.size > 0) {
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, customer_id, duration')
        .in('id', Array.from(bookingIds));

      (bookings || []).forEach((b: any) => {
        if (b.customer_id) {
          bookingToCustomerMap.set(b.id, b.customer_id);
          customerIds.add(b.customer_id);
        }
        if (b.duration) {
          bookingToDurationMap.set(b.id, b.duration);
        }
      });
    }

    // Fetch customer codes in bulk
    const customerCodeMap = new Map<string, string>();
    if (customerIds.size > 0) {
      const { data: customers } = await supabase
        .from('customers')
        .select('id, customer_code')
        .in('id', Array.from(customerIds));

      (customers || []).forEach((c: any) => {
        customerCodeMap.set(c.id, c.customer_code);
      });
    }

    // Add staff display names, customer codes, and duration to notifications
    const notifications = (rawNotifications || []).map((notification: any) => {
      // Determine customer_id: use direct customer_id or look up from booking
      const customerId = notification.customer_id ||
        (notification.metadata?.bookingId ? bookingToCustomerMap.get(notification.metadata.bookingId) : null);

      // Get duration from booking
      const duration = notification.metadata?.bookingId
        ? bookingToDurationMap.get(notification.metadata.bookingId) || null
        : null;

      return {
        ...notification,
        acknowledged_by_display_name: notification.acknowledged_by_user_id
          ? userDisplayNameMap.get(notification.acknowledged_by_user_id) || null
          : null,
        notes_updated_by_display_name: notification.notes_updated_by_user_id
          ? userDisplayNameMap.get(notification.notes_updated_by_user_id) || null
          : null,
        customer_code: customerId
          ? customerCodeMap.get(customerId) || null
          : null,
        duration: duration,
      };
    });

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
