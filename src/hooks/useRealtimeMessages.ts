import { useEffect, useRef, useCallback, useState } from 'react';
import { refacSupabase } from '@/lib/refac-supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  text?: string;
  type: string;
  senderType: 'user' | 'admin';
  senderName?: string;
  createdAt: string;
  timestamp?: number;
  // Sticker properties
  packageId?: string;
  stickerId?: string;
  stickerKeywords?: string[];
  // File properties (includes images)
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  // Legacy image property (for backward compatibility)
  imageUrl?: string;
  // Reply/Quote properties for native LINE reply support
  quoteToken?: string;
  repliedToMessageId?: string;
  replyPreviewText?: string;
  replyPreviewType?: string;
  // Populated reply data when message is a reply
  repliedToMessage?: {
    id: string;
    text?: string;
    type: string;
    senderName?: string;
    senderType?: string;
    pictureUrl?: string;
    fileName?: string;
  };
}

interface RealtimeConnectionStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
  lastConnected?: Date;
  reconnectAttempts: number;
}

interface UseRealtimeMessagesOptions {
  conversationId: string | null;
  onNewMessage?: (message: Message) => void;
  onMessageUpdate?: (message: Message) => void;
}

export function useRealtimeMessages({
  conversationId,
  onNewMessage,
  onMessageUpdate
}: UseRealtimeMessagesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<RealtimeConnectionStatus>({
    status: 'disconnected',
    reconnectAttempts: 0
  });

  // Track processed message IDs to prevent duplicates
  const processedMessagesRef = useRef<Set<string>>(new Set());

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      console.log('Disconnecting from realtime messages channel');
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
    if (!conversationId || !refacSupabase) {
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
      return;
    }

    // Disconnect existing channel first
    disconnect();

    try {
      console.log(`Connecting to realtime messages for conversation: ${conversationId}`);
      setConnectionStatus(prev => ({ ...prev, status: 'connecting' }));

      // Create channel with conversation-specific name
      const channel = refacSupabase
        .channel(`line_messages:conversation:${conversationId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'line_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: any) => {
            console.log('Realtime message INSERT:', payload);

            const messageId = payload.new?.id;
            if (!messageId || processedMessagesRef.current.has(messageId)) {
              console.log('Skipping duplicate message:', messageId);
              return;
            }

            processedMessagesRef.current.add(messageId);

            // Transform database record to Message interface
            const message: Message = {
              id: payload.new.id,
              text: payload.new.message_text,
              type: payload.new.message_type || 'text',
              senderType: payload.new.sender_type === 'admin' ? 'admin' : 'user',
              senderName: payload.new.sender_name,
              createdAt: payload.new.created_at,
              timestamp: payload.new.timestamp,
              packageId: payload.new.package_id,
              stickerId: payload.new.sticker_id,
              stickerKeywords: payload.new.sticker_keywords,
              fileUrl: payload.new.file_url,
              fileName: payload.new.file_name,
              fileSize: payload.new.file_size,
              fileType: payload.new.file_type,
              imageUrl: payload.new.image_url,
              quoteToken: payload.new.quote_token,
              repliedToMessageId: payload.new.replied_to_message_id,
              replyPreviewText: payload.new.reply_preview_text,
              replyPreviewType: payload.new.reply_preview_type,
            };

            onNewMessage?.(message);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'line_messages',
            filter: `conversation_id=eq.${conversationId}`
          },
          (payload: any) => {
            console.log('Realtime message UPDATE:', payload);

            // Transform database record to Message interface
            const message: Message = {
              id: payload.new.id,
              text: payload.new.message_text,
              type: payload.new.message_type || 'text',
              senderType: payload.new.sender_type === 'admin' ? 'admin' : 'user',
              senderName: payload.new.sender_name,
              createdAt: payload.new.created_at,
              timestamp: payload.new.timestamp,
              packageId: payload.new.package_id,
              stickerId: payload.new.sticker_id,
              stickerKeywords: payload.new.sticker_keywords,
              fileUrl: payload.new.file_url,
              fileName: payload.new.file_name,
              fileSize: payload.new.file_size,
              fileType: payload.new.file_type,
              imageUrl: payload.new.image_url,
              quoteToken: payload.new.quote_token,
              repliedToMessageId: payload.new.replied_to_message_id,
              replyPreviewText: payload.new.reply_preview_text,
              replyPreviewType: payload.new.reply_preview_type,
            };

            onMessageUpdate?.(message);
          }
        )
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);

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
            console.log(`Reconnecting in ${delay}ms...`);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else if (status === 'CLOSED') {
            setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
          }
        });

      channelRef.current = channel;

    } catch (error) {
      console.error('Failed to connect to realtime messages:', error);
      setConnectionStatus(prev => ({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    }
  }, [conversationId, onNewMessage, onMessageUpdate, disconnect, connectionStatus.reconnectAttempts]);

  // Connect when conversationId changes
  useEffect(() => {
    if (conversationId) {
      connect();
    } else {
      disconnect();
    }

    return disconnect;
  }, [conversationId, connect, disconnect]);

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

  // Clear processed messages when conversation changes
  useEffect(() => {
    processedMessagesRef.current.clear();
  }, [conversationId]);

  return {
    connectionStatus,
    reconnect,
    disconnect
  };
}