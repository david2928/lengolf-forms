'use client';

// Enhanced MessageInput component with AI suggestions
// Extends the original MessageInput with AI-powered response suggestions

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AISuggestionCard, AISuggestion } from './AISuggestionCard';
import { useAISuggestions } from '@/hooks/useAISuggestions';
import {
  Send,
  RefreshCw,
  Paperclip,
  Image as ImageIcon,
  Upload,
  FileText,
  Plus,
  CalendarPlus,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

interface EnhancedMessageInputProps {
  // Core message functionality
  onSendMessage: (message: string, type: 'text') => Promise<void>;
  disabled?: boolean;
  isMobile?: boolean;

  // Conversation context for AI
  conversationId: string;
  channelType: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';
  customerId?: string;
  lastCustomerMessage?: string; // Trigger AI suggestion when this changes

  // Additional features
  onTemplateSelect?: (template: any) => Promise<void>;
  onCuratedImagesSelect?: (imageIds: string[]) => Promise<void>;
  onFileUpload?: (file: File) => Promise<void>;

  // Reply functionality
  replyingToMessage?: any;
  onCancelReply?: () => void;

  // AI functionality
  onAIRetrigger?: () => void;
  enableAISuggestions?: boolean;
}

export const EnhancedMessageInput: React.FC<EnhancedMessageInputProps> = ({
  onSendMessage,
  disabled = false,
  isMobile = false,
  conversationId,
  channelType,
  customerId,
  lastCustomerMessage,
  onTemplateSelect,
  onCuratedImagesSelect,
  onFileUpload,
  replyingToMessage,
  onCancelReply,
  onAIRetrigger,
  enableAISuggestions = true
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showMobileQuickActions, setShowMobileQuickActions] = useState(false);
  const [isAISuggestionActive, setIsAISuggestionActive] = useState(false);
  const [lastSuggestionId, setLastSuggestionId] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // AI suggestions hook
  const {
    isLoading: aiLoading,
    suggestion,
    error: aiError,
    hasSuggestion,
    generateSuggestion,
    acceptSuggestion,
    editSuggestion,
    declineSuggestion,
    completeEditFeedback,
    clearSuggestion,
    cleanup
  } = useAISuggestions({
    conversationId,
    channelType,
    customerId,
    onSuggestionAccepted: (suggestion, response) => {
      setNewMessage(response);
      setIsAISuggestionActive(true);
      // Focus textarea for immediate sending
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    onSuggestionEdited: (suggestion, originalResponse, editedResponse) => {
      setNewMessage(originalResponse);
      setIsAISuggestionActive(true);
      setLastSuggestionId(suggestion.id);
      // Focus textarea for editing
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(originalResponse.length, originalResponse.length);
      }
    },
    onSuggestionDeclined: (suggestion) => {
      // Just clear, no action needed
    }
  });

  // Generate AI suggestion when customer message changes - TEMPORARILY DISABLED
  useEffect(() => {
    // DISABLED: AI suggestions are temporarily disabled
    // if (lastCustomerMessage && lastCustomerMessage.trim() && !disabled) {
    //   // Small delay to avoid generating suggestions for rapid message sequences
    //   const timer = setTimeout(() => {
    //     generateSuggestion(lastCustomerMessage);
    //   }, 500);

    //   return () => clearTimeout(timer);
    // }
  }, [lastCustomerMessage, disabled, generateSuggestion]);

  // Handle keyboard shortcuts for AI suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasSuggestion) return;

      // Only handle shortcuts when not typing in textarea
      if (document.activeElement?.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'Enter':
          e.preventDefault();
          if (suggestion) acceptSuggestion(suggestion);
          break;
        case 'e':
        case 'E':
          e.preventDefault();
          if (suggestion) editSuggestion(suggestion);
          break;
        case 'Escape':
          e.preventDefault();
          if (suggestion) declineSuggestion(suggestion);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [hasSuggestion, suggestion, acceptSuggestion, editSuggestion, declineSuggestion]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || disabled) return;

    const messageToSend = newMessage.trim();

    // If this was an AI-suggested message that was edited, record the feedback
    if (isAISuggestionActive && lastSuggestionId && suggestion) {
      completeEditFeedback(lastSuggestionId, suggestion.suggestedResponse, messageToSend);
    }

    await onSendMessage(messageToSend, 'text');
    setNewMessage('');
    setIsAISuggestionActive(false);
    setLastSuggestionId(null);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = '80px';
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onFileUpload) {
      setShowAttachmentMenu(false);
      setShowMobileQuickActions(false);
      await onFileUpload(file);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (isMobile || !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    if (!isMobile && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 80;
      textareaRef.current.style.height = `${Math.max(minHeight, scrollHeight)}px`;
    }
  };

  return (
    <div className="sticky bottom-0 z-10">
      {/* AI Suggestion Card - TEMPORARILY HIDDEN */}
      {false && (hasSuggestion || aiLoading) && (
        <div className="bg-white border-t border-gray-200 p-3">
          {aiLoading ? (
            <div className="flex items-center space-x-1 p-2 text-xs text-gray-500">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Analyzing...</span>
            </div>
          ) : suggestion ? (
            <div className="space-y-2">
              <AISuggestionCard
                suggestion={suggestion!}
                onAccept={acceptSuggestion}
                onEdit={editSuggestion}
                onDecline={declineSuggestion}
                isVisible={true}
              />
              {/* Re-generate button - TEMPORARILY HIDDEN */}
              {false && enableAISuggestions && lastCustomerMessage && (
                <div className="flex justify-center">
                  <Button
                    onClick={() => {
                      if (lastCustomerMessage && lastCustomerMessage.trim()) {
                        generateSuggestion(lastCustomerMessage);
                      }
                      if (onAIRetrigger) {
                        onAIRetrigger();
                      }
                    }}
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs px-3 text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Re-generate
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Reply Preview Container */}
      {replyingToMessage && onCancelReply && (
        <div className="bg-white border-t p-3">
          <div className="bg-gray-50 rounded-lg p-3 relative">
            <button
              onClick={onCancelReply}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
            <div className="text-xs text-gray-500 mb-1">Replying to:</div>
            <div className="text-sm text-gray-700">{replyingToMessage.text}</div>
          </div>
        </div>
      )}

      {/* Message Input Container */}
      <div className={`${isMobile ? 'bg-gray-100 p-2' : 'bg-white p-4'} border-t`}>
        {/* Mobile Layout */}
        {isMobile ? (
          <div className="flex items-center space-x-2">
            {/* Plus Button for Mobile Actions */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileQuickActions(!showMobileQuickActions)}
                disabled={disabled}
                className="h-9 w-9 p-0 rounded-full hover:bg-gray-200 flex-shrink-0"
              >
                <Plus className="h-4 w-4 text-gray-600" />
              </Button>

              {/* Mobile Quick Actions Menu */}
              {showMobileQuickActions && (
                <>
                  <div
                    className="fixed inset-0 bg-black bg-opacity-25 z-10"
                    onClick={() => setShowMobileQuickActions(false)}
                  />
                  <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 min-w-[200px]">
                    <div className="space-y-1">
                      <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <Upload className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Upload File</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>

                      {onTemplateSelect && (
                        <button
                          onClick={() => {
                            // This would trigger template selector modal
                            setShowMobileQuickActions(false);
                          }}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left"
                        >
                          <FileText className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Select Template</span>
                        </button>
                      )}

                      <Link href="/create-booking" target="_blank" rel="noopener noreferrer">
                        <button
                          onClick={() => setShowMobileQuickActions(false)}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left"
                        >
                          <CalendarPlus className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Create Booking</span>
                        </button>
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="flex-1 bg-white rounded-full px-3 py-2 border border-gray-300">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Type your message..."
                disabled={disabled}
                className="w-full bg-transparent border-0 focus:outline-none text-sm"
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={disabled || !newMessage.trim()}
              className="h-9 w-9 p-0 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 rounded-full flex-shrink-0"
            >
              {disabled ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          /* Desktop Layout */
          <>
            {/* Attachment toolbar */}
            <div className="flex items-center space-x-2 mb-3 border-b pb-2">
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  disabled={disabled}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Paperclip className="h-4 w-4 mr-1" />
                  Attach
                </Button>

                {/* Attachment dropdown */}
                {showAttachmentMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowAttachmentMenu(false)}
                    />
                    <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-20 min-w-[180px]">
                      <div className="space-y-1">
                        <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <Upload className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Upload File</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </label>

                        {onCuratedImagesSelect && (
                          <button
                            onClick={() => {
                              // This would trigger curated images modal
                              setShowAttachmentMenu(false);
                            }}
                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left"
                          >
                            <ImageIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm">Image Library</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {onTemplateSelect && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // This would trigger template selector modal
                  }}
                  disabled={disabled}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  Templates
                </Button>
              )}

              <Link href="/create-booking" target="_blank" rel="noopener noreferrer">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <CalendarPlus className="h-4 w-4 mr-1" />
                  Booking
                </Button>
              </Link>

              {/* AI Indicator - TEMPORARILY HIDDEN */}
              {false && (aiLoading || hasSuggestion) && (
                <div className="ml-auto flex items-center space-x-1 text-xs text-gray-500">
                  <Sparkles className="h-3 w-3" />
                  <span>AI</span>
                </div>
              )}
            </div>

            {/* Message input area */}
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <Textarea
                  ref={textareaRef}
                  value={newMessage}
                  onChange={handleTextareaChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  disabled={disabled}
                  className={`min-h-[80px] max-h-[200px] resize-none ${
                    isAISuggestionActive ? 'border-purple-200 bg-purple-50/30' : ''
                  }`}
                />
                {isAISuggestionActive && (
                  <div className="text-xs text-gray-400 mt-1">
                    Suggestion applied
                  </div>
                )}
              </div>

              <Button
                onClick={handleSendMessage}
                disabled={disabled || !newMessage.trim()}
                className="bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 px-6"
              >
                {disabled ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Send
              </Button>
            </div>

            {/* Send hint */}
            <div className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send • Shift+Enter for new line
            </div>
          </>
        )}
      </div>
    </div>
  );
};