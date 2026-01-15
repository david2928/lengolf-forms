import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { isUserAdmin } from '@/lib/auth';
import { postReviewReply, getReviewById } from '@/lib/google-business-profile';
import { getValidAccessToken } from '@/lib/google-business-oauth';

/**
 * POST /api/google-reviews/[id]/reply
 *
 * Posts a reply to a Google Business Profile review
 * - Requires admin authentication (Chris or David only)
 * - Uses stored OAuth tokens from database
 * - Posts reply to Google, then updates local database
 *
 * Body: { reply_text: string }
 * Returns: { success: boolean, error?: string, warning?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params;

    // Check authentication
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await isUserAdmin(session.user.email);
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { reply_text } = body;

    // Validate reply text
    if (!reply_text || typeof reply_text !== 'string') {
      return NextResponse.json(
        { error: 'Reply text is required' },
        { status: 400 }
      );
    }

    const trimmedReply = reply_text.trim();

    if (trimmedReply.length < 10) {
      return NextResponse.json(
        { error: 'Reply must be at least 10 characters long' },
        { status: 400 }
      );
    }

    if (trimmedReply.length > 4096) {
      return NextResponse.json(
        { error: 'Reply cannot exceed 4096 characters' },
        { status: 400 }
      );
    }

    // Get the review from database
    const review = await getReviewById(reviewId);
    if (!review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    // Check if review already has a reply
    if (review.has_reply) {
      return NextResponse.json(
        { error: 'This review already has a reply. Edit replies directly on Google Business Profile.' },
        { status: 400 }
      );
    }

    // Get access token from database
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        {
          error: 'Google Business account not connected. Please connect your Google Business account first.',
        },
        { status: 401 }
      );
    }

    // Extract first name from session user
    const adminName = session.user.name || session.user.email;
    const adminFirstName = adminName.split(' ')[0];

    console.log(`Admin ${session.user.email} (${adminFirstName}) posting reply to review ${reviewId}`);

    // Post the reply
    const result = await postReviewReply(
      reviewId,
      review.google_review_name,
      trimmedReply,
      accessToken,
      adminFirstName
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to post reply' },
        { status: 500 }
      );
    }

    console.log(`Reply posted successfully to review ${reviewId} by ${adminFirstName}`);

    return NextResponse.json({
      success: true,
      message: 'Reply posted successfully',
      warning: result.warning,
      reply_text: result.replyText,
      replied_by: result.repliedBy,
      replied_at: result.repliedAt,
    });
  } catch (error) {
    console.error('Error in POST /api/google-reviews/[id]/reply:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
