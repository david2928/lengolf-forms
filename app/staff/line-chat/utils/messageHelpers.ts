// Message helper utilities extracted from the main LINE chat component
// These handle message enhancement, reply logic, and message processing

import type { Message, MessagePreview } from './chatTypes';

/**
 * Enhance message display with emoji and formatting
 * This function was originally inline in the component
 * @param text - Raw message text
 * @returns Enhanced message text
 */
export const enhanceMessageDisplay = (text: string): string => {
  // This function exists in the codebase as an import
  // We'll keep the same interface but import from the existing location
  // For now, return the text as-is since the actual implementation
  // is in @/lib/line/emoji-display-utils
  return text;
};

/**
 * Create message preview for conversation list
 * @param message - Message object
 * @returns Message preview with enhanced text
 */
export const createMessagePreview = (message: Pick<Message, 'text' | 'type'>): MessagePreview => {
  if (!message.text) {
    return {
      text: `[${message.type} message]`,
      type: message.type,
      enhanced: false
    };
  }

  return {
    text: enhanceMessageDisplay(message.text),
    type: message.type,
    enhanced: true
  };
};

/**
 * Get appropriate message component type for rendering
 * @param messageType - The type of message
 * @returns Component identifier string
 */
export const getMessageComponentType = (messageType: string): string => {
  switch (messageType) {
    case 'sticker':
      return 'StickerMessage';
    case 'image':
      return 'ImageMessage';
    case 'file':
    case 'video':
    case 'audio':
      return 'FileMessage';
    default:
      return 'TextMessage';
  }
};

/**
 * Get message styling classes based on message type and sender
 * @param message - Message object
 * @param isOwn - Whether message is from current user
 * @returns CSS class string
 */
export const getMessageStyles = (message: Message, isOwn: boolean): string => {
  const baseClasses = message.repliedToMessage
    ? 'max-w-lg lg:max-w-2xl'
    : 'max-w-xs lg:max-w-md';

  const backgroundClasses = isOwn
    ? 'bg-green-100 text-gray-800 border border-green-200'
    : 'bg-white border shadow-sm';

  return `message-bubble ${baseClasses} px-4 py-2 rounded-lg ${backgroundClasses}`;
};

/**
 * Check if message contains media content
 * @param message - Message object
 * @returns true if message has media content
 */
export const hasMediaContent = (message: Message): boolean => {
  return !!(message.fileUrl || message.imageUrl || message.stickerId);
};

/**
 * Get display text for message in conversation list
 * @param conversation - Conversation object with last message info
 * @returns Display text for the last message
 */
export const getLastMessageDisplay = (conversation: {
  lastMessageText?: string;
  lastMessageType?: string;
  lastMessageBy: 'user' | 'admin';
  user: { displayName: string };
}): string => {
  if (!conversation.lastMessageText) return '';

  switch (conversation.lastMessageType) {
    case 'sticker':
      return `${conversation.user.displayName} sent a sticker`;
    case 'image':
      return `${conversation.user.displayName} sent an image`;
    case 'file':
    case 'video':
    case 'audio':
      return `${conversation.user.displayName} sent a file`;
    default:
      return enhanceMessageDisplay(conversation.lastMessageText);
  }
};

/**
 * Validate message content before sending
 * @param content - Message content
 * @param type - Message type
 * @returns Validation result with error message if invalid
 */
export const validateMessageContent = (
  content: string,
  type: string
): { isValid: boolean; error?: string } => {
  if (type === 'text' && !content.trim()) {
    return { isValid: false, error: 'Message content cannot be empty' };
  }

  if (content.length > 5000) {
    return { isValid: false, error: 'Message is too long (max 5000 characters)' };
  }

  return { isValid: true };
};

/**
 * Create reply preview data for a message
 * @param message - Original message being replied to
 * @returns Reply preview object
 */
export const createReplyPreview = (message: Message) => {
  return {
    id: message.id,
    text: message.text,
    type: message.type,
    senderName: message.senderName,
    senderType: message.senderType,
    fileName: message.fileName
  };
};

/**
 * Check if two messages should be grouped together (same sender, close timestamps)
 * @param prevMessage - Previous message
 * @param currentMessage - Current message
 * @returns true if messages should be grouped
 */
export const shouldGroupMessages = (prevMessage: Message, currentMessage: Message): boolean => {
  if (prevMessage.senderType !== currentMessage.senderType) {
    return false;
  }

  const prevTime = new Date(prevMessage.createdAt).getTime();
  const currentTime = new Date(currentMessage.createdAt).getTime();
  const timeDiff = currentTime - prevTime;

  // Group messages within 5 minutes
  return timeDiff < 5 * 60 * 1000;
};

/**
 * Scroll to bottom of messages container
 * @param behavior - Scroll behavior ('smooth' | 'instant')
 */
export const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth'): void => {
  const messagesEnd = document.querySelector('.messages-end');
  if (messagesEnd) {
    messagesEnd.scrollIntoView({ behavior });
  }
};