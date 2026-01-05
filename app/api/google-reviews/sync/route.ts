import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { syncReviewsToSupabase } from '@/lib/google-business-profile';

/**
 * POST /api/google-reviews/sync
 *
 * Syncs Google Business Profile reviews to Supabase database
 * - Requires admin authentication
 * - Uses OAuth access token from user session
 * - Fetches all reviews from Google
 * - Upserts to backoffice.google_reviews table
 *
 * Returns: { success: boolean, synced: number, new: number, updated: number }
 */
export async function POST(request: NextRequest) {
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

    // Check for access token
    if (!session.accessToken) {
      return NextResponse.json(
        {
          error:
            'No Google access token found. Please sign out and sign in again to grant Business Profile API access.',
        },
        { status: 401 }
      );
    }

    console.log(`Admin ${session.user.email} initiating Google reviews sync`);

    // Perform sync
    const result = await syncReviewsToSupabase(session.accessToken);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: 500 }
      );
    }

    console.log(
      `Sync completed: ${result.new} new, ${result.updated} updated, ${result.synced} total`
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in POST /api/google-reviews/sync:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
