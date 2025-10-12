'use client';

// ConversationSidebar component extracted from main LINE chat component
// Handles the left panel with conversation list, search, and notifications
// Extended to support unified multi-channel conversations (LINE + Website)

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Smartphone,
  Sparkles,
  Home,
  Globe,
  MailOpen,
  Pin,
  PinOff,
  MoreHorizontal,
  RefreshCw,
  AlertOctagon,
  ShieldCheck
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaLine } from 'react-icons/fa';
import Image from 'next/image';
import Link from 'next/link';
import type {
  ConversationSidebarProps,
  Conversation,
  UnifiedConversation,
  ChannelType
} from '../utils/chatTypes';
import { formatTime } from '../utils/formatters';

// Platform logo badge component - ChatCone style with actual company logos
const PlatformLogoBadge = ({ channelType }: { channelType: ChannelType }) => {
  const getIcon = () => {
    switch (channelType) {
      case 'facebook':
        return <FaFacebook className="w-3 h-3" style={{ color: '#1877F2' }} />;
      case 'instagram':
        return <FaInstagram className="w-3 h-3" style={{ color: '#E4405F' }} />;
      case 'whatsapp':
        return <FaWhatsapp className="w-3 h-3" style={{ color: '#25D366' }} />;
      case 'line':
        return <FaLine className="w-3 h-3" style={{ color: '#00B900' }} />;
      case 'website':
        return <Globe className="w-3 h-3" style={{ color: '#3B82F6' }} />;
      default:
        return null;
    }
  };

  const icon = getIcon();
  if (!icon) return null;

  return (
    <div
      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm border-0 flex items-center justify-center"
      style={{ padding: '1px' }}
      title={channelType.toUpperCase()}
    >
      {icon}
    </div>
  );
};

// Get display name for unified conversation with Meta platform support
const resolveChannelDisplayName = (metadata: any, fallback: string): string => {
  if (!metadata) return fallback;

  const candidates = [
    metadata.customer_name,
    metadata.display_name,
    metadata.displayName,
    metadata.full_name,
    metadata.username,
    metadata.ig_username,
    metadata.profile_name,
    metadata.profileName,
    metadata.name,
    metadata.sender_name
  ];

  const resolved = candidates.find(name => typeof name === 'string' && name.trim().length > 0);
  return resolved || fallback;
};

const getConversationDisplayName = (conversation: UnifiedConversation | Conversation): string => {
  // Check if it's a unified conversation
  if ('channel_type' in conversation) {
    const unified = conversation as UnifiedConversation;
    if (unified.channel_type === 'line') {
      return resolveChannelDisplayName(unified.channel_metadata, 'Unknown User');
    } else if (unified.channel_type === 'website') {
      return resolveChannelDisplayName(unified.channel_metadata, '') ||
             (unified.channel_metadata?.email ? `Web User (${unified.channel_metadata.email})` : 'Website User');
    } else if (unified.channel_type === 'facebook') {
      return resolveChannelDisplayName(unified.channel_metadata, 'Facebook User');
    } else if (unified.channel_type === 'instagram') {
      return resolveChannelDisplayName(unified.channel_metadata, 'Instagram User');
    } else if (unified.channel_type === 'whatsapp') {
      return resolveChannelDisplayName(unified.channel_metadata, '') ||
             (unified.channel_metadata?.phone_number ? `WhatsApp User (${unified.channel_metadata.phone_number})` : 'WhatsApp User');
    }
  }

  // Fallback to legacy conversation format
  const legacy = conversation as Conversation;
  return legacy.customer?.name || legacy.user?.displayName || 'Unknown';
};

