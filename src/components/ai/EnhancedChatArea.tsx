'use client';

// Enhanced ChatArea component with AI suggestions
// Extends the original ChatArea with AI-powered response suggestions

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedMessageInput } from './EnhancedMessageInput';
import {
  MessageSquare,
  Users,
  RefreshCw,
  PanelLeft,
  PanelRight,
  ChevronLeft,
  MoreHorizontal,
  Monitor,
  Smartphone,
  Sparkles,
  Settings
} from 'lucide-react';
import Image from 'next/image';

interface EnhancedChatAreaProps {
  // Core chat functionality
  selectedConversation: string | null;
  selectedConversationObj: any;
  messages: any[];
  setMessages: React.Dispatch<React.SetStateAction<any[]>>;

  // Chat operations
  onSendMessage: (message: string, type: 'text') => Promise<void>;
  onMarkConversationRead?: (conversationId: string) => void;
  onFileUpload?: (file: File) => Promise<void>;
  onTemplateSelect?: (template: any) => Promise<void>;
  onCuratedImagesSelect?: (imageIds: string[]) => Promise<void>;

  // UI state
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onTogglePanel: (panel: 'left' | 'right') => void;
  onShowMobileCustomer?: () => void;
  onMobileBack?: () => void;

  // AI configuration
  enableAISuggestions?: boolean;
  onToggleAI?: (enabled: boolean) => void;
}

// Helper functions (copied from original ChatArea)
const getConversationDisplayName = (conversation: any): string => {
  if (conversation?.channel_type === 'line') {
    return conversation.channel_metadata?.display_name || 'Unknown User';
  } else if (conversation?.channel_type === 'website') {
    return conversation.channel_metadata?.display_name ||
           (conversation.channel_metadata?.email ? `Web User (${conversation.channel_metadata.email})` : 'Website User');
  }
  return conversation?.customer?.name || conversation?.user?.displayName || 'Unknown';
};

const getConversationPictureUrl = (conversation: any): string => {
  if (conversation?.channel_type === 'line') {
    return conversation.channel_metadata?.picture_url || '';
  }
  return conversation?.user?.pictureUrl || '';
};

const formatMessageTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Channel indicator component
const ChatHeaderChannelIndicator = ({ channelType }: { channelType: 'line' | 'website' }) => {
  if (channelType === 'line') {
    return (
      <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 rounded-full">
        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
        <Smartphone className="h-3 w-3 text-green-600" />
        <span className="text-xs font-medium text-green-700">LINE</span>
      </div>
    );
  } else {
    return (
      <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 rounded-full">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <Monitor className="h-3 w-3 text-blue-600" />
        <span className="text-xs font-medium text-blue-700">Website</span>
      </div>
    );
  }
};

// Safe Image component
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
      unoptimized={true}
      onError={() => setImageError(true)}
    />
  );
};

export const EnhancedChatArea: React.FC<EnhancedChatAreaProps> = ({
  selectedConversation,
  selectedConversationObj,
  messages,
  setMessages,
  onSendMessage,
  onMarkConversationRead,
  onFileUpload,
  onTemplateSelect,
  onCuratedImagesSelect,
  leftPanelCollapsed,
  rightPanelCollapsed,
  onTogglePanel,
  onShowMobileCustomer,
  onMobileBack,
  enableAISuggestions = true,
  onToggleAI
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [lastCustomerMessage, setLastCustomerMessage] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark conversation as read when messages change
  useEffect(() => {
    if (selectedConversation && messages.length > 0 && onMarkConversationRead) {
      onMarkConversationRead(selectedConversation);
    }
  }, [selectedConversation, messages, onMarkConversationRead]);

  // Track last customer message for AI suggestions
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.senderType === 'user' || lastMessage.senderType === 'customer') {
        setLastCustomerMessage(lastMessage.text || lastMessage.messageText || lastMessage.content || '');
      }
    }
  }, [messages]);

  // Loading state
  if (!selectedConversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No conversation selected</h3>
          <p className="text-gray-500">Choose a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  const conversationDisplayName = getConversationDisplayName(selectedConversationObj);
  const conversationPictureUrl = getConversationPictureUrl(selectedConversationObj);
  const channelType = selectedConversationObj?.channelType || selectedConversationObj?.channel_type || 'line';

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {/* Left side - Back button (mobile) + User info */}
          <div className="flex items-center space-x-3">
            {/* Mobile back button */}
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.history.back()}
                className="p-1 h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Toggle left panel */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTogglePanel('left')}
                className="p-1 h-8 w-8"
              >
                <PanelLeft className={`h-4 w-4 ${leftPanelCollapsed ? 'text-gray-400' : 'text-blue-600'}`} />
              </Button>
            )}

            {/* User Avatar */}
            <SafeImage
              src={conversationPictureUrl}
              alt={conversationDisplayName}
              width={40}
              height={40}
              className="w-10 h-10 rounded-full object-cover"
            />

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {conversationDisplayName}
                </h2>
                <ChatHeaderChannelIndicator channelType={channelType} />
                {enableAISuggestions && (
                  <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 rounded-full">
                    <Sparkles className="h-3 w-3 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700">AI</span>
                  </div>
                )}
              </div>
              {selectedConversationObj?.customer && (
                <p className="text-sm text-gray-500 truncate">
                  Customer: {selectedConversationObj.customer.name}
                </p>
              )}
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center space-x-2">
            {/* AI Toggle */}
            {onToggleAI && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggleAI(!enableAISuggestions)}
                className={`p-2 ${enableAISuggestions ? 'text-purple-600 bg-purple-50' : 'text-gray-400'}`}
                title={`${enableAISuggestions ? 'Disable' : 'Enable'} AI suggestions`}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
            )}

            {/* Mobile customer info button */}
            {isMobile && onShowMobileCustomer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShowMobileCustomer}
                className="p-1 h-8 w-8"
              >
                <Users className="h-4 w-4" />
              </Button>
            )}

            {/* Toggle right panel */}
            {!isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onTogglePanel('right')}
                className="p-1 h-8 w-8"
              >
                <PanelRight className={`h-4 w-4 ${rightPanelCollapsed ? 'text-gray-400' : 'text-blue-600'}`} />
              </Button>
            )}

            {/* Header menu */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHeaderMenu(!showHeaderMenu)}
                className="p-1 h-8 w-8"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>

              {showHeaderMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowHeaderMenu(false)}
                  />
                  <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 min-w-[160px]">
                    <button className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left">
                      <RefreshCw className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">Refresh</span>
                    </button>
                    {onToggleAI && (
                      <button
                        onClick={() => {
                          onToggleAI(!enableAISuggestions);
                          setShowHeaderMenu(false);
                        }}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left"
                      >
                        <Sparkles className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{enableAISuggestions ? 'Disable' : 'Enable'} AI</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">Start the conversation!</p>
          </div>
        ) : (
          messages.map((message: any, index: number) => (
            <div
              key={message.id || index}
              className={`flex ${
                message.senderType === 'admin' || message.senderType === 'staff'
                  ? 'justify-end'
                  : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 ${
                  message.senderType === 'admin' || message.senderType === 'staff'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                {/* Message content */}
                <div className="whitespace-pre-wrap break-words">
                  {message.text || message.messageText || message.content || '[No content]'}
                </div>

                {/* Message time */}
                <div
                  className={`text-xs mt-1 ${
                    message.senderType === 'admin' || message.senderType === 'staff'
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  {formatMessageTime(message.createdAt || message.created_at || new Date().toISOString())}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Message Input with AI */}
      <EnhancedMessageInput
        onSendMessage={onSendMessage}
        conversationId={selectedConversation}
        channelType={channelType}
        customerId={selectedConversationObj?.customer?.id || selectedConversationObj?.customerId}
        lastCustomerMessage={enableAISuggestions ? lastCustomerMessage : undefined}
        onTemplateSelect={onTemplateSelect}
        onCuratedImagesSelect={onCuratedImagesSelect}
        onFileUpload={onFileUpload}
        enableAISuggestions={enableAISuggestions}
        isMobile={isMobile}
      />
    </div>
  );
};