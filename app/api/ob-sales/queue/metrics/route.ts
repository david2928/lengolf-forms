/**
 * OB Queue Metrics API
 * Returns queue and follow-up counts for dashboard display
 */

import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export const dynamic = 'force-dynamic';

// GET /api/ob-sales/queue/metrics - Get queue metrics
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch both counts in parallel
    const [queueCountResult, followUpCountResult] = await Promise.all([
      refacSupabaseAdmin.rpc('count_ob_calling_queue'),
      refacSupabaseAdmin.rpc('count_ob_followups')
    ]);

    if (queueCountResult.error) {
      console.error('Error fetching queue count:', queueCountResult.error);
    }

    if (followUpCountResult.error) {
      console.error('Error fetching follow-up count:', followUpCountResult.error);
    }

    const queueCount = queueCountResult.error ? 0 : (queueCountResult.data || 0);
    const followUpCount = followUpCountResult.error ? 0 : (followUpCountResult.data || 0);

    return NextResponse.json({
      success: true,
      queueCount,
      followUpCount
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('OB Queue Metrics API Error:', error);
    return NextResponse.json(
      { error: "Failed to fetch metrics", details: errorMessage },
      { status: 500 }
    );
  }
}
