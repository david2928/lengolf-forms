import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (same as LINE handler)
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

// Meta webhook event types and interfaces
export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string;
  time: number;
  messaging?: MessengerEvent[];
  changes?: WhatsAppChange[];
}

export interface MessengerEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: Array<{
      type: 'image' | 'video' | 'audio' | 'file';
      payload: { url: string };
    }>;
    quick_reply?: { payload: string };
    sticker_id?: number;
    is_echo?: boolean;
    // Potential reply fields (based on other Meta platforms)
    reply_to?: {
      mid: string;
      text?: string;
    };
    quoted_message?: {
      id: string;
      text?: string;
      sender?: { id: string };
    };
    context?: {
      id: string;
      from?: string;
    };
  };
  postback?: {
    payload: string;
    title: string;
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
}

export interface WhatsAppChange {
  field: string;
  value: {
    messaging_product: 'whatsapp';
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: Array<{ profile: { name: string }; wa_id: string }>;
    messages?: Array<{
      from: string;
      id: string;
      timestamp: string;
      text?: { body: string };
      type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'contacts';
      image?: { id: string; mime_type: string; sha256: string };
      document?: { id: string; filename: string; mime_type: string; sha256: string };
      audio?: { id: string; mime_type: string; sha256: string };
      video?: { id: string; mime_type: string; sha256: string };
      sticker?: { id: string; mime_type: string; sha256: string; animated: boolean };
      context?: { from: string; id: string };
    }>;
    statuses?: Array<{
      id: string;
      status: 'sent' | 'delivered' | 'read' | 'failed';
      timestamp: string;
      recipient_id: string;
    }>;
  };
}

/**
 * Log webhook event to database for debugging (same pattern as LINE)
 */
export async function logWebhookEvent(
  eventType: string,
  platform: string,
  signature: string,
  rawBody: string,
  processed: boolean = false,
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('meta_webhook_logs')
      .insert({
        event_type: eventType,
        platform,
        hub_signature: signature,
        webhook_data: JSON.parse(rawBody),
        processing_status: processed ? 'completed' : 'pending',
        error_message: errorMessage
      });

    if (error) {
      console.error('Error logging Meta webhook event:', error);
    }
  } catch (err) {
    console.error('Failed to log Meta webhook event:', err);
  }
}

/**
 * Check if webhook event has already been processed (deduplication)
 */
export async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('meta_messages')
      .select('id')
      .eq('webhook_event_id', eventId)
      .limit(1);

    if (error) {
      console.error('Error checking webhook event:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (err) {
    console.error('Failed to check webhook event:', err);
    return false;
  }
}

/**
 * Detect platform from webhook entry
 */
export function detectPlatform(entry: MetaWebhookEntry): 'facebook' | 'instagram' | 'whatsapp' {
  // WhatsApp events have changes array
  if (entry.changes && entry.changes.length > 0) {
    const change = entry.changes[0];
    if (change.field === 'messages' && change.value.messaging_product === 'whatsapp') {
      return 'whatsapp';
    }
  }

  // Messenger events have messaging array
  if (entry.messaging && entry.messaging.length > 0) {
    const message = entry.messaging[0];

    // Check if it's Instagram by looking at the sender ID pattern
    // Instagram PSIDs are typically longer and have different format
    if (message.sender.id.length > 16 || message.sender.id.startsWith('1')) {
      // This is a heuristic - in production you might want to check against known page IDs
      return 'instagram';
    }

    return 'facebook';
  }

  return 'facebook'; // default fallback
}

/**
 * Fetch user profile from Meta platforms (Facebook/Instagram)
 */
