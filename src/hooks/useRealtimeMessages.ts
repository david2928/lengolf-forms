import { useEffect, useRef, useCallback, useState } from 'react';
import { supabaseRealtime } from '@/lib/supabase-realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  conversationId?: string; // Added for routing messages to correct conversations
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
  replySenderName?: string;
  replySenderType?: string;
  replySenderPictureUrl?: string;
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
  conversationId: string | null; // null means subscribe to ALL conversations
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
    status: supabaseRealtime ? 'disconnected' : 'error',
    error: supabaseRealtime ? undefined : 'Realtime client not available',
    reconnectAttempts: 0
  });

  // Track processed message IDs to prevent duplicates
  const processedMessagesRef = useRef<Set<string>>(new Set());

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
    disconnect();

    try {
      const channelName = conversationId ? `messages-${conversationId}` : 'all-messages';
      setConnectionStatus(prev => ({ ...prev, status: 'connecting', error: undefined }));

      // Create channel with minimal configuration
      const channel = supabaseRealtime
        .channel(channelName)
        .on(
          'postgres_changes',
          conversationId
            ? {
                event: 'INSERT',
                schema: 'public',
                table: 'line_messages',
                filter: `conversation_id=eq.${conversationId}`
              }
            : {
                event: 'INSERT',
                schema: 'public',
                table: 'line_messages'
                // No filter = subscribe to ALL messages
              },
          (payload: any) => {
            const messageId = payload.new?.id;
            if (!messageId || processedMessagesRef.current.has(messageId)) {
              return;
            }

            processedMessagesRef.current.add(messageId);

            // Transform to Message interface
            const message: Message = {
              id: payload.new.id,
              conversationId: payload.new.conversation_id, // Add conversation ID for routing
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
              replySenderName: payload.new.reply_sender_name,
              replySenderType: payload.new.reply_sender_type,
              replySenderPictureUrl: payload.new.reply_sender_picture_url,
              // Construct repliedToMessage object from available reply data
              repliedToMessage: payload.new.replied_to_message_id ? {
                id: payload.new.replied_to_message_id,
                text: payload.new.reply_preview_text,
                type: payload.new.reply_preview_type || 'text',
                senderName: payload.new.reply_sender_name,
                senderType: payload.new.reply_sender_type,
                pictureUrl: payload.new.reply_sender_picture_url
              } : undefined,
            };

            onNewMessage?.(message);
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

            // Retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, connectionStatus.reconnectAttempts), 30000);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else if (status === 'CLOSED') {
            setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
          }
        });

      channelRef.current = channel;

    } catch (error) {
      setConnectionStatus(prev => ({
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed',
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
    }
  }, [conversationId, onNewMessage, disconnect, connectionStatus.reconnectAttempts]);

  // Connect when conversationId changes OR when subscribing to all conversations
  useEffect(() => {
    if (supabaseRealtime) {
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