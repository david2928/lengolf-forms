import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Send a message in a conversation
 * POST /api/line/conversations/[id]/messages
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { message, senderName = 'Admin' } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({
        success: false,
        error: 'Message text is required'
      }, { status: 400 });
    }

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('line_conversations')
      .select('line_user_id')
      .eq('id', conversationId)
      .single();

    if (conversationError) {
      console.error('Error fetching conversation:', conversationError);
      throw conversationError;
    }

    if (!conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 });
    }

    // Send message via LINE API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: conversation.line_user_id,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error(`LINE API error: ${lineResponse.status} ${lineResponse.statusText} - ${errorText}`);

      return NextResponse.json({
        success: false,
        error: 'Failed to send message via LINE API',
        details: errorText
      }, { status: lineResponse.status });
    }

    // Store message in our database
    const { data: storedMessage, error: messageError } = await supabase
      .from('line_messages')
      .insert({
        conversation_id: conversationId,
        line_user_id: conversation.line_user_id,
        message_type: 'text',
        message_text: message,
        sender_type: 'admin',
        sender_name: senderName,
        timestamp: Date.now(),
        is_read: true // Admin messages are already "read" by admin
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error storing message:', messageError);
      throw messageError;
    }

    // Update conversation with last message info
    const { error: updateError } = await supabase
      .from('line_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: message,
        last_message_by: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: storedMessage.id,
        text: storedMessage.message_text,
        type: storedMessage.message_type,
        senderType: storedMessage.sender_type,
        senderName: storedMessage.sender_name,
        timestamp: storedMessage.timestamp,
        createdAt: storedMessage.created_at,
        isRead: storedMessage.is_read
      }
    });

  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}