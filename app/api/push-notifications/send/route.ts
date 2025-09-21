import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!;
const supabaseKey = process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // Check if this is an internal request from the webhook
    const isInternalRequest = request.headers.get('X-Internal-Request') === 'true';

    // For external requests, verify user session
    if (!isInternalRequest) {
      const session = await getDevSession(authOptions, request);
      if (!session?.user?.email) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const body = await request.json();
    const {
      title,
      body: messageBody,
      conversationId,
      lineUserId,
      customerName,
      targetUsers // Optional: specific users to notify, otherwise notify all
    } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { error: 'Title and message body are required' },
        { status: 400 }
      );
    }

    // Get active subscriptions
    let query = supabase
      .schema('backoffice')
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    // If specific users are targeted, filter by those emails
    if (targetUsers && Array.isArray(targetUsers) && targetUsers.length > 0) {
      query = query.in('user_email', targetUsers);
    }

    const { data: subscriptions, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { success: true, message: 'No active subscriptions found', sent: 0 },
        { status: 200 }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      title,
      body: messageBody,
      conversationId,
      lineUserId,
      customerName,
      url: conversationId ? `/staff/line-chat?conversation=${conversationId}` : '/staff/line-chat'
    };

    // Import web-push dynamically
    const webpush = await import('web-push') as any;

    // Configure web-push
    webpush.default.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );

    // Send notifications to all active subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh_key,
            auth: subscription.auth_key
          }
        };

        await webpush.default.sendNotification(
          pushSubscription,
          JSON.stringify(notificationPayload)
        );

        return { success: true, email: subscription.user_email };
      } catch (error) {
        console.error(`Failed to send push notification to ${subscription.user_email}:`, error);

        // If subscription is invalid (410 Gone), deactivate it
        if ((error as any)?.statusCode === 410) {
          await supabase
            .schema('backoffice')
            .from('push_subscriptions')
            .update({ is_active: false })
            .eq('id', subscription.id);
        }

        return { success: false, email: subscription.user_email, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(sendPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    return NextResponse.json(
      {
        success: true,
        message: `Notifications sent to ${successful} users`,
        sent: successful,
        failed: failed.length,
        failedEmails: failed.map(f => f.email)
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending push notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Test endpoint for manual testing
export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Send test notification to current user
    const testNotification = {
      title: 'Test LINE Chat Notification',
      body: 'This is a test notification from the LINE Chat system',
      customerName: 'Test Customer',
      conversationId: 'test-123'
    };

    // Use POST logic but only for current user
    const response = await fetch(`${request.nextUrl.origin}/api/push-notifications/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || ''
      },
      body: JSON.stringify({
        ...testNotification,
        targetUsers: [session.user.email]
      })
    });

    const result = await response.json();

    return NextResponse.json(
      {
        success: true,
        message: 'Test notification sent',
        result
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}