import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Add members to audience
 * POST /api/line/audiences/[id]/members
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
    const { line_user_id, customer_id } = await request.json();

    if (!line_user_id) {
      return NextResponse.json({
        success: false,
        error: 'line_user_id is required'
      }, { status: 400 });
    }

    // Add member to audience
    const { data, error } = await refacSupabaseAdmin
      .from('line_audience_members')
      .insert({
        audience_id: audienceId,
        line_user_id,
        customer_id,
        opted_out: false,
        added_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate key error
      if (error.code === '23505') {
        return NextResponse.json({
          success: false,
          error: 'Member already exists in this audience'
        }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      member: data
    });

  } catch (error) {
    console.error('Failed to add member:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
