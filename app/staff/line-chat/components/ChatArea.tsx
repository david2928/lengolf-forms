'use client';

// ChatArea component extracted from main LINE chat component
// Handles the center chat area including header, messages, and input
// Extended to support unified multi-channel messaging (LINE + Website)

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { enhanceMessageDisplay } from '@/lib/line/emoji-display-utils';
import { StickerMessage } from '@/components/line/StickerMessage';
import { ImageMessage } from '@/components/line/ImageMessage';
import { FileMessage } from '@/components/line/FileMessage';
import { ReplyDisplay } from '@/components/line/ReplyDisplay';
import { MessageContextMenu } from '@/components/line/MessageContextMenu';
import { MessageInput } from './MessageInput';
import { RichMessagePreview } from '@/components/unified-chat/RichMessagePreview';
import { BayAvailabilitySection } from './BayAvailabilitySection';
import { AISuggestionCard } from '@/components/ai/AISuggestionCard';
import {
  MessageSquare,
  Users,
  Calendar,
  Target,
  RefreshCw,
  PanelLeft,
  PanelRight,
  Maximize2,
  ChevronLeft,
  MoreHorizontal,
  Monitor,
  Smartphone,
  Globe,
  Clock
} from 'lucide-react';
import { FaFacebook, FaInstagram, FaWhatsapp, FaLine } from 'react-icons/fa';
import type {
  ChatAreaProps,
  Message,
  MessageType,
  UnifiedConversation,
  ChannelType
} from '../utils/chatTypes';
import { formatMessageTime, isDifferentDay, formatDateSeparator } from '../utils/formatters';

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

// Channel indicator for chat header
const ChatHeaderChannelIndicator = ({ channelType }: { channelType: ChannelType }) => {
  if (channelType === 'line') {
    return (
      <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-full">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <Smartphone className="h-3 w-3 text-green-600" />
        <span className="text-xs font-medium text-green-700">LINE</span>
      </div>
    );
  } else if (channelType === 'website') {
    return (
      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded-full">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <Monitor className="h-3 w-3 text-blue-600" />
        <span className="text-xs font-medium text-blue-700">Website</span>
      </div>
    );
  }
  return null;
};

// Helper functions for unified conversation handling
const isUnifiedConversation = (conversation: any): conversation is UnifiedConversation => {
  return conversation && 'channel_type' in conversation;
};

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

const getConversationDisplayName = (conversation: any): string => {
  if (isUnifiedConversation(conversation)) {
    if (conversation.channel_type === 'line') {
      return resolveChannelDisplayName(conversation.channel_metadata, 'Unknown User');
    } else if (conversation.channel_type === 'website') {
      return resolveChannelDisplayName(conversation.channel_metadata, '') ||
             (conversation.channel_metadata?.email ? `Web User (${conversation.channel_metadata.email})` : 'Website User');
    }
  }
  // Fallback for legacy conversation format
  return conversation?.customer?.name || conversation?.user?.displayName || 'Unknown';
};

const getConversationPictureUrl = (conversation: any): string => {
  if (isUnifiedConversation(conversation)) {
    if (conversation.channel_type === 'line') {
      return conversation.channel_metadata?.picture_url || '';
    } else if (conversation.channel_type === 'website') {
      // Use Lengolf logo for website users
      return '/LG_Logo_Big.jpg';
    }
    // Meta platforms and other users
    return conversation.channel_metadata?.profile_pic || '';
  }
  // Fallback for legacy conversation format
  return conversation?.user?.pictureUrl || '';
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

export const ChatArea: React.FC<ChatAreaProps> = ({
  selectedConversation,
  selectedConversationObj,
  chatOperations,
  customerOperations,
  leftPanelCollapsed,
  rightPanelCollapsed,
  onTogglePanel,
  messages: propMessages,
  setMessages: propSetMessages,
  onShowMobileCustomer,
  onMarkConversationRead,
  onMobileBackToList,
  enableAISuggestions,
  onAIRetrigger,
  aiSuggestion,
  aiSuggestionLoading,
  onAcceptSuggestion,
  onEditSuggestion,
  onDeclineSuggestion,
  onApproveSuggestion,
  aiPrefillMessage: propAIPrefillMessage,
  onAIPrefillMessageClear
}) => {
  // Use messages from props if provided, otherwise use local state
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messages = propMessages || localMessages;
  const setMessages = propSetMessages || setLocalMessages;
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [contextMenuMessageElement, setContextMenuMessageElement] = useState<HTMLElement | null>(null);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showBayAvailability, setShowBayAvailability] = useState(false);
  const [localAIPrefillMessage, setLocalAIPrefillMessage] = useState<string | undefined>(undefined);
  const [templatePrefillMessage, setTemplatePrefillMessage] = useState<string | undefined>(undefined);

  // Use prefill message from props if provided, otherwise use local state
  const aiPrefillMessage = propAIPrefillMessage || localAIPrefillMessage;
  const setAIPrefillMessage = onAIPrefillMessageClear
    ? (value: string | undefined) => {
        if (value === undefined) {
          onAIPrefillMessageClear();
        }
      }
    : setLocalAIPrefillMessage;

  // Combine AI and template prefill messages (template takes priority)
  const combinedPrefillMessage = templatePrefillMessage || aiPrefillMessage;

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Touch gesture state for swipe detection
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const [isSwipeDetected, setIsSwipeDetected] = useState(false);

  // Use the real conversation object passed from parent
  const selectedConv = selectedConversationObj;

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // Tailwind's md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Handle touch start for swipe gesture detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile || !onMobileBackToList) return;

    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    setIsSwipeDetected(false);
  }, [isMobile, onMobileBackToList]);

  // Handle touch move for swipe gesture detection
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current || !isMobile || !onMobileBackToList || isSwipeDetected) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Check if this is a rightward swipe gesture
    const isRightSwipe = deltaX > 100; // Must swipe at least 100px right
    const isNotVerticalScroll = Math.abs(deltaY) < Math.abs(deltaX) * 0.5; // Vertical movement should be less than half of horizontal
    const isFastEnough = deltaTime < 500; // Must complete within 500ms

    if (isRightSwipe && isNotVerticalScroll && isFastEnough) {
      setIsSwipeDetected(true);
      // Prevent default to avoid interfering with normal touch behavior
      e.preventDefault();
      // Trigger back navigation
      onMobileBackToList?.();
    }
  }, [isMobile, onMobileBackToList, isSwipeDetected]);

  // Handle touch end to reset swipe detection
  const handleTouchEnd = useCallback(() => {
    touchStart.current = null;
    setIsSwipeDetected(false);
  }, []);

  const fetchMessages = useCallback(async (conversationId: string) => {
    if (!selectedConversationObj) {
      console.log('No conversation object available');
      return;
    }

    try {
      // Determine the channel type and use appropriate API endpoint
      const channelType = selectedConversationObj.channelType;
      let apiEndpoint: string;

      if (channelType === 'website') {
        apiEndpoint = `/api/conversations/website/${conversationId}/messages`;
      } else if (channelType && ['facebook', 'instagram', 'whatsapp'].includes(channelType)) {
        apiEndpoint = `/api/conversations/meta/${conversationId}/messages`;
      } else {
        // Default to LINE API for LINE conversations or legacy conversations without channelType
        apiEndpoint = `/api/line/conversations/${conversationId}`;
      }

      const response = await fetch(apiEndpoint);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);

        // Scroll to bottom on message load
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
        }, 50);

        // Mark conversation as read
        if (channelType === 'website') {
          // Mark website conversation as read
          await fetch(`/api/conversations/website/${conversationId}/mark-read`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } else if (channelType && ['facebook', 'instagram', 'whatsapp'].includes(channelType)) {
          // Mark Meta conversation as read
          await fetch(`/api/conversations/meta/${conversationId}/mark-read`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } else {
          // Mark LINE conversation as read
          await fetch(`/api/line/conversations/${conversationId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'mark_read' }),
          });
        }

        // Update local conversation state to reflect read status
        onMarkConversationRead?.(conversationId);
      } else {
        console.error('Failed to fetch messages:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [selectedConversationObj, onMarkConversationRead, setMessages]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // Clear existing messages first
      setMessages([]);
      fetchMessages(selectedConversation);
    } else {
      setMessages([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  // Handle template selection
  const handleTemplateSelect = useCallback(async (template: any) => {
    if (!selectedConversation || !selectedConversationObj) return;

    // Get customer name for template variable substitution
    const customerName = selectedConversationObj.customer?.name || selectedConversationObj.user.displayName || '';

    // Extract template text and replace variables
    let templateText = '';

    if (isUnifiedConversation(selectedConversationObj)) {
      // For unified conversations (Meta, Website)
      templateText = template.text?.replace(/\{\{customer_name\}\}/g, customerName) || template.name || 'Template message';
    } else {
      // For LINE conversations, the template content might be structured differently
      templateText = template.content?.replace(/\{\{customer_name\}\}/g, customerName) || template.text?.replace(/\{\{customer_name\}\}/g, customerName) || 'Template message';
    }

    // Prefill the message input instead of sending immediately
    setTemplatePrefillMessage(templateText);
  }, [selectedConversation, selectedConversationObj]);

  // Handle curated images selection
  const handleCuratedImagesSelect = useCallback(async (imageIds: string[]) => {
    if (!selectedConversation || imageIds.length === 0) return;

    try {
      // Use existing batch images functionality
      await chatOperations.sendBatchImages(imageIds);
    } catch (error) {
      console.error('Error sending curated images:', error);
    }
  }, [selectedConversation, chatOperations]);

  // Handle right-click context menu
  const handleMessageRightClick = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    e.stopPropagation();

    const messageElement = (e.currentTarget as HTMLElement).closest('.message-bubble') as HTMLElement;

    setContextMenuPosition({
      x: e.clientX,
      y: e.clientY
    });
    setContextMenuMessage(message);
    setContextMenuMessageElement(messageElement);
    setShowContextMenu(true);
  };

  // Handle long press for mobile
  const handleMessageLongPress = (e: React.TouchEvent, message: Message) => {
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return; // Let native text selection work
    }

    e.preventDefault();
    const touch = e.touches[0];

    const messageElement = (e.currentTarget as HTMLElement).closest('.message-bubble') as HTMLElement;

    setContextMenuPosition({
      x: touch.clientX,
      y: touch.clientY
    });
    setContextMenuMessage(message);
    setContextMenuMessageElement(messageElement);
    setShowContextMenu(true);
  };

  // Start reply to a message
  const handleReplyToMessage = (message: Message) => {
    setReplyingToMessage(message);
    setShowContextMenu(false);

    // Focus the message input
    setTimeout(() => {
      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.focus();
      }
    }, 100);
  };

  // Cancel reply
  const handleCancelReply = () => {
    setReplyingToMessage(null);
  };

  // Wrapper for sendMessage that includes reply logic and unified channel support
  const handleSendMessage = async (content: string, type?: MessageType, replyToMessageId?: string) => {
    // Check if we're dealing with a unified conversation and use appropriate sending method
    if (isUnifiedConversation(selectedConversationObj) && chatOperations.sendUnifiedMessage) {
      // For unified conversations, we need to handle reply differently
      // Pass the reply ID to the unified send function
      await chatOperations.sendUnifiedMessage(content, selectedConversationObj, type, replyToMessageId);
    } else {
      // Fallback to regular LINE message sending for legacy conversations
      await chatOperations.sendMessage(content, type, replyToMessageId || replyingToMessage?.id);
    }

    // Clear reply after sending
    if (replyingToMessage) {
      setReplyingToMessage(null);
    }
  };

  // Handle copy message text
  const handleCopyMessage = () => {
    console.log('Message text copied to clipboard');
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
    setContextMenuMessage(null);
    setContextMenuMessageElement(null);
  };

  const refreshData = () => {
    // This would trigger refresh from parent
    if (selectedConversation) {
      fetchMessages(selectedConversation);
    }
  };

  if (!selectedConversation) {
    return (
      <div className="flex-1 flex flex-col">
        {/* Global Panel Controls for Empty State */}
        <div className="bg-[#1a4d2e] border-b p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePanel('left')}
              className="h-8 w-8 p-0 hover:bg-white/10"
              title={leftPanelCollapsed ? "Show conversations" : "Hide conversations"}
            >
              <PanelLeft className={`h-4 w-4 transition-all duration-200 ${leftPanelCollapsed ? 'text-white/50' : 'text-white/90'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePanel('right')}
              className="h-8 w-8 p-0 hover:bg-white/10"
              title={rightPanelCollapsed ? "Show customer info" : "Hide customer info"}
            >
              <PanelRight className={`h-4 w-4 transition-all duration-200 ${rightPanelCollapsed ? 'text-white/50' : 'text-white/90'}`} />
            </Button>
            {leftPanelCollapsed && rightPanelCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onTogglePanel('left');
                  onTogglePanel('right');
                }}
                className="h-8 w-8 p-0 hover:bg-white/10"
                title="Show all panels"
              >
                <Maximize2 className="h-4 w-4 text-white" />
              </Button>
            )}
          </div>

          {/* Quick Links */}
          <div className="flex items-center space-x-2">
            <Link href="/bookings-calendar" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Bookings Calendar"
              >
                <Calendar className="h-4 w-4 text-gray-600" />
              </Button>
            </Link>

            <Link href="/coaching-assist" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Coaching Assist"
              >
                <Target className="h-4 w-4 text-gray-600" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Centered Content Area */}
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center text-gray-500">
            {leftPanelCollapsed && rightPanelCollapsed ? (
              <div className="max-w-md px-8">
                <Users className="h-20 w-20 mx-auto mb-6 opacity-30" />
                <h3 className="text-xl font-medium mb-3">Select a conversation to view customer information</h3>
                <p className="text-base leading-relaxed mb-6">
                  Use the panel controls above to show conversations and customer details
                </p>
                <div className="flex justify-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => onTogglePanel('left')}
                    className="flex items-center space-x-2"
                  >
                    <PanelLeft className="h-4 w-4" />
                    <span>Show Conversations</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => onTogglePanel('right')}
                    className="flex items-center space-x-2"
                  >
                    <PanelRight className="h-4 w-4" />
                    <span>Show Customer Info</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p>Choose a conversation from the left to start chatting</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 flex flex-col h-full min-h-0"
      style={{ height: isMobile ? '100vh' : 'auto' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Chat Header */}
      <div className="bg-[#1a4d2e] border-b p-2 md:p-4 flex items-center justify-between sticky top-0 z-10 md:static md:z-auto">
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          {/* Panel Controls - Desktop Only */}
          <div className="hidden md:flex items-center space-x-2 mr-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePanel('left')}
              className="h-8 w-8 p-0 hover:bg-white/10"
              title={leftPanelCollapsed ? "Show conversations" : "Hide conversations"}
            >
              <PanelLeft className={`h-4 w-4 transition-all duration-200 ${leftPanelCollapsed ? 'text-white/50' : 'text-white/90'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePanel('right')}
              className="h-8 w-8 p-0 hover:bg-white/10"
              title={rightPanelCollapsed ? "Show customer info" : "Hide customer info"}
            >
              <PanelRight className={`h-4 w-4 transition-all duration-200 ${rightPanelCollapsed ? 'text-white/50' : 'text-white/90'}`} />
            </Button>
            {leftPanelCollapsed && rightPanelCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onTogglePanel('left');
                  onTogglePanel('right');
                }}
                className="h-8 w-8 p-0 hover:bg-white/10"
                title="Show all panels"
              >
                <Maximize2 className="h-4 w-4 text-white" />
              </Button>
            )}
          </div>

          {/* Back Button - Mobile Only */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0 hover:bg-white/10"
            onClick={onMobileBackToList}
          >
            <ChevronLeft className="h-4 w-4 text-white" />
          </Button>

          {/* User Avatar */}
          <div className="relative flex-shrink-0">
            <SafeImage
              src={getConversationPictureUrl(selectedConv)}
              alt={getConversationDisplayName(selectedConv)}
              width={32}
              height={32}
              className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover"
            />
            {/* Platform logo badge overlaid on profile picture */}
            {selectedConv && (
              (isUnifiedConversation(selectedConv) && selectedConv.channel_type) ? (
                <PlatformLogoBadge channelType={selectedConv.channel_type} />
              ) : (
                selectedConv.channelType && <PlatformLogoBadge channelType={selectedConv.channelType} />
              )
            )}
          </div>

          {/* Customer Info - Clickable on Mobile */}
          <div
            className="flex-1 min-w-0 cursor-pointer md:cursor-default"
            onClick={() => {
              if (isMobile && onShowMobileCustomer) {
                onShowMobileCustomer();
              }
            }}
          >
            <div className="flex items-center space-x-2 mb-1">
              {/* Channel indicator */}
              {isUnifiedConversation(selectedConv) && (
                <ChatHeaderChannelIndicator channelType={selectedConv.channel_type} />
              )}
              <h2 className="font-semibold text-sm md:text-base truncate text-white">
                {getConversationDisplayName(selectedConv)}
              </h2>
            </div>

            {/* Show different metadata based on channel type */}
            {isUnifiedConversation(selectedConv) ? (
              selectedConv.channel_type === 'line' && selectedConv.channel_metadata?.display_name && (
                <p className="text-xs text-white/70 truncate hidden md:block">
                  User: {selectedConv.channel_metadata.display_name}
                </p>
              )
            ) : (
              selectedConv?.customer && (
                <p className="text-xs text-gray-500 truncate hidden md:block">
                  User: {selectedConv.user.displayName}
                </p>
              )
            )}
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center space-x-1">
          {/* Desktop Quick Links */}
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/bookings-calendar" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/10"
                title="Bookings Calendar"
              >
                <Calendar className="h-4 w-4 text-white/90" />
              </Button>
            </Link>

            <Link href="/coaching-assist" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/10"
                title="Coaching Assist"
              >
                <Target className="h-4 w-4 text-white/90" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBayAvailability(!showBayAvailability)}
              className={`h-8 w-8 p-0 hover:bg-white/10 ${showBayAvailability ? 'bg-white/20' : ''}`}
              title={showBayAvailability ? "Hide Bay Availability" : "Show Bay Availability"}
            >
              <Clock className={`h-4 w-4 ${showBayAvailability ? 'text-white' : 'text-white/90'}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              className="h-8 w-8 p-0 hover:bg-white/10"
              title="Refresh conversations and messages"
            >
              <RefreshCw className="h-4 w-4 text-white/90" />
            </Button>
          </div>

          {/* Mobile Header Actions */}
          <div className="md:hidden flex items-center space-x-1">
            <Link href="/bookings-calendar" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/10"
                title="Bookings Calendar"
              >
                <Calendar className="h-4 w-4 text-white/90" />
              </Button>
            </Link>

            <Link href="/coaching-assist" target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-white/10"
                title="Coaching Assist"
              >
                <Target className="h-4 w-4 text-white/90" />
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              className={`h-8 w-8 p-0 hover:bg-white/10 ${showBayAvailability ? 'bg-white/20' : ''}`}
              onClick={() => setShowBayAvailability(!showBayAvailability)}
              title={showBayAvailability ? "Hide Bay Availability" : "Show Bay Availability"}
            >
              <Clock className={`h-4 w-4 ${showBayAvailability ? 'text-white' : 'text-white/90'}`} />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-white/10"
              onClick={refreshData}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4 text-white/90" />
            </Button>
          </div>
        </div>
      </div>

      {/* Bay Availability Section */}
      {showBayAvailability && (
        <BayAvailabilitySection
          onClose={() => setShowBayAvailability(false)}
          conversationId={selectedConversationObj?.id}
          customerId={selectedConversationObj?.customerId}
          channelType={selectedConversationObj?.channelType || (isUnifiedConversation(selectedConversationObj) ? selectedConversationObj.channel_type : 'line')}
          channelUserId={selectedConversationObj?.lineUserId || (isUnifiedConversation(selectedConversationObj) ? selectedConversationObj.channel_user_id : undefined)}
          userName={getConversationDisplayName(selectedConversationObj)}
        />
      )}

      {/* Messages */}
      <div className={`flex-1 overflow-y-auto p-2 md:p-4 space-y-4 messages-container min-h-0 ${isMobile ? 'pb-[80px]' : ''}`}>
        {messages.map((message, index) => {
          // Check if we need a date separator before this message
          const showDateSeparator = index === 0 ||
            (index > 0 && isDifferentDay(messages[index - 1].createdAt, message.createdAt));

          return (
            <div key={message.id}>
              {/* Date Separator */}
              {showDateSeparator && (
                <div className="flex justify-center my-4">
                  <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                    {formatDateSeparator(message.createdAt)}
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div
                className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
            {/* Render rich messages (Flex Messages, booking confirmations, cancellations, package info) */}
            {(message.type === 'flex' && (message.rawEvent?.booking_details || message.rawEvent?.package_details)) ? (
              <div className={`flex flex-col space-y-1 ${message.senderType === 'admin' ? 'items-end' : 'items-start'}`}>
                <RichMessagePreview
                  messageType={(message.rawEvent?.flex_type === 'booking_confirmation' || message.rawEvent?.flex_type === 'booking_reminder' || message.rawEvent?.flex_type === 'booking_cancellation' || message.rawEvent?.flex_type === 'package_info' || message.rawEvent?.flex_type === 'flex') ? message.rawEvent.flex_type : (message.rawEvent?.type === 'booking_confirmation' || message.rawEvent?.type === 'booking_reminder' || message.rawEvent?.type === 'booking_cancellation' || message.rawEvent?.type === 'package_info') ? message.rawEvent.type : 'booking_confirmation'}
                  bookingDetails={message.rawEvent?.booking_details}
                  packageDetails={message.rawEvent?.package_details}
                  className="message-bubble"
                />
                <span className="text-xs text-gray-400">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            ) : /* Render stickers and images without background container */
            message.type === 'sticker' && message.stickerId ? (
              <div className={`flex flex-col space-y-1 ${message.senderType === 'admin' ? 'items-end' : 'items-start'}`}>
                <div
                  className="message-bubble"
                  onContextMenu={(e: React.MouseEvent) => handleMessageRightClick(e, message)}
                  onTouchStart={(e: React.TouchEvent) => {
                    let touchMoved = false;
                    const initialTouch = e.touches[0];
                    const startX = initialTouch.clientX;
                    const startY = initialTouch.clientY;

                    const timeout = setTimeout(() => {
                      if (!touchMoved) {
                        handleMessageLongPress(e as any, message);
                      }
                    }, 600);

                    const handleTouchMove = (moveEvent: TouchEvent) => {
                      const touch = moveEvent.touches[0];
                      const moveDistance = Math.abs(touch.clientX - startX) + Math.abs(touch.clientY - startY);
                      if (moveDistance > 10) {
                        touchMoved = true;
                        clearTimeout(timeout);
                      }
                    };

                    const handleTouchEnd = () => {
                      clearTimeout(timeout);
                      document.removeEventListener('touchmove', handleTouchMove);
                      document.removeEventListener('touchend', handleTouchEnd);
                    };

                    document.addEventListener('touchmove', handleTouchMove);
                    document.addEventListener('touchend', handleTouchEnd);
                  }}
                >
                  <StickerMessage
                    packageId={message.packageId || ''}
                    stickerId={message.stickerId}
                    keywords={message.stickerKeywords}
                    size="large"
                    className=""
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            ) : message.type === 'image' && (message.fileUrl || message.imageUrl) ? (
              <div className={`flex flex-col space-y-1 ${message.senderType === 'admin' ? 'items-end' : 'items-start'}`}>
                <div
                  className="message-bubble"
                  onContextMenu={(e: React.MouseEvent) => handleMessageRightClick(e, message)}
                >
                  <ImageMessage
                    imageUrl={message.fileUrl || message.imageUrl!}
                    fileName={message.fileName}
                    fileSize={message.fileSize}
                    altText="Shared image"
                    className=""
                    showControls={true}
                  />
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  {message.fileSize && (
                    <span>{/* formatFileSize would go here */}</span>
                  )}
                  <span>{formatMessageTime(message.createdAt)}</span>
                </div>
              </div>
            ) : (
              /* Regular messages with background and timestamp below */
              <div className={`flex flex-col space-y-1 ${message.senderType === 'admin' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`message-bubble ${
                    message.repliedToMessage
                      ? 'max-w-lg lg:max-w-2xl'
                      : 'max-w-xs lg:max-w-md'
                  } px-4 py-2 rounded-lg ${
                    message.senderType === 'admin'
                      ? 'bg-green-100 text-gray-800 border border-green-200'
                      : 'bg-white border shadow-sm'
                  }`}
                  onContextMenu={(e: React.MouseEvent) => handleMessageRightClick(e, message)}
                >
                  {/* Show reply preview if this is a reply */}
                  {message.repliedToMessage && (
                    <ReplyDisplay
                      repliedToMessage={message.repliedToMessage}
                      replyPreviewText={message.replyPreviewText}
                      replyPreviewType={message.replyPreviewType}
                      onClickReply={() => {
                        console.log('Scroll to message:', message.repliedToMessage?.id);
                      }}
                    />
                  )}

                  {((message.type === 'file' || message.type === 'video' || message.type === 'audio') && message.fileUrl) ? (
                    <FileMessage
                      fileUrl={message.fileUrl}
                      fileName={message.fileName}
                      fileSize={message.fileSize}
                      fileType={message.fileType}
                      className="my-2"
                    />
                  ) : message.text ? (
                    <p
                      className="text-sm whitespace-pre-wrap select-text"
                      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    >
                      {enhanceMessageDisplay(message.text)}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-500 italic">[{message.type} message]</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="messages-end" />
      </div>

      {/* AI Suggestion Card - Shows between messages and input */}
      {enableAISuggestions && aiSuggestion && onAcceptSuggestion && onEditSuggestion && onDeclineSuggestion && (
        <div className="border-t bg-gray-50 p-3">
          <AISuggestionCard
            suggestion={aiSuggestion}
            onAccept={() => onAcceptSuggestion(aiSuggestion)}
            onEdit={() => onEditSuggestion(aiSuggestion)}
            onDecline={() => onDeclineSuggestion(aiSuggestion)}
            onApprove={onApproveSuggestion ? () => onApproveSuggestion(aiSuggestion) : undefined}
            isVisible={true}
          />
        </div>
      )}

      {/* Message Input - Always at bottom */}
      <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0 safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.1)]' : 'mt-auto'} bg-white border-t z-10 flex-shrink-0`}>
        <MessageInput
          onSendMessage={handleSendMessage}
          replyingToMessage={replyingToMessage}
          onCancelReply={handleCancelReply}
          disabled={chatOperations.sendingMessage}
          isMobile={isMobile}
          selectedConversationObj={selectedConversationObj}
          onTemplateSelect={handleTemplateSelect}
          onCuratedImagesSelect={handleCuratedImagesSelect}
          onFileUpload={chatOperations.handleFileUpload}
          onSendCoachingAvailability={customerOperations?.sendCoachingAvailability}
          sendingCoachingAvailability={customerOperations?.sendingAvailability}
          hasLinkedCustomer={!!customerOperations?.customerDetails}
          enableAISuggestions={enableAISuggestions}
          onAIRetrigger={onAIRetrigger}
          aiSuggestionLoading={aiSuggestionLoading}
          prefillMessage={combinedPrefillMessage}
          onMessageChange={() => {
            setAIPrefillMessage(undefined);
            setTemplatePrefillMessage(undefined);
          }}
        />
      </div>

      {/* Message Context Menu */}
      {contextMenuMessage && (
        <MessageContextMenu
          isOpen={showContextMenu}
          onClose={handleCloseContextMenu}
          onReply={() => handleReplyToMessage(contextMenuMessage)}
          onCopy={handleCopyMessage}
          position={contextMenuPosition}
          messageText={contextMenuMessage.text}
          isOwnMessage={contextMenuMessage.senderType === 'admin'}
          messageElement={contextMenuMessageElement || undefined}
        />
      )}
    </div>
  );
};
