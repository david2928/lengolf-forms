import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import type { ConversationSLADetail, SLAAPIResponse } from '@/types/chat-sla';

/**
 * GET /api/chat-sla/conversation-details
 * Get detailed conversation-level SLA data for drill-down views
 *
 * Query params:
 * - start_date: YYYY-MM-DD format (required)
 * - end_date: YYYY-MM-DD format (required)
 * - sla_status: met | breached | unanswered | outside_business_hours (optional)
 * - channel: line | website | facebook | instagram | whatsapp | meta (optional)
 * - limit: number of results (optional, default 100)
 */
export async function GET(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json<SLAAPIResponse<ConversationSLADetail[]>>(
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
      return NextResponse.json<SLAAPIResponse<ConversationSLADetail[]>>(
        { success: false, error: "Staff access required" },
        { status: 403 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const slaStatus = searchParams.get('sla_status');
    const channel = searchParams.get('channel');
    const limitStr = searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : 100;

    // Validate required parameters
    if (!startDate || !endDate) {
      return NextResponse.json<SLAAPIResponse<ConversationSLADetail[]>>(
        { success: false, error: 'start_date and end_date are required' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      return NextResponse.json<SLAAPIResponse<ConversationSLADetail[]>>(
        { success: false, error: 'Dates must be in YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json<SLAAPIResponse<ConversationSLADetail[]>>(
        { success: false, error: 'Limit must be between 1 and 1000' },
        { status: 400 }
      );
    }

    // Call database function
    const { data, error } = await refacSupabaseAdmin.rpc('get_chat_sla_conversation_details', {
      start_date: startDate,
      end_date: endDate,
      sla_status_filter: slaStatus || null,
      channel_filter: channel || null,
      limit_count: limit
    });

    if (error) {
      console.error('Error fetching conversation SLA details:', error);
      throw error;
    }

    return NextResponse.json<SLAAPIResponse<ConversationSLADetail[]>>({
      success: true,
      data: (data || []) as ConversationSLADetail[]
    });

  } catch (error) {
    console.error('Error in chat SLA conversation details API:', error);
    return NextResponse.json<SLAAPIResponse<ConversationSLADetail[]>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
