import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get list of all staff members for conversation assignment
 * GET /api/staff/list
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    // Get only allowed assignees (Ashley, Eak, David)
    const allowedEmails = [
      'vangoolashley39@gmail.com',    // Ashley
      'akarat.loeksirinukul@gmail.com', // Eak
      'dgeiermann@gmail.com'           // David (owner)
    ];

    const { data: staffList, error: staffError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('email, display_name, is_admin, is_staff')
      .in('email', allowedEmails)
      .order('display_name');

    if (staffError) {
      console.error('Error fetching staff list:', staffError);
      throw staffError;
    }

    const formattedStaff = (staffList || []).map((staff: any) => ({
      email: staff.email,
      displayName: staff.display_name || staff.email,
      isAdmin: staff.is_admin,
      isStaff: staff.is_staff
    }));

    return NextResponse.json({
      success: true,
      staff: formattedStaff,
      count: formattedStaff.length
    });

  } catch (error: any) {
    console.error('Error fetching staff list:', error);
    return NextResponse.json({
      error: "Failed to fetch staff list",
      details: error.message
    }, { status: 500 });
  }
}
