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
    emojis?: Array<{
      index: number;
      length: number;
      emojiId: string;
      productId: string;
    }>;
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
    console.log(`Fetching LINE profile for user: ${userId}`);
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
    console.log(`Successfully fetched profile for user: ${userId} (${profile.displayName})`);
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

    console.log(`Stored/updated profile for user: ${profile.userId}`);
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

    console.log(`Created minimal user record for: ${userId}`);
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
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('line_conversations')
      .select('id')
      .eq('line_user_id', lineUserId)
      .single();

    if (existing) {
      return existing.id;
    }

    // Create new conversation
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

    console.log(`Created conversation for user: ${lineUserId}`);
    return conversation.id;
  } catch (err) {
    console.error('Failed to ensure conversation exists:', err);
    throw err;
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
          displayText = '📷 Image';
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
          displayText = '😀 Sticker';
          break;
        case 'location':
          displayText = '📍 Location';
          break;
        default:
          displayText = `[${event.message?.type || 'message'}]`;
      }
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
        reply_token: event.replyToken,
        timestamp: event.timestamp,
        sender_type: 'user',
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

    console.log(`Stored message: ${event.webhookEventId} from user: ${event.source.userId}`);
  } catch (err) {
    console.error('Failed to store LINE message:', err);
    throw err;
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