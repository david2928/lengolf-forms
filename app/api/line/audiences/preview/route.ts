import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Preview audience size for given criteria
 * POST /api/line/audiences/preview
 */
export async function POST(request: NextRequest) {
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

    const { criteria_json } = await request.json();

    if (!criteria_json) {
      return NextResponse.json({
        success: false,
        error: 'Criteria JSON is required'
      }, { status: 400 });
    }

    // Calculate audience size
    const { data: audienceSize, error } = await refacSupabaseAdmin
      .rpc('calculate_audience_size', { criteria_json });

    if (error) {
      console.error('Error calculating audience size:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      estimated_size: audienceSize || 0,
      criteria: criteria_json
    });

  } catch (error) {
    console.error('Failed to preview audience:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
