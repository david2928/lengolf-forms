import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { getAuthorizationUrl } from '@/lib/google-business-oauth';

/**
 * GET /api/google-reviews/oauth/connect
 *
 * Initiates Google Business Profile OAuth flow
 * - Requires admin authentication
 * - Redirects to Google OAuth consent screen
 * - Google will redirect back to /api/google-reviews/oauth/callback
 */
export async function GET(request: NextRequest) {
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

    // Generate OAuth authorization URL
    const authUrl = getAuthorizationUrl();

    // Redirect to Google OAuth consent screen
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Error in GET /api/google-reviews/oauth/connect:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
