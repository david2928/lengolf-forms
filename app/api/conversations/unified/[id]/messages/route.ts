import { NextRequest, NextResponse } from 'next/server';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * GET /api/conversations/unified/[id]/messages
 * Fetch messages for a conversation from unified_messages view
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    if (!refacSupabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Database client not available' },
        { status: 500 }
      );
    }

    // First get the conversation to determine channel type
    const { data: conversation, error: convError } = await refacSupabaseAdmin
      .from('unified_conversations')
      .select('channel_type')
      .eq('id', id)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Fetch messages from unified_messages view
    const { data: messages, error: msgError } = await refacSupabaseAdmin
      .from('unified_messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (msgError) {
      console.error('Error fetching messages:', msgError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Transform to common format (snake_case for analyze endpoint compatibility)
    const transformedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      content_type: msg.content_type || 'text',
      sender_type: msg.sender_type === 'user' ? 'user' : 'admin',
      sender_name: msg.sender_name,
      created_at: msg.created_at,
    }));

    return NextResponse.json({
      success: true,
      messages: transformedMessages,
      count: transformedMessages.length,
    });

  } catch (error) {
    console.error('Error in GET /api/conversations/unified/[id]/messages:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
