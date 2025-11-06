import { NextRequest, NextResponse } from 'next/server';
import { refacSupabase } from '@/lib/refac-supabase';

/**
 * GET /api/conversations/unified/[id]
 * Fetch a single conversation with full details from unified_conversations view
 * Used by real-time handler to get properly formatted conversation data
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

    // Fetch single conversation from unified view
    const { data, error } = await refacSupabase
      .from('unified_conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching conversation:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch conversation' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Transform to format expected by frontend (same logic as useUnifiedChat)
    const conversation = transformConversation(data);

    return NextResponse.json({
      success: true,
      conversation
    });

  } catch (error) {
    console.error('Error in GET /api/conversations/unified/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Transform unified conversation data to legacy format
 * This matches the transformation logic in useUnifiedChat.ts
 */
function transformConversation(conv: any) {
  const resolvePreferredName = (metadata: any, fallback: string) => {
    if (!metadata) return fallback;

    const candidates = [
      metadata.customer_name,
      metadata.display_name,
      metadata.displayName,
      metadata.full_name,
      metadata.username,
      metadata.ig_username,
      metadata.profile_name,
      metadata.profileName,
      metadata.name,
      metadata.sender_name
    ];

    const resolved = candidates.find(name => typeof name === 'string' && name.trim().length > 0);
    return resolved || fallback;
  };

  if (conv.channel_type === 'line') {
    // LINE conversation
    return {
      id: conv.id,
      lineUserId: conv.channel_user_id,
      customerId: conv.customer_id,
      lastMessageAt: conv.last_message_at,
      lastMessageText: conv.last_message_text,
      lastMessageBy: conv.last_message_by,
      lastMessageType: 'text',
      unreadCount: conv.unread_count || 0,
      user: {
        displayName: resolvePreferredName(conv.channel_metadata, 'Unknown User'),
        pictureUrl: conv.channel_metadata?.picture_url || '',
        lineUserId: conv.channel_user_id,
        customerId: conv.customer_id
      },
      customer: conv.customer_id ? {
        id: conv.customer_id,
        name: resolvePreferredName({
          customer_name: conv.channel_metadata?.customer_name,
          display_name: conv.channel_metadata?.display_name
        }, 'Customer'),
        phone: '',
        email: ''
      } : null,
      channelType: 'line' as const,
      channelMetadata: conv.channel_metadata,
      isFollowing: conv.is_following || false,
      markedUnreadAt: conv.marked_unread_at,
      followUpAt: conv.follow_up_at,
      isSpam: conv.is_spam || false,
      markedSpamAt: conv.marked_spam_at
    };
  } else if (conv.channel_type === 'website') {
    // Website conversation
    return {
      id: conv.id,
      lineUserId: conv.channel_user_id,
      customerId: conv.customer_id,
      lastMessageAt: conv.last_message_at,
      lastMessageText: conv.last_message_text,
      lastMessageBy: conv.last_message_by,
      lastMessageType: 'text',
      unreadCount: conv.unread_count || 0,
      user: {
        displayName: resolvePreferredName(conv.channel_metadata, '') ||
                    (conv.channel_metadata?.email ? `Web User (${conv.channel_metadata.email})` : 'Website User'),
        pictureUrl: '/LG_Logo_Big.jpg',
        lineUserId: conv.channel_user_id,
        customerId: conv.customer_id
      },
      customer: conv.customer_id ? {
        id: conv.customer_id,
        name: resolvePreferredName({
          customer_name: conv.channel_metadata?.customer_name,
          display_name: conv.channel_metadata?.display_name
        }, 'Customer'),
        phone: '',
        email: ''
      } : null,
      channelType: 'website' as const,
      channelMetadata: conv.channel_metadata,
      isFollowing: conv.is_following || false,
      markedUnreadAt: conv.marked_unread_at,
      followUpAt: conv.follow_up_at,
      isSpam: conv.is_spam || false,
      markedSpamAt: conv.marked_spam_at
    };
  } else if (['facebook', 'instagram', 'whatsapp'].includes(conv.channel_type)) {
    // Meta platforms
    const platformName = conv.channel_type.charAt(0).toUpperCase() + conv.channel_type.slice(1);
    return {
      id: conv.id,
      lineUserId: conv.channel_user_id,
      customerId: conv.customer_id,
      lastMessageAt: conv.last_message_at,
      lastMessageText: conv.last_message_text,
      lastMessageBy: conv.last_message_by,
      lastMessageType: 'text',
      unreadCount: conv.unread_count || 0,
      user: {
        displayName: resolvePreferredName(conv.channel_metadata, `${platformName} User`),
        pictureUrl: conv.channel_metadata?.profile_pic || '',
        lineUserId: conv.channel_user_id,
        customerId: conv.customer_id
      },
      customer: conv.customer_id ? {
        id: conv.customer_id,
        name: resolvePreferredName({
          customer_name: conv.channel_metadata?.customer_name,
          display_name: conv.channel_metadata?.display_name
        }, 'Customer'),
        phone: conv.channel_metadata?.phone_number || '',
        email: ''
      } : null,
      channelType: conv.channel_type as 'facebook' | 'instagram' | 'whatsapp',
      channelMetadata: conv.channel_metadata,
      isFollowing: conv.is_following || false,
      markedUnreadAt: conv.marked_unread_at,
      followUpAt: conv.follow_up_at,
      isSpam: conv.is_spam || false,
      markedSpamAt: conv.marked_spam_at
    };
  } else {
    // Unknown channel type - fallback
    return {
      id: conv.id,
      lineUserId: conv.channel_user_id,
      customerId: conv.customer_id,
      lastMessageAt: conv.last_message_at,
      lastMessageText: conv.last_message_text,
      lastMessageBy: conv.last_message_by,
      lastMessageType: 'text',
      unreadCount: conv.unread_count || 0,
      user: {
        displayName: resolvePreferredName(conv.channel_metadata, 'Unknown User'),
        pictureUrl: conv.channel_metadata?.profile_pic || '',
        lineUserId: conv.channel_user_id,
        customerId: conv.customer_id
      },
      customer: conv.customer_id ? {
        id: conv.customer_id,
        name: resolvePreferredName({
          customer_name: conv.channel_metadata?.customer_name,
          display_name: conv.channel_metadata?.display_name
        }, 'Customer'),
        phone: '',
        email: ''
      } : null,
      channelType: conv.channel_type as any,
      channelMetadata: conv.channel_metadata,
      isFollowing: conv.is_following || false,
      markedUnreadAt: conv.marked_unread_at,
      followUpAt: conv.follow_up_at,
      isSpam: conv.is_spam || false,
      markedSpamAt: conv.marked_spam_at
    };
  }
}
