import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { StaffSLAMetrics, SLAAPIResponse } from '@/types/chat-sla';

/**
 * GET /api/chat-sla/staff-metrics
 * Get per-staff SLA performance metrics
 *
 * Query params:
 * - start_date: YYYY-MM-DD format (required)
 * - end_date: YYYY-MM-DD format (required)
 * - channel: line | website | facebook | instagram | whatsapp | meta (optional)
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json<SLAAPIResponse<StaffSLAMetrics[]>>(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
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
      return NextResponse.json<SLAAPIResponse<StaffSLAMetrics[]>>(
        { success: false, error: "Staff access required" },
        { status: 403 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const channel = searchParams.get('channel');

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json<SLAAPIResponse<StaffSLAMetrics[]>>(
        { success: false, error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json<SLAAPIResponse<StaffSLAMetrics[]>>(
        { success: false, error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Call database function
    const { data, error } = await refacSupabaseAdmin.rpc('get_chat_sla_by_staff', {
      start_date: startDate,
      end_date: endDate,
      channel_filter: channel || null
    });

    if (error) {
      console.error('Error fetching staff SLA metrics:', error);
      throw error;
    }

    return NextResponse.json<SLAAPIResponse<StaffSLAMetrics[]>>({
      success: true,
      data: (data || []) as StaffSLAMetrics[]
    });

  } catch (error) {
    console.error('Error in chat SLA staff metrics API:', error);
    return NextResponse.json<SLAAPIResponse<StaffSLAMetrics[]>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
