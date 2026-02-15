import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { postReviewReply, getReviewById } from '@/lib/google-business-profile';
import { getValidAccessToken } from '@/lib/google-business-oauth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * POST /api/google-reviews/[id]/draft/approve
 *
 * Approves a draft reply and posts it to Google.
 * Uses the review's draft_reply text to post via Google Business API.
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

    // Get the review with its draft
    const review = await getReviewById(reviewId);
    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (!review.draft_reply) {
      return NextResponse.json({ error: 'No draft reply to approve' }, { status: 400 });
    }

    if (review.has_reply) {
      return NextResponse.json({ error: 'Review already has a reply' }, { status: 400 });
    }

    // Get access token
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Google Business account not connected' },
        { status: 401 }
      );
    }

    const adminName = session.user.name || session.user.email;
    const adminFirstName = adminName.split(' ')[0];

    console.log(`Admin ${session.user.email} approving draft for review ${reviewId}`);

    // Post to Google using existing function
    const result = await postReviewReply(
      reviewId,
      review.google_review_name,
      review.draft_reply,
      accessToken,
      adminFirstName
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to post reply to Google' },
        { status: 500 }
      );
    }

    // Update draft status
    const now = new Date().toISOString();
    const { error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('google_reviews')
      .update({
        draft_status: 'approved',
        draft_reviewed_at: now,
        draft_reviewed_by: adminFirstName,
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Error updating draft status:', updateError);
      // Reply was posted but draft status update failed - not critical
    }

    console.log(`Draft approved and posted for review ${reviewId}`);

    return NextResponse.json({
      success: true,
      message: 'Draft approved and reply posted to Google',
      warning: result.warning,
      reply_text: result.replyText,
      replied_by: result.repliedBy,
      replied_at: result.repliedAt,
    });
  } catch (error) {
    console.error('Error in POST /api/google-reviews/[id]/draft/approve:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
