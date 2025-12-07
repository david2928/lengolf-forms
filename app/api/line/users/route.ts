import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * GET /api/line/users
 * Search LINE users by display name or LINE user ID
 *
 * Query params:
 *   - search: search term (optional, min 1 character)
 *   - limit: number of results (default: 10, max: 50)
 *   - includeLinked: include already linked users (default: false)
 *
 * Returns:
 *   - lineUsers: array of LINE user objects (id, line_user_id, display_name, picture_url, customer_id)
 *   - count: number of results
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const includeLinked = searchParams.get('includeLinked') === 'true';

    let query = refacSupabaseAdmin
      .from('line_users')
      .select('id, line_user_id, display_name, picture_url, customer_id')
      .order('display_name', { ascending: true })
      .limit(limit);

    // Filter out already linked users unless explicitly requested
    if (!includeLinked) {
      query = query.is('customer_id', null);
    }

    // Apply search filter if provided
    if (search && search.length >= 1) {
      query = query.or(`display_name.ilike.%${search}%,line_user_id.ilike.%${search}%`);
    }

    const { data: lineUsers, error } = await query;

    if (error) {
      console.error('Error fetching LINE users:', error);
      return NextResponse.json({
        error: "Failed to fetch LINE users"
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lineUsers: lineUsers || [],
      count: lineUsers?.length || 0
    });

  } catch (error) {
    console.error('Error in LINE users search:', error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}