async function fetchMetaUserProfile(userId: string, platform: 'facebook' | 'instagram' | 'whatsapp'): Promise<{ name?: string, profile_pic?: string }> {
  const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;

  if (!pageAccessToken) {
    console.warn('META_PAGE_ACCESS_TOKEN not configured - cannot fetch user profiles');
    return {};
  }

  try {
    let apiUrl: string;

    if (platform === 'instagram') {
      // For Instagram, Instagram Graph API has limited fields available for business-scoped IDs
      // Try to get basic profile info - may not work for all Instagram accounts
      apiUrl = `https://graph.facebook.com/v19.0/${userId}?fields=name,username&access_token=${pageAccessToken}`;
    } else {
      // For Facebook and WhatsApp, use standard Graph API
      apiUrl = `https://graph.facebook.com/v19.0/${userId}?fields=name,profile_pic&access_token=${pageAccessToken}`;
    }

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Failed to fetch ${platform} user profile: ${response.status} ${response.statusText}`, errorText);

      // For Instagram, if the profile fetch fails, we'll use a meaningful fallback
      if (platform === 'instagram') {
        console.log(`Using Instagram user fallback for ID: ${userId}`);
        return {
          name: `Instagram User ${userId.slice(-4)}`, // Use last 4 digits for uniqueness
          profile_pic: undefined
        };
      }

      return {};
    }

    const data = await response.json();
    // console.log(`${platform} profile data:`, data); // Removed to avoid logging personal data

    return {
      name: data.name || data.username || (platform === 'instagram' ? `Instagram User ${userId.slice(-4)}` : undefined),
      profile_pic: data.profile_pic || null
    };
  } catch (error) {
    console.error(`Error fetching ${platform} user profile:`, error);
    return {};
  }
}

/**
 * Ensure a Meta user exists in the database
 */
export async function ensureMetaUserExists(
  platformUserId: string,
  platform: 'facebook' | 'instagram' | 'whatsapp',
  displayName?: string,
  profilePic?: string,
  phoneNumber?: string
): Promise<void> {
  try {
    let finalDisplayName = displayName;
    let finalProfilePic = profilePic;

    // If no display name provided and this is Facebook/Instagram, try to fetch from Graph API
    if (!finalDisplayName && (platform === 'facebook' || platform === 'instagram')) {
      const profile = await fetchMetaUserProfile(platformUserId, platform);
      finalDisplayName = profile.name;
      finalProfilePic = finalProfilePic || profile.profile_pic;
    }

    const { error } = await supabase
      .from('meta_users')
      .upsert({
        platform_user_id: platformUserId,
        platform,
        display_name: finalDisplayName || `${platform.charAt(0).toUpperCase() + platform.slice(1)} User`,
        profile_pic: finalProfilePic,
        phone_number: phoneNumber,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'platform_user_id'
      });

    if (error) {
      console.error('Error storing Meta user:', error);
      throw error;
    }
  } catch (err) {
    console.error('Failed to ensure Meta user exists:', err);
    throw err;
  }
}

/**
 * Ensure a Meta conversation exists
 */
export async function ensureMetaConversationExists(
  platformUserId: string,
  platform: 'facebook' | 'instagram' | 'whatsapp'
): Promise<string> {
  try {
    // Get the most recent active conversation
    const { data: existing } = await supabase
      .from('meta_conversations')
      .select('id')
      .eq('platform_user_id', platformUserId)
      .eq('platform', platform)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // Create new conversation
    const { data: conversation, error } = await supabase
      .from('meta_conversations')
      .insert({
        platform_user_id: platformUserId,
        platform,
        unread_count: 0,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating Meta conversation:', error);
      throw error;
    }

    return conversation.id;
  } catch (err) {
    console.error('Failed to ensure Meta conversation exists:', err);
    throw err;
  }
}

/**
 * Store Meta message in database
 */
export async function storeMetaMessage(
  conversationId: string,
  platformUserId: string,
  platformMessageId: string,
  messageText: string,
  messageType: string,
  senderType: 'user' | 'business',
  senderName: string,
  platform: 'facebook' | 'instagram' | 'whatsapp',
  webhookEventId?: string,
  attachments?: any[],
  replyToMessageId?: string
): Promise<string> {
  try {

    // Process attachments if any
    let imageUrl: string | null = null;
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;

    if (attachments && attachments.length > 0) {
      const attachment = attachments[0]; // Take first attachment
      if (attachment.type === 'image') {
        imageUrl = attachment.payload?.url;
        fileType = 'image/jpeg';
      } else {
        fileUrl = attachment.payload?.url;
        fileType = 'application/octet-stream';
      }
    }

    // Handle reply if replyToMessageId is present (similar to LINE implementation)
    let repliedToMessageId: string | null = null;
    let replyPreviewText: string | null = null;
    let replyPreviewType: string | null = null;
    let replySenderName: string | null = null;
    let replySenderType: string | null = null;

    if (replyToMessageId) {
      console.log(`🔍 [${platform}] Looking up original message for reply: ${replyToMessageId}`);

      // Look up the original message by platform_message_id
      const { data: originalMessage } = await supabase
        .from('meta_messages')
        .select(`
          id,
          message_text,
          message_type,
          sender_name,
          sender_type,
          file_name
        `)
        .eq('platform_message_id', replyToMessageId)
        .single();

      if (originalMessage) {
        console.log(`✅ [${platform}] Found original message:`, originalMessage.id);
        repliedToMessageId = originalMessage.id;
        replyPreviewType = originalMessage.message_type;
        replySenderName = originalMessage.sender_name;
        replySenderType = originalMessage.sender_type;

        // Generate preview text based on message type (similar to LINE)
        if (originalMessage.message_type === 'text') {
          replyPreviewText = originalMessage.message_text;
        } else if (originalMessage.message_type === 'image') {
          replyPreviewText = '📷 Photo';
        } else if (originalMessage.message_type === 'file') {
          replyPreviewText = `📄 ${originalMessage.file_name || 'File'}`;
        } else {
          replyPreviewText = `[${originalMessage.message_type}]`;
        }
      } else {
        console.log(`❌ [${platform}] Original message not found for: ${replyToMessageId}`);
        // Graceful fallback - still store as a reply with generic preview
        replyPreviewText = "Original message";
        replyPreviewType = "text";
        replySenderName = "Unknown";
        replySenderType = "user";
        // Note: repliedToMessageId stays null, but we still store reply info for the UI
      }
    }

    // Insert the message and return the generated UUID
    const { data: insertedMessage, error: messageError } = await supabase
      .from('meta_messages')
      .insert({
        conversation_id: conversationId,
        platform_user_id: platformUserId,
        platform_message_id: platformMessageId,
        webhook_event_id: webhookEventId,
        message_text: messageText,
        message_type: messageType,
        sender_type: senderType,
        sender_name: senderName,
        image_url: imageUrl,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        reply_to_message_id: repliedToMessageId, // Use the resolved UUID instead of platform ID
        reply_preview_text: replyPreviewText,
        reply_preview_type: replyPreviewType,
        is_read: false,
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (messageError) {
      console.error('🚨 Error storing Meta message:', messageError);
      throw messageError;
    }


    // Update conversation with latest message info
    const { error: updateError } = await supabase.rpc('increment_meta_conversation_unread', {
      conversation_id: conversationId,
      new_last_message_at: new Date().toISOString(),
      new_last_message_text: messageText,
      new_last_message_by: senderType
    });

    if (updateError) {
      console.error('Error updating Meta conversation:', updateError);

      // Fallback to manual update
      await supabase
        .from('meta_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: messageText,
          last_message_by: senderType,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    }

    // Send push notification (non-blocking, same as LINE)
    sendPushNotificationForMetaMessage(conversationId, messageText, senderName, platform)
      .catch(error => {
        console.error('Failed to send push notification:', error);
      });

    // Return the database UUID
    return insertedMessage.id;

  } catch (err) {
    console.error('Failed to store Meta message:', err);
    throw err;
  }
}

/**
 * Send push notification for new Meta message (same pattern as LINE)
 */
async function sendPushNotificationForMetaMessage(
  conversationId: string,
  messageText: string,
  senderName: string,
  platform: string
): Promise<void> {
  try {
    // Get active subscriptions
    const { data: subscriptions, error } = await supabase
      .schema('backoffice')
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found');
      return;
    }

    const platformEmoji = platform === 'whatsapp' ? '💬' : platform === 'instagram' ? '📷' : '📘';

    // Prepare notification payload
    const notificationPayload = {
      title: `${platformEmoji} New ${platform} message from ${senderName}`,
      body: messageText.length > 100 ? messageText.substring(0, 100) + '...' : messageText,
      conversationId,
      platform,
      customerName: senderName,
      url: `/staff/unified-chat?conversation=${conversationId}`
    };

    try {
      const webpush = await import('web-push');

      webpush.default.setVapidDetails(
        process.env.VAPID_SUBJECT!,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        process.env.VAPID_PRIVATE_KEY!
      );

      // Send notifications
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
      console.log(`Push notifications sent to ${successful}/${subscriptions.length} users`);

    } catch (importError) {
      console.error('Failed to import web-push module:', importError);
    }

  } catch (error) {
    console.error('Error sending push notification for Meta message:', error);
  }
}

/**
 * Process Messenger event (Facebook/Instagram)
 */
export async function processMessengerEvent(
  event: MessengerEvent,
  platform: 'facebook' | 'instagram'
): Promise<void> {
  try {
    // Skip echo messages (sent by us)
    if (event.message?.is_echo) {
      console.log('Skipping echo message');
      return;
    }

    // Log only when reply fields are present for debugging
    if (event.message?.reply_to || event.message?.quoted_message || event.message?.context) {
      console.log(`🔍 [${platform}] Reply event detected:`, JSON.stringify({
        reply_to: event.message.reply_to,
        quoted_message: event.message.quoted_message,
        context: event.message.context
      }, null, 2));
    }

    const userId = event.sender.id;

    // Ensure user exists
    await ensureMetaUserExists(userId, platform);

    // Get the user's display name from database
    const { data: user } = await supabase
      .from('meta_users')
      .select('display_name')
      .eq('platform_user_id', userId)
      .eq('platform', platform)
      .single();

    const displayName = user?.display_name || `${platform.charAt(0).toUpperCase() + platform.slice(1)} User`;

    // Ensure conversation exists
    const conversationId = await ensureMetaConversationExists(userId, platform);

    // Process the message
    if (event.message) {
      const messageText = event.message.text ||
                         (event.message.sticker_id ? 'Sent a sticker' :
                          event.message.attachments ? `Sent ${event.message.attachments[0].type}` :
                          'Sent a message');

      // Check for reply information in various possible fields
      let replyToMessageId: string | null = null;

      if (event.message.reply_to?.mid) {
        console.log(`📝 [${platform}] Found reply_to.mid:`, event.message.reply_to.mid);
        replyToMessageId = event.message.reply_to.mid;
      } else if (event.message.quoted_message?.id) {
        console.log(`📝 [${platform}] Found quoted_message.id:`, event.message.quoted_message.id);
        replyToMessageId = event.message.quoted_message.id;
      } else if (event.message.context?.id) {
        console.log(`📝 [${platform}] Found context.id:`, event.message.context.id);
        replyToMessageId = event.message.context.id;
      }

      await storeMetaMessage(
        conversationId,
        userId,
        event.message.mid,
        messageText,
        event.message.sticker_id ? 'sticker' : event.message.attachments ? event.message.attachments[0].type : 'text',
        'user',
        displayName,
        platform,
        `${event.sender.id}_${event.timestamp}`,
        event.message.attachments,
        replyToMessageId || undefined // Pass the reply ID if found
      );
    }

    // Handle postbacks (button clicks)
    if (event.postback) {
      await storeMetaMessage(
        conversationId,
        userId,
        `postback_${event.timestamp}`,
        `Clicked: ${event.postback.title}`,
        'postback',
        'user',
        displayName,
        platform,
        `postback_${event.sender.id}_${event.timestamp}`
      );
    }

  } catch (error) {
    console.error(`Error processing ${platform} messenger event:`, error);
    throw error;
  }
}

/**
 * Process WhatsApp event
 */
export async function processWhatsAppEvent(value: WhatsAppChange['value']): Promise<void> {
  try {
    // Process incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        // Ensure user exists
        await ensureMetaUserExists(message.from, 'whatsapp', undefined, undefined, message.from);

        // Get the user's display name from database
        const { data: user } = await supabase
          .from('meta_users')
          .select('display_name')
          .eq('platform_user_id', message.from)
          .eq('platform', 'whatsapp')
          .single();

        const displayName = user?.display_name || 'WhatsApp User';

        // Ensure conversation exists
        const conversationId = await ensureMetaConversationExists(message.from, 'whatsapp');

        let messageText = '';
        let messageType = message.type;

        switch (message.type) {
          case 'text':
            messageText = message.text?.body || '';
            break;
          case 'image':
            messageText = '📷 Image';
            break;
          case 'document':
            messageText = `📄 ${message.document?.filename || 'Document'}`;
            break;
          case 'audio':
            messageText = '🎵 Audio message';
            break;
          case 'video':
            messageText = '🎥 Video';
            break;
          case 'sticker':
            messageText = 'Sent a sticker';
            break;
          case 'location':
            messageText = '📍 Location';
            break;
          default:
            messageText = `[${message.type}]`;
        }

        await storeMetaMessage(
          conversationId,
          message.from,
          message.id,
          messageText,
          messageType,
          'user',
          displayName,
          'whatsapp',
          message.id,
          undefined,
          message.context?.id // For replies
        );
      }
    }

    // Process message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        // Update message status in database
        const { error } = await supabase
          .from('meta_messages')
          .update({
            message_status: status.status,
            delivered_at: status.status === 'delivered' ? new Date(parseInt(status.timestamp) * 1000).toISOString() : undefined,
            read_at: status.status === 'read' ? new Date(parseInt(status.timestamp) * 1000).toISOString() : undefined
          })
          .eq('platform_message_id', status.id);

        if (error) {
          console.error('Error updating WhatsApp message status:', error);
        }
      }
    }

  } catch (error) {
    console.error('Error processing WhatsApp event:', error);
    throw error;
  }
}

/**
 * Process entire Meta webhook payload
 */
export async function processMetaWebhookPayload(payload: MetaWebhookPayload): Promise<void> {

  // Process entries sequentially
  for (const entry of payload.entry) {
    try {
      const platform = detectPlatform(entry);

      // Process Messenger events (Facebook/Instagram)
      if (entry.messaging && (platform === 'facebook' || platform === 'instagram')) {
        for (const event of entry.messaging) {
          await processMessengerEvent(event, platform);
        }
      }

      // Process WhatsApp events
      if (entry.changes) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await processWhatsAppEvent(change.value);
          }
        }
      }

    } catch (error) {
      console.error(`Failed to process entry ${entry.id}:`, error);
      // Continue processing other entries
    }
  }
}