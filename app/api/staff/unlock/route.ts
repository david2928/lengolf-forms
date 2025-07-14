import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getDevSession } from '@/lib/dev-session';
import { isUserAdmin } from '@/lib/auth';
import { unlockStaffAccount, getStaffById } from '@/lib/staff-utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * POST /api/staff/unlock - Manually unlock staff account
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
    const body = await request.json();
    const { staff_id } = body;

    // Validate required fields
    if (!staff_id) {
      return NextResponse.json(
        { error: 'Staff ID is required' },
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

    // Get current staff data to check if they exist and are locked
    const currentStaff = await getStaffById(staff_id);
    if (!currentStaff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    // Check if staff member is actually locked
    const isCurrentlyLocked = currentStaff.locked_until ? new Date(currentStaff.locked_until) > new Date() : false;
    
    if (!isCurrentlyLocked && currentStaff.failed_attempts === 0) {
      return NextResponse.json({
        success: true,
        message: 'Staff account is not locked',
        data: {
          staff_id: staff_id,
          staff_name: currentStaff.staff_name,
          was_locked: false
        }
      });
    }

    // Unlock the staff account
    await unlockStaffAccount(staff_id, session.user.email);

    console.log('Staff account unlocked successfully:', {
      staff_id: staff_id,
      staff_name: currentStaff.staff_name,
      unlocked_by: session.user.email,
      previous_failed_attempts: currentStaff.failed_attempts,
      was_locked_until: currentStaff.locked_until
    });

    return NextResponse.json({
      success: true,
      message: 'Staff account unlocked successfully',
      data: {
        staff_id: staff_id,
        staff_name: currentStaff.staff_name,
        was_locked: isCurrentlyLocked,
        failed_attempts_cleared: currentStaff.failed_attempts
      }
    });

  } catch (error) {
    console.error('Error in POST /api/staff/unlock:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 