import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get all broadcast campaigns
 * GET /api/line/campaigns
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const audienceId = searchParams.get('audience_id');

    let query = refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .select(`
        *,
        line_audiences (
          id,
          name,
          type
        )
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (audienceId) {
      query = query.eq('audience_id', audienceId);
    }

    const { data: campaigns, error } = await query;

    if (error) {
      console.error('Error fetching campaigns:', error);
      throw error;
    }

    // Get stats for each campaign
    const campaignsWithStats = await Promise.all(
      (campaigns || []).map(async (campaign: any) => {
        const { data: stats } = await refacSupabaseAdmin
          .rpc('get_campaign_stats', { p_campaign_id: campaign.id });

        return {
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
        };
      })
    );

    return NextResponse.json({
      success: true,
      campaigns: campaignsWithStats
    });

  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Create a new broadcast campaign
 * POST /api/line/campaigns
 */
export async function POST(request: NextRequest) {
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

    const {
      name,
      audience_id,
      message_type,
      flex_message,
      message_template_id,
      schedule_type = 'immediate',
      scheduled_at,
      recurrence_rule
    } = await request.json();

    // Validate required fields
    if (!name || !audience_id || !message_type) {
      return NextResponse.json({
        success: false,
        error: 'Name, audience_id, and message_type are required'
      }, { status: 400 });
    }

    if (!['text', 'flex'].includes(message_type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid message type'
      }, { status: 400 });
    }

    if (message_type === 'flex' && !flex_message) {
      return NextResponse.json({
        success: false,
        error: 'flex_message is required for flex message type'
      }, { status: 400 });
    }

    // Verify audience exists
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .from('line_audiences')
      .select('id, name')
      .eq('id', audience_id)
      .single();

    if (audienceError || !audience) {
      return NextResponse.json({
        success: false,
        error: 'Audience not found'
      }, { status: 404 });
    }

    // Create campaign
    const { data: campaign, error } = await refacSupabaseAdmin
      .from('line_broadcast_campaigns')
      .insert({
        name,
        audience_id,
        message_template_id,
        message_type,
        flex_message,
        schedule_type,
        scheduled_at,
        recurrence_rule,
        status: schedule_type === 'immediate' ? 'draft' : 'scheduled',
        created_by: session.user.email
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      campaign
    });

  } catch (error) {
    console.error('Failed to create campaign:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
