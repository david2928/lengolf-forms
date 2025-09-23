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
  Smartphone
} from 'lucide-react';
import type {
  ChatAreaProps,
  Message,
  MessageType,
  UnifiedConversation,
  ChannelType
} from '../utils/chatTypes';
import { formatMessageTime } from '../utils/formatters';

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

const getConversationDisplayName = (conversation: any): string => {
  if (isUnifiedConversation(conversation)) {
    if (conversation.channel_type === 'line') {
      return conversation.channel_metadata?.display_name || 'Unknown User';
    } else if (conversation.channel_type === 'website') {
      return conversation.channel_metadata?.display_name ||
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
    }
    // Website users don't have profile pictures
    return '';
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
  leftPanelCollapsed,
  rightPanelCollapsed,
  onTogglePanel,
  messages: propMessages,
  setMessages: propSetMessages,
  onShowMobileCustomer,
  onMarkConversationRead
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

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // Clear existing messages first
      setMessages([]);
      fetchMessages(selectedConversation);
    } else {
      setMessages([]);
    }
  }, [selectedConversation]);

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
      } else {
        // Default to LINE API for LINE conversations or legacy conversations without channelType
        apiEndpoint = `/api/line/conversations/${conversationId}`;
      }

      console.log(`Fetching messages for ${channelType || 'LINE'} conversation:`, conversationId);
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
  }, [selectedConversationObj]);

  // Handle template selection
  const handleTemplateSelect = useCallback(async (template: any) => {
    if (!selectedConversation || !selectedConversationObj) return;

    try {
      const customerName = selectedConversationObj.customer?.name || selectedConversationObj.user.displayName || '';

      const response = await fetch(`/api/line/templates/${template.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          variables: { customer_name: customerName },
          senderName: 'Admin'
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Scroll to bottom after template is sent
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        console.error('Failed to send template:', data.error);
      }
    } catch (error) {
      console.error('Error sending template:', error);
    }
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
  const handleSendMessage = async (content: string, type?: MessageType) => {
    // Check if we're dealing with a unified conversation and use appropriate sending method
    if (isUnifiedConversation(selectedConversationObj) && chatOperations.sendUnifiedMessage) {
      await chatOperations.sendUnifiedMessage(content, selectedConversationObj, type);
    } else {
      // Fallback to regular LINE message sending for legacy conversations
      await chatOperations.sendMessage(content, type, replyingToMessage?.id);
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
        <div className="bg-white border-b p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePanel('left')}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title={leftPanelCollapsed ? "Show conversations" : "Hide conversations"}
            >
              <PanelLeft className={`h-4 w-4 transition-all duration-200 ${leftPanelCollapsed ? 'text-gray-400' : 'text-gray-600'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePanel('right')}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title={rightPanelCollapsed ? "Show customer info" : "Hide customer info"}
            >
              <PanelRight className={`h-4 w-4 transition-all duration-200 ${rightPanelCollapsed ? 'text-gray-400' : 'text-gray-600'}`} />
            </Button>
            {leftPanelCollapsed && rightPanelCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onTogglePanel('left');
                  onTogglePanel('right');
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Show all panels"
              >
                <Maximize2 className="h-4 w-4 text-blue-600" />
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
    <div className="flex-1 flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border-b p-2 md:p-4 flex items-center justify-between sticky top-0 z-10 md:static md:z-auto">
        <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
          {/* Panel Controls - Desktop Only */}
          <div className="hidden md:flex items-center space-x-2 mr-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePanel('left')}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title={leftPanelCollapsed ? "Show conversations" : "Hide conversations"}
            >
              <PanelLeft className={`h-4 w-4 transition-all duration-200 ${leftPanelCollapsed ? 'text-gray-400' : 'text-gray-600'}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onTogglePanel('right')}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title={rightPanelCollapsed ? "Show customer info" : "Hide customer info"}
            >
              <PanelRight className={`h-4 w-4 transition-all duration-200 ${rightPanelCollapsed ? 'text-gray-400' : 'text-gray-600'}`} />
            </Button>
            {leftPanelCollapsed && rightPanelCollapsed && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onTogglePanel('left');
                  onTogglePanel('right');
                }}
                className="h-8 w-8 p-0 hover:bg-gray-100"
                title="Show all panels"
              >
                <Maximize2 className="h-4 w-4 text-blue-600" />
              </Button>
            )}
          </div>

          {/* Back Button - Mobile Only */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden h-8 w-8 p-0"
            onClick={() => {/* This would come from parent */}}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* User Avatar */}
          <SafeImage
            src={getConversationPictureUrl(selectedConv)}
            alt={getConversationDisplayName(selectedConv)}
            width={32}
            height={32}
            className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
          />

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
              <h2 className="font-semibold text-sm md:text-base truncate">
                {getConversationDisplayName(selectedConv)}
              </h2>
            </div>

            {/* Show different metadata based on channel type */}
            {isUnifiedConversation(selectedConv) ? (
              selectedConv.channel_type === 'line' && selectedConv.channel_metadata?.display_name && (
                <p className="text-xs text-gray-500 truncate hidden md:block">
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

            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              className="h-8 w-8 p-0 hover:bg-gray-100"
              title="Refresh conversations and messages"
            >
              <RefreshCw className="h-4 w-4 text-gray-600" />
            </Button>
          </div>

          {/* Mobile Header Menu */}
          <div className="relative md:hidden header-menu-container">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>

            {/* Mobile Header Dropdown */}
            {showHeaderMenu && (
              <>
                <div
                  className="fixed inset-0 bg-black bg-opacity-25 z-10"
                  onClick={() => setShowHeaderMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-20 min-w-[160px]">
                  <Link href="/bookings-calendar" target="_blank" rel="noopener noreferrer">
                    <button
                      onClick={() => setShowHeaderMenu(false)}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left text-sm"
                    >
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Bookings Calendar</span>
                    </button>
                  </Link>

                  <Link href="/coaching-assist" target="_blank" rel="noopener noreferrer">
                    <button
                      onClick={() => setShowHeaderMenu(false)}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left text-sm"
                    >
                      <Target className="h-4 w-4 text-gray-500" />
                      <span>Coaching Assist</span>
                    </button>
                  </Link>

                  <button
                    onClick={() => {
                      refreshData();
                      setShowHeaderMenu(false);
                    }}
                    className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left text-sm"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-500" />
                    <span>Refresh</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-4 messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
          >
            {/* Render stickers and images without background container */}
            {message.type === 'sticker' && message.stickerId ? (
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
        ))}
        <div ref={messagesEndRef} className="messages-end" />
      </div>

      {/* Message Input */}
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
      />

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