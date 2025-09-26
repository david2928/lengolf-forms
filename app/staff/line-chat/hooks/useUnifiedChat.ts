// Unified chat hook for managing conversations across multiple channels (LINE + Website)
// Provides a single interface for fetching and managing multi-channel conversations

import { useState, useEffect, useCallback } from 'react';
import type {
  Conversation,
  UnifiedMessage,
  ChannelType
} from '../utils/chatTypes';

interface UseUnifiedChatOptions {
  channelFilter?: ChannelType | null;
  includeInactive?: boolean;
}

interface UseUnifiedChatReturn {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  loading: boolean;
  error: string | null;
  fetchConversations: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  getConversationById: (id: string) => Conversation | null;
  updateConversationLastMessage: (conversationId: string, message: UnifiedMessage) => void;
  updateConversationUnreadCount: (conversationId: string, unreadCount: number) => void;
}

/**
 * Custom hook for managing unified conversations across LINE and website channels
 * Uses the unified_conversations view to provide a seamless multi-channel experience
 */
export const useUnifiedChat = (options: UseUnifiedChatOptions = {}): UseUnifiedChatReturn => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { channelFilter, includeInactive = false } = options;

  // Fetch conversations from unified API endpoint
  const fetchConversations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (channelFilter) {
        params.append('channel', channelFilter);
      }
      if (includeInactive) {
        params.append('includeInactive', 'true');
      }

      const response = await fetch(`/api/conversations/unified?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch conversations: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch conversations');
      }

      // Transform unified conversations to legacy format for component compatibility
      const legacyFormatConversations = (data.conversations || []).map((conv: any) => {
        if (conv.channel_type === 'line') {
          // LINE conversation - map unified format to legacy format
          return {
            id: conv.id,
            lineUserId: conv.channel_user_id,
            customerId: conv.customer_id,
            lastMessageAt: conv.last_message_at,
            lastMessageText: conv.last_message_text,
            lastMessageBy: conv.last_message_by,
            lastMessageType: 'text', // Default, can be enhanced later
            unreadCount: conv.unread_count || 0,
            user: {
              displayName: conv.channel_metadata?.display_name || 'Unknown User',
              pictureUrl: conv.channel_metadata?.picture_url || '',
              lineUserId: conv.channel_user_id,
              customerId: conv.customer_id
            },
            customer: conv.customer_id ? {
              id: conv.customer_id,
              name: conv.channel_metadata?.customer_name || 'Customer',
              phone: '',
              email: ''
            } : null,
            channelType: 'line' as const // Add channel identifier
          };
        } else if (conv.channel_type === 'website') {
          // Website conversation - transform to legacy format
          return {
            id: conv.id,
            lineUserId: conv.channel_user_id, // Use session_id as lineUserId for compatibility
            customerId: conv.customer_id,
            lastMessageAt: conv.last_message_at,
            lastMessageText: conv.last_message_text,
            lastMessageBy: conv.last_message_by,
            lastMessageType: 'text',
            unreadCount: conv.unread_count || 0,
            user: {
              displayName: conv.channel_metadata?.display_name ||
                          (conv.channel_metadata?.email ? `Web User (${conv.channel_metadata.email})` : 'Website User'),
              pictureUrl: '/LG_Logo_Big.jpg', // Use Lengolf logo for website users
              lineUserId: conv.channel_user_id,
              customerId: conv.customer_id
            },
            customer: conv.customer_id ? {
              id: conv.customer_id,
              name: conv.channel_metadata?.customer_name || 'Customer',
              phone: '',
              email: ''
            } : null,
            channelType: 'website' as const // Add channel identifier
          };
        } else if (['facebook', 'instagram', 'whatsapp'].includes(conv.channel_type)) {
          // Meta platforms conversation - transform to legacy format
          const platformName = conv.channel_type.charAt(0).toUpperCase() + conv.channel_type.slice(1);
          return {
            id: conv.id,
            lineUserId: conv.channel_user_id, // Use platform_user_id for compatibility
            customerId: conv.customer_id,
            lastMessageAt: conv.last_message_at,
            lastMessageText: conv.last_message_text,
            lastMessageBy: conv.last_message_by,
            lastMessageType: 'text',
            unreadCount: conv.unread_count || 0,
            user: {
              displayName: conv.channel_metadata?.display_name || `${platformName} User`,
              pictureUrl: conv.channel_metadata?.profile_pic || '',
              lineUserId: conv.channel_user_id,
              customerId: conv.customer_id
            },
            customer: conv.customer_id ? {
              id: conv.customer_id,
              name: conv.channel_metadata?.customer_name || 'Customer',
              phone: conv.channel_metadata?.phone_number || '',
              email: ''
            } : null,
            channelType: conv.channel_type as 'facebook' | 'instagram' | 'whatsapp'
          };
        } else {
          // Unknown channel type - fallback
          return {
            id: conv.id,
            lineUserId: conv.channel_user_id,
            customerId: conv.customer_id,
            lastMessageAt: conv.last_message_at,
            lastMessageText: conv.last_message_text,
            lastMessageBy: conv.last_message_by,
            lastMessageType: 'text',
            unreadCount: conv.unread_count || 0,
            user: {
              displayName: conv.channel_metadata?.display_name || 'Unknown User',
              pictureUrl: conv.channel_metadata?.profile_pic || '',
              lineUserId: conv.channel_user_id,
              customerId: conv.customer_id
            },
            customer: conv.customer_id ? {
              id: conv.customer_id,
              name: conv.channel_metadata?.customer_name || 'Customer',
              phone: '',
              email: ''
            } : null,
            channelType: conv.channel_type as any
          };
        }
      });

      setConversations(legacyFormatConversations);

    } catch (err) {
      console.error('Error in fetchConversations:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [channelFilter, includeInactive]);

  // Refresh conversations (alias for fetchConversations for clarity)
  const refreshConversations = useCallback(async () => {
    await fetchConversations();
  }, [fetchConversations]);

  // Get conversation by ID
  const getConversationById = useCallback((id: string): Conversation | null => {
    return conversations.find(conv => conv.id === id) || null;
  }, [conversations]);

  // Update conversation's last message when a new message arrives
  const updateConversationLastMessage = useCallback((conversationId: string, message: UnifiedMessage) => {
    setConversations(prev => {
      // Update the conversation data
      const updated = prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            lastMessageAt: message.created_at,
            lastMessageText: message.content,
            lastMessageBy: (message.sender_type === 'staff' || message.sender_type === 'admin') ? 'admin' as const : 'user' as const,
            // Only increment unread count for messages from customers/users
            unreadCount: message.sender_type === 'customer' || message.sender_type === 'user'
              ? conv.unreadCount + 1
              : conv.unreadCount
          } as Conversation;
        }
        return conv;
      });

      // IMMEDIATELY sort the updated conversations by lastMessageAt (newest first)
      return updated.sort((a, b) => {
        const aTime = new Date(a.lastMessageAt || 0).getTime();
        const bTime = new Date(b.lastMessageAt || 0).getTime();
        return bTime - aTime; // Descending order
      });
    });
  }, []);

  // Update conversation's unread count (useful for marking as read)
  const updateConversationUnreadCount = useCallback((conversationId: string, unreadCount: number) => {
    setConversations(prev =>
      prev.map(conv => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            unreadCount
          } as Conversation;
        }
        return conv;
      })
    );
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    setConversations,
    loading,
    error,
    fetchConversations,
    refreshConversations,
    getConversationById,
    updateConversationLastMessage,
    updateConversationUnreadCount
  };
};

// Specialized hooks for specific channels
export const useLineChat = () => useUnifiedChat({ channelFilter: 'line' });
export const useWebsiteChat = () => useUnifiedChat({ channelFilter: 'website' });