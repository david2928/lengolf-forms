import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createBookingConfirmationMessage, createBookingReminderMessage } from '@/lib/line/flex-templates';

const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Send rich LINE message (Flex Message)
 * POST /api/line/send-rich-message
 */
export async function POST(request: NextRequest) {
  try {
    const { conversationId, messageType, senderName = 'Admin' } = await request.json();

    if (!conversationId || !messageType) {
      return NextResponse.json({
        success: false,
        error: 'conversationId and messageType are required'
      }, { status: 400 });
    }

    // Get conversation details
    const { data: conversation, error: conversationError } = await supabase
      .from('line_conversations')
      .select('line_user_id, line_users!inner(display_name)')
      .eq('id', conversationId)
      .single();

    if (conversationError || !conversation) {
      return NextResponse.json({
        success: false,
        error: 'Conversation not found'
      }, { status: 404 });
    }

    // Generate mock booking data
    const mockBookingData = {
      bookingId: `BK${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      customerName: (conversation as any).line_users.display_name,
      date: 'December 15, 2024',
      time: '14:00 - 16:00',
      bay: '3',
      duration: '2 hours',
      packageName: 'Premium Golf Package',
      totalAmount: 1500,
      hoursUntil: 24
    };

    let flexMessage;
    let altText;

    // Create appropriate flex message based on type
    switch (messageType) {
      case 'booking_confirmation':
        flexMessage = createBookingConfirmationMessage(mockBookingData);
        altText = `Booking Confirmation - ${mockBookingData.date} ${mockBookingData.time}`;
        break;

      case 'booking_reminder':
        flexMessage = createBookingReminderMessage(mockBookingData);
        altText = `Booking Reminder - ${mockBookingData.date} ${mockBookingData.time}`;
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid message type'
        }, { status: 400 });
    }

    // Send Flex Message via LINE API
    const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: conversation.line_user_id,
        messages: [flexMessage]
      })
    });

    if (!lineResponse.ok) {
      const errorText = await lineResponse.text();
      console.error(`LINE API error: ${lineResponse.status} ${lineResponse.statusText} - ${errorText}`);

      return NextResponse.json({
        success: false,
        error: 'Failed to send rich message via LINE API',
        details: errorText
      }, { status: lineResponse.status });
    }

    // Store message in our database
    const { data: storedMessage, error: messageError } = await supabase
      .from('line_messages')
      .insert({
        conversation_id: conversationId,
        line_user_id: conversation.line_user_id,
        message_type: 'flex',
        message_text: altText,
        sender_type: 'admin',
        sender_name: senderName,
        timestamp: Date.now(),
        is_read: true,
        raw_event: {
          type: 'admin_flex_message',
          flex_type: messageType,
          booking_data: mockBookingData
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error storing flex message:', messageError);
    }

    // Update conversation
    const { error: updateError } = await supabase
      .from('line_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: `📋 ${messageType.replace('_', ' ')}`,
        last_message_by: 'admin',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    }

    return NextResponse.json({
      success: true,
      message: storedMessage ? {
        id: storedMessage.id,
        text: storedMessage.message_text,
        type: storedMessage.message_type,
        senderType: storedMessage.sender_type,
        senderName: storedMessage.sender_name,
        timestamp: storedMessage.timestamp,
        createdAt: storedMessage.created_at,
        isRead: storedMessage.is_read
      } : null,
      mockData: mockBookingData
    });

  } catch (error) {
    console.error('Failed to send rich message:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}