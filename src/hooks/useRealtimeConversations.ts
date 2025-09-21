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
    if (!supabaseRealtime) {
      setConnectionStatus(prev => ({
        ...prev,
        status: 'error',
        error: 'Realtime client not available'
      }));
      return;
    }

    // Disconnect existing channel first
    disconnect();

    try {
      console.log('📋 Connecting to realtime conversations');
      setConnectionStatus(prev => ({ ...prev, status: 'connecting', error: undefined }));

      // Create channel for conversation updates
      const channel = supabaseRealtime
        .channel('conversations-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'line_conversations'
          },
          (payload: any) => {
            console.log('📋 Conversation update via realtime:', payload.new?.id);

            const conversationId = payload.new?.id;
            const updateKey = `update:${conversationId}:${payload.new.updated_at}`;

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

            onConversationUpdate?.(conversationUpdate);
          }
        )
        .subscribe((status) => {
          console.log('🔌 Conversations realtime status:', status);

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
  }, [onConversationUpdate, disconnect]);

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