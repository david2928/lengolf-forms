import { createClient } from '@supabase/supabase-js';
import { processLineMessage, logEmojiProcessing } from './emoji-processor';
import { downloadLineImageToStorage } from './storage-handler';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

// LINE webhook event types
export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'memberJoined' | 'memberLeft' | 'postback' | 'beacon' | 'accountLink' | 'things';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
  replyToken?: string;
  message?: {
    id: string;
    type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker';
    text?: string;
    fileName?: string;
    fileSize?: number;
    title?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    packageId?: string;
    stickerId?: string;
    quoteToken?: string;
    quotedMessageId?: string; // LINE message ID of the message being replied to
    emojis?: Array<{
      index: number;
      length: number;
      emojiId: string;
      productId: string;
    }>;
  };
  postback?: {
    data: string;
    params?: Record<string, any>;
  };
  mode?: string;
}

export interface LineWebhookPayload {
  destination: string;
  events: LineWebhookEvent[];
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

/**
 * Log webhook event to database for debugging
 */
export async function logWebhookEvent(
  eventType: string,
  signature: string,
  rawBody: string,
  processed: boolean = false,
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('line_webhook_logs')
      .insert({
        event_type: eventType,
        signature,
        raw_body: rawBody,
        processed,
        error_message: errorMessage
      });

    if (error) {
      console.error('Error logging webhook event:', error);
    }
  } catch (err) {
    console.error('Failed to log webhook event:', err);
  }
}

/**
 * Check if webhook event has already been processed (deduplication)
 */
