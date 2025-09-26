import { useEffect, useRef, useCallback, useState } from 'react';
import { supabaseRealtime } from '@/lib/supabase-realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: string;
  platformMessageId?: string; // Original platform message ID for replies (Facebook mid, etc)
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
  channelType?: 'line' | 'website' | 'meta' | 'all'; // Add Meta channel support
}

export function useRealtimeMessages({
  conversationId,
  onNewMessage,
  onMessageUpdate,
  channelType = 'all'
}: UseRealtimeMessagesOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
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

    // Disconnect existing channel first (inline to avoid dependency loop)
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    try {
      const channelName = conversationId ? `messages-${conversationId}` : 'all-messages';
      setConnectionStatus(prev => ({ ...prev, status: 'connecting', error: undefined }));

      // Create channel with minimal configuration
      let channel = supabaseRealtime.channel(channelName);

      // Helper function to transform LINE messages
      const transformLineMessage = (payload: any): Message => ({
        id: payload.new.id,
        conversationId: payload.new.conversation_id,
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
        repliedToMessage: payload.new.replied_to_message_id ? {
          id: payload.new.replied_to_message_id,
          text: payload.new.reply_preview_text,
          type: payload.new.reply_preview_type || 'text',
          senderName: payload.new.reply_sender_name,
          senderType: payload.new.reply_sender_type,
          pictureUrl: payload.new.reply_sender_picture_url
        } : undefined,
      });

      // Helper function to transform website messages
      const transformWebsiteMessage = (payload: any): Message => ({
        id: payload.new.id,
        conversationId: payload.new.conversation_id,
        text: payload.new.message_text,
        type: payload.new.message_type || 'text',
        senderType: (payload.new.sender_type === 'staff' || payload.new.sender_type === 'bot') ? 'admin' : 'user',
        senderName: payload.new.sender_name || (payload.new.sender_type === 'customer' ? 'Website User' : 'Admin'),
        createdAt: payload.new.created_at,
        timestamp: new Date(payload.new.created_at).getTime(),
        // Include image URL if it's an image message
        imageUrl: payload.new.image_url || undefined
      });

      // Helper function to transform Meta messages (Facebook, Instagram, WhatsApp)
      const transformMetaMessage = async (payload: any): Promise<Message> => {
        let repliedToMessage = undefined;

        // If this is a reply, fetch the original message data from database
        if (payload.new.reply_to_message_id) {
          try {
            const { data: originalMessage } = await supabaseRealtime!
              .from('meta_messages')
              .select('id, message_text, message_type, sender_name, sender_type, platform_user_id')
              .eq('id', payload.new.reply_to_message_id)
              .single();

            if (originalMessage) {
              // Fetch profile picture from meta_users table
              const { data: user } = await supabaseRealtime!
                .from('meta_users')
                .select('profile_pic')
                .eq('platform_user_id', originalMessage.platform_user_id)
                .single();

              repliedToMessage = {
                id: originalMessage.id,
                text: originalMessage.message_text,
                type: originalMessage.message_type || 'text',
                senderName: originalMessage.sender_name,
                senderType: originalMessage.sender_type === 'business' ? 'admin' : 'user',
                pictureUrl: user?.profile_pic || undefined // Add profile picture to reply context
              };
            }
          } catch (error) {
            console.log('Failed to fetch reply context for realtime message:', error);
            // Fall back to basic preview data
            repliedToMessage = {
              id: payload.new.reply_to_message_id,
              text: payload.new.reply_preview_text,
              type: payload.new.reply_preview_type || 'text',
              senderName: 'User', // Generic fallback if database lookup fails
              senderType: 'user'
            };
          }
        }

        return {
          id: payload.new.id,
          platformMessageId: payload.new.platform_message_id, // Include platform message ID for replies
          conversationId: payload.new.conversation_id,
          text: payload.new.message_text,
          type: payload.new.message_type || 'text',
          senderType: payload.new.sender_type === 'business' ? 'admin' : 'user',
          senderName: payload.new.sender_name,
          createdAt: payload.new.created_at,
          timestamp: new Date(payload.new.created_at).getTime(),
          // Meta-specific fields
          fileUrl: payload.new.file_url,
          fileName: payload.new.file_name,
          fileSize: payload.new.file_size,
          fileType: payload.new.file_type,
          imageUrl: payload.new.image_url,
          // Reply support for Meta
          repliedToMessageId: payload.new.reply_to_message_id,
          replyPreviewText: payload.new.reply_preview_text,
          replyPreviewType: payload.new.reply_preview_type,
          repliedToMessage
        };
      };

      // Message handler with deduplication
      const handleMessage = async (payload: any, messageType: 'line' | 'website' | 'meta' = 'line') => {
        const messageId = payload.new?.id;
        if (!messageId || processedMessagesRef.current.has(messageId)) {
          return;
        }

        processedMessagesRef.current.add(messageId);

        let message: Message;
        switch (messageType) {
          case 'website':
            message = transformWebsiteMessage(payload);
            break;
          case 'meta':
            message = await transformMetaMessage(payload);
            break;
          case 'line':
          default:
            message = transformLineMessage(payload);
            break;
        }

        onNewMessage?.(message);
      };

      // Subscribe to LINE messages if needed
      if (channelType === 'line' || channelType === 'all') {
        channel = channel.on(
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
              },
          (payload: any) => handleMessage(payload, 'line')
        );
      }

      // Subscribe to website messages if needed
      if (channelType === 'website' || channelType === 'all') {
        channel = channel.on(
          'postgres_changes',
          conversationId
            ? {
                event: 'INSERT',
                schema: 'public',
                table: 'web_chat_messages',
                filter: `conversation_id=eq.${conversationId}`
              }
            : {
                event: 'INSERT',
                schema: 'public',
                table: 'web_chat_messages'
              },
          (payload: any) => handleMessage(payload, 'website')
        );
      }

      // Subscribe to Meta messages if needed (NEW)
      if (channelType === 'meta' || channelType === 'all') {
        channel = channel.on(
          'postgres_changes',
          conversationId
            ? {
                event: 'INSERT',
                schema: 'public',
                table: 'meta_messages',
                filter: `conversation_id=eq.${conversationId}`
              }
            : {
                event: 'INSERT',
                schema: 'public',
                table: 'meta_messages'
              },
          (payload: any) => handleMessage(payload, 'meta')
        );
      }

      // Subscribe to all configured events
      channel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttemptsRef.current = 0;
            setConnectionStatus({
              status: 'connected',
              lastConnected: new Date(),
              reconnectAttempts: 0
            });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnectionStatus(prev => ({
              status: 'error',
              error: `Connection failed: ${status}`,
              reconnectAttempts: reconnectAttemptsRef.current
            }));

            // Retry with exponential backoff
            reconnectAttemptsRef.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

            reconnectTimeoutRef.current = setTimeout(() => {
              connect();
            }, delay);
          } else if (status === 'CLOSED') {
            setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
          }
        });

      channelRef.current = channel;

    } catch (error) {
      reconnectAttemptsRef.current++;
      setConnectionStatus(prev => ({
        status: 'error',
        error: error instanceof Error ? error.message : 'Connection failed',
        reconnectAttempts: reconnectAttemptsRef.current
      }));
    }
  }, [conversationId, onNewMessage, channelType]);

  // Connect when conversationId changes OR when subscribing to all conversations
  useEffect(() => {
    if (supabaseRealtime) {
      connect();
    } else {
      // Disconnect inline to avoid dependency loop
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      setConnectionStatus(prev => ({ ...prev, status: 'disconnected' }));
    }

    return () => {
      // Cleanup inline to avoid dependency loop
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [conversationId, channelType, connect]);

  // Note: Cleanup is handled in the main useEffect above

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