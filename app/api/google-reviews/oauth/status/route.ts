import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import {
  isGoogleBusinessConnected,
  getConnectedAccountEmail,
} from '@/lib/google-business-oauth';

/**
 * GET /api/google-reviews/oauth/status
 *
 * Check Google Business Profile connection status
 * - Requires admin authentication
 * - Returns connection status and connected account email
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

    // Check connection status
    const connected = await isGoogleBusinessConnected();
    const email = connected ? await getConnectedAccountEmail() : null;

    return NextResponse.json({
      connected,
      email,
    });
  } catch (error) {
    console.error('Error in GET /api/google-reviews/oauth/status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