export async function isWebhookEventProcessed(webhookEventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('line_messages')
      .select('id')
      .eq('webhook_event_id', webhookEventId)
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
 * Fetch user profile from LINE API
 */
export async function fetchLineUserProfile(userId: string): Promise<LineUserProfile | null> {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!channelAccessToken) {
    console.error('LINE_CHANNEL_ACCESS_TOKEN environment variable is not set');
    return null;
  }

  try {
    const response = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${channelAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LINE API error: ${response.status} ${response.statusText} - ${errorText}`);

      if (response.status === 404) {
        console.log(`User profile not found for userId: ${userId}`);
        return null;
      }
      if (response.status === 401) {
        console.error('LINE API unauthorized - check your LINE_CHANNEL_ACCESS_TOKEN');
        return null;
      }
      return null;
    }

    const profile: LineUserProfile = await response.json();
    return profile;
  } catch (error) {
    console.error(`Failed to fetch user profile for ${userId}:`, error);
    return null;
  }
}

/**
 * Store or update LINE user profile in database
 */
export async function storeLineUserProfile(profile: LineUserProfile): Promise<void> {
  try {
    const { error } = await supabase
      .from('line_users')
      .upsert({
        line_user_id: profile.userId,
        display_name: profile.displayName,
        picture_url: profile.pictureUrl,
        status_message: profile.statusMessage,
        language: profile.language,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'line_user_id'
      });

    if (error) {
      console.error('Error storing LINE user profile:', error);
      throw error;
    }

  } catch (err) {
    console.error('Failed to store LINE user profile:', err);
    throw err;
  }
}

/**
 * Create a minimal user record when profile fetch fails
 */
export async function createMinimalUserRecord(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('line_users')
      .upsert({
        line_user_id: userId,
        display_name: 'Unknown User',
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'line_user_id'
      });

    if (error) {
      console.error('Error creating minimal user record:', error);
      throw error;
    }

  } catch (err) {
    console.error('Failed to create minimal user record:', err);
    throw err;
  }
}

/**
 * Ensure a conversation exists for a LINE user
 */
export async function ensureConversationExists(lineUserId: string): Promise<string> {
  try {
    // Get the most recent active conversation (handles multiple records gracefully)
    const { data: existing } = await supabase
      .from('line_conversations')
      .select('id')
      .eq('line_user_id', lineUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      return existing[0].id;
    }

    // Create new conversation only if none exists
    const { data: conversation, error } = await supabase
      .from('line_conversations')
      .insert({
        line_user_id: lineUserId,
        unread_count: 0,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }

    return conversation.id;
  } catch (err) {
    console.error('Failed to ensure conversation exists:', err);
    throw err;
  }
}

/**
 * Send push notification for new LINE message directly (optimized for serverless)
 */
async function sendPushNotificationForNewMessage(
  event: LineWebhookEvent,
  conversationId: string,
  displayText: string
): Promise<void> {
  try {
    // Get user profile for notification
    let userProfile: LineUserProfile | null = null;
    if (event.source.userId) {
      try {
        const { data: userData } = await supabase
          .from('line_users')
          .select('display_name')
          .eq('line_user_id', event.source.userId)
          .single();

        if (userData) {
          userProfile = {
            userId: event.source.userId,
            displayName: userData.display_name
          };
        }
      } catch (error) {
        console.error('Failed to get user profile for notification:', error);
      }
    }

    const customerName = userProfile?.displayName || 'Unknown Customer';

    // Get active subscriptions directly from database
    const { data: subscriptions, error } = await supabase
      .schema('backoffice')
      .from('push_subscriptions')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found');
      return;
    }

    // Prepare notification payload
    const notificationPayload = {
      title: customerName,
      body: displayText.length > 100 ? displayText.substring(0, 100) + '...' : displayText,
      conversationId,
      lineUserId: event.source.userId,
      customerName,
      url: conversationId ? `/staff/line-chat?conversation=${conversationId}` : '/staff/line-chat'
    };

    // Import and configure web-push directly
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

          // If subscription is invalid (410 Gone), deactivate it
          if ((error as any)?.statusCode === 410) {
            console.log(`Deactivating invalid subscription for ${subscription.user_email}`);
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
    console.error('Error sending push notification from webhook:', error);
  }
}

/**
 * Store LINE message in database
 */
export async function storeLineMessage(event: LineWebhookEvent): Promise<void> {
  if (!event.source.userId) {
    console.log('Skipping message storage - no userId in event source');
    return;
  }

  // Only process direct messages (user-to-bot), not group or room messages
  if (event.source.type !== 'user') {
    console.log(`Skipping message storage - not a direct message (source type: ${event.source.type})`);
    return;
  }

  try {
    // Get the conversation ID
    const conversationId = await ensureConversationExists(event.source.userId);

    // Process emoji placeholders to Unicode emojis
    const originalText = event.message?.text || '';
    const processedText = processLineMessage(originalText, event);

    // Log emoji processing for debugging
    if (originalText !== processedText) {
      logEmojiProcessing(originalText, processedText, event.message?.emojis || []);
    }

    // Handle image and file downloads
    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;

    if (event.message?.type === 'image' || event.message?.type === 'video' || event.message?.type === 'audio' || event.message?.type === 'file') {
      if (event.message?.id) {
        console.log(`Processing ${event.message.type} message: ${event.message.id}`);

        try {
          const downloadResult = await downloadLineImageToStorage(
            event.message.id,
            conversationId
          );

          if (downloadResult.success) {
            fileUrl = downloadResult.url || null;
            fileName = event.message.fileName || `${event.message.type}-${event.message.id}`;
            fileSize = event.message.fileSize || null;

            // Set file type based on message type or get from LINE content
            switch (event.message.type) {
              case 'image':
                fileType = 'image/jpeg'; // Default, may be overridden by actual content type
                break;
              case 'video':
                fileType = 'video/mp4';
                break;
              case 'audio':
                fileType = 'audio/mpeg';
                break;
              case 'file':
                fileType = 'application/octet-stream';
                break;
            }

            console.log(`Successfully downloaded ${event.message.type} to: ${fileUrl}`);
          } else {
            console.error(`Failed to download ${event.message.type}:`, downloadResult.error);
          }
        } catch (downloadError) {
          console.error(`Error downloading ${event.message.type}:`, downloadError);
        }
      }
    }

    // Prepare message text for display
    let displayText = processedText;
    if (!displayText && event.message?.type !== 'text') {
      // Generate display text for non-text messages
      switch (event.message?.type) {
        case 'image':
          displayText = 'sent a photo';
          break;
        case 'video':
          displayText = '🎥 Video';
          break;
        case 'audio':
          displayText = '🎵 Audio';
          break;
        case 'file':
          displayText = `📄 ${fileName || 'File'}`;
          break;
        case 'sticker':
          displayText = 'sent a sticker';
          break;
        case 'location':
          displayText = '📍 Location';
          break;
        default:
          displayText = `[${event.message?.type || 'message'}]`;
      }
    }

    // Handle reply if quotedMessageId is present
    let repliedToMessageId: string | null = null;
    let replyPreviewText: string | null = null;
    let replyPreviewType: string | null = null;
    let replySenderName: string | null = null;
    let replySenderType: string | null = null;
    let replySenderPictureUrl: string | null = null;

    if (event.message?.quotedMessageId) {
      const { data: originalMessage } = await supabase
        .from('line_messages')
        .select(`
          id, message_text, message_type, sender_name, sender_type, file_name,
          line_user_id,
          line_users!inner(picture_url)
        `)
        .eq('message_id', event.message.quotedMessageId)
        .single();

      if (originalMessage) {
        repliedToMessageId = originalMessage.id;
        replyPreviewType = originalMessage.message_type;
        replySenderName = originalMessage.sender_name;
        replySenderType = originalMessage.sender_type;
        replySenderPictureUrl = (originalMessage as any).line_users?.picture_url || null;

        // Generate preview text based on message type
        if (originalMessage.message_type === 'text') {
          replyPreviewText = originalMessage.message_text;
        } else if (originalMessage.message_type === 'image') {
          replyPreviewText = '📷 Photo';
        } else if (originalMessage.message_type === 'file') {
          replyPreviewText = `📄 ${originalMessage.file_name || 'File'}`;
        } else {
          replyPreviewText = `[${originalMessage.message_type}]`;
        }
      }
    }

    // Get customer name for sender_name
    let customerName: string | null = null;
    if (event.source.userId) {
      const { data: userProfile } = await supabase
        .from('line_users')
        .select('display_name')
        .eq('line_user_id', event.source.userId)
        .single();

      customerName = userProfile?.display_name || null;
    }

    // Insert the message
    const { error: messageError } = await supabase
      .from('line_messages')
      .insert({
        conversation_id: conversationId,
        webhook_event_id: event.webhookEventId,
        line_user_id: event.source.userId,
        message_type: event.message?.type || 'unknown',
        message_id: event.message?.id,
        message_text: displayText,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        source_type: event.source.type, // Track source type for filtering
        reply_token: event.replyToken,
        quote_token: event.message?.quoteToken, // Capture quote token for replies
        replied_to_message_id: repliedToMessageId, // Link to original message for replies
        reply_preview_text: replyPreviewText,
        reply_preview_type: replyPreviewType,
        reply_sender_name: replySenderName,
        reply_sender_type: replySenderType,
        reply_sender_picture_url: replySenderPictureUrl,
        timestamp: event.timestamp,
        sender_type: 'user',
        sender_name: customerName,
        is_read: false,
        raw_event: event
      });

    if (messageError) {
      console.error('Error storing LINE message:', messageError);
      throw messageError;
    }

    // Update conversation with latest message info and increment unread count
    const { error: updateError } = await supabase.rpc('increment_conversation_unread', {
      conversation_id: conversationId,
      new_last_message_at: new Date(event.timestamp).toISOString(),
      new_last_message_text: displayText,
      new_last_message_by: 'user'
    });

    if (updateError) {
      console.error('Error updating conversation, trying manual update:', updateError);

      // Fallback to manual update without increment
      await supabase
        .from('line_conversations')
        .update({
          last_message_at: new Date(event.timestamp).toISOString(),
          last_message_text: displayText,
          last_message_by: 'user',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
    }

    if (updateError) {
      console.error('Error updating conversation:', updateError);
    }

    // Send push notification to all staff (don't await to avoid blocking message storage)
    sendPushNotificationForNewMessage(event, conversationId, displayText)
      .catch(error => {
        console.error('Failed to send push notification:', error);
        // Don't let push notification failures block message storage
      });

  } catch (err) {
    console.error('Failed to store LINE message:', err);
    throw err;
  }
}

/**
 * Handle postback events from interactive buttons
 */
async function handlePostbackEvent(event: LineWebhookEvent): Promise<void> {
  if (!event.postback || !event.source.userId) return;

  console.log(`Processing postback: ${event.postback.data} from user: ${event.source.userId}`);

  try {
    // Parse the postback data
    const postbackData = event.postback.data;
    const params = new URLSearchParams(postbackData);
    const action = params.get('action');
    const bookingId = params.get('booking_id');

    // Ensure conversation exists before storing the response
    await ensureConversationExists(event.source.userId);

    // Get conversation ID
    const { data: conversation } = await supabase
      .from('line_conversations')
      .select('id')
      .eq('line_user_id', event.source.userId)
      .single();

    if (!conversation) {
      console.error('Could not find conversation for user:', event.source.userId);
      return;
    }

    let responseMessage = '';
    let displayText = '';

    // Handle different actions
    switch (action) {
      case 'confirm_booking':
        responseMessage = '✅ Thank you for confirming your booking! We look forward to seeing you.';
        displayText = '✅ Confirmed booking';
        break;

      case 'request_changes':
        responseMessage = '📝 We\'ve received your request to make changes to your booking. Our staff will contact you shortly to assist with the modifications.';
        displayText = '📝 Requested booking changes';
        break;

      case 'cancel_booking':
        responseMessage = '❌ We\'ve received your cancellation request. Our staff will process this and contact you to confirm the cancellation.';
        displayText = '❌ Requested booking cancellation';
        break;

      default:
        responseMessage = '🤔 We received your response but couldn\'t understand the action. Our staff will follow up with you.';
        displayText = '❓ Unknown action';
    }

    // Store the customer's action as a message
    const { error: postbackError } = await supabase
      .from('line_messages')
      .insert({
        conversation_id: conversation.id,
        webhook_event_id: event.webhookEventId,
        line_user_id: event.source.userId,
        message_type: 'postback',
        message_text: displayText,
        reply_token: event.replyToken,
        timestamp: event.timestamp,
        sender_type: 'user',
        is_read: false,
        raw_event: event
      });

    if (postbackError) {
      console.error('Error storing postback message:', postbackError);
      throw postbackError;
    }

    // Note: Automated responses removed per user request - only show customer button clicks

    // Update conversation with the customer's action
    const { error: updateError } = await supabase.rpc('increment_conversation_unread', {
      conversation_id: conversation.id,
      new_last_message_at: new Date(event.timestamp).toISOString(),
      new_last_message_text: displayText,
      new_last_message_by: 'user'
    });

    if (updateError) {
      console.error('Error updating conversation:', updateError);
      // Don't throw here as the messages are already stored
    }

    console.log(`Processed postback action: ${action} for booking: ${bookingId}`);

    // Send push notification for postback action (don't await to avoid blocking)
    sendPushNotificationForNewMessage(event, conversation.id, displayText)
      .catch(error => {
        console.error('Failed to send push notification for postback:', error);
        // Don't let push notification failures block postback processing
      });

  } catch (error) {
    console.error('Error handling postback event:', error);
  }
}

/**
 * Process a single webhook event
 */
export async function processWebhookEvent(event: LineWebhookEvent): Promise<void> {
  try {
    // Check for deduplication
    if (await isWebhookEventProcessed(event.webhookEventId)) {
      console.log(`Skipping duplicate event: ${event.webhookEventId}`);
      return;
    }

    // Only process direct messages and user events (not group/room events)
    if (event.source.type !== 'user') {
      console.log(`Skipping event processing - not from direct user (source type: ${event.source.type})`);
      return;
    }

    console.log(`Processing event: ${event.type} from user: ${event.source.userId}`);

    // Process based on event type
    switch (event.type) {
      case 'message':
        // First, ensure user profile exists (fetch and store if needed)
        if (event.source.userId) {
          try {
            const profile = await fetchLineUserProfile(event.source.userId);
            if (profile) {
              await storeLineUserProfile(profile);
            } else {
              // Create a minimal user record if profile fetch fails
              console.log(`Creating minimal user record for ${event.source.userId}`);
              await createMinimalUserRecord(event.source.userId);
            }
          } catch (profileError) {
            console.error(`Failed to fetch/store user profile for ${event.source.userId}:`, profileError);
            // Create a minimal user record as fallback
            await createMinimalUserRecord(event.source.userId);
          }

          // Ensure conversation exists
          await ensureConversationExists(event.source.userId);
        }

        // Now store the message (user and conversation should exist now)
        await storeLineMessage(event);
        break;

      case 'follow':
        // User added bot as friend - fetch and store profile
        if (event.source.userId) {
          console.log(`New follower: ${event.source.userId}`);
          try {
            const profile = await fetchLineUserProfile(event.source.userId);
            if (profile) {
              await storeLineUserProfile(profile);
            } else {
              await createMinimalUserRecord(event.source.userId);
            }
          } catch (profileError) {
            console.error(`Failed to fetch profile for new follower ${event.source.userId}:`, profileError);
            await createMinimalUserRecord(event.source.userId);
          }
        }
        break;

      case 'unfollow':
        // User blocked or removed bot - we could mark them as inactive
        if (event.source.userId) {
          console.log(`User unfollowed: ${event.source.userId}`);
          // Note: We don't delete their data, just log the event
        }
        break;

      case 'join':
        // Bot was added to a group/room
        console.log(`Bot joined group/room: ${event.source.groupId || event.source.roomId}`);
        break;

      case 'postback':
        // Handle button clicks from Flex messages
        if (event.source.userId && event.postback) {
          await handlePostbackEvent(event);
        }
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
        break;
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.webhookEventId}:`, error);
    throw error;
  }
}

/**
 * Process entire webhook payload
 */
export async function processWebhookPayload(payload: LineWebhookPayload): Promise<void> {
  console.log(`Processing webhook with ${payload.events.length} events`);

  // Process events sequentially to avoid overwhelming the database
  for (const event of payload.events) {
    try {
      await processWebhookEvent(event);
    } catch (error) {
      console.error(`Failed to process event ${event.webhookEventId}:`, error);
      // Continue processing other events even if one fails
    }
  }
}