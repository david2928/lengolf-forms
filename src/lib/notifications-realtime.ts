/**
 * Supabase Realtime Integration for Notifications
 *
 * Manages WebSocket subscriptions to the notifications table for real-time
 * updates across multiple browser tabs and sessions.
 *
 * Story: NOTIF-005 (Supabase Realtime Integration)
 *
 * @module notifications-realtime
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { getRefacSupabaseClient } from '@/lib/refac-supabase-client';

/**
 * Notification data structure matching database table
 */
export interface Notification {
  id: string;
  booking_id: string | null;
  type: 'created' | 'cancelled' | 'modified';
  message: string;
  metadata: Record<string, any>;
  customer_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  booking_date: string | null;
  booking_time: string | null;
  bay: string | null;
  duration?: number | null;
  // Legacy fields (deprecated but kept for backward compatibility)
  acknowledged_by: number | null;
  notes_updated_by: number | null;
  // New UUID-based fields
  acknowledged_by_user_id: string | null;
  acknowledged_at: string | null;
  read: boolean;
  internal_notes: string | null;
  notes_updated_by_user_id: string | null;
  notes_updated_at: string | null;
  // Joined fields from allowed_users and customers (populated by API)
  acknowledged_by_display_name?: string | null;
  notes_updated_by_display_name?: string | null;
  customer_code?: string | null;
  line_notification_sent: boolean;
  line_notification_error: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Realtime event payload from Supabase
 */
export interface RealtimePayload<T = any> {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
  errors: any[];
}

/**
 * Configuration for notification subscription
 */
export interface SubscriptionConfig {
  /**
   * Callback fired when a new notification is inserted
   */
  onInsert?: (notification: Notification) => void;

  /**
   * Callback fired when a notification is updated (e.g., acknowledged, notes added)
   */
  onUpdate?: (notification: Notification, oldNotification: Notification) => void;

  /**
   * Callback fired when a notification is deleted (unlikely, but supported)
   */
  onDelete?: (oldNotification: Notification) => void;

  /**
   * Callback fired when subscription is successfully established
   */
  onSubscribed?: (status: string) => void;

  /**
   * Callback fired on subscription errors
   */
  onError?: (error: any) => void;

  /**
   * Callback fired when channel is closed
   */
  onClosed?: () => void;
}

/**
 * Subscribe to real-time notifications
 *
 * Creates a WebSocket connection to Supabase Realtime and listens for
 * INSERT, UPDATE, and DELETE events on the public.notifications table.
 *
 * @param config - Subscription configuration with event callbacks
 * @returns RealtimeChannel instance (call unsubscribe() to clean up)
 *
 * @example
 * ```typescript
 * const channel = subscribeToNotifications({
 *   onInsert: (notification) => {
 *     console.log('New notification:', notification);
 *     // Update UI, play sound, show browser notification
 *   },
 *   onUpdate: (notification, old) => {
 *     console.log('Notification updated:', notification);
 *     // Sync acknowledgment across tabs
 *   },
 *   onError: (error) => {
 *     console.error('Realtime error:', error);
 *   }
 * });
 *
 * // Later, clean up
 * unsubscribeFromNotifications(channel);
 * ```
 */
export function subscribeToNotifications(config: SubscriptionConfig = {}): RealtimeChannel | null {
  const {
    onInsert,
    onUpdate,
    onDelete,
    onSubscribed,
    onError,
    onClosed,
  } = config;

  // Check if running in browser
  if (typeof window === 'undefined') {
    console.warn('[Realtime] Cannot subscribe on server-side');
    return null;
  }

  const refacSupabase = getRefacSupabaseClient();

  if (!refacSupabase) {
    console.error('[Realtime] Supabase client not initialized. Check environment variables.');
    if (onError) {
      onError(new Error('Supabase client not initialized'));
    }
    return null;
  }

  // Validate that the channel method exists
  if (typeof refacSupabase.channel !== 'function') {
    console.error('[Realtime] Supabase client does not have channel method. Realtime may not be properly configured.');
    if (onError) {
      onError(new Error('Realtime not available'));
    }
    return null;
  }

  // Create a unique channel name (allows multiple subscriptions if needed)
  const channelName = `notifications-${Date.now()}`;

  try {
    const channel = refacSupabase
      .channel(channelName)
    .on(
      'postgres_changes' as any,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      },
      (payload: RealtimePayload<Notification>) => {
        console.log('[Realtime] INSERT event received:', payload);
        if (onInsert && payload.new) {
          onInsert(payload.new);
        }
      }
    )
    .on(
      'postgres_changes' as any,
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
      },
      (payload: RealtimePayload<Notification>) => {
        console.log('[Realtime] UPDATE event received:', payload);
        if (onUpdate && payload.new && payload.old) {
          onUpdate(payload.new, payload.old);
        }
      }
    )
    .on(
      'postgres_changes' as any,
      {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
      },
      (payload: RealtimePayload<Notification>) => {
        console.log('[Realtime] DELETE event received:', payload);
        if (onDelete && payload.old) {
          onDelete(payload.old);
        }
      }
    )
    .subscribe((status: string, error?: any) => {
      if (status === 'SUBSCRIBED') {
        console.log('[Realtime] Successfully subscribed to notifications channel');
        if (onSubscribed) {
          onSubscribed(status);
        }
      } else if (status === 'CLOSED') {
        console.log('[Realtime] Notifications channel closed');
        if (onClosed) {
          onClosed();
        }
      } else if (status === 'CHANNEL_ERROR') {
        console.error('[Realtime] Channel error:', error);
        if (onError) {
          onError(error);
        }
      } else {
        console.log('[Realtime] Channel status:', status);
      }
    });

    return channel;
  } catch (error) {
    console.error('[Realtime] Error creating subscription:', error);
    if (onError) {
      onError(error);
    }
    return null;
  }
}

/**
 * Unsubscribe from notifications channel
 *
 * Closes the WebSocket connection and cleans up resources.
 *
 * @param channel - The channel returned from subscribeToNotifications()
 *
 * @example
 * ```typescript
 * const channel = subscribeToNotifications({ ... });
 *
 * // Later...
 * unsubscribeFromNotifications(channel);
 * ```
 */
export function unsubscribeFromNotifications(channel: RealtimeChannel): void {
  if (!channel) {
    console.warn('[Realtime] Attempted to unsubscribe from null/undefined channel');
    return;
  }

  console.log('[Realtime] Unsubscribing from notifications channel');
  const refacSupabase = getRefacSupabaseClient();
  refacSupabase?.removeChannel(channel);
}

/**
 * Check if Realtime is available and configured
 *
 * Useful for conditional features or debugging connection issues.
 *
 * @returns true if Realtime is available, false otherwise
 */
export function isRealtimeAvailable(): boolean {
  return !!getRefacSupabaseClient();
}

/**
 * Get current Realtime connection state
 *
 * @param channel - The channel to check
 * @returns Connection state string
 */
export function getChannelState(channel: RealtimeChannel | null): string {
  if (!channel) return 'NOT_INITIALIZED';
  return channel.state;
}
