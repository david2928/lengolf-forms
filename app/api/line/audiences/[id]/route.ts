import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get specific LINE audience with members
 * GET /api/line/audiences/[id]
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

    const { id: audienceId } = await params;

    // Get audience details
    const { data: audience, error: audienceError } = await refacSupabaseAdmin
      .from('line_audiences')
      .select('*')
      .eq('id', audienceId)
      .single();

    if (audienceError || !audience) {
      return NextResponse.json({
        success: false,
        error: 'Audience not found'
      }, { status: 404 });
    }

    // Get audience stats
    const { data: stats } = await refacSupabaseAdmin
      .rpc('get_audience_stats', { p_audience_id: audienceId });

    // Get active members
    const { data: members } = await refacSupabaseAdmin
      .rpc('get_active_audience_members', { p_audience_id: audienceId });

    return NextResponse.json({
      success: true,
      audience: {
        ...audience,
        stats: stats?.[0] || {
          total_members: 0,
          opted_out_count: 0,
          active_members: 0,
          opt_out_rate: 0
        },
        members: members || []
      }
    });

  } catch (error) {
    console.error('Failed to fetch audience:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Update LINE audience
 * PATCH /api/line/audiences/[id]
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

    const { id: audienceId } = await params;
    const { name, description, criteria_json, allow_opt_out, is_active } = await request.json();

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (criteria_json !== undefined) updateData.criteria_json = criteria_json;
    if (allow_opt_out !== undefined) updateData.allow_opt_out = allow_opt_out;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data: audience, error } = await refacSupabaseAdmin
      .from('line_audiences')
      .update(updateData)
      .eq('id', audienceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating audience:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      audience
    });

  } catch (error) {
    console.error('Failed to update audience:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Delete LINE audience
 * DELETE /api/line/audiences/[id]
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

    const { id: audienceId } = await params;

    const { error } = await refacSupabaseAdmin
      .from('line_audiences')
      .delete()
      .eq('id', audienceId);

    if (error) {
      console.error('Error deleting audience:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Audience deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete audience:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
