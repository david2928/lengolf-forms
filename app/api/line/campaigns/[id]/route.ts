import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get campaign details
 * GET /api/line/campaigns/[id]
 */
export async function GET(
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

    const { id: campaignId } = await params;

    // Get campaign with audience details
    const { data: campaign, error: campaignError } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .select(`
        *,
        line_audiences (
          id,
          name,
          type,
          description
        )
      `)
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({
        success: false,
        error: 'Campaign not found'
      }, { status: 404 });
    }

    // Get campaign stats
    const { data: stats } = await refacSupabaseAdmin
      .rpc('get_campaign_stats', { p_campaign_id: campaignId });

    return NextResponse.json({
      success: true,
      campaign: {
        ...campaign,
        stats: stats?.[0] || {
          total_sent: 0,
          success_count: 0,
          error_count: 0,
          opted_out_count: 0,
          blocked_count: 0,
          success_rate: 0,
          error_rate: 0
        }
      }
    });

  } catch (error) {
    console.error('Failed to fetch campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update campaign
 * PATCH /api/line/campaigns/[id]
 */
export async function PATCH(
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

    const { id: campaignId } = await params;
    const { name, status, scheduled_at, recurrence_rule } = await request.json();

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
    if (recurrence_rule !== undefined) updateData.recurrence_rule = recurrence_rule;

    const { data: campaign, error } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .update(updateData)
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Failed to update campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Delete campaign
 * DELETE /api/line/campaigns/[id]
 */
export async function DELETE(
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

    const { id: campaignId } = await params;

    // Check if campaign can be deleted
    const { data: campaign } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .select('status')
      .eq('id', campaignId)
      .single();

    if (campaign?.status === 'sending') {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete campaign while sending'
      }, { status: 400 });
    }

    const { error } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .delete()
      .eq('id', campaignId);

    if (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
