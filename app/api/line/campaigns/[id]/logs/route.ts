import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Get broadcast delivery logs for a campaign
 * GET /api/line/campaigns/[id]/logs
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: campaignId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = refacSupabaseAdmin
      .from('line_broadcast_logs')
      .select(`
        id,
        campaign_id,
        line_user_id,
        customer_id,
        status,
        error_message,
        line_message_id,
        sent_at
      `, { count: 'exact' })
      .eq('campaign_id', campaignId)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching broadcast logs:', error);
      throw error;
    }

    // Enrich logs with customer and LINE user data
    const enrichedLogs = await Promise.all((logs || []).map(async (log: any) => {
      const enrichedLog: any = { ...log };

      // Fetch customer data if customer_id exists
      if (log.customer_id) {
        const { data: customer } = await refacSupabaseAdmin
          .from('customers')
          .select('customer_name, contact_number')
          .eq('id', log.customer_id)
          .single();

        enrichedLog.customers = customer;
      }

      // Fetch LINE user data if line_user_id exists
      if (log.line_user_id) {
        const { data: lineUser } = await refacSupabaseAdmin
          .from('line_users')
          .select('display_name, picture_url')
          .eq('line_user_id', log.line_user_id)
          .single();

        enrichedLog.line_users = lineUser;
      }

      return enrichedLog;
    }));

    return NextResponse.json({
      success: true,
      logs: enrichedLogs,
      total: count || 0,
      limit,
      offset
    });

  } catch (error) {
    console.error('Failed to fetch broadcast logs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
