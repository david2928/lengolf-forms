import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getDevSession } from '@/lib/dev-session';
import { isUserAdmin } from '@/lib/auth';
import { getStaffStatus } from '@/lib/staff-utils';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/staff/status - Get status overview for all staff members
 * Admin authentication required
 */
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const staffId = searchParams.get('staffId');

    // Get staff status
    const staffStatus = await getStaffStatus(staffId ? parseInt(staffId) : undefined);

    // Calculate summary statistics
    const summary = {
      total_staff: staffStatus.length,
      active_staff: staffStatus.filter(s => s.is_active).length,
      currently_clocked_in: staffStatus.filter(s => s.currently_clocked_in).length,
      locked_accounts: staffStatus.filter(s => s.is_currently_locked).length,
      failed_attempt_warnings: staffStatus.filter(s => s.failed_attempts >= 5).length
    };

    return NextResponse.json({
      success: true,
      data: staffStatus,
      summary: summary
    });

  } catch (error) {
    console.error('Error in GET /api/staff/status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 