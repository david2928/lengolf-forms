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
  CalendarPlus
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
  onFileUpload
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

    await onSendMessage(newMessage.trim(), 'text');
    setNewMessage('');

    // Reset textarea height to default (3 lines)
    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.style.height = '80px';
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

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // On mobile, always send on Enter
      // On desktop, send on Enter unless Shift is held
      if (isMobile || !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    // Auto-resize textarea only on desktop
    if (!isMobile) {
      const textarea = e.target;
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 80; // min-h-[80px] = 80px (3 lines)
      textarea.style.height = `${Math.max(minHeight, scrollHeight)}px`;
    }
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
        {/* Mobile Compact Input */}
        {isMobile ? (
          <div className="flex items-center space-x-2">
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
                placeholder="Enter Message"
                disabled={disabled}
                className="w-full bg-transparent border-0 focus:border-0 focus:ring-0 focus:outline-none text-sm"
                style={{
                  outline: 'none !important',
                  boxShadow: 'none !important',
                  border: '0 !important'
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
              placeholder="Type a message... (Shift + Enter for new line)"
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
                <Link href="/create-booking" target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 rounded-full hover:bg-gray-100"
                    title="Create Booking"
                  >
                    <CalendarPlus className="h-5 w-5 text-gray-600" />
                  </Button>
                </Link>
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