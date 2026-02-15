import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * PUT /api/google-reviews/[id]/draft
 *
 * Update the draft reply text (edit before approving).
 * Body: { draft_reply: string }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;

    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { draft_reply } = body;

    if (!draft_reply || typeof draft_reply !== 'string' || draft_reply.trim().length < 10) {
      return NextResponse.json({ error: 'Draft reply must be at least 10 characters' }, { status: 400 });
    }

    if (draft_reply.length > 4096) {
      return NextResponse.json({ error: 'Draft reply cannot exceed 4096 characters' }, { status: 400 });
    }

    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .update({
        draft_reply: draft_reply.trim(),
        draft_status: 'pending',
      })
      .eq('id', reviewId);

    if (error) {
      console.error('Error updating draft:', error);
      return NextResponse.json({ error: 'Failed to update draft' }, { status: 500 });
    }

    return NextResponse.json({ success: true, draft_reply: draft_reply.trim() });
  } catch (error) {
    console.error('Error in PUT /api/google-reviews/[id]/draft:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
