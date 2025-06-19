import { NextRequest, NextResponse } from 'next/server';
import { verifyStaffPin } from '@/lib/staff-utils';
import { DateTime } from 'luxon';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/time-clock/status/[pin] - Check staff current status
 * Public endpoint - no authentication required (PIN-based verification)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { pin: string } }
) {
  try {
    const { pin } = params;

    // Validate PIN parameter
    if (!pin) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'PIN is required' 
        },
        { status: 400 }
      );
    }

    // Verify PIN and get staff status
    const pinVerification = await verifyStaffPin(pin);
    
    if (!pinVerification.success) {
      return NextResponse.json(
        {
          success: false,
          message: pinVerification.message,
          is_locked: pinVerification.is_locked,
          lock_expires_at: pinVerification.lock_expires_at
        },
        { status: 401 }
      );
    }

    // Return staff status information
    const currentTime = DateTime.now().setZone('Asia/Bangkok');
    
    return NextResponse.json({
      success: true,
      staff_id: pinVerification.staff_id,
      staff_name: pinVerification.staff_name,
      currently_clocked_in: pinVerification.currently_clocked_in,
      is_locked: pinVerification.is_locked,
      lock_expires_at: pinVerification.lock_expires_at,
      next_action: pinVerification.currently_clocked_in ? 'clock_out' : 'clock_in',
      server_time: currentTime.toISO(),
      server_time_display: currentTime.toFormat('MMM dd, yyyy h:mm a'),
      message: pinVerification.currently_clocked_in 
        ? `${pinVerification.staff_name} is currently clocked in`
        : `${pinVerification.staff_name} is currently clocked out`
    });

  } catch (error) {
    console.error('Error in GET /api/time-clock/status/[pin]:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'System error while checking status'
      },
      { status: 500 }
    );
  }
} 