import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getDevSession } from '@/lib/dev-session';
import { isUserAdmin } from '@/lib/auth';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { 
  hashPin, 
  validatePinFormat,
  logStaffAction,
  getStaffById 
} from '@/lib/staff-utils';
import { ResetPinRequest } from '@/types/staff';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/staff/reset-pin - Reset staff member PIN
 * Admin authentication required
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userIsAdmin = await isUserAdmin(session.user.email);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse request body
    const body: ResetPinRequest & { staff_id: number } = await request.json();
    const { staff_id, new_pin } = body;

    // Validate required fields
    if (!staff_id || !new_pin) {
      return NextResponse.json(
        { error: 'Staff ID and new PIN are required' },
        { status: 400 }
      );
    }

    // Validate staff ID is a number
    if (typeof staff_id !== 'number' || isNaN(staff_id)) {
      return NextResponse.json(
        { error: 'Invalid staff ID format' },
        { status: 400 }
      );
    }

    // Validate PIN format
    const pinValidation = validatePinFormat(new_pin);
    if (!pinValidation.valid) {
      return NextResponse.json(
        { error: pinValidation.error },
        { status: 400 }
      );
    }

    // Get current staff data
    const currentStaff = await getStaffById(staff_id);
    if (!currentStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Hash the new PIN
    let hashedPin: string;
    try {
      hashedPin = await hashPin(new_pin);
    } catch (error) {
      console.error('Error hashing new PIN:', error);
      return NextResponse.json(
        { error: 'Error processing new PIN' },
        { status: 500 }
      );
    }

    // Reset PIN and clear any lockout status
    // IMPORTANT: Update both pin_hash AND clear_pin for compatibility with optimized verification
    const { error: updateError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('staff')
      .update({
        pin_hash: hashedPin,
        clear_pin: new_pin,  // Store clear PIN for fast verification
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', staff_id);

    if (updateError) {
      console.error('Error resetting PIN:', updateError);
      return NextResponse.json({ error: 'Failed to reset PIN' }, { status: 500 });
    }

    // Log the PIN reset in audit trail
    await logStaffAction(
      staff_id,
      'pin_changed',
      'admin',
      session.user.email,
      `PIN reset for staff member: ${currentStaff.staff_name}${currentStaff.staff_id ? ` (ID: ${currentStaff.staff_id})` : ''}`,
      'Admin PIN reset - failed attempts and lockout cleared',
      {
        staff_name: currentStaff.staff_name,
        staff_id: currentStaff.staff_id,
        failed_attempts: currentStaff.failed_attempts,
        locked_until: currentStaff.locked_until
      },
      {
        staff_name: currentStaff.staff_name,
        staff_id: currentStaff.staff_id,
        failed_attempts: 0,
        locked_until: null,
        pin_changed: true
      }
    );

    console.log('PIN reset successfully:', {
      staff_id: staff_id,
      staff_name: currentStaff.staff_name,
      reset_by: session.user.email,
      failed_attempts_cleared: currentStaff.failed_attempts,
      lockout_cleared: !!currentStaff.locked_until
    });

    return NextResponse.json({
      success: true,
      message: 'PIN reset successfully',
      data: {
        staff_id: staff_id,
        staff_name: currentStaff.staff_name,
        failed_attempts_cleared: currentStaff.failed_attempts > 0,
        lockout_cleared: !!currentStaff.locked_until
      }
    });

  } catch (error) {
    console.error('Error in POST /api/staff/reset-pin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 