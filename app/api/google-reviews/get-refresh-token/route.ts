import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';

/**
 * GET /api/google-reviews/get-refresh-token
 *
 * TEMPORARY ENDPOINT - Use once to extract refresh token
 * Delete this file after extracting the token!
 *
 * Instructions:
 * 1. Sign in with info@len.golf
 * 2. Navigate to this endpoint
 * 3. Copy the refresh token
 * 4. Add to Vercel environment variables
 * 5. DELETE THIS FILE
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only allow admin users
    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return NextResponse.json({
      email: session.user.email,
      accessToken: session.accessToken ? 'Present ✓' : 'Missing ✗',
      refreshToken: session.refreshToken || 'Missing ✗',
      instructions: [
        '1. Copy the refreshToken value below',
        '2. Add to Vercel: GOOGLE_BUSINESS_REFRESH_TOKEN=<token>',
        '3. Redeploy the app',
        '4. DELETE this endpoint file for security',
      ],
      warning: '⚠️ Keep this token secret! Delete this endpoint after use!',
    });
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
