import { useEffect, useRef, useCallback, useState } from 'react';
import { refacSupabase } from '@/lib/refac-supabase';
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
    status: 'disconnected',
    reconnectAttempts: 0
  });

  // Track processed conversation updates to prevent duplicates
  const processedUpdatesRef = useRef<Set<string>>(new Set());

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      console.log('Disconnecting from realtime conversations channel');
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
    if (!refacSupabase) {
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
      return;
    }

    // Disconnect existing channel first
    disconnect();

    try {
      console.log('Connecting to realtime conversations');
      setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));

      // Create channel for conversation updates
      const channel = refacSupabase
        .channel('line_conversations:updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'line_conversations'
          },
          (payload: any) => {
            console.log('Realtime conversation INSERT:', payload);

            const conversationId = payload.new?.id;
            const updateKey = `insert:${conversationId}`;

            if (!conversationId || processedUpdatesRef.current.has(updateKey)) {
              console.log('Skipping duplicate conversation insert:', conversationId);
              return;
            }

            processedUpdatesRef.current.add(updateKey);

            // For new conversations, we need to fetch complete data including user/customer info
            // This is a simplified version - in practice you might want to call the API
            const newConversation: Conversation = {
              id: payload.new.id,
              lineUserId: payload.new.line_user_id,
              customerId: payload.new.customer_id,
              lastMessageAt: payload.new.last_message_at || payload.new.created_at,
              lastMessageText: payload.new.last_message_text,
              lastMessageBy: payload.new.last_message_by || 'user',
              lastMessageType: payload.new.last_message_type,
              unreadCount: payload.new.unread_count || 0,
              user: {
                displayName: 'New User', // This would normally come from a join
                lineUserId: payload.new.line_user_id
              }
            };

            onNewConversation?.(newConversation);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'line_conversations'
          },
          (payload: any) => {
            console.log('Realtime conversation UPDATE:', payload);

            const conversationId = payload.new?.id;
            const updateKey = `update:${conversationId}:${payload.new.updated_at}`;

            if (!conversationId || processedUpdatesRef.current.has(updateKey)) {
              console.log('Skipping duplicate conversation update:', conversationId);
              return;
            }

            processedUpdatesRef.current.add(updateKey);

            // Create partial update object with changed fields
            const conversationUpdate: Partial<Conversation> & { id: string } = {
              id: conversationId,
              lastMessageAt: payload.new.last_message_at,
              lastMessageText: payload.new.last_message_text,
              lastMessageBy: payload.new.last_message_by,
              lastMessageType: payload.new.last_message_type,
              unreadCount: payload.new.unread_count
            };

            onConversationUpdate?.(conversationUpdate);
          }
        )
        .subscribe((status) => {
          console.log('Realtime conversations subscription status:', status);

          if (status === 'SUBSCRIBED') {
            setConnectionStatus({
              status: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0
            });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus(prev => ({
              status: 'error',
              error: `Subscription failed: ${status}`,
              reconnectAttempts: prev.reconnectAttempts + 1
            }));

            // Exponential backoff reconnection
            const delay = Math.min(1000 * Math.pow(2, connectionStatus.reconnectAttempts), 30000);
            console.log(`Reconnecting conversations in ${delay}ms...`);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else if (status === 'CLOSED') {
            setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
          }
        });

      channelRef.current = channel;

    } catch (error) {
      console.error('Failed to connect to realtime conversations:', error);
      setConnectionStatus(prev => ({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    }
  }, [onConversationUpdate, onNewConversation, disconnect, connectionStatus.reconnectAttempts]);

  // Connect on mount
  useEffect(() => {
    connect();
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