import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/google-reviews/sync
 *
 * Syncs Google Business Profile reviews to Supabase database
 * - Requires admin authentication
 * - Triggers Supabase Edge Function to do the actual work (avoids Vercel timeout)
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

    console.log(`Admin ${session.user.email} triggering Google reviews sync via Edge Function`);

    // Call Supabase Edge Function
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/google-reviews-sync`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Edge Function error:', result);
      return NextResponse.json(
        { error: result.error || 'Sync failed' },
        { status: response.status }
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
