import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * POST /api/google-reviews/[id]/draft/reject
 *
 * Rejects a draft reply and clears it.
 * The review returns to the "needs reply" state for manual reply or re-generation.
 */
export async function POST(
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

    const adminName = session.user.name || session.user.email;
    const adminFirstName = adminName.split(' ')[0];
    const now = new Date().toISOString();

    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .update({
        draft_reply: null,
        draft_reply_en_translation: null,
        draft_status: 'rejected',
        draft_reviewed_at: now,
        draft_reviewed_by: adminFirstName,
      })
      .eq('id', reviewId);

    if (error) {
      console.error('Error rejecting draft:', error);
      return NextResponse.json({ error: 'Failed to reject draft' }, { status: 500 });
    }

    console.log(`Draft rejected for review ${reviewId} by ${adminFirstName}`);

    return NextResponse.json({ success: true, message: 'Draft rejected' });
  } catch (error) {
    console.error('Error in POST /api/google-reviews/[id]/draft/reject:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
