import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { updateSuggestionFeedback } from '@/lib/ai/suggestion-service';

interface FeedbackRequest {
  suggestionId: string;
  action: 'accept' | 'edit' | 'decline';
  finalResponse?: string; // If edited, what was actually sent
  feedbackText?: string; // Optional feedback from staff
}

/**
 * Record feedback for AI suggestions (accept/edit/decline)
 * POST /api/ai/feedback
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: FeedbackRequest = await request.json();

    // Validate required fields
    if (!body.suggestionId || !body.action) {
      return NextResponse.json({
        error: 'Missing required fields: suggestionId, action'
      }, { status: 400 });
    }

    // Validate action
    if (!['accept', 'edit', 'decline'].includes(body.action)) {
      return NextResponse.json({
        error: 'Invalid action. Must be accept, edit, or decline'
      }, { status: 400 });
    }

    // Prepare feedback data
    const feedback = {
      accepted: body.action === 'accept',
      edited: body.action === 'edit',
      declined: body.action === 'decline',
      finalResponse: body.finalResponse,
      feedbackText: body.feedbackText
    };

    // Update suggestion feedback
    await updateSuggestionFeedback(body.suggestionId, feedback);

    return NextResponse.json({
      success: true,
      message: `Feedback recorded: ${body.action}`
    });

  } catch (error) {
    console.error('Error recording feedback:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to record feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}