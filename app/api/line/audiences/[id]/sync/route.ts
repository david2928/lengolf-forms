import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Sync audience members for criteria-based audiences
 * POST /api/line/audiences/[id]/sync
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const { id: audienceId } = await params;

    // Verify audience exists and is criteria-based
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .from('line_audiences')
      .select('type')
      .eq('id', audienceId)
      .single();

    if (audienceError || !audience) {
      return NextResponse.json({
        success: false,
        error: 'Audience not found'
      }, { status: 404 });
    }

    if (audience.type !== 'criteria') {
      return NextResponse.json({
        success: false,
        error: 'Can only sync criteria-based audiences'
      }, { status: 400 });
    }

    // Sync members
    const { data: membersAdded, error: syncError } = await refacSupabaseAdmin
      .rpc('sync_audience_members', { p_audience_id: audienceId });

    if (syncError) {
      console.error('Error syncing audience members:', syncError);
      throw syncError;
    }

    // Get updated stats
    const { data: stats } = await refacSupabaseAdmin
      .rpc('get_audience_stats', { p_audience_id: audienceId });

    return NextResponse.json({
      success: true,
      members_added: membersAdded || 0,
      stats: stats?.[0] || {
        total_members: 0,
        opted_out_count: 0,
        active_members: 0,
        opt_out_rate: 0
      }
    });

  } catch (error) {
    console.error('Failed to sync audience:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
