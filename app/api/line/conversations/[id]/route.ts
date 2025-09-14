import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Get messages for a specific conversation
 * GET /api/line/conversations/[id]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('line_conversations')
      .select(`
        id,
        line_user_id,
        customer_id,
        unread_count,
        line_users!inner (
          display_name,
          picture_url
        ),
        customers (
          id,
          customer_name,
          contact_number,
          email
        )
      `)
      .eq('id', conversationId)
      .single();

    if (conversationError) {
      console.error('Error fetching conversation:', conversationError);
      throw conversationError;
    }

    // Get messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('line_messages')
      .select(`
        id,
        message_text,
        message_type,
        sender_type,
        sender_name,
        timestamp,
        created_at,
        is_read
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw messagesError;
    }

    // Format messages
    const formattedMessages = messages?.map(msg => ({
      id: msg.id,
      text: msg.message_text,
      type: msg.message_type,
      senderType: msg.sender_type, // 'user' or 'admin'
      senderName: msg.sender_name,
      timestamp: msg.timestamp,
      createdAt: msg.created_at,
      isRead: msg.is_read
    })) || [];

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        lineUserId: conversation.line_user_id,
        customerId: conversation.customer_id,
        unreadCount: conversation.unread_count,
        user: {
          displayName: (conversation as any).line_users.display_name,
          pictureUrl: (conversation as any).line_users.picture_url
        },
        customer: (conversation as any).customers ? {
          id: (conversation as any).customers.id,
          name: (conversation as any).customers.customer_name,
          phone: (conversation as any).customers.contact_number,
          email: (conversation as any).customers.email
        } : null
      },
      messages: formattedMessages
    });

  } catch (error) {
    console.error('Failed to fetch conversation messages:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Mark conversation messages as read
 * PUT /api/line/conversations/[id]
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { action } = await request.json();

    if (action === 'mark_read') {
      // Mark all messages in this conversation as read
      const { error: messagesError } = await supabase
        .from('line_messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .eq('is_read', false);

      if (messagesError) throw messagesError;

      // Reset unread count for conversation
      const { error: conversationError } = await supabase
        .from('line_conversations')
        .update({
          unread_count: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      if (conversationError) throw conversationError;

      return NextResponse.json({
        success: true,
        message: 'Conversation marked as read'
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Failed to update conversation:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}