// Get profile picture URL for unified conversation with Meta platform support
const getConversationPictureUrl = (conversation: UnifiedConversation | Conversation): string => {
  // Check if it's a unified conversation
  if ('channel_type' in conversation) {
    const unified = conversation as UnifiedConversation;
    if (unified.channel_type === 'line') {
      return unified.channel_metadata?.picture_url || '';
    } else if (unified.channel_type === 'facebook' || unified.channel_type === 'instagram') {
      // Meta platforms support profile pictures
      return unified.channel_metadata?.profile_pic || '';
    } else if (unified.channel_type === 'website') {
      // Use Lengolf logo for website users
      return '/LG_Logo_Big.jpg';
    }
    // WhatsApp users don't have profile pictures typically
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

// Export interface for imperative methods
export interface ConversationSidebarRef {
  scrollToTop: () => void;
}

export const ConversationSidebar = forwardRef<ConversationSidebarRef, ConversationSidebarProps>(({
  selectedConversation,
  onConversationSelect,
  conversations: propConversations,
  setConversations: propSetConversations,
  enableAISuggestions = true,
  onToggleAI,
  markAsUnread,
  toggleFollowUp,
  toggleSpam,
  onRefresh
}, ref) => {
  // Use conversations from props if provided, otherwise use local state
  const [localConversations, setLocalConversations] = useState<Conversation[]>([]);
  const conversations = propConversations || localConversations;
  const setConversations = propSetConversations || setLocalConversations;
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Filter state - 'all' excludes spam, 'following' shows followed, 'spam' shows spam only
  const [filter, setFilter] = useState<'all' | 'following' | 'spam'>('all');

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState<string | null>(null);

  // Long press state for mobile
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  // Ref for the scrollable conversations container
  const conversationsContainerRef = useRef<HTMLDivElement>(null);

  // Expose scroll method to parent component
  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      if (conversationsContainerRef.current) {
        const container = conversationsContainerRef.current;

        // Try multiple scroll methods immediately
        container.scrollTo({ top: 0, behavior: 'smooth' });
        container.scrollTop = 0; // Force instant scroll too

        // Find and scroll all scrollable parents
        const findScrollableParents = (element: HTMLElement): HTMLElement[] => {
          const scrollableParents: HTMLElement[] = [];
          let current = element.parentElement;

          while (current && current !== document.body) {
            const style = window.getComputedStyle(current);
            const isScrollable = style.overflowY === 'auto' || style.overflowY === 'scroll' ||
                               current.scrollHeight > current.clientHeight;

            if (isScrollable) {
              scrollableParents.push(current);
            }
            current = current.parentElement;
          }
          return scrollableParents;
        };

        const scrollableParents = findScrollableParents(container);
        scrollableParents.forEach((parent) => {
          parent.scrollTo({ top: 0, behavior: 'smooth' });
          parent.scrollTop = 0;
        });

        // Force scroll after a delay
        setTimeout(() => {
          if (conversationsContainerRef.current) {
            conversationsContainerRef.current.scrollTop = 0;
          }

          // Also force scroll all parents again
          scrollableParents.forEach((parent) => {
            parent.scrollTop = 0;
          });
        }, 100);
      }
    }
  }), []);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);


  // Context menu actions
  const handleMarkAsUnread = useCallback(async (conversation: Conversation) => {
    if (!markAsUnread) return;
    try {
      const channelType = conversation.channelType || 'line';
      await markAsUnread(conversation.id, channelType);
      setContextMenuOpen(null);
    } catch (error) {
      console.error('Failed to mark conversation as unread:', error);
    }
  }, [markAsUnread]);

  const handleToggleFollowUp = useCallback(async (conversation: Conversation) => {
    if (!toggleFollowUp) return;
    try {
      const channelType = conversation.channelType || 'line';
      await toggleFollowUp(conversation.id, channelType, conversation.isFollowing || false);
      setContextMenuOpen(null);
    } catch (error) {
      console.error('Failed to toggle follow-up status:', error);
    }
  }, [toggleFollowUp]);

  const handleToggleSpam = useCallback(async (conversation: Conversation) => {
    if (!toggleSpam) return;
    try {
      const channelType = conversation.channelType || 'line';
      await toggleSpam(conversation.id, channelType, conversation.isSpam || false);
      setContextMenuOpen(null);
    } catch (error) {
      console.error('Failed to toggle spam status:', error);
    }
  }, [toggleSpam]);

  // Long press handlers for mobile
  const handleTouchStart = useCallback((conversationId: string) => {
    if (!isMobile) return;

    setIsLongPressing(false);
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      setContextMenuOpen(conversationId);
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms long press duration

    setLongPressTimer(timer);
  }, [isMobile]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  }, [longPressTimer]);

  const handleTouchCancel = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setIsLongPressing(false);
  }, [longPressTimer]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

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
  }, [setConversations]);

  // Initialize conversations on mount (only if not provided via props)
  useEffect(() => {
    if (!propConversations) {
      fetchConversations();
    }
  }, [fetchConversations, propConversations]);

  // Filter conversations by search term and filter type
  const filteredConversations = conversations.filter(conv => {
    // First apply search filter
    const matchesSearch =
      conv.user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.lastMessageText?.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    // Then apply tab filter
    if (filter === 'all') {
      // 'All' shows everything EXCEPT spam
      return !conv.isSpam;
    } else if (filter === 'following') {
      // 'Follow-up' shows only followed conversations (not spam)
      return conv.isFollowing && !conv.isSpam;
    } else if (filter === 'spam') {
      // 'Spam' shows only spam conversations
      return conv.isSpam;
    }

    return true;
  });

  return (
    <div className="w-full md:w-96 bg-white border-r flex flex-col transition-all duration-300 ease-in-out">
      <div className="p-4 border-b bg-[#1a4d2e]">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-white">Conversations</h1>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Refresh Button - Available on both mobile and desktop */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                className="h-8 w-8 p-0 hover:bg-[#2a6d4e] text-white"
                title="Refresh conversations"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {/* Home Button - Available on both mobile and desktop */}
            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-[#2a6d4e] text-white"
                title="Go to Home"
              >
                <Home className="h-4 w-4" />
              </Button>
            </Link>

            {/* AI Suggestions Toggle - TEMPORARILY HIDDEN */}
            {false && onToggleAI && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleAI?.(!enableAISuggestions)}
                className={`transition-all duration-200 ${
                  enableAISuggestions
                    ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                    : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50'
                }`}
                title={enableAISuggestions ? "Disable AI suggestions" : "Enable AI suggestions"}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}

            {/* Push Notification Controls */}
            {isSupported && (
              <>
                {isSubscribed ? (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={unsubscribeFromNotifications}
                      disabled={notificationLoading}
                      className="text-white hover:bg-[#2a6d4e]"
                      title="Notifications enabled - Click to disable"
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={sendTestNotification}
                      disabled={notificationLoading}
                      className="text-white hover:bg-[#2a6d4e]"
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
                    className="text-white/70 hover:text-white hover:bg-[#2a6d4e]"
                    title="Enable notifications for new messages"
                  >
                    <BellOff className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notification Error/Status */}
        {notificationError && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
            {notificationError}
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="flex gap-2">
          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 px-3 h-10 bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-colors rounded-md"
              >
                <span className="text-sm font-medium">
                  {filter === 'all' && '≡ All'}
                  {filter === 'following' && '≡ Follow-up'}
                  {filter === 'spam' && '≡ Spam'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuItem
                onClick={() => setFilter('all')}
                className={`cursor-pointer ${filter === 'all' ? 'bg-blue-50 text-blue-600 font-medium' : ''}`}
              >
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter('following')}
                className={`cursor-pointer ${filter === 'following' ? 'bg-blue-50 text-blue-600 font-medium' : ''}`}
              >
                Follow-up
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilter('spam')}
                className={`cursor-pointer ${filter === 'spam' ? 'bg-red-50 text-red-600 font-medium' : ''}`}
              >
                Spam
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Search Box - Full width */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-white border-white/20 rounded-md focus:border-white/40 focus:ring-0"
            />
          </div>
        </div>
      </div>

      <div
        ref={conversationsContainerRef}
        className="overflow-y-auto flex-1 conversations-container"
        data-conversations-list
      >
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={`${conversation.id}-${(conversation as any).channel_type || conversation.channelType || 'unknown'}`}
              className={`p-4 border-b cursor-pointer hover:bg-gray-50 group relative ${
                selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onTouchStart={() => handleTouchStart(conversation.id)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchCancel}
            >
              <div
                className="flex items-center space-x-3"
                onClick={(e) => {
                  // Don't navigate if we're in the middle of a long press
                  if (isLongPressing) {
                    e.preventDefault();
                    return;
                  }
                  onConversationSelect(conversation.id);
                }}
              >
                <div className="relative">
                  <SafeImage
                    src={getConversationPictureUrl(conversation)}
                    alt={getConversationDisplayName(conversation)}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {/* Platform logo badge overlaid on profile picture */}
                  {conversation.channelType && (
                    <PlatformLogoBadge channelType={conversation.channelType as ChannelType} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {getConversationDisplayName(conversation)}
                      </p>
                      {/* Spam badge */}
                      {conversation.isSpam && (
                        <Badge variant="destructive" className="text-xs bg-red-500 text-white">
                          Spam
                        </Badge>
                      )}
                      {/* Following badge */}
                      {conversation.isFollowing && (
                        <Badge variant="default" className="text-xs bg-blue-500 text-white">
                          Following
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      {getUnreadCount(conversation) > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {getUnreadCount(conversation)}
                        </Badge>
                      )}
                      <span className={`text-xs text-gray-500 transition-opacity ${
                        contextMenuOpen === conversation.id ? 'opacity-0' : 'group-hover:opacity-0'
                      }`}>
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
                              <p className="text-sm text-gray-500 truncate max-w-48">
                                📷 Image message
                              </p>
                            );
                          } else {
                            return (
                              <p className="text-sm text-gray-500 truncate max-w-48">
                                {enhanceMessageDisplay(getLastMessageText(conversation))}
                              </p>
                            );
                          }
                        }

                        // Legacy conversation format
                        const legacyConv = conversation as Conversation;
                        if (legacyConv.lastMessageType === 'sticker') {
                          return (
                            <p className="text-sm text-gray-500 truncate max-w-48">
                              {getConversationDisplayName(conversation)} sent a sticker
                            </p>
                          );
                        } else if (legacyConv.lastMessageType === 'image') {
                          return (
                            <p className="text-sm text-gray-500 truncate max-w-48">
                              {getConversationDisplayName(conversation)} sent an image
                            </p>
                          );
                        } else {
                          return (
                            <p className="text-sm text-gray-500 truncate max-w-48">
                              {enhanceMessageDisplay(getLastMessageText(conversation))}
                            </p>
                          );
                        }
                      })()}
                    </div>
                  )}
                </div>
              </div>

              {/* Three dots menu - desktop only (hover), mobile uses long press without visible dots */}
              {!isMobile && (
                <div className={`absolute top-4 right-4 transition-opacity ${
                  contextMenuOpen === conversation.id ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'
                }`}>
                <DropdownMenu
                  open={contextMenuOpen === conversation.id}
                  onOpenChange={(open) => setContextMenuOpen(open ? conversation.id : null)}
                >
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent conversation selection
                      }}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => handleMarkAsUnread(conversation)}
                      className="cursor-pointer"
                    >
                      <MailOpen className="mr-2 h-4 w-4" />
                      Mark as Unread
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleFollowUp(conversation)}
                      className="cursor-pointer"
                    >
                      {conversation.isFollowing ? (
                        <>
                          <PinOff className="mr-2 h-4 w-4" />
                          Unfollow
                        </>
                      ) : (
                        <>
                          <Pin className="mr-2 h-4 w-4" />
                          Follow Up
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleToggleSpam(conversation)}
                      className="cursor-pointer"
                    >
                      {conversation.isSpam ? (
                        <>
                          <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                          <span className="text-green-600">Not Spam</span>
                        </>
                      ) : (
                        <>
                          <AlertOctagon className="mr-2 h-4 w-4 text-red-600" />
                          <span className="text-red-600">Mark as Spam</span>
                        </>
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* Mobile Bottom Sheet Modal - LINE OA Style */}
      {isMobile && contextMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setContextMenuOpen(null)}
          />

          {/* Center Modal */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-0 shadow-2xl w-80 max-w-[90%]">
            {/* Header */}
            <div className="text-center py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Chat actions</h3>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <button
                onClick={() => {
                  const conversation = conversations.find(c => c.id === contextMenuOpen);
                  if (conversation) handleMarkAsUnread(conversation);
                }}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-center space-x-3"
              >
                <MailOpen className="h-5 w-5 text-gray-600" />
                <span className="text-base text-gray-900">Mark as Unread</span>
              </button>

              <button
                onClick={() => {
                  const conversation = conversations.find(c => c.id === contextMenuOpen);
                  if (conversation) handleToggleFollowUp(conversation);
                }}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-center space-x-3"
              >
                {(() => {
                  const conversation = conversations.find(c => c.id === contextMenuOpen);
                  const isFollowing = conversation?.isFollowing || false;
                  return (
                    <>
                      {isFollowing ? (
                        <PinOff className="h-5 w-5 text-gray-600" />
                      ) : (
                        <Pin className="h-5 w-5 text-gray-600" />
                      )}
                      <span className="text-base text-gray-900">
                        {isFollowing ? 'Unfollow' : 'Follow up'}
                      </span>
                    </>
                  );
                })()}
              </button>

              <button
                onClick={() => {
                  const conversation = conversations.find(c => c.id === contextMenuOpen);
                  if (conversation) handleToggleSpam(conversation);
                }}
                className="w-full px-6 py-4 text-left hover:bg-gray-50 flex items-center space-x-3"
              >
                {(() => {
                  const conversation = conversations.find(c => c.id === contextMenuOpen);
                  const isSpam = conversation?.isSpam || false;
                  return (
                    <>
                      {isSpam ? (
                        <ShieldCheck className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertOctagon className="h-5 w-5 text-red-600" />
                      )}
                      <span className={`text-base ${isSpam ? 'text-green-600' : 'text-red-600'}`}>
                        {isSpam ? 'Not Spam' : 'Mark as Spam'}
                      </span>
                    </>
                  );
                })()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Add display name for debugging
ConversationSidebar.displayName = 'ConversationSidebar';
