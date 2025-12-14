import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's display name from allowed_users table
    const { data: userData, error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('email, display_name')
      .eq('email', session.user.email.toLowerCase())
      .single();

    if (error) {
      console.error('Error fetching user data:', error);
      // Fallback to session data if database query fails
      return NextResponse.json({
        success: true,
        data: {
          email: session.user.email,
          staffDisplayName: session.user.name || 'Staff'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: userData.email,
        staffDisplayName: userData.display_name || session.user.name || 'Staff'
      }
    });

  } catch (error) {
    console.error('Error in /api/user/me:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
