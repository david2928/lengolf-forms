// Chat operations hook extracted from main LINE chat component
// Handles message sending, file uploads, and all messaging functionality
// Extended to support unified multi-channel messaging (LINE + Website)

import { useState, useCallback } from 'react';
import { compressImage } from '@/lib/image-compression';
import { refacSupabase } from '@/lib/refac-supabase';
import type {
  ChatOperations,
  MessageType,
  UnifiedConversation,
  UnifiedChatOperations
} from '../utils/chatTypes';
import { validateMessageContent, scrollToBottom } from '../utils/messageHelpers';

/**
 * Custom hook for chat operations (message sending, file upload, etc.)
 * Extracted from main component to reduce complexity and improve testability
 */
export const useChatOperations = (
  conversationId: string | null,
  onMessageSent?: (message: any) => void,
  selectedConversationObj?: any // Add selected conversation to determine channel type
): ChatOperations => {
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sendingProgress, setSendingProgress] = useState<{current: number, total: number} | null>(null);

  // Send message function extracted from main component
  const sendMessage = useCallback(async (content: string, type: MessageType = 'text', replyToMessageId?: string) => {
    if (!conversationId) {
      console.log('No conversation selected');
      return;
    }

    // Validate message content
    const validation = validateMessageContent(content, type);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    try {
      setSendingMessage(true);

      // Check if this is a website conversation
      if (selectedConversationObj?.channelType === 'website' || selectedConversationObj?.channel_type === 'website') {
        // Handle website message sending
        if (!refacSupabase) {
          throw new Error('Supabase client not available');
        }

        const { data: message, error } = await refacSupabase
          .from('web_chat_messages')
          .insert({
            conversation_id: conversationId,
            session_id: selectedConversationObj.lineUserId || selectedConversationObj.channel_user_id, // Using lineUserId as session_id for compatibility
            message_text: content.trim(),
            sender_type: 'staff',
            sender_name: 'Admin'
          })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        // Update conversation's last message
        await refacSupabase
          .from('web_chat_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_text: content.trim(),
            unread_count: 0
          })
          .eq('id', conversationId);

        // Notify parent component about the sent message
        if (onMessageSent && message) {
          onMessageSent(message);
        }

        console.log('Website message sent successfully:', message);
      } else if (['facebook', 'instagram', 'whatsapp'].includes(selectedConversationObj?.channelType || selectedConversationObj?.channel_type)) {
        // Handle Meta platform message sending
        const response = await fetch('/api/meta/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformUserId: selectedConversationObj.lineUserId || selectedConversationObj.channel_user_id, // Using lineUserId as platform user ID for compatibility
            message: content.trim(),
            platform: selectedConversationObj.channelType || selectedConversationObj.channel_type, // facebook, instagram, or whatsapp
            ...(replyToMessageId && { replyToMessageId }) // Add reply support for Meta platforms
          }),
        });

        const data = await response.json();

        if (data.success) {
          // Notify parent component about the sent message
          if (onMessageSent && data.message) {
            onMessageSent(data.message);
          }
        } else {
          console.error(`Failed to send message:`, data.error);
          alert(`Failed to send message: ${data.error}`);
        }
      } else {
        // Handle LINE message sending (existing logic)
        const response = await fetch(`/api/line/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: content.trim(),
            type: type,
            senderName: 'Admin',
            ...(replyToMessageId && { repliedToMessageId: replyToMessageId })
          }),
        });

        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
          console.log('LINE message sent successfully:', data.message);

          // Notify parent component about the sent message
          if (onMessageSent && data.message) {
            onMessageSent(data.message);
          }
        } else {
          console.error('Failed to send message:', data.error);
          alert('Failed to send message: ' + data.error);
        }
      }

      // Scroll to bottom when user sends a message
      setTimeout(() => {
        scrollToBottom();
      }, 100);

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error);
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, selectedConversationObj, onMessageSent]);

  // File upload function extracted from main component
  const handleFileUpload = useCallback(async (file: File) => {
    if (!conversationId) {
      console.log('No conversation selected');
      return;
    }

    try {
      console.log('File upload started:', {
        name: file.name,
        size: file.size,
        type: file.type
      });


      setSendingMessage(true);

      // Compress image if it's an image file
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        console.log('Compressing image...');
        processedFile = await compressImage(file);
      }

      const formData = new FormData();
      formData.append('file', processedFile);
      formData.append('type', file.type.startsWith('image/') ? 'image' : 'file');
      formData.append('senderName', 'Admin');

      let response;


      if (selectedConversationObj?.channel_type === 'website' || selectedConversationObj?.channelType === 'website') {
        // Website channel - upload file to storage and send actual image
        console.log('Website channel - uploading file');

        const websiteFormData = new FormData();
        websiteFormData.append('file', processedFile);
        websiteFormData.append('conversationId', conversationId);
        websiteFormData.append('sessionId', selectedConversationObj.channel_user_id);
        websiteFormData.append('senderName', 'Admin');

        response = await fetch('/api/conversations/website/upload', {
          method: 'POST',
          body: websiteFormData,
        });
      } else if (selectedConversationObj?.channel_type === 'facebook' || selectedConversationObj?.channelType === 'facebook' ||
                 selectedConversationObj?.channel_type === 'instagram' || selectedConversationObj?.channelType === 'instagram' ||
                 selectedConversationObj?.channel_type === 'whatsapp' || selectedConversationObj?.channelType === 'whatsapp') {
        // Meta channels - upload file and send actual image
        console.log('Meta channel - uploading file and sending actual image');

        // Create form data for Meta file upload
        const metaFormData = new FormData();
        metaFormData.append('file', processedFile);
        metaFormData.append('conversationId', conversationId);
        metaFormData.append('platformUserId', selectedConversationObj.lineUserId || selectedConversationObj.channel_user_id);
        metaFormData.append('platform', selectedConversationObj.channelType || selectedConversationObj.channel_type);

        response = await fetch('/api/meta/upload-file', {
          method: 'POST',
          body: metaFormData,
        });
      } else {
        // LINE endpoint supports file uploads
        console.log(`Sending file upload request to LINE endpoint`);
        response = await fetch(`/api/line/conversations/${conversationId}/messages`, {
          method: 'POST',
          body: formData,
        });
      }

      const data = await response.json();
      console.log('File upload response:', data);

      if (data.success) {
        console.log('File uploaded successfully:', data.message);
        setSelectedFile(null);

        // Notify parent component about the uploaded file/message
        if (onMessageSent && data.message) {
          onMessageSent(data.message);
        }

        // Scroll to bottom when file is uploaded
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        console.error('Failed to upload file:', data.error);
        alert('Failed to upload file: ' + data.error);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file: ' + error);
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, selectedConversationObj, onMessageSent]);

  // Batch image sending function extracted from main component
  const sendBatchImages = useCallback(async (imageIds: string[]) => {
    if (!conversationId || imageIds.length === 0) return;

    try {
      setSendingMessage(true);
      setSendingProgress({ current: 1, total: imageIds.length });


      let response;

      if (selectedConversationObj?.channel_type === 'website' || selectedConversationObj?.channelType === 'website') {
        // Website channel - send actual curated images using enhanced send-message API
        console.log('Website channel - sending actual curated images');

        // Try multiple possible session ID properties for website conversations
        const sessionId = selectedConversationObj.channel_user_id ||
                          selectedConversationObj.session_id ||
                          selectedConversationObj.lineUserId; // fallback

        response = await fetch('/api/conversations/website/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            sessionId,
            messageType: 'image',
            curatedImageIds: imageIds,
            senderName: 'Admin'
          }),
        });
      } else if (selectedConversationObj?.channel_type === 'facebook' || selectedConversationObj?.channelType === 'facebook' ||
                 selectedConversationObj?.channel_type === 'instagram' || selectedConversationObj?.channelType === 'instagram' ||
                 selectedConversationObj?.channel_type === 'whatsapp' || selectedConversationObj?.channelType === 'whatsapp') {
        // Meta channels - send actual images!
        console.log('Meta channel - sending actual images');
        response = await fetch('/api/meta/send-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            platformUserId: selectedConversationObj.lineUserId || selectedConversationObj.channel_user_id,
            platform: selectedConversationObj.channelType || selectedConversationObj.channel_type,
            messageType: 'image',
            curatedImageIds: imageIds,
            message: imageIds.length > 1 ? `Sent ${imageIds.length} images` : undefined // Optional caption for multiple images
          }),
        });
      } else {
        // LINE endpoint supports batch images
        console.log(`Sending batch images to LINE endpoint`);
        response = await fetch(`/api/line/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'batch_images',
            curatedImageIds: imageIds,
            senderName: 'Admin'
          }),
        });
      }

      const data = await response.json();

      // 🐛 DEBUG: Check what the API returns
      console.log('🐛 DEBUG: Batch images API response:', data);
      console.log('🐛 DEBUG: data.messages for UI:', data.messages);
      console.log('🐛 DEBUG: data.message (single) for UI:', data.message);

      if (data.success) {
        // Handle multiple messages (Meta platforms send each image as separate message)
        if (onMessageSent) {
          if (data.messages && Array.isArray(data.messages)) {
            // Send multiple messages - call onMessageSent for each
            console.log(`🐛 DEBUG: Calling onMessageSent for ${data.messages.length} messages`);
            data.messages.forEach((message: any) => {
              onMessageSent(message);
            });
          } else if (data.message) {
            // Single message (LINE/legacy format)
            console.log('🐛 DEBUG: Calling onMessageSent with single message:', data.message);
            onMessageSent(data.message);
          } else {
            console.log('🐛 DEBUG: No onMessageSent callback or no message in response');
          }
        }

        // Show success feedback
        setSendingProgress({ current: imageIds.length, total: imageIds.length });

        // Brief success state before clearing
        setTimeout(() => {
          setSendingProgress(null);
        }, 1000);

        // Scroll to bottom when batch images are sent
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        alert('Failed to send images: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending batch images:', error);
      alert('Failed to send images: ' + error);
    } finally {
      // Delay clearing the sending state to show completion
      setTimeout(() => {
        setSendingMessage(false);
      }, 1000);
    }
  }, [conversationId, selectedConversationObj, onMessageSent]);

  // Unified message sending that handles both LINE and website channels
  const sendUnifiedMessage = useCallback(async (
    content: string,
    conversation: UnifiedConversation,
    type: MessageType = 'text',
    replyToMessageId?: string
  ) => {
    if (!conversation) {
      console.log('No conversation provided');
      return;
    }

    // Validate message content
    const validation = validateMessageContent(content, type);
    if (!validation.isValid) {
      alert(validation.error);
      return;
    }

    try {
      setSendingMessage(true);
      console.log(`Sending ${conversation.channel_type} message...`);

      if (conversation.channel_type === 'line') {
        // Use existing LINE API endpoint
        const response = await fetch(`/api/line/conversations/${conversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.trim(),
            type: type,
            senderName: 'Admin'
          }),
        });

        const data = await response.json();
        if (data.success && onMessageSent && data.message) {
          onMessageSent(data.message);
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to send LINE message');
        }

      } else if (conversation.channel_type === 'website') {
        // Direct database insert for website messages
        if (!refacSupabase) {
          throw new Error('Supabase client not available');
        }

        const { data: message, error } = await refacSupabase
          .from('web_chat_messages')
          .insert({
            conversation_id: conversation.id,
            session_id: conversation.channel_user_id,
            message_text: content.trim(),
            sender_type: 'staff',
            sender_name: 'Admin'
          })
          .select()
          .single();

        if (error) {
          throw new Error(error.message);
        }

        // Update conversation's last message
        await refacSupabase
          .from('web_chat_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_text: content.trim(),
            unread_count: 0
          })
          .eq('id', conversation.id);

        // Notify parent component about the sent message
        if (onMessageSent && message) {
          onMessageSent(message);
        }

      } else if (['facebook', 'instagram', 'whatsapp'].includes(conversation.channel_type)) {
        // Use Meta send message API
        const response = await fetch('/api/meta/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            platformUserId: conversation.channel_user_id,
            message: content.trim(),
            platform: conversation.channel_type, // facebook, instagram, or whatsapp
            ...(replyToMessageId && { replyToMessageId }) // Include reply ID if provided
          }),
        });

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to send Meta message');
        }

        // The Meta API handles message storage and conversation updates
        // Notify parent component if needed
        if (onMessageSent && data.message) {
          onMessageSent(data.message);
        }
      }

      // Scroll to bottom when message is sent
      setTimeout(() => {
        scrollToBottom();
      }, 100);

    } catch (error) {
      console.error(`Error sending ${conversation.channel_type} message:`, error);
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSendingMessage(false);
    }
  }, [onMessageSent]);

  return {
    sendMessage,
    sendingMessage,
    handleFileUpload,
    selectedFile,
    setSelectedFile,
    sendBatchImages,
    sendingProgress,
    sendUnifiedMessage,
    channelType: null // Will be determined by the conversation passed to sendUnifiedMessage
  };
};