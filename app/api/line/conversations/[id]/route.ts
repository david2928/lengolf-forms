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

    // Get messages for this conversation (direct messages from users + admin messages)
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
        is_read,
        file_url,
        file_name,
        file_size,
        file_type,
        raw_event,
        quote_token,
        replied_to_message_id,
        reply_preview_text,
        reply_preview_type,
        reply_sender_name,
        reply_sender_type,
        reply_sender_picture_url
      `)
      .eq('conversation_id', conversationId)
      .in('sender_type', ['user', 'admin']) // Include only user and admin messages
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
      throw messagesError;
    }

    // Format messages
    const formattedMessages = messages?.map(msg => {
      const rawMessage = msg.raw_event?.message;

      return {
        id: msg.id,
        text: msg.message_text,
        type: msg.message_type,
        senderType: msg.sender_type, // 'user' or 'admin'
        senderName: msg.sender_name,
        timestamp: msg.timestamp,
        createdAt: msg.created_at,
        isRead: msg.is_read,
        // Include file information (images, PDFs, etc.)
        ...(msg.file_url && {
          fileUrl: msg.file_url,
          fileName: msg.file_name,
          fileSize: msg.file_size,
          fileType: msg.file_type
        }),
        // Include sticker information if it's a sticker message
        ...(msg.message_type === 'sticker' && rawMessage && {
          packageId: rawMessage.packageId,
          stickerId: rawMessage.stickerId,
          stickerKeywords: rawMessage.keywords || []
        }),
        // Legacy image support (fallback to LINE API if no stored file)
        ...((msg.message_type === 'image' && !msg.file_url) && rawMessage && {
          imageUrl: `https://api.line.me/v2/bot/message/${rawMessage.id}/content`
        }),
        // Include reply information
        ...(msg.quote_token && {
          quoteToken: msg.quote_token
        }),
        ...(msg.replied_to_message_id && {
          repliedToMessageId: msg.replied_to_message_id,
          replyPreviewText: msg.reply_preview_text,
          replyPreviewType: msg.reply_preview_type,
          // Use the stored sender information, fallback to conversation user for legacy data
          repliedToMessage: {
            id: msg.replied_to_message_id,
            text: msg.reply_preview_text,
            type: msg.reply_preview_type || 'text',
            senderName: msg.reply_sender_name || (msg.reply_sender_type === 'admin' ? 'LENGOLF' : (conversation as any).line_users?.display_name || 'User'),
            senderType: msg.reply_sender_type || 'user',
            pictureUrl: msg.reply_sender_picture_url || (msg.reply_sender_type === 'admin' ? '/favicon.svg' : (conversation as any).line_users?.picture_url),
            fileName: null
          }
        }),
        // Include raw_event for rich message previews (Flex Messages, booking confirmations, etc.)
        ...(msg.raw_event && {
          rawEvent: msg.raw_event
        })
      };
    }) || [];

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