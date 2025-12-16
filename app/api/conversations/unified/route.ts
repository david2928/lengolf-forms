import { NextRequest, NextResponse } from "next/server";
import { refacSupabase, refacSupabaseAdmin } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channelFilter = searchParams.get('channel');
    const includeInactive = searchParams.get('includeInactive') === 'true';

    if (!refacSupabase) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available'
      }, { status: 500 });
    }

    let query = refacSupabase
      .from('unified_conversations')
      .select('*')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    // Apply channel filter if specified
    if (channelFilter && ['line', 'website', 'facebook', 'instagram', 'whatsapp'].includes(channelFilter)) {
      query = query.eq('channel_type', channelFilter);
    }

    // Filter by active status
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching unified conversations:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Fetch assignee display names for conversations that have assigned_to
    const assignedEmails = [...new Set(
      (data || [])
        .filter(conv => conv.assigned_to)
        .map(conv => conv.assigned_to)
    )];

    let assigneeMap: Record<string, string> = {};
    if (assignedEmails.length > 0) {
      const { data: assignees } = await refacSupabaseAdmin
        .schema('backoffice')
        .from('allowed_users')
        .select('email, display_name')
        .in('email', assignedEmails);

      assigneeMap = (assignees || []).reduce((acc, assignee) => {
        acc[assignee.email] = assignee.display_name || assignee.email;
        return acc;
      }, {} as Record<string, string>);
    }

    // Enrich conversations with assignee display names
    const enrichedConversations = (data || []).map(conv => ({
      ...conv,
      assigned_to_name: conv.assigned_to ? assigneeMap[conv.assigned_to] || conv.assigned_to : null
    }));

    return NextResponse.json({
      success: true,
      conversations: enrichedConversations
    });

  } catch (error) {
    console.error('Error in unified conversations API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}