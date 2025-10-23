import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { functionExecutor } from '@/lib/ai/function-executor';

interface ApproveBookingRequest {
  suggestionId: string;
  customerId?: string; // Customer ID for existing customers
  conversationId?: string; // Conversation ID for sending LINE confirmation
  functionResult?: {
    success: boolean;
    data?: any;
    error?: string;
    requiresApproval?: boolean;
    approvalMessage?: string;
    functionName?: string;
  };
}

/**
 * Execute approved booking creation
 * POST /api/ai/approve-booking
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Parse request body
    const body: ApproveBookingRequest = await request.json();

    // Validate required fields
    if (!body.suggestionId || !body.functionResult) {
      return NextResponse.json({
        error: 'Missing required fields: suggestionId, functionResult'
      }, { status: 400 });
    }

    // Verify this is a supported function
    const supportedFunctions = ['create_booking', 'cancel_booking'];
    if (!supportedFunctions.includes(body.functionResult.functionName || '')) {
      return NextResponse.json({
        error: `Only ${supportedFunctions.join(', ')} functions can be approved`
      }, { status: 400 });
    }

    // Verify the function result requires approval
    if (!body.functionResult.requiresApproval) {
      return NextResponse.json({
        error: 'This function does not require approval'
      }, { status: 400 });
    }

    // Execute the approved function based on type
    let result;
    if (body.functionResult.functionName === 'create_booking') {
      result = await functionExecutor.executeApprovedBooking(
        body.functionResult.data,
        body.customerId // Pass customer ID if available
      );
    } else if (body.functionResult.functionName === 'cancel_booking') {
      result = await functionExecutor.executeApprovedCancellation(
        body.functionResult.data
      );
    } else {
      return NextResponse.json({
        success: false,
        error: 'Unsupported function'
      }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || `Failed to execute ${body.functionResult.functionName}`
      }, { status: 400 });
    }

    // Send booking confirmation to conversation if conversationId is provided
    if (body.conversationId && result.data?.booking_id && body.functionResult.functionName === 'create_booking') {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/line/bookings/${result.data.booking_id}/send-confirmation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageFormat: 'flex',
            senderName: 'AI Assistant'
          })
        });
        console.log('✅ Booking confirmation sent to conversation');
      } catch (error) {
        console.warn('Could not send booking confirmation to conversation:', error);
        // Non-critical error, booking was still created
      }
    }

    // Return successful result
    const message = body.functionResult.functionName === 'cancel_booking'
      ? 'Booking cancelled successfully'
      : 'Booking created successfully';

    return NextResponse.json({
      success: true,
      booking: result.data,
      message: message
    });

  } catch (error) {
    console.error('Error approving booking:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to approve booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
