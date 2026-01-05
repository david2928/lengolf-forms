import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { getReviewsFromDB } from '@/lib/google-business-profile';

/**
 * GET /api/google-reviews
 *
 * Lists Google Business Profile reviews from database
 * - Requires admin authentication
 * - Supports filtering by reply status
 * - Supports pagination
 *
 * Query params:
 * - hasReply: boolean (optional) - Filter by reply status
 * - limit: number (optional) - Number of results (default: 50)
 * - offset: number (optional) - Pagination offset (default: 0)
 *
 * Returns: { reviews: GoogleReviewDB[], count: number }
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const hasReplyParam = searchParams.get('hasReply');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const filters: any = {};

    if (hasReplyParam !== null) {
      filters.hasReply = hasReplyParam === 'true';
    }

    if (limitParam) {
      filters.limit = parseInt(limitParam, 10);
    } else {
      filters.limit = 50; // Default limit
    }

    if (offsetParam) {
      filters.offset = parseInt(offsetParam, 10);
    }

    // Fetch reviews from database
    const reviews = await getReviewsFromDB(filters);

    return NextResponse.json({
      reviews,
      count: reviews.length,
    });
  } catch (error) {
    console.error('Error in GET /api/google-reviews:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
