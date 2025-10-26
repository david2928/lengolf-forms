import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { formatCoachingAvailabilityAsText, createCoachingAvailabilityMessage } from '@/lib/line/flex-templates';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';

/**
 * Helper function to fetch coaching availability
 */
async function getCoachingAvailability() {
  try {
    const today = new Date();
    const fourteenDaysLater = new Date(today);
    fourteenDaysLater.setDate(today.getDate() + 14);

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/coaching-assist/slots?fromDate=${today.toISOString().split('T')[0]}&toDate=${fourteenDaysLater.toISOString().split('T')[0]}`
    );

    if (!response.ok) {
      console.error('Failed to fetch coaching slots');
      return null;
    }

    const data = await response.json();
    return data.coaches || [];
  } catch (error) {
    console.error('Error fetching coaching availability:', error);
    return null;
  }
}

/**
 * Helper function to send LINE push message
 */
async function sendLineMessage(lineUserId: string, message: any): Promise<{ success: boolean; error?: string }> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    return { success: false, error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' };
  }

  try {
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${channelAccessToken}`
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [message]
      })
    });

    if (response.ok) {
      return { success: true };
    }

    const errorText = await response.text();
    return {
      success: false,
      error: `LINE API error: ${response.status} - ${errorText}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

/**
 * Send coaching availability to a customer via their preferred channel
 * POST /api/coaching/send-availability
 *
 * Body:
 * - conversationId: string (required) - The conversation ID
 * - channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp' (required)
 * - channelUserId: string (required) - LINE user ID or platform user ID
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { conversationId, channelType, channelUserId } = body;

    if (!conversationId || !channelType || !channelUserId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: conversationId, channelType, channelUserId'
      }, { status: 400 });
    }

    // Fetch coaching availability
    const coaches = await getCoachingAvailability();

    if (!coaches || coaches.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No coaching availability found for the next 14 days'
      }, { status: 404 });
    }

    // Send based on channel type
    if (channelType === 'line') {
      // Send rich Flex message carousel for LINE
      // For testing, we'll include unsubscribe with real test audience
      const flexMessage = createCoachingAvailabilityMessage(coaches, {
        includeUnsubscribe: true,
        campaignId: 'test-campaign-' + Date.now(),
        audienceId: '4a619615-26b4-4f33-8931-177abc711a66'  // Real test audience ID
      });

      const result = await sendLineMessage(channelUserId, flexMessage);

      if (!result.success) {
        return NextResponse.json({
          success: false,
          error: result.error || 'Failed to send LINE message'
        }, { status: 500 });
      }

      // Save message to database so it appears in chat history
      const { error: insertError } = await refacSupabaseAdmin
        .from('line_messages')
        .insert({
          conversation_id: conversationId,
          line_user_id: channelUserId,
          message_text: 'Coaching availability (carousel)',
          message_type: 'flex',
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
          last_message_text: 'Coaching availability sent',
          last_message_by: 'admin'
        })
        .eq('id', conversationId);

      return NextResponse.json({
        success: true,
        message: 'Coaching availability sent via LINE (Flex carousel)'
      });

    } else if (channelType === 'website') {
      // Send plain text for website chat
      const textMessage = formatCoachingAvailabilityAsText(coaches);

      const { error: insertError } = await refacSupabaseAdmin
        .from('web_chat_messages')
        .insert({
          conversation_id: conversationId,
          session_id: channelUserId,
          message_text: textMessage,
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
          last_message_text: 'Coaching availability sent',
          unread_count: 0
        })
        .eq('id', conversationId);

      return NextResponse.json({
        success: true,
        message: 'Coaching availability sent via website chat'
      });

    } else if (['facebook', 'instagram', 'whatsapp'].includes(channelType)) {
      // Send plain text for Meta platforms
      const textMessage = formatCoachingAvailabilityAsText(coaches);

      const metaResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/meta/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platformUserId: channelUserId,
          message: textMessage,
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
        message: `Coaching availability sent via ${channelType}`
      });

    } else {
      return NextResponse.json({
        success: false,
        error: `Unsupported channel type: ${channelType}`
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Failed to send coaching availability:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
