import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions';
import { sendPushNotificationForWebsiteMessage } from '@/lib/website/notification-handler';

/**
 * Website Chat Webhook endpoint
 * Receives notifications from database triggers when customers send website chat messages
 * Follows the same pattern as LINE and Meta webhook handlers
 */

interface WebsiteWebhookPayload {
  conversation_id: string;
  message_text: string;
  session_id: string;
  user_id?: string;
  created_at: string;
}

export async function POST(request: NextRequest) {
  console.log('Website chat webhook received');

  try {
    // Step 1: Basic security check using secret header
    const webhookSecret = request.headers.get('X-Webhook-Secret');
    const expectedSecret = process.env.WEBSITE_WEBHOOK_SECRET;

    if (expectedSecret && webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2: Parse JSON payload
    let payload: WebsiteWebhookPayload;
    try {
      const rawBody = await request.text();
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse webhook JSON:', parseError);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Step 3: Validate required fields
    if (!payload.conversation_id || !payload.message_text || !payload.session_id) {
      console.error('Missing required fields:', payload);
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Step 4: Return 200 immediately to prevent database trigger timeouts
    const response = NextResponse.json({ success: true }, { status: 200 });

    // Step 5: Process notification in background using waitUntil
    waitUntil(
      sendPushNotificationForWebsiteMessage(
        payload.conversation_id,
        payload.message_text,
        payload.session_id,
        payload.user_id
      )
        .then(() => {
          console.log('Website chat notification sent successfully');
        })
        .catch((error) => {
          console.error('Error sending website chat notification:', error);
        })
    );

    return response;

  } catch (error) {
    console.error('Website chat webhook processing error:', error);

    if (error instanceof Error) {
      if (error.message.includes('secret')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Handle GET requests for webhook verification (optional)
 * Useful for testing webhook connectivity
 */
export async function GET(request: NextRequest) {
  console.log('Website chat webhook verification request');

  try {
    const { searchParams } = new URL(request.url);
    const verify = searchParams.get('verify');

    if (verify === 'true') {
      return NextResponse.json({
        status: 'Website chat webhook is active',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid verification request' }, { status: 400 });

  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json({
      error: 'Verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}