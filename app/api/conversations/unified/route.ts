import { NextRequest, NextResponse } from "next/server";
import { refacSupabase } from '@/lib/refac-supabase';

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

    return NextResponse.json({
      success: true,
      conversations: data || []
    });

  } catch (error) {
    console.error('Error in unified conversations API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}