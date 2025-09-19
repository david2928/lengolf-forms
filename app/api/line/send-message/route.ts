import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabaseAdmin } from '@/lib/refac-supabase';
import { createLineClient } from '@/lib/line-messaging';

interface SendMessageRequest {
  userId: string;
  message: string;
  type?: 'text' | 'flex';
}

/**
 * Send message to LINE user
 * POST /api/line/send-message
 */
export async function POST(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user is staff or admin
    const { data: user, error: userError } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('allowed_users')
      .select('is_admin, is_staff')
      .eq('email', session.user.email)
      .single();

    if (userError || (!user?.is_admin && !user?.is_staff)) {
      return NextResponse.json({ error: "Staff access required" }, { status: 403 });
    }

    const { userId, message, type = 'text' }: SendMessageRequest = await request.json();

    // Validate input
    if (!userId || !message) {
      return NextResponse.json(
        { error: 'userId and message are required' },
        { status: 400 }
      );
    }

    if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      console.error('LINE_CHANNEL_ACCESS_TOKEN not configured');
      return NextResponse.json(
        { error: 'LINE messaging not configured' },
        { status: 500 }
      );
    }

    // Create LINE client and send message
    const lineClient = createLineClient(process.env.LINE_CHANNEL_ACCESS_TOKEN);

    console.log(`Sending ${type} message to user: ${userId}`);
    console.log(`Message: ${message}`);

    // Use push message API to send directly to user
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        to: userId,
        messages: [
          {
            type: 'text',
            text: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LINE API error: ${response.status} ${response.statusText} - ${errorText}`);

      let errorMessage = 'Failed to send message';
      if (response.status === 401) {
        errorMessage = 'LINE API authentication failed - check your access token';
      } else if (response.status === 400) {
        errorMessage = 'Invalid request - user may not be reachable';
      }

      return NextResponse.json(
        { error: errorMessage, details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('Message sent successfully:', result);

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      messageId: result.sentMessages?.[0]?.id
    });

  } catch (error) {
    console.error('Error sending LINE message:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}