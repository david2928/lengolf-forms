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

// Create a global event emitter for conversation events
// This ensures events are emitted even if the parent component re-renders
const conversationEventTarget = typeof window !== 'undefined' ? new EventTarget() : null;

export function useRealtimeConversations({
  onConversationUpdate,
  onNewConversation
}: UseRealtimeConversationsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    status: refacSupabase ? 'disconnected' : 'error',
    error: refacSupabase ? undefined : 'Realtime client not available',
    reconnectAttempts: 0
  });

  // Track processed conversation updates to prevent duplicates
  const processedUpdatesRef = useRef<Set<string>>(new Set());

  // Listen to global events and call callbacks
  useEffect(() => {
    if (!conversationEventTarget) return;

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (onConversationUpdate) {
        onConversationUpdate(customEvent.detail);
      }
    };

    const handleNew = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (onNewConversation) {
        onNewConversation(customEvent.detail);
      }
    };

    conversationEventTarget.addEventListener('conversationUpdate', handleUpdate);
    conversationEventTarget.addEventListener('newConversation', handleNew);

    return () => {
      conversationEventTarget.removeEventListener('conversationUpdate', handleUpdate);
      conversationEventTarget.removeEventListener('newConversation', handleNew);
    };
  }, [onConversationUpdate, onNewConversation]);

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
    if (!refacSupabase) {
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
      const channel = refacSupabase
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

            // Emit event instead of calling callback directly
            conversationEventTarget?.dispatchEvent(
              new CustomEvent('conversationUpdate', { detail: conversationUpdate })
            );
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

            // Emit event instead of calling callback directly
            conversationEventTarget?.dispatchEvent(
              new CustomEvent('newConversation', { detail: payload.new })
            );
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
              lastMessageBy: 'user' as const,
              unreadCount: payload.new.unread_count
            };

            // Emit event instead of calling callback directly
            conversationEventTarget?.dispatchEvent(
              new CustomEvent('conversationUpdate', { detail: conversationUpdate })
            );
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

            // Emit event instead of calling callback directly
            conversationEventTarget?.dispatchEvent(
              new CustomEvent('newConversation', { detail: payload.new })
            );
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

            // Emit event instead of calling callback directly
            conversationEventTarget?.dispatchEvent(
              new CustomEvent('conversationUpdate', { detail: conversationUpdate })
            );
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

            if (!conversationId) {
              return;
            }

            if (processedUpdatesRef.current.has(insertKey)) {
              return;
            }

            processedUpdatesRef.current.add(insertKey);

            // Emit event instead of calling callback directly
            // This decouples the subscription from the parent component's render cycle
            conversationEventTarget?.dispatchEvent(
              new CustomEvent('newConversation', { detail: payload.new })
            );
          }
        )
        .subscribe((status: string) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus({
              status: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0
            });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus(prev => {
              const newAttempts = prev.reconnectAttempts + 1;

              // Auto-retry up to 3 times with exponential backoff
              if (newAttempts <= 3) {
                const delay = Math.min(1000 * Math.pow(2, newAttempts - 1), 5000);

                reconnectTimeoutRef.current = setTimeout(() => {
                  connect();
                }, delay);
              }

              return {
                status: 'error',
                error: `Connection failed: ${status}`,
                reconnectAttempts: newAttempts
              };
            });
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

  // Connect on mount - delay slightly to ensure refs are populated
  useEffect(() => {
    let mounted = true;
    let connectTimeout: NodeJS.Timeout;

    if (refacSupabase && mounted) {
      // Delay connection by 100ms to ensure callbacks are fully initialized
      connectTimeout = setTimeout(() => {
        if (mounted) {
          connect();
        }
      }, 100);
    }

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (connectTimeout) {
        clearTimeout(connectTimeout);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - connect once and refs will handle callback updates

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