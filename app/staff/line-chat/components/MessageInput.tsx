'use client';

// MessageInput component extracted from main LINE chat component
// Handles message input, file uploads, templates, and mobile/desktop layouts

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TemplateSelector } from '@/components/line/TemplateSelector';
import { CuratedImageModal } from '@/components/line/CuratedImageModal';
import { ReplyPreview } from '@/components/line/ReplyPreview';
import {
  Send,
  RefreshCw,
  Paperclip,
  Image as ImageIcon,
  Upload,
  FileText,
  Plus,
  CheckCircle,
  CalendarPlus,
  Sparkles
} from 'lucide-react';
import type { MessageInputProps, MessageType } from '../utils/chatTypes';

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  replyingToMessage,
  onCancelReply,
  disabled,
  isMobile,
  selectedConversationObj,
  onTemplateSelect,
  onCuratedImagesSelect,
  onFileUpload,
  onAIRetrigger,
  enableAISuggestions = false
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showMobileQuickActions, setShowMobileQuickActions] = useState(false);
  const [showCuratedImages, setShowCuratedImages] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{current: number, total: number} | null>(null);

  // Handle sending message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || disabled) return;

    // Pass reply information if replying to a message - use platformMessageId for Facebook replies
    await onSendMessage(newMessage.trim(), 'text', replyingToMessage?.platformMessageId || replyingToMessage?.id);
    setNewMessage('');

    // Clear reply state when message is sent
    if (replyingToMessage && onCancelReply) {
      onCancelReply();
    }

    // Reset textarea height to default
    const textarea = document.querySelector('textarea');
    if (textarea) {
      const defaultHeight = isMobile ? '20px' : '80px'; // Single line for mobile, 3 lines for desktop
      textarea.style.height = defaultHeight;
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setShowAttachmentMenu(false);
      setShowMobileQuickActions(false);

      if (onFileUpload) {
        await onFileUpload(file);
      }
    }
  };

  // Handle curated image selection
  const handleCuratedImageSelect = async (imageIds: string[]) => {
    setShowCuratedImages(false);
    if (onCuratedImagesSelect) {
      await onCuratedImagesSelect(imageIds);
    }
  };

  // Handle template selection
  const handleTemplateSelect = async (template: any) => {
    setShowTemplateSelector(false);
    if (onTemplateSelect) {
      await onTemplateSelect(template);
    }
  };

  // Handle Enter key - different behavior for mobile vs desktop
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (isMobile) {
        // Mobile: Enter creates new line (no shift key available)
        // Use Send button to send message
        return; // Let Enter create new line naturally
      } else {
        // Desktop: Shift+Enter creates new line, Enter alone sends message
        if (!e.shiftKey) {
          e.preventDefault();
          handleSendMessage();
        }
      }
    }
  };

  // Auto-resize textarea - now works for both mobile and desktop
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;

    // Different min heights for mobile vs desktop
    const minHeight = isMobile ? 20 : 80; // Mobile: single line height, Desktop: ~3 lines
    const maxHeight = isMobile ? 120 : 200; // Mobile: ~5 lines, Desktop: ~8 lines

    const newHeight = Math.max(minHeight, Math.min(maxHeight, scrollHeight));
    textarea.style.height = `${newHeight}px`;
  };

  return (
    <div className="sticky bottom-0 z-10">
      {/* Reply Preview Container */}
      {replyingToMessage && (
        <div className="bg-white border-t">
          <ReplyPreview
            message={{
              id: replyingToMessage.id,
              text: replyingToMessage.text,
              type: replyingToMessage.type,
              senderName: replyingToMessage.senderName,
              senderType: replyingToMessage.senderType,
              fileName: replyingToMessage.fileName,
              // Use conversation user data like old version
              pictureUrl: replyingToMessage.senderType === 'admin'
                ? '/favicon.svg'
                : selectedConversationObj?.user.pictureUrl
            }}
            onClose={onCancelReply}
          />
        </div>
      )}

      {/* Message Input Container */}
      <div className={`${isMobile ? 'bg-gray-100 p-2' : 'bg-white p-4'} ${replyingToMessage ? 'border-t border-gray-200' : 'border-t'}`}>
        {/* Mobile Input - starts single line, grows upward */}
        {isMobile ? (
          <div className="flex items-end space-x-2">
            {/* Plus Button */}
            <div className="relative mobile-quick-actions-container">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMobileQuickActions(!showMobileQuickActions)}
                disabled={disabled}
                className="h-9 w-9 p-0 rounded-full hover:bg-gray-200 flex-shrink-0"
                title="Quick actions"
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
                        <span className="text-sm">Upload from Device</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </label>

                      <button
                        onClick={() => {
                          setShowCuratedImages(true);
                          setShowMobileQuickActions(false);
                        }}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left"
                      >
                        <ImageIcon className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Select from Library</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowTemplateSelector(true);
                          setShowMobileQuickActions(false);
                        }}
                        className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left"
                      >
                        <FileText className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">Select Template</span>
                      </button>

                      <Link
                        href={`/create-booking?from=chat&conversation=${selectedConversationObj?.id || ''}&customer=${selectedConversationObj?.customerId || ''}&channel=${selectedConversationObj?.channelType || 'line'}&staff=David`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <button
                          onClick={() => setShowMobileQuickActions(false)}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left"
                        >
                          <CalendarPlus className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Create Booking</span>
                        </button>
                      </Link>

                      {/* AI Re-trigger Button (Mobile) - TEMPORARILY HIDDEN */}
                      {false && onAIRetrigger && enableAISuggestions && (
                        <button
                          onClick={() => {
                            onAIRetrigger?.();
                            setShowMobileQuickActions(false);
                          }}
                          className="flex items-center space-x-2 p-2 hover:bg-purple-50 rounded w-full text-left"
                        >
                          <Sparkles className="h-4 w-4 text-purple-600" />
                          <span className="text-sm">Re-trigger AI</span>
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Message Input - Now using textarea for multi-line support */}
            <div className="flex-1 bg-white rounded-2xl px-3 py-1 border border-gray-300 min-h-[32px] flex items-center">
              <Textarea
                value={newMessage}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={isMobile ? "Type a message..." : "Type a message... (Shift + Enter for new line)"}
                disabled={disabled}
                className="w-full bg-transparent border-0 focus:border-0 focus:ring-0 focus:outline-none focus:shadow-none text-sm resize-none min-h-[20px] p-0 leading-5 overflow-hidden focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                rows={1}
                style={{
                  outline: 'none !important',
                  boxShadow: 'none !important',
                  border: '0 !important',
                  borderWidth: '0 !important',
                  borderStyle: 'none !important',
                  borderColor: 'transparent !important',
                  height: '20px', // Start with single line height
                  userSelect: 'text',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none',
                  appearance: 'none'
                }}
                onFocus={(e) => {
                  e.target.style.outline = 'none';
                  e.target.style.border = 'none';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={disabled || !newMessage.trim()}
              className="h-9 w-9 p-0 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full flex-shrink-0"
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
            <Textarea
              value={newMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder={isMobile ? "Type a message..." : "Type a message... (Shift + Enter for new line)"}
              disabled={disabled}
              className="w-full min-h-[80px] resize-none border-0 focus:border-0 focus:ring-0 focus:outline-none focus:shadow-none active:border-0 active:ring-0 hover:border-0 overflow-hidden mb-3 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              rows={3}
              style={{
                outline: 'none !important',
                boxShadow: 'none !important',
                border: '0 !important',
                borderWidth: '0 !important',
                borderStyle: 'none !important',
                borderColor: 'transparent !important',
                userSelect: 'text',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none'
              }}
              onFocus={(e) => {
                e.target.style.outline = 'none';
                e.target.style.border = 'none';
                e.target.style.boxShadow = 'none';
              }}
            />

            {/* Desktop Action Buttons Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {/* Attachment button */}
                <div className="relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    disabled={disabled}
                    className="h-9 w-9 p-0 rounded-full hover:bg-gray-100"
                    title="Attach file or image"
                  >
                    <Paperclip className="h-5 w-5 text-gray-600" />
                  </Button>

                  {/* Attachment menu */}
                  {showAttachmentMenu && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 min-w-[180px]">
                      <div className="space-y-1">
                        <label className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <Upload className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Upload from Device</span>
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </label>

                        <button
                          onClick={() => {
                            setShowCuratedImages(true);
                            setShowAttachmentMenu(false);
                          }}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded w-full text-left"
                        >
                          <ImageIcon className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Select from Library</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Template button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTemplateSelector(true)}
                  disabled={disabled}
                  className="h-9 w-9 p-0 rounded-full hover:bg-gray-100"
                  title="Select template"
                >
                  <FileText className="h-5 w-5 text-gray-600" />
                </Button>

                {/* Create Booking Button */}
                <Link
                  href={`/create-booking?from=chat&conversation=${selectedConversationObj?.id || ''}&customer=${selectedConversationObj?.customerId || ''}&channel=${selectedConversationObj?.channelType || 'line'}&staff=David`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-full hover:bg-gray-100"
                    title="Create Booking"
                  >
                    <CalendarPlus className="h-5 w-5 text-gray-600" />
                  </Button>
                </Link>

                {/* AI Re-trigger Button - TEMPORARILY HIDDEN */}
                {false && onAIRetrigger && enableAISuggestions && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onAIRetrigger}
                    className="h-9 w-9 p-0 rounded-full hover:bg-purple-50"
                    title="Re-trigger AI suggestion"
                  >
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </Button>
                )}
              </div>

              {/* Desktop Send Button */}
              <Button
                onClick={handleSendMessage}
                disabled={disabled || !newMessage.trim()}
                className="px-4 py-2 h-10 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200 rounded-md font-medium"
              >
                {disabled ? (
                  <>
                    {sendingProgress && sendingProgress.current === sendingProgress.total ? (
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    ) : (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    )}
                    {sendingProgress && sendingProgress.current === sendingProgress.total ? (
                      'Sent successfully!'
                    ) : sendingProgress ? (
                      `Sending ${sendingProgress.total} images...`
                    ) : (
                      'Sending...'
                    )}
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <CuratedImageModal
        isOpen={showCuratedImages}
        onClose={() => setShowCuratedImages(false)}
        onSelect={handleCuratedImageSelect}
      />

      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
        customerName={selectedConversationObj?.customer?.name || selectedConversationObj?.user.displayName || ''}
      />
    </div>
  );
};