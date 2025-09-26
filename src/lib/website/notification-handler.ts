import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (same as LINE handler)
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Send push notification for new website chat message
 * Follows the same pattern as LINE and Meta notification handlers
 */
export async function sendPushNotificationForWebsiteMessage(
  conversationId: string,
  messageText: string,
  sessionId: string,
  userId?: string
): Promise<void> {
  try {
    // Get customer info for notification display
    let customerName = 'Website User';
    let customerEmail = '';

    try {
      // Try to get user info from web_chat_sessions
      const { data: sessionData } = await supabase
        .from('web_chat_sessions')
        .select('display_name, email, user_id')
        .eq('session_id', sessionId)
        .single();

      if (sessionData) {
        customerName = sessionData.display_name || 'Website User';
        customerEmail = sessionData.email || '';

        // If we have a user_id, try to get more context
        if (sessionData.user_id || userId) {
          const actualUserId = sessionData.user_id || userId;

          // Try to get customer context from backoffice
          const { data: customerData } = await supabase
            .schema('backoffice')
            .from('customers')
            .select('name, email')
            .eq('user_id', actualUserId)
            .single();

          if (customerData) {
            customerName = customerData.name || customerName;
            customerEmail = customerData.email || customerEmail;
          }
        }
      }
    } catch (error) {
      console.error('Failed to get customer info for notification:', error);
      // Use fallback values
    }

    // Format customer display name for notification
    const displayName = customerName !== 'Website User'
      ? customerName
      : customerEmail
        ? `Web User (${customerEmail})`
        : 'Website User';

    // Get active subscriptions from backoffice schema
    const { data: subscriptions, error } = await supabase
      .schema('backoffice')
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found');
      return;
    }

    // Prepare notification payload
    const notificationPayload = {
      title: `🌐 New website message from ${displayName}`,
      body: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
      conversationId,
      platform: 'website',
      customerName: displayName,
      sessionId,
      url: `/staff/unified-chat?conversation=${conversationId}`
    };

    try {
      const webpush = await import('web-push');

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

          // Deactivate invalid subscriptions
          if ((error as any)?.statusCode === 410) {
            await supabase
              .schema('backoffice')
              .from('push_subscriptions')
              .update({ is_active: false })
              .eq('id', subscription.id);
          }

          return { success: false, email: subscription.user_email };
        }
      });

      const results = await Promise.all(sendPromises);
      const successful = results.filter(r => r.success).length;
      console.log(`Website chat push notifications sent to ${successful}/${subscriptions.length} users`);

    } catch (importError) {
      console.error('Failed to import web-push module:', importError);
    }

  } catch (error) {
    console.error('Error sending push notification for website message:', error);
  }
}