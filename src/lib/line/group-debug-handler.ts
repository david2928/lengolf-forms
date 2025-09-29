import { createClient } from '@supabase/supabase-js';
import { LineWebhookEvent } from './webhook-handler';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_REFAC_SUPABASE_URL!,
  process.env.REFAC_SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Debug function to capture ALL LINE messages including group/room messages
 * Only runs when debug mode is enabled
 */
export async function captureGroupMessage(event: LineWebhookEvent): Promise<void> {
  try {
    // Check if group debug is enabled
    const { data: settings } = await supabase
      .from('line_group_debug_settings')
      .select('enabled')
      .single();

    if (!settings?.enabled) {
      return; // Debug mode disabled
    }

    // Only capture message events from groups or rooms
    if (event.type !== 'message' || event.source.type === 'user') {
      return;
    }

    console.log(`🐛 DEBUG: Capturing ${event.source.type} message:`, {
      groupId: event.source.groupId,
      roomId: event.source.roomId,
      userId: event.source.userId,
      messageType: event.message?.type,
      messageText: event.message?.text
    });

    // Store in debug table
    const { error } = await supabase
      .from('line_group_debug')
      .insert({
        webhook_event_id: event.webhookEventId,
        source_type: event.source.type,
        group_id: event.source.groupId || null,
        room_id: event.source.roomId || null,
        user_id: event.source.userId || null,
        message_text: event.message?.text || `[${event.message?.type || 'unknown'}]`,
        message_type: event.message?.type || 'unknown',
        timestamp: event.timestamp,
        raw_event: event,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('🐛 DEBUG: Error storing group message:', error);
    } else {
      console.log('🐛 DEBUG: Group message stored successfully');
    }

  } catch (err) {
    console.error('🐛 DEBUG: Failed to capture group message:', err);
  }
}