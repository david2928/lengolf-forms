import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get all LINE audiences
 * GET /api/line/audiences
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

    // Fetch all audiences with stats
    const { data: audiences, error } = await refacSupabaseAdmin
      .from('line_audiences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching audiences:', error);
      throw error;
    }

    // Get stats for each audience
    const audiencesWithStats = await Promise.all(
      (audiences || []).map(async (audience: any) => {
        const { data: stats } = await refacSupabaseAdmin
          .rpc('get_audience_stats', { p_audience_id: audience.id });

        return {
          ...audience,
          stats: stats?.[0] || {
            total_members: 0,
            opted_out_count: 0,
            active_members: 0,
            opt_out_rate: 0
          }
        };
      })
    );

    return NextResponse.json({
      success: true,
      audiences: audiencesWithStats
    });

  } catch (error) {
    console.error('Failed to fetch audiences:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Create a new LINE audience
 * POST /api/line/audiences
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

    const { name, description, type, criteria_json, allow_opt_out = true } = await request.json();

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json({
        success: false,
        error: 'Name and type are required'
      }, { status: 400 });
    }

    if (!['manual', 'criteria', 'upload'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid audience type'
      }, { status: 400 });
    }

    // Create audience
    const { data: audience, error } = await refacSupabaseAdmin
      .from('line_audiences')
      .insert({
        name,
        description,
        type,
        criteria_json,
        allow_opt_out,
        created_by: session.user.email,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating audience:', error);
      throw error;
    }

    // If criteria-based, automatically sync members
    if (type === 'criteria' && criteria_json) {
      try {
        const { data: memberCount } = await refacSupabaseAdmin
          .rpc('sync_audience_members', { p_audience_id: audience.id });

        console.log(`Synced ${memberCount} members to audience ${audience.id}`);
      } catch (syncError) {
        console.error('Error syncing audience members:', syncError);
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json({
      success: true,
      audience
    });

  } catch (error) {
    console.error('Failed to create audience:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
