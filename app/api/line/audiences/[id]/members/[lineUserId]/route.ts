import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Remove member from audience
 * DELETE /api/line/audiences/[id]/members/[lineUserId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineUserId: string }> }
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

    const { id: audienceId, lineUserId } = await params;

    // Remove member from audience
    const { error } = await refacSupabaseAdmin
      .from('line_audience_members')
      .delete()
      .eq('audience_id', audienceId)
      .eq('line_user_id', lineUserId);

    if (error) {
      console.error('Error removing member:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    });

  } catch (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
