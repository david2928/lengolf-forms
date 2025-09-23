import { NextRequest, NextResponse } from "next/server";
import { refacSupabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params;

    if (!refacSupabase) {
      return NextResponse.json({
        success: false,
        error: 'Database client not available'
      }, { status: 500 });
    }

    // Fetch messages for the website conversation
    const { data: messages, error } = await refacSupabase
      .from('web_chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching website messages:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Transform website messages to match LINE message format for compatibility
    const transformedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      text: msg.message_text,
      type: 'text',
      senderType: (msg.sender_type === 'staff' || msg.sender_type === 'bot') ? 'admin' : 'user',
      senderName: msg.sender_name || (msg.sender_type === 'customer' ? 'Website User' : 'Admin'),
      createdAt: msg.created_at,
      timestamp: new Date(msg.created_at).getTime()
    }));

    return NextResponse.json({
      success: true,
      messages: transformedMessages
    });

  } catch (error) {
    console.error('Error in website messages API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}