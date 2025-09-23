'use client';

// ConversationSidebar component extracted from main LINE chat component
// Handles the left panel with conversation list, search, and notifications
// Extended to support unified multi-channel conversations (LINE + Website)

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { enhanceMessageDisplay } from '@/lib/line/emoji-display-utils';
import {
  MessageSquare,
  Users,
  Search,
  Bell,
  BellOff,
  Zap,
  Monitor,
  Smartphone
} from 'lucide-react';
import Image from 'next/image';
import type {
  ConversationSidebarProps,
  Conversation,
  UnifiedConversation,
  ChannelType
} from '../utils/chatTypes';
import { formatTime } from '../utils/formatters';

// Channel indicator component
const ChannelIndicator = ({ channelType }: { channelType: ChannelType }) => {
  if (channelType === 'line') {
    return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
  } else if (channelType === 'website') {
    return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
  }
  return null;
};

// Get display name for unified conversation
const getConversationDisplayName = (conversation: UnifiedConversation | Conversation): string => {
  // Check if it's a unified conversation
  if ('channel_type' in conversation) {
    const unified = conversation as UnifiedConversation;
    if (unified.channel_type === 'line') {
      return unified.channel_metadata?.display_name || 'Unknown User';
    } else if (unified.channel_type === 'website') {
      return unified.channel_metadata?.display_name ||
             (unified.channel_metadata?.email ? `Web User (${unified.channel_metadata.email})` : 'Website User');
    }
  }

  // Fallback to legacy conversation format
  const legacy = conversation as Conversation;
  return legacy.customer?.name || legacy.user?.displayName || 'Unknown';
};

// Get profile picture URL for unified conversation
const getConversationPictureUrl = (conversation: UnifiedConversation | Conversation): string => {
  // Check if it's a unified conversation
  if ('channel_type' in conversation) {
    const unified = conversation as UnifiedConversation;
    if (unified.channel_type === 'line') {
      return unified.channel_metadata?.picture_url || '';
    }
    // Website users don't have profile pictures
    return '';
  }

  // Fallback to legacy conversation format
  const legacy = conversation as Conversation;
  return legacy.user?.pictureUrl || '';
};

// Check if conversation is unified format
const isUnifiedConversation = (conversation: any): conversation is UnifiedConversation => {
  return 'channel_type' in conversation;
};

// Universal property accessors that work with both conversation types
const getUnreadCount = (conversation: Conversation | UnifiedConversation): number => {
  if (isUnifiedConversation(conversation)) {
    return conversation.unread_count || 0;
  }
  return conversation.unreadCount || 0;
};

const getLastMessageText = (conversation: Conversation | UnifiedConversation): string => {
  if (isUnifiedConversation(conversation)) {
    return conversation.last_message_text || '';
  }
  return conversation.lastMessageText || '';
};

const getLastMessageAt = (conversation: Conversation | UnifiedConversation): string => {
  if (isUnifiedConversation(conversation)) {
    return conversation.last_message_at || '';
  }
  return conversation.lastMessageAt || '';
};

const getLastMessageBy = (conversation: Conversation | UnifiedConversation): string => {
  if (isUnifiedConversation(conversation)) {
    return conversation.last_message_by || '';
  }
  return conversation.lastMessageBy || '';
};

