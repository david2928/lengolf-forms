import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Send bay availability to a customer via their preferred channel
 * POST /api/bay-availability/send
 *
 * Body:
 * - conversationId: string (required) - The conversation ID
 * - channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp' (required)
 * - channelUserId: string (required) - LINE user ID or platform user ID
 * - availabilityMessage: string (required) - Formatted availability message
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, channelType, channelUserId, availabilityMessage } = body;

    if (!conversationId || !channelType || !channelUserId || !availabilityMessage) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversationId, channelType, channelUserId, availabilityMessage'
      }, { status: 400 });
    }

    // Send based on channel type
    if (channelType === 'line') {
      // Send plain text for LINE
      const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

      if (!channelAccessToken) {
        return NextResponse.json({
          success: false,
          error: 'LINE_CHANNEL_ACCESS_TOKEN not configured'
        }, { status: 500 });
      }

      const response = await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${channelAccessToken}`
        },
        body: JSON.stringify({
          to: channelUserId,
          messages: [{
            type: 'text',
            text: availabilityMessage
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return NextResponse.json({
          success: false,
          error: `LINE API error: ${response.status} - ${errorText}`
        }, { status: 500 });
      }

      // Save message to database so it appears in chat history
      const { error: insertError } = await refacSupabaseAdmin
        .from('line_messages')
        .insert({
          conversation_id: conversationId,
          line_user_id: channelUserId,
          message_text: availabilityMessage,
          message_type: 'text',
          sender_type: 'admin',
          sender_name: session.user.email || 'Admin',
          timestamp: Date.now(),
          is_read: true
        });

      if (insertError) {
        console.error('Failed to save LINE message to database:', insertError);
        // Don't fail the request - message was already sent successfully
      }

      // Update conversation's last message timestamp
      await refacSupabaseAdmin
        .from('line_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: 'Bay availability sent',
          last_message_by: 'admin'
        })
        .eq('id', conversationId);

      return NextResponse.json({
        success: true,
        message: 'Bay availability sent via LINE'
      });

    } else if (channelType === 'website') {
      // Send plain text for website chat
      const { error: insertError } = await refacSupabaseAdmin
        .from('web_chat_messages')
        .insert({
          conversation_id: conversationId,
          session_id: channelUserId,
          message_text: availabilityMessage,
          sender_type: 'staff',
          sender_name: 'Admin'
        });

      if (insertError) {
        return NextResponse.json({
          success: false,
          error: `Failed to save message: ${insertError.message}`
        }, { status: 500 });
      }

      // Update conversation's last message
      await refacSupabaseAdmin
        .from('web_chat_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: 'Bay availability sent',
          unread_count: 0
        })
        .eq('id', conversationId);

      return NextResponse.json({
        success: true,
        message: 'Bay availability sent via website chat'
      });

    } else if (['facebook', 'instagram', 'whatsapp'].includes(channelType)) {
      // Send plain text for Meta platforms
      const metaResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/meta/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platformUserId: channelUserId,
          message: availabilityMessage,
          platform: channelType,
          messageType: 'text'
        }),
      });

      const metaData = await metaResponse.json();

      if (!metaData.success) {
        return NextResponse.json({
          success: false,
          error: metaData.error || 'Failed to send Meta message'
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Bay availability sent via ${channelType}`
      });

    } else {
      return NextResponse.json({
        success: false,
        error: `Unsupported channel type: ${channelType}`
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Failed to send bay availability:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
