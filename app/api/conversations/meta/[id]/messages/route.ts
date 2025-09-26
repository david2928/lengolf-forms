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

    // Fetch messages for the Meta conversation
    const { data: messages, error } = await refacSupabase
      .from('meta_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching Meta messages:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Get unique platform user IDs to fetch profile pictures
    const platformUserIds = Array.from(new Set((messages || []).map((msg: any) => msg.platform_user_id)));

    // Fetch user profile pictures
    const { data: users } = await refacSupabase
      .from('meta_users')
      .select('platform_user_id, profile_pic')
      .in('platform_user_id', platformUserIds);

    // Create user profile picture lookup
    const userProfileMap = new Map();
    (users || []).forEach((user: any) => {
      userProfileMap.set(user.platform_user_id, user.profile_pic);
    });

    // Create a lookup map for replied message data
    const messageMap = new Map();
    (messages || []).forEach((msg: any) => {
      messageMap.set(msg.id, {
        id: msg.id,
        text: msg.message_text,
        type: msg.message_type,
        senderName: msg.sender_name,
        senderType: msg.sender_type,
        pictureUrl: userProfileMap.get(msg.platform_user_id) // Add profile picture
      });
    });

    // Transform Meta messages to match LINE message format for compatibility
    const transformedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      platformMessageId: msg.platform_message_id, // Include platform message ID for replies
      text: msg.message_text,
      type: msg.message_type || 'text',
      senderType: msg.sender_type === 'business' ? 'admin' : 'user',
      senderName: msg.sender_name,
      createdAt: msg.created_at,
      timestamp: new Date(msg.created_at).getTime(),
      // Include file information if available
      ...(msg.file_url && {
        fileUrl: msg.file_url,
        fileName: msg.file_name,
        fileSize: msg.file_size,
        fileType: msg.file_type
      }),
      // Include image information if available
      ...(msg.image_url && {
        imageUrl: msg.image_url
      }),
      // Include reply information if available
      ...(msg.reply_to_message_id && {
        repliedToMessageId: msg.reply_to_message_id,
        replyPreviewText: msg.reply_preview_text,
        replyPreviewType: msg.reply_preview_type,
        // Create repliedToMessage object for UI display (similar to LINE)
        repliedToMessage: msg.reply_to_message_id ? (() => {
          const repliedMsg = messageMap.get(msg.reply_to_message_id);
          return {
            id: msg.reply_to_message_id,
            text: repliedMsg?.text || msg.reply_preview_text,
            type: repliedMsg?.type || msg.reply_preview_type || 'text',
            senderName: repliedMsg?.senderName || 'User',
            senderType: repliedMsg?.senderType === 'business' ? 'admin' : 'user',
            pictureUrl: repliedMsg?.pictureUrl // Add profile picture to reply context
          };
        })() : null
      })
    }));

    return NextResponse.json({
      success: true,
      messages: transformedMessages
    });

  } catch (error) {
    console.error('Error in Meta messages API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}