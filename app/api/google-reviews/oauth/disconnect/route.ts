import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { disconnectGoogleBusiness } from '@/lib/google-business-oauth';

/**
 * POST /api/google-reviews/oauth/disconnect
 *
 * Disconnect Google Business Profile account
 * - Requires admin authentication
 * - Removes stored OAuth tokens from database
 */
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Disconnect account
    const result = await disconnectGoogleBusiness();

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to disconnect' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/google-reviews/oauth/disconnect:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