// Safe Image component with error handling
const SafeImage = ({ src, alt, width, height, className }: {
  src: string;
  alt: string;
  width: number;
  height: number;
  className: string;
}) => {
  const [imageError, setImageError] = useState(false);

  if (!src || imageError) {
    return (
      <div className={`${className} bg-gray-300 flex items-center justify-center`}>
        <Users className="h-5 w-5 text-gray-600" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setImageError(true)}
    />
  );
};

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  selectedConversation,
  onConversationSelect,
  conversations: propConversations,
  setConversations: propSetConversations
}) => {
  // Use conversations from props if provided, otherwise use local state
  const [localConversations, setLocalConversations] = useState<Conversation[]>([]);
  const conversations = propConversations || localConversations;
  const setConversations = propSetConversations || setLocalConversations;
  const [searchTerm, setSearchTerm] = useState('');

  // Push notifications hook
  const {
    isSupported,
    isSubscribed,
    isLoading: notificationLoading,
    error: notificationError,
    subscribe: subscribeToNotifications,
    unsubscribe: unsubscribeFromNotifications,
    sendTestNotification
  } = usePushNotifications();

  // Stabilize the conversation update callback
  const handleConversationUpdate = useCallback((conversation: any) => {
    setConversations((prev: Conversation[]): Conversation[] =>
      prev.map((conv: Conversation): Conversation =>
        conv.id === conversation.id
          ? { ...conv, ...conversation }
          : conv
      )
    );
  }, [setConversations]);

  // Realtime conversations hook
  const {
    connectionStatus: conversationsConnectionStatus,
    reconnect: reconnectConversations,
    disconnect: disconnectConversations
  } = useRealtimeConversations({
    onConversationUpdate: handleConversationUpdate
  });

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/line/conversations');
      const data = await response.json();

      if (data.success) {
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    }
  }, []);

  // Initialize conversations on mount (only if not provided via props)
  useEffect(() => {
    if (!propConversations) {
      fetchConversations();
    }
  }, [fetchConversations, propConversations]);

  // Filter conversations by search term
  const filteredConversations = conversations.filter(conv =>
    conv.user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessageText?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full md:w-80 bg-white border-r flex flex-col transition-all duration-300 ease-in-out">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Conversations</h1>

          {/* Push Notification Controls */}
          {isSupported && (
            <div className="flex items-center space-x-2">
              {isSubscribed ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={unsubscribeFromNotifications}
                    disabled={notificationLoading}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Notifications enabled - Click to disable"
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={sendTestNotification}
                    disabled={notificationLoading}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    title="Send test notification"
                  >
                    <Zap className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={subscribeToNotifications}
                  disabled={notificationLoading}
                  className="text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                  title="Enable notifications for new messages"
                >
                  <BellOff className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Notification Error/Status */}
        {notificationError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {notificationError}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onConversationSelect(conversation.id)}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <SafeImage
                  src={getConversationPictureUrl(conversation)}
                  alt={getConversationDisplayName(conversation)}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {/* Channel indicator */}
                      {conversation.channelType && (
                        <ChannelIndicator channelType={conversation.channelType as ChannelType} />
                      )}
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.customer?.name || conversation.user.displayName}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {getUnreadCount(conversation) > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {getUnreadCount(conversation)}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTime(getLastMessageAt(conversation))}
                      </span>
                    </div>
                  </div>

                  {getLastMessageText(conversation) && (
                    <div className="flex items-center space-x-2 mt-1">
                      {(getLastMessageBy(conversation) === 'admin' || getLastMessageBy(conversation) === 'staff') && (
                        <span className="text-sm text-gray-500">✓</span>
                      )}
                      {/* Handle different message types for both unified and legacy formats */}
                      {(() => {
                        // For unified conversations, check the content type or infer from text
                        if (isUnifiedConversation(conversation)) {
                          const lastMessageType = getLastMessageText(conversation).includes('📷') ? 'image' : 'text';

                          if (lastMessageType === 'image') {
                            return (
                              <p className="text-sm text-gray-500 truncate">
                                📷 Image message
                              </p>
                            );
                          } else {
                            return (
                              <p className="text-sm text-gray-500 truncate">
                                {enhanceMessageDisplay(getLastMessageText(conversation))}
                              </p>
                            );
                          }
                        }

                        // Legacy conversation format
                        const legacyConv = conversation as Conversation;
                        if (legacyConv.lastMessageType === 'sticker') {
                          return (
                            <p className="text-sm text-gray-500 truncate">
                              {getConversationDisplayName(conversation)} sent a sticker
                            </p>
                          );
                        } else if (legacyConv.lastMessageType === 'image') {
                          return (
                            <p className="text-sm text-gray-500 truncate">
                              {getConversationDisplayName(conversation)} sent an image
                            </p>
                          );
                        } else {
                          return (
                            <p className="text-sm text-gray-500 truncate">
                              {enhanceMessageDisplay(getLastMessageText(conversation))}
                            </p>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};