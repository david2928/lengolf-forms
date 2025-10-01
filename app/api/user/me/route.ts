import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * GET /api/user/me - Get current user information
 * Returns the current user's staff display name from the allowed_users table
 */
export async function GET(request: NextRequest) {
  try {
    // Get session using dev-aware session helper
    const session = await getDevSession(authOptions, request);

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query allowed_users table for staff display name
    const { data: userData, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('display_name, coach_display_name, coach_name, email, is_staff, is_admin, is_coach')
      .eq('email', session.user.email.toLowerCase())
      .single();

    if (error) {
      console.error('Error fetching user data:', error);

      // Fallback to email username if user not found
      const emailUsername = session.user.email.split('@')[0];
      return NextResponse.json({
        success: true,
        data: {
          email: session.user.email,
          staffDisplayName: emailUsername,
          isStaff: false,
          isAdmin: false,
          isCoach: false
        }
      });
    }

    // Determine the best display name to use - prioritize display_name over legacy fields
    let staffDisplayName = userData.display_name?.trim() ||
                           userData.coach_display_name?.trim() ||
                           userData.coach_name?.trim() ||
                           session.user.email.split('@')[0];

    return NextResponse.json({
      success: true,
      data: {
        email: userData.email,
        staffDisplayName,
        isStaff: userData.is_staff || false,
        isAdmin: userData.is_admin || false,
        isCoach: userData.is_coach || false
      }
    });

  } catch (error) {
    console.error('Error in GET /api/user/me:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
