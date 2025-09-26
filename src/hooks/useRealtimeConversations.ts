import { useEffect, useRef, useCallback, useState } from 'react';
import { supabaseRealtime } from '@/lib/supabase-realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface LineUser {
  displayName: string;
  pictureUrl?: string;
  lineUserId?: string;
  customerId?: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface Conversation {
  id: string;
  lineUserId: string;
  customerId?: string;
  lastMessageAt: string;
  lastMessageText?: string;
  lastMessageBy: 'user' | 'admin';
  lastMessageType?: string;
  unreadCount: number;
  user: LineUser;
  customer?: Customer;
}

interface RealtimeConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
}

interface UseRealtimeConversationsOptions {
  onConversationUpdate?: (conversation: Partial<Conversation> & { id: string }) => void;
  onNewConversation?: (conversation: Conversation) => void;
}

export function useRealtimeConversations({
  onConversationUpdate,
  onNewConversation
}: UseRealtimeConversationsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    status: supabaseRealtime ? 'disconnected' : 'error',
    error: supabaseRealtime ? undefined : 'Realtime client not available',
    reconnectAttempts: 0
  });

  // Track processed conversation updates to prevent duplicates
  const processedUpdatesRef = useRef<Set<string>>(new Set());

  // Use refs to store callback functions to avoid dependency issues
  const onConversationUpdateRef = useRef(onConversationUpdate);
  const onNewConversationRef = useRef(onNewConversation);

  // Update refs when callbacks change
  onConversationUpdateRef.current = onConversationUpdate;
  onNewConversationRef.current = onNewConversation;

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
  }, []);

  const connect = useCallback(async () => {
    if (!supabaseRealtime) {
      setConnectionStatus(prev => ({
        ...prev,
        status: 'error',
        error: 'Realtime client not available'
      }));
      return;
    }

    // Disconnect existing channel first
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      setConnectionStatus(prev => ({ ...prev, status: 'connecting', error: undefined }));

      // Create channel for conversation updates
      const channel = supabaseRealtime
        .channel('conversations-updates')
        // Listen to LINE conversation updates
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'line_conversations'
          },
          (payload: any) => {
            const conversationId = payload.new?.id;
            const updateKey = `line_update:${conversationId}:${payload.new.updated_at}`;

            if (!conversationId || processedUpdatesRef.current.has(updateKey)) {
              return;
            }

            processedUpdatesRef.current.add(updateKey);

            // Create partial update object
            const conversationUpdate = {
              id: conversationId,
              lastMessageAt: payload.new.last_message_at,
              lastMessageText: payload.new.last_message_text,
              lastMessageBy: payload.new.last_message_by,
              lastMessageType: payload.new.last_message_type,
              unreadCount: payload.new.unread_count
            };

            onConversationUpdateRef.current?.(conversationUpdate);
          }
        )
        // Listen to LINE conversation inserts (new conversations)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'line_conversations'
          },
          (payload: any) => {
            const conversationId = payload.new?.id;
            const insertKey = `line_insert:${conversationId}:${payload.new.created_at}`;

            if (!conversationId || processedUpdatesRef.current.has(insertKey)) {
              return;
            }

            processedUpdatesRef.current.add(insertKey);

            // Trigger conversation list refresh for new conversations
            // The onNewConversation callback will be handled by the parent component
            console.log('🔔 New LINE conversation detected:', conversationId);
            onNewConversationRef.current?.(payload.new as Conversation);
          }
        )
        // Listen to website conversation updates
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'web_chat_conversations'
          },
          (payload: any) => {
            const conversationId = payload.new?.id;
            const updateKey = `web_update:${conversationId}:${payload.new.updated_at}`;

            if (!conversationId || processedUpdatesRef.current.has(updateKey)) {
              return;
            }

            processedUpdatesRef.current.add(updateKey);

            // Create partial update object for website conversations
            const conversationUpdate = {
              id: conversationId,
              lastMessageAt: payload.new.last_message_at,
              lastMessageText: payload.new.last_message_text,
              lastMessageBy: 'user' as const, // Website messages are typically from users (customers)
              unreadCount: payload.new.unread_count
            };

            onConversationUpdateRef.current?.(conversationUpdate);
          }
        )
        // Listen to website conversation inserts (new conversations)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'web_chat_conversations'
          },
          (payload: any) => {
            const conversationId = payload.new?.id;
            const insertKey = `web_insert:${conversationId}:${payload.new.created_at}`;

            if (!conversationId || processedUpdatesRef.current.has(insertKey)) {
              return;
            }

            processedUpdatesRef.current.add(insertKey);

            // Trigger conversation list refresh for new website conversations
            console.log('🔔 New website conversation detected:', conversationId);
            onNewConversationRef.current?.(payload.new as any);
          }
        )
        // Listen to Meta conversation updates
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'meta_conversations'
          },
          (payload: any) => {
            const conversationId = payload.new?.id;
            const updateKey = `meta_update:${conversationId}:${payload.new.updated_at}`;

            if (!conversationId || processedUpdatesRef.current.has(updateKey)) {
              return;
            }

            processedUpdatesRef.current.add(updateKey);

            // Create partial update object for Meta conversations
            const conversationUpdate = {
              id: conversationId,
              lastMessageAt: payload.new.last_message_at,
              lastMessageText: payload.new.last_message_text,
              lastMessageBy: payload.new.last_message_by,
              unreadCount: payload.new.unread_count
            };

            onConversationUpdateRef.current?.(conversationUpdate);
          }
        )
        // Listen to Meta conversation inserts (new conversations)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'meta_conversations'
          },
          (payload: any) => {
            const conversationId = payload.new?.id;
            const insertKey = `meta_insert:${conversationId}:${payload.new.created_at}`;

            if (!conversationId || processedUpdatesRef.current.has(insertKey)) {
              return;
            }

            processedUpdatesRef.current.add(insertKey);

            // Trigger conversation list refresh for new Meta conversations
            console.log('🔔 New Meta conversation detected:', conversationId, payload.new.platform);
            onNewConversationRef.current?.(payload.new as any);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus({
              status: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0
            });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus(prev => ({
              status: 'error',
              error: `Connection failed: ${status}`,
              reconnectAttempts: prev.reconnectAttempts + 1
            }));
          } else if (status === 'CLOSED') {
            setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
          }
        });

      channelRef.current = channel;

    } catch (error) {
      console.error('❌ Conversations realtime failed:', error);
      setConnectionStatus(prev => ({
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    }
  }, []);

  // Connect on mount
  useEffect(() => {
    if (supabaseRealtime) {
      connect();
    }
    return disconnect;
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Manual reconnect function
  const reconnect = useCallback(() => {
    setConnectionStatus(prev => ({ ...prev, reconnectAttempts: 0 }));
    connect();
  }, [connect]);

  // Clear processed updates periodically to prevent memory leaks
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Keep only recent updates (last hour)
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const recentUpdates = new Set<string>();

      processedUpdatesRef.current.forEach(key => {
        // Extract timestamp from update key if it contains one
        if (key.includes(':') && key.split(':').length >= 3) {
          const timestamp = new Date(key.split(':')[2]).getTime();
          if (timestamp > oneHourAgo) {
            recentUpdates.add(key);
          }
        } else {
          // Keep keys without timestamps for safety
          recentUpdates.add(key);
        }
      });

      processedUpdatesRef.current = recentUpdates;
    }, 5 * 60 * 1000); // Run every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    connectionStatus,
    reconnect,
    disconnect
  };
}