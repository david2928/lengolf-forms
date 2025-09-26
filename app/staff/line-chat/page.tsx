'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { enhanceMessageDisplay, createMessagePreview, type MessagePreview } from '@/lib/line/emoji-display-utils';
import { CustomerLinkModal } from '@/components/admin/line-chat/CustomerLinkModal';
import { CustomerConfirmationModal } from '@/components/admin/line-chat/CustomerConfirmationModal';
import { StickerMessage } from '@/components/line/StickerMessage';
import { ImageMessage } from '@/components/line/ImageMessage';
import { FileMessage } from '@/components/line/FileMessage';
import { CuratedImageModal } from '@/components/line/CuratedImageModal';
import { TemplateSelector } from '@/components/line/TemplateSelector';
import { MessageContextMenu } from '@/components/line/MessageContextMenu';
import { ReplyPreview } from '@/components/line/ReplyPreview';
import { ReplyDisplay } from '@/components/line/ReplyDisplay';
import { compressImage } from '@/lib/image-compression';
import { imageCache } from '@/lib/image-cache';
import { usePushNotifications } from '@/hooks/use-push-notifications';
// Realtime now working after webpack fixes!
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import {
  MessageSquare,
  Send,
  Users,
  Phone,
  Mail,
  Calendar,
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Zap,
  Paperclip,
  Image as ImageIcon,
  Upload,
  X,
  FileText,
  Plus,
  CheckCircle,
  PanelLeft,
  PanelRight,
  Maximize2,
  CalendarPlus,
  Bell,
  BellOff,
  Target,
  MoreHorizontal
} from 'lucide-react';

interface LineUser {
  displayName: string;
  pictureUrl?: string;
  lineUserId?: string;
  customerId?: string;
}

interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

interface Conversation {
  id: string;
  lineUserId: string;
  customerId?: string;
  lastMessageAt: string;
  lastMessageText?: string;
  lastMessageBy: 'user' | 'admin';
  lastMessageType?: string;
  unreadCount: number;
  user: LineUser;
  customer?: Customer;
}

interface Message {
  id: string;
  text?: string;
  type: string;
  senderType: 'user' | 'admin';
  senderName?: string;
  createdAt: string;
  timestamp?: number;
  // Sticker properties
  packageId?: string;
  stickerId?: string;
  stickerKeywords?: string[];
  // File properties (includes images)
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  // Legacy image property (for backward compatibility)
  imageUrl?: string;
  // Reply/Quote properties for native LINE reply support
  quoteToken?: string;
  repliedToMessageId?: string;
  replyPreviewText?: string;
  replyPreviewType?: string;
  // Populated reply data when message is a reply
  repliedToMessage?: {
    id: string;
    text?: string;
    type: string;
    senderName?: string;
    senderType?: string;
    pictureUrl?: string;
    fileName?: string;
  };
}

interface CustomerDetails {
  id: string;
  name: string;
  code: string;
  phone?: string;
  email?: string;
  lifetimeValue: number;
  totalVisits: number;
  lastVisitDate?: string;
  profiles?: any;
}

interface Booking {
  id: string;
  date: string;
  start_time: string;
  duration: number;
  bay: string;
  number_of_people: number;
  status: string;
}

interface Package {
  id: string;
  package_type_name: string;
  remaining_hours: number | string;
  used_hours?: number;
  expiration_date: string;
  package_type: string;
  hours_remaining?: number | null; // For numeric calculations, null for unlimited packages
}

interface Transaction {
  id: string;
  transaction_date: string;
  total_amount: number;
  payment_method: string;
  receipt_number: string;
}

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

export default function LineChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

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
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingProgress, setSendingProgress] = useState<{current: number, total: number} | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showMobileQuickActions, setShowMobileQuickActions] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showCuratedImages, setShowCuratedImages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileCustomer, setShowMobileCustomer] = useState(false);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [customerBookings, setCustomerBookings] = useState<Booking[]>([]);
  const [customerPackages, setCustomerPackages] = useState<Package[]>([]);
  const [customerTransactions, setCustomerTransactions] = useState<Transaction[]>([]);
  const [linkingCustomer, setLinkingCustomer] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedCustomerForLink, setSelectedCustomerForLink] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState<string | null>(null);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [currentBookingIndex, setCurrentBookingIndex] = useState(0);

  // Mobile state tracking
  const [isMobile, setIsMobile] = useState(false);

  // Reply functionality state
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [contextMenuMessageElement, setContextMenuMessageElement] = useState<HTMLElement | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastOpenedConversationRef = useRef<string | null>(null);

  // Stabilize the new message callback to prevent infinite re-renders
  const handleNewMessage = useCallback((message: any) => {
    // Add message to the messages list ONLY if it's for the currently selected conversation
    if (selectedConversation === message.conversationId) {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find(m => m.id === message.id)) return prev;
        return [...prev, message];
      });
    }

    // Always update conversation's last message and unread count for ALL conversations
    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id === message.conversationId) {
          const isCurrentlySelected = selectedConversation === conv.id;
          return {
            ...conv,
            lastMessage: message.text || '[Media]',
            lastMessageTime: message.createdAt,
            // Increment unread count ONLY if this conversation is NOT currently selected
            unreadCount: isCurrentlySelected ? 0 : (conv.unreadCount || 0) + 1
          };
        }
        return conv;
      });

      // Sort conversations by last message time (most recent first)
      return updated.sort((a, b) =>
        new Date(b.lastMessageAt || 0).getTime() -
        new Date(a.lastMessageAt || 0).getTime()
      );
    });
  }, [selectedConversation]);

  // Realtime hooks for instant message updates (ALL conversations)
  const {
    connectionStatus: messagesConnectionStatus,
    reconnect: reconnectMessages,
    disconnect: disconnectMessages
  } = useRealtimeMessages({
    conversationId: null, // Subscribe to ALL conversations, not just selected
    onNewMessage: handleNewMessage
  });

  // Stabilize the conversation update callback to prevent infinite re-renders
  const handleConversationUpdate = useCallback((conversation: any) => {
    setConversations(prev => {
      const updated = prev.map(conv =>
        conv.id === conversation.id
          ? { ...conv, ...conversation }
          : conv
      );

      // Re-sort conversations by lastMessageAt (most recent first)
      return updated.sort((a, b) => {
        const aTime = new Date(a.lastMessageAt || 0).getTime();
        const bTime = new Date(b.lastMessageAt || 0).getTime();
        return bTime - aTime; // Descending order (newest first)
      });
    });
  }, []);

  const {
    connectionStatus: conversationsConnectionStatus,
    reconnect: reconnectConversations,
    disconnect: disconnectConversations
  } = useRealtimeConversations({
    onConversationUpdate: handleConversationUpdate
  });

  // Handle customer selection from search modal - shows confirmation first
  const handleCustomerSelection = (customerId: string, customer: any) => {
    setSelectedCustomerForLink(customer);
    setShowLinkModal(false);
    setShowConfirmationModal(true);
  };

  // Handle edit link - reopens customer search
  const handleEditCustomerLink = () => {
    setShowConfirmationModal(false);
    setSelectedCustomerForLink(null);
    setShowLinkModal(true);
  };

  // Link LINE user to customer
  const linkCustomerToLineUser = async () => {
    if (!selectedCustomerForLink || !selectedConv?.user.lineUserId) return;

    try {
      setLinkingCustomer(true);

      const response = await fetch(`/api/line/users/${selectedConv.user.lineUserId}/link-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId: selectedCustomerForLink.id }),
      });

      const data = await response.json();

      if (data.success) {
        // Update the conversation with customer info
        setConversations(prev =>
          prev.map(conv =>
            conv.id === selectedConversation
              ? {
                  ...conv,
                  customer: {
                    id: selectedCustomerForLink.id,
                    name: selectedCustomerForLink.customer_name,
                    phone: selectedCustomerForLink.contact_number,
                    email: selectedCustomerForLink.email
                  },
                  user: {
                    ...conv.user,
                    customerId: selectedCustomerForLink.id
                  }
                }
              : conv
          )
        );

        // Close modals and reset state
        setShowConfirmationModal(false);
        setSelectedCustomerForLink(null);

        // Fetch detailed customer information
        fetchCustomerDetails(selectedCustomerForLink.id);
      } else {
        alert('Failed to link customer: ' + data.error);
      }
    } catch (error) {
      console.error('Error linking customer:', error);
      alert('Failed to link customer');
    } finally {
      setLinkingCustomer(false);
    }
  };

  // Fetch customer details
  const fetchCustomerDetails = async (customerId: string) => {
    try {
      const response = await fetch(`/api/line/customers/${customerId}/details`);
      const data = await response.json();

      if (data.success) {
        setCustomerDetails(data.customer);
        setCustomerBookings(data.bookings);
        setCustomerPackages(data.packages);
        setCustomerTransactions(data.transactions);
        setCurrentBookingIndex(0); // Reset to first booking
      }
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

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

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/line/conversations/${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages);

        // Preload all images in the conversation for caching
        const imageUrls = data.messages
          .filter((msg: any) => msg.type === 'image' && (msg.fileUrl || msg.imageUrl))
          .map((msg: any) => msg.fileUrl || msg.imageUrl);

        if (imageUrls.length > 0) {
          imageCache.preloadImages(imageUrls).catch(error => {
            console.warn('Failed to preload some images:', error);
          });
        }

        // Only scroll to bottom on first open of this conversation
        if (lastOpenedConversationRef.current !== conversationId) {
          lastOpenedConversationRef.current = conversationId;
          // Use instant scroll for initial load - just jump to bottom
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
          }, 50);
        }

        // Mark conversation as read
        await fetch(`/api/line/conversations/${conversationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'mark_read' }),
        });

        // Refresh conversations to update unread count
        fetchConversations();
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  }, [fetchConversations]);

  // Handle right-click context menu
  const handleMessageRightClick = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    e.stopPropagation();

    // Find the message bubble element for better positioning
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
    // Check if there's text selection - if so, don't show context menu
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      return; // Let native text selection work
    }

    e.preventDefault();
    const touch = e.touches[0];

    // Find the message bubble element for better positioning
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

  // Handle copy message text
  const handleCopyMessage = () => {
    // Optional: Show a brief success notification or feedback
    console.log('Message text copied to clipboard');
  };

  // Close context menu
  const handleCloseContextMenu = () => {
    setShowContextMenu(false);
    setContextMenuMessage(null);
    setContextMenuMessageElement(null);
  };

  // Send message (text, image, or file)
  const sendMessage = async (type: 'text' | 'image' | 'file' = 'text', curatedImageId?: string, fileToUpload?: File) => {
    const fileToUse = fileToUpload || selectedFile;
    console.log('sendMessage called with:', { type, curatedImageId, fileToUse, selectedFile });
    if (!selectedConversation) {
      console.log('No conversation selected');
      return;
    }

    // Validate based on message type
    if (type === 'text' && !newMessage.trim()) {
      console.log('No text message provided');
      return;
    }
    if ((type === 'image' || type === 'file') && !fileToUse && !curatedImageId) {
      console.log('No file or curated image provided');
      return;
    }

    try {
      setSendingMessage(true);
      console.log('Starting to send message...');

      let response: Response;

      if (type === 'text') {
        // Send regular text message
        response = await fetch(`/api/line/conversations/${selectedConversation}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: newMessage.trim(),
            type: 'text',
            senderName: 'Admin',
            repliedToMessageId: replyingToMessage?.id
          }),
        });
      } else {
        // Send file or curated image
        console.log('Preparing FormData for file upload...');
        const formData = new FormData();
        if (fileToUse) {
          console.log('Appending file to FormData:', fileToUse.name);
          formData.append('file', fileToUse);
        }
        if (curatedImageId) {
          console.log('Appending curated image ID:', curatedImageId);
          formData.append('curatedImageId', curatedImageId);
        }
        formData.append('type', type);
        formData.append('senderName', 'Admin');

        console.log('Sending FormData request...');
        response = await fetch(`/api/line/conversations/${selectedConversation}/messages`, {
          method: 'POST',
          body: formData,
        });
        console.log('Response received:', response.status, response.statusText);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        console.log('Message sent successfully:', data.message);

        // Clear input states
        setNewMessage('');
        setSelectedFile(null);
        setShowAttachmentMenu(false);
        setShowCuratedImages(false);
        setReplyingToMessage(null); // Clear reply state

        // Reset textarea height to default (3 lines)
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.style.height = '80px';
        }

        // Refocus the input for continued typing (both desktop and mobile)
        setTimeout(() => {
          const input = isMobile
            ? document.querySelector('input[placeholder="Enter Message"]') as HTMLInputElement
            : document.querySelector('textarea[placeholder*="Type a message"]') as HTMLTextAreaElement;

          if (input) {
            input.focus();
          }
        }, 100);

        // Scroll to bottom when user sends a message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        console.error('Failed to send message:', data.error);
        alert('Failed to send message: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message: ' + error);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log('File selected:', file);
    if (file) {
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      setShowAttachmentMenu(false);

      // Compress image if it's an image file
      let processedFile = file;
      if (file.type.startsWith('image/')) {
        console.log('Compressing image...');
        processedFile = await compressImage(file);
      }

      setSelectedFile(processedFile);

      // Determine message type based on file type
      const messageType = file.type.startsWith('image/') ? 'image' : 'file';
      console.log('Sending message type:', messageType);
      sendMessage(messageType, undefined, processedFile); // Pass processed file directly
    }
  };

  // Handle curated image selection - now supports multiple images
  const handleCuratedImageSelect = async (imageIds: string[]) => {
    if (imageIds.length === 1) {
      // Single image - use existing flow
      sendMessage('image', imageIds[0]);
    } else {
      // Multiple images - send directly
      await sendBatchImages(imageIds);
    }
  };

  // Send multiple images in batch
  const sendBatchImages = async (imageIds: string[]) => {
    if (!selectedConversation || imageIds.length === 0) return;

    try {
      setSendingMessage(true);
      setSendingProgress({ current: 1, total: imageIds.length });

      const response = await fetch(`/api/line/conversations/${selectedConversation}/messages`, {
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

      const data = await response.json();

      if (data.success) {
        // Show success feedback
        setSendingProgress({ current: imageIds.length, total: imageIds.length });

        // Brief success state before clearing
        setTimeout(() => {
          setSendingProgress(null);
        }, 1000);

        // Scroll to bottom when user sends multiple images
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        // Refocus the input for continued typing (both desktop and mobile)
        setTimeout(() => {
          const input = isMobile
            ? document.querySelector('input[placeholder="Enter Message"]') as HTMLInputElement
            : document.querySelector('textarea[placeholder*="Type a message"]') as HTMLTextAreaElement;

          if (input) {
            input.focus();
          }
        }, 150);
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
  };

  // Handle template selection
  const handleTemplateSelect = async (template: any) => {
    if (!selectedConversation) return;

    try {
      setSendingMessage(true);
      setShowTemplateSelector(false);

      // Get customer name for variable substitution
      const customerName = selectedConv?.customer?.name || selectedConv?.user.displayName || '';

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
        // Scroll to bottom when user sends a template
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        // Refocus the input for continued typing (both desktop and mobile)
        setTimeout(() => {
          const input = isMobile
            ? document.querySelector('input[placeholder="Enter Message"]') as HTMLInputElement
            : document.querySelector('textarea[placeholder*="Type a message"]') as HTMLTextAreaElement;

          if (input) {
            input.focus();
          }
        }, 150);
      } else {
        alert('Failed to send template: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending template:', error);
      alert('Failed to send template');
    } finally {
      setSendingMessage(false);
    }
  };

  // Send rich message
  const sendRichMessage = async (messageType: 'booking_confirmation' | 'booking_reminder') => {
    if (!selectedConversation) return;

    try {
      setSendingMessage(true);

      const response = await fetch(`/api/line/send-rich-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId: selectedConversation,
          messageType,
          senderName: 'Admin'
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Scroll to bottom when user sends a rich message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      } else {
        alert(`Failed to send ${messageType}: ${data.error}`);
      }
    } catch (error) {
      console.error(`Error sending ${messageType}:`, error);
      alert(`Failed to send ${messageType}`);
    } finally {
      setSendingMessage(false);
    }
  };

  // Send booking confirmation
  const sendBookingConfirmation = async (bookingId: string) => {
    if (!selectedConversation) return;

    try {
      setSendingConfirmation(bookingId);

      const response = await fetch(`/api/line/bookings/${bookingId}/send-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageFormat: 'flex', // Send interactive flex message only
          senderName: 'Admin'
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Booking confirmation sent successfully');
      } else {
        if (data.error.includes('does not have a linked LINE account')) {
          alert('This customer does not have a linked LINE account. Please link their LINE account first.');
        } else if (data.error.includes('Cannot send confirmation for booking with status')) {
          alert(`Cannot send confirmation: ${data.error}\n\nBooking Status: ${data.bookingStatus || 'unknown'}`);
        } else if (data.error.includes('Booking not found')) {
          alert('Booking not found. It may have been deleted or the ID is incorrect.');
        } else {
          alert('Failed to send booking confirmation: ' + data.error);
        }
      }
    } catch (error) {
      console.error('Error sending booking confirmation:', error);
      alert('Failed to send booking confirmation. Please try again.');
    } finally {
      setSendingConfirmation(null);
    }
  };

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Log cache stats for debugging (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const logCacheStats = () => {
        const stats = imageCache.getCacheStats();
        console.log('Image Cache Stats:', stats);
      };

      // Log stats every 30 seconds in development
      const interval = setInterval(logCacheStats, 30000);
      return () => clearInterval(interval);
    }
  }, []);

  // Enhanced scroll to bottom that waits for images to load
  const scrollToBottomAfterImages = () => {
    // Wait for any pending images to load
    const images = document.querySelectorAll('.messages-container img');
    let loadedCount = 0;
    const totalImages = images.length;

    if (totalImages === 0) {
      scrollToBottom();
      return;
    }

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalImages) {
        scrollToBottom();
      }
    };

    images.forEach((img) => {
      if (img instanceof HTMLImageElement) {
        if (img.complete) {
          checkAllLoaded();
        } else {
          img.addEventListener('load', checkAllLoaded, { once: true });
          img.addEventListener('error', checkAllLoaded, { once: true });
        }
      }
    });

    // Fallback timeout in case some images fail to trigger events
    setTimeout(() => {
      scrollToBottom();
    }, 1000);
  };

  // Filter conversations by search term
  const filteredConversations = conversations.filter(conv =>
    conv.user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessageText?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get selected conversation data
  const selectedConv = conversations.find(conv => conv.id === selectedConversation);

  // Format time display
  const formatTime = (dateString?: string | null) => {
    if (!dateString) {
      return 'No messages';
    }

    const date = new Date(dateString);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) {
      return 'Just now';
    } else if (hours < 24) {
      return `${Math.floor(hours)}h ago`;
    } else {
      const days = Math.floor(hours / 24);
      if (days === 1) {
        return 'Yesterday';
      } else if (days < 7) {
        return `${days} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
  };

  // Format message time
  const formatMessageTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    const size = bytes / Math.pow(k, i);

    // Show 1 decimal place for MB and above, whole numbers for KB and below
    if (i >= 2) {
      return `${size.toFixed(1)}${sizes[i]}`;
    } else {
      return `${Math.round(size)}${sizes[i]}`;
    }
  };

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

  // Setup fallback polling as backup to realtime
  useEffect(() => {
    fetchConversations();
    setLoading(false);

    // Fallback polling - only when realtime fails
    const startFallbackPolling = () => {
      if (pollIntervalRef.current) return;

      pollIntervalRef.current = setInterval(() => {
        if (!document.hidden) {
          // Skip polling entirely if conversations realtime is working
          if (conversationsConnectionStatus.status === 'connected') {
            return; // Realtime is working, no need to poll
          }

          // Only poll if realtime connections are having actual issues
          const hasConnectionIssues =
            // Messages connection issues (only check if conversation is selected)
            (selectedConversation && messagesConnectionStatus.status === 'error') ||
            // Conversations connection issues (only error, not disconnected - disconnected is normal during startup)
            conversationsConnectionStatus.status === 'error';

          if (hasConnectionIssues) {
            console.log('🔄 Fallback polling due to realtime issues:', {
              selectedConversation,
              messagesStatus: messagesConnectionStatus.status,
              conversationsStatus: conversationsConnectionStatus.status
            });
            fetchConversations();
            if (selectedConversation) {
              fetchMessages(selectedConversation);
            }
          }
        }
      }, 10000); // 10 seconds fallback polling
    };

    const stopPolling = () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };

    // Start polling when page is visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        startFallbackPolling();
        // Refresh data when coming back to the page
        fetchConversations();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startFallbackPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchConversations, fetchMessages, selectedConversation, messagesConnectionStatus.status, conversationsConnectionStatus.status]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      // Clear existing messages first to prevent showing stale data
      setMessages([]);
      fetchMessages(selectedConversation);
    } else {
      // Clear messages when no conversation is selected
      setMessages([]);
    }
  }, [selectedConversation, fetchMessages]);

  // Fetch customer details when conversation with linked customer is selected
  useEffect(() => {
    if (selectedConv?.customer?.id) {
      fetchCustomerDetails(selectedConv.customer.id);
    } else {
      // Clear customer details when no customer is linked
      setCustomerDetails(null);
      setCustomerBookings([]);
      setCustomerPackages([]);
      setCustomerTransactions([]);
      setCurrentBookingIndex(0);
    }
  }, [selectedConv?.customer?.id]);

  // Ensure booking index stays within bounds when bookings change
  useEffect(() => {
    if (customerBookings.length > 0 && currentBookingIndex >= customerBookings.length) {
      setCurrentBookingIndex(0);
    }
  }, [customerBookings.length, currentBookingIndex]);

  // Close mobile quick actions menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showMobileQuickActions && !target.closest('.mobile-quick-actions-container')) {
        setShowMobileQuickActions(false);
      }
    };

    if (showMobileQuickActions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMobileQuickActions]);

  // Close header menu when clicking outside or pressing escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showHeaderMenu && !target.closest('.header-menu-container')) {
        setShowHeaderMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showHeaderMenu) {
        setShowHeaderMenu(false);
      }
    };

    if (showHeaderMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showHeaderMenu]);

  // Prevent background scrolling when mobile customer modal is open
  useEffect(() => {
    if (showMobileCustomer) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.top = '0';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
    };
  }, [showMobileCustomer]);


  // Only auto-scroll when sending new messages (not when receiving or loading)
  // Removed automatic scrolling on messages change to prevent interrupting reading

  // Handle Enter key in message input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // On mobile, always send on Enter
      // On desktop, send on Enter unless Shift is held
      if (isMobile || !e.shiftKey) {
        e.preventDefault();
        sendMessage();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading conversations...</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-50 relative">
      {/* Left Sidebar - Conversations List */}
      {!leftPanelCollapsed && (
        <div className={`w-full md:w-80 bg-white border-r flex flex-col transition-all duration-300 ease-in-out ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-semibold">LINE Conversations</h1>

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
                onClick={() => {
                  setSelectedConversation(conversation.id);
                  setShowMobileChat(true);
                }}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                  selectedConversation === conversation.id ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <SafeImage
                    src={conversation.user.pictureUrl || ''}
                    alt={conversation.user.displayName}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {conversation.customer?.name || conversation.user.displayName}
                      </p>
                      <div className="flex items-center space-x-2">
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                    </div>


                    {conversation.lastMessageText && (
                      <div className="flex items-center space-x-2 mt-1">
                        {conversation.lastMessageBy === 'admin' && (
                          <span className="text-sm text-gray-500">✓</span>
                        )}
                        {conversation.lastMessageType === 'sticker' ? (
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.user.displayName} sent a sticker
                          </p>
                        ) : conversation.lastMessageType === 'image' ? (
                          <p className="text-sm text-gray-500 truncate">
                            {conversation.user.displayName} sent an image
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 truncate">
                            {enhanceMessageDisplay(conversation.lastMessageText)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </div>
      )}

      {/* Center - Chat Window */}
      <div className={`flex-1 flex flex-col ${!showMobileChat && selectedConversation ? 'hidden md:flex' : ''} ${!selectedConversation ? 'hidden md:flex' : ''} transition-all duration-300 ease-in-out`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b p-2 md:p-4 flex items-center justify-between sticky top-0 z-10 md:static md:z-auto">
              <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                {/* Panel Controls - Desktop Only */}
                <div className="hidden md:flex items-center space-x-2 mr-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                    className="h-8 w-8 p-0 hover:bg-gray-100"
                    title={leftPanelCollapsed ? "Show conversations" : "Hide conversations"}
                  >
                    <PanelLeft className={`h-4 w-4 transition-all duration-200 ${leftPanelCollapsed ? 'text-gray-400' : 'text-gray-600'}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
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
                        setLeftPanelCollapsed(false);
                        setRightPanelCollapsed(false);
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
                  onClick={() => setShowMobileChat(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* User Avatar */}
                <SafeImage
                  src={selectedConv?.user.pictureUrl || ''}
                  alt={selectedConv?.user.displayName || 'User'}
                  width={32}
                  height={32}
                  className="w-7 h-7 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0"
                />

                {/* Customer Info - Clickable on Mobile */}
                <div
                  className="flex-1 min-w-0 cursor-pointer md:cursor-default"
                  onClick={() => {
                    if (isMobile) {
                      setShowMobileCustomer(true);
                    }
                  }}
                >
                  <h2 className="font-semibold text-sm md:text-base truncate">
                    {selectedConv?.customer?.name || selectedConv?.user.displayName}
                  </h2>
                  {selectedConv?.customer && (
                    <p className="text-xs text-gray-500 truncate hidden md:block">
                      LINE: {selectedConv.user.displayName}
                    </p>
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
                    onClick={() => {
                      fetchConversations();
                      if (selectedConversation) {
                        fetchMessages(selectedConversation);
                      }
                    }}
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
                            fetchConversations();
                            if (selectedConversation) {
                              fetchMessages(selectedConversation);
                            }
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
                          // More sophisticated long press detection that respects text selection
                          let touchMoved = false;
                          const initialTouch = e.touches[0];
                          const startX = initialTouch.clientX;
                          const startY = initialTouch.clientY;

                          const timeout = setTimeout(() => {
                            if (!touchMoved) {
                              handleMessageLongPress(e as any, message);
                            }
                          }, 600); // Slightly longer delay to allow for text selection

                          const handleTouchMove = (moveEvent: TouchEvent) => {
                            const touch = moveEvent.touches[0];
                            const moveDistance = Math.abs(touch.clientX - startX) + Math.abs(touch.clientY - startY);
                            if (moveDistance > 10) { // 10px tolerance
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
                        onTouchStart={(e: React.TouchEvent) => {
                          // More sophisticated long press detection that respects text selection
                          let touchMoved = false;
                          const initialTouch = e.touches[0];
                          const startX = initialTouch.clientX;
                          const startY = initialTouch.clientY;

                          const timeout = setTimeout(() => {
                            if (!touchMoved) {
                              handleMessageLongPress(e as any, message);
                            }
                          }, 600); // Slightly longer delay to allow for text selection

                          const handleTouchMove = (moveEvent: TouchEvent) => {
                            const touch = moveEvent.touches[0];
                            const moveDistance = Math.abs(touch.clientX - startX) + Math.abs(touch.clientY - startY);
                            if (moveDistance > 10) { // 10px tolerance
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
                          <span>{formatFileSize(message.fileSize)}</span>
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
                        onTouchStart={(e: React.TouchEvent) => {
                          // More sophisticated long press detection that respects text selection
                          let touchMoved = false;
                          const initialTouch = e.touches[0];
                          const startX = initialTouch.clientX;
                          const startY = initialTouch.clientY;

                          const timeout = setTimeout(() => {
                            if (!touchMoved) {
                              handleMessageLongPress(e as any, message);
                            }
                          }, 600); // Slightly longer delay to allow for text selection

                          const handleTouchMove = (moveEvent: TouchEvent) => {
                            const touch = moveEvent.touches[0];
                            const moveDistance = Math.abs(touch.clientX - startX) + Math.abs(touch.clientY - startY);
                            if (moveDistance > 10) { // 10px tolerance
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
                        {/* Show reply preview if this is a reply */}
                        {message.repliedToMessage && (
                          <ReplyDisplay
                            repliedToMessage={message.repliedToMessage}
                            replyPreviewText={message.replyPreviewText}
                            replyPreviewType={message.replyPreviewType}
                            onClickReply={() => {
                              // TODO: Scroll to original message
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
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area Container */}
            <div className="sticky bottom-0 z-10">
              {/* Reply Preview Container (separate) */}
              {replyingToMessage && (
                <div className="bg-white border-t">
                  <ReplyPreview
                    message={{
                      id: replyingToMessage.id,
                      text: replyingToMessage.text,
                      type: replyingToMessage.type,
                      senderName: replyingToMessage.senderName,
                      senderType: replyingToMessage.senderType,
                      pictureUrl: replyingToMessage.senderType === 'admin' ? '/favicon.svg' : (selectedConv?.user.pictureUrl),
                      fileName: replyingToMessage.fileName
                    }}
                    onClose={handleCancelReply}
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
                        disabled={sendingMessage}
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
                                  onChange={(e) => {
                                    handleFileSelect(e);
                                    setShowMobileQuickActions(false);
                                  }}
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
                            sendMessage();
                          }
                        }}
                        placeholder="Enter Message"
                        disabled={sendingMessage}
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
                      onClick={() => sendMessage()}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="h-9 w-9 p-0 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed rounded-full flex-shrink-0"
                    >
                      {sendingMessage ? (
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
                      disabled={sendingMessage}
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
                            disabled={sendingMessage}
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
                          disabled={sendingMessage}
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
                        onClick={() => sendMessage()}
                        disabled={sendingMessage || !newMessage.trim()}
                        className="px-4 py-2 h-10 bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all duration-200 rounded-md font-medium"
                      >
                        {sendingMessage ? (
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
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full">
            {/* Global Panel Controls for Empty State */}
            <div className="bg-white border-b p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
                  className="h-8 w-8 p-0 hover:bg-gray-100"
                  title={leftPanelCollapsed ? "Show conversations" : "Hide conversations"}
                >
                  <PanelLeft className={`h-4 w-4 transition-all duration-200 ${leftPanelCollapsed ? 'text-gray-400' : 'text-gray-600'}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
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
                      setLeftPanelCollapsed(false);
                      setRightPanelCollapsed(false);
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
                {/* Calendar Link */}
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

                {/* Coaching Link */}
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
                        onClick={() => setLeftPanelCollapsed(false)}
                        className="flex items-center space-x-2"
                      >
                        <PanelLeft className="h-4 w-4" />
                        <span>Show Conversations</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setRightPanelCollapsed(false)}
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
        )}
      </div>

      {/* Right Sidebar - Customer Info */}
      {!rightPanelCollapsed && (
        <div className={`w-full md:w-80 bg-white border-l transition-all duration-300 ease-in-out flex flex-col ${!showMobileCustomer ? 'hidden md:flex' : 'hidden md:flex'}`}>
        {selectedConv ? (
          <div className="p-4 flex-1 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Customer Information</h3>
            </div>

            {/* User Profile */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <SafeImage
                    src={selectedConv.user.pictureUrl || ''}
                    alt={selectedConv.user.displayName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">{selectedConv.user.displayName}</h4>
                    <p className="text-sm text-gray-500">LINE User</p>
                  </div>
                </div>

                {selectedConv.customer ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedConv.customer.name}</span>
                      </div>
                      {selectedConv.customer.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{selectedConv.customer.phone}</span>
                        </div>
                      )}
                      {selectedConv.customer.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{selectedConv.customer.email}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLinkModal(true)}
                      disabled={linkingCustomer}
                      className="w-full text-xs"
                    >
                      Edit Customer Link
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">Not linked to customer</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowLinkModal(true);
                        setShowMobileCustomer(false); // Close mobile customer modal if open
                      }}
                      disabled={linkingCustomer}
                    >
                      {linkingCustomer ? 'Linking...' : 'Link to Customer'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details (if linked) */}
            {selectedConv.customer && customerDetails && (
              <>
                {/* Customer Stats */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold">{customerDetails.totalVisits || 0}</p>
                        <p className="text-xs text-gray-500">Total Visits</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">฿{(customerDetails.lifetimeValue || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Lifetime Value</p>
                      </div>
                    </div>
                    {customerDetails.lastVisitDate && (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-gray-500">
                          Last visit: {new Date(customerDetails.lastVisitDate).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Bookings Carousel */}
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Upcoming Bookings
                      </div>
                      {customerBookings.length > 1 && (
                        <span className="text-xs text-gray-500 font-normal">
                          {customerBookings.length} bookings
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {customerBookings.length > 0 ? (
                      <div className="space-y-3">
                        {/* Current Booking Display */}
                        {(() => {
                          const booking = customerBookings[currentBookingIndex];
                          if (!booking) return null;

                          const bookingDate = new Date(booking.date);
                          const isConfirmed = booking.status === 'confirmed';

                          // Use Thailand timezone for date and time comparisons
                          const thailandNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
                          const thailandToday = new Date(thailandNow.getFullYear(), thailandNow.getMonth(), thailandNow.getDate());
                          const thailandTomorrow = new Date(thailandToday.getTime() + 24 * 60 * 60 * 1000);

                          // Create full datetime for this booking in Thailand timezone
                          const [hours, minutes] = booking.start_time.split(':').map(Number);
                          const bookingDateTime = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate(), hours, minutes);

                          // Booking is upcoming if it's in the future (considering both date and time)
                          const isUpcoming = bookingDateTime > thailandNow;
                          const isToday = bookingDate.toDateString() === thailandToday.toDateString();
                          const isTomorrow = bookingDate.toDateString() === thailandTomorrow.toDateString();

                          // Format date more elegantly
                          let dateDisplay;
                          if (isToday) {
                            dateDisplay = 'Today';
                          } else if (isTomorrow) {
                            dateDisplay = 'Tomorrow';
                          } else {
                            dateDisplay = bookingDate.toLocaleDateString('en-GB', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            });
                          }

                          return (
                            <div key={booking.id} className={`relative p-4 rounded-xl border transition-all duration-200 ${
                              isUpcoming
                                ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md hover:border-blue-300'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}>
                              {/* Status indicator line */}
                              <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl ${
                                isUpcoming && isConfirmed ? 'bg-green-500' :
                                isUpcoming ? 'bg-yellow-500' : 'bg-gray-300'
                              }`} />

                              {/* Header with Bay and Status */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    isUpcoming ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {booking.bay}
                                  </div>
                                </div>

                                <Badge
                                  variant={isConfirmed ? 'default' : 'secondary'}
                                  className={`text-xs font-medium ${
                                    isConfirmed ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''
                                  }`}
                                >
                                  {booking.status}
                                </Badge>
                              </div>

                              {/* Date and Time - Primary info */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {dateDisplay}
                                  </div>
                                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    <div className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      {booking.start_time}
                                    </div>
                                    <div>
                                      {booking.duration}h
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Button */}
                              {isUpcoming && isConfirmed && (
                                <div className="pt-2 border-t border-gray-100">
                                  <Button
                                    size="sm"
                                    className={`w-full h-9 font-medium transition-all duration-200 ${
                                      sendingConfirmation === booking.id
                                        ? 'bg-gray-100 text-gray-600'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                                    }`}
                                    onClick={() => sendBookingConfirmation(booking.id)}
                                    disabled={sendingConfirmation === booking.id}
                                  >
                                    {sendingConfirmation === booking.id ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Confirmation
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Booking Navigation */}
                        {customerBookings.length > 1 && (
                          <div className="flex items-center justify-center space-x-3 pt-3 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              onClick={() => setCurrentBookingIndex(Math.max(0, currentBookingIndex - 1))}
                              disabled={currentBookingIndex === 0}
                              title="Previous booking"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <span className="text-sm text-gray-600 font-medium">
                              {currentBookingIndex + 1}/{customerBookings.length}
                            </span>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              onClick={() => setCurrentBookingIndex(Math.min(customerBookings.length - 1, currentBookingIndex + 1))}
                              disabled={currentBookingIndex === customerBookings.length - 1}
                              title="Next booking"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No upcoming bookings</p>
                    )}
                  </CardContent>
                </Card>

                {/* Active Packages */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Active Packages ({customerPackages.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {customerPackages.length > 0 ? (
                      <div className="space-y-3">
                        {customerPackages.map((pkg) => {
                          const isUnlimited = pkg.remaining_hours === 'Unlimited';
                          const hoursLeft = Number(pkg.remaining_hours) || 0;
                          const totalHours = hoursLeft + (pkg.used_hours || 0);
                          const usagePercentage = isUnlimited ? 0 : ((totalHours - hoursLeft) / totalHours) * 100;
                          const expiryDate = new Date(pkg.expiration_date);
                          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                          // Determine urgency level
                          const isExpiringSoon = daysUntilExpiry <= 7;
                          const isLowHours = !isUnlimited && hoursLeft <= 5;

                          return (
                            <div
                              key={pkg.id}
                              className={`relative p-4 rounded-xl border transition-all duration-200 ${
                                isExpiringSoon || isLowHours
                                  ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white'
                                  : 'border-green-200 bg-gradient-to-br from-green-50 to-white'
                              } hover:shadow-md`}
                            >
                              {/* Package type header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  isUnlimited
                                    ? 'bg-purple-100 text-purple-800'
                                    : isExpiringSoon || isLowHours
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-green-100 text-green-800'
                                }`}>
                                  {pkg.package_type_name}
                                </div>

                                {(isExpiringSoon || isLowHours) && (
                                  <div className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                    {isExpiringSoon ? 'EXPIRING SOON' : 'LOW HOURS'}
                                  </div>
                                )}
                              </div>

                              {/* Hours remaining display */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-lg font-bold text-gray-900">
                                    {isUnlimited ? '∞ Unlimited' : `${hoursLeft}h remaining`}
                                  </span>
                                </div>

                                {/* Progress bar for limited packages */}
                                {!isUnlimited && (
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        hoursLeft <= 2 ? 'bg-red-500' :
                                        hoursLeft <= 5 ? 'bg-orange-500' :
                                        'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.max(5, 100 - usagePercentage)}%` }}
                                    />
                                  </div>
                                )}

                                {/* Usage statistics */}
                                {!isUnlimited && (
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Used: {pkg.used_hours || 0}h</span>
                                    <span>Total: {totalHours}h</span>
                                  </div>
                                )}
                              </div>

                              {/* Expiry information */}
                              <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    {expiryDate.toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className={`font-medium ${
                                    daysUntilExpiry <= 3 ? 'text-red-600' :
                                    daysUntilExpiry <= 7 ? 'text-orange-600' :
                                    'text-green-600'
                                  }`}>
                                    {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Package className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No active packages</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Select a conversation to view customer information</p>
            </div>
          </div>
        )}
        </div>
      )}

      {/* Customer Link Modal */}
      <CustomerLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onCustomerSelect={handleCustomerSelection}
        loading={linkingCustomer}
        lineUserName={selectedConv?.user.displayName}
      />

      {/* Customer Confirmation Modal */}
      <CustomerConfirmationModal
        isOpen={showConfirmationModal}
        onClose={() => {
          setShowConfirmationModal(false);
          setSelectedCustomerForLink(null);
        }}
        onConfirm={linkCustomerToLineUser}
        onEdit={handleEditCustomerLink}
        customer={selectedCustomerForLink}
        lineUserName={selectedConv?.user.displayName}
        loading={linkingCustomer}
      />

      <CuratedImageModal
        isOpen={showCuratedImages}
        onClose={() => setShowCuratedImages(false)}
        onSelect={handleCuratedImageSelect}
      />

      <TemplateSelector
        isOpen={showTemplateSelector}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
        customerName={selectedConv?.customer?.name || selectedConv?.user.displayName}
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

      {/* Mobile Customer Panel - Full Screen Modal */}
      {showMobileCustomer && selectedConv && (
        <div className="fixed inset-0 bg-white z-50 md:hidden flex flex-col">
          {/* Mobile Customer Header */}
          <div className="bg-white border-b p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowMobileCustomer(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="font-semibold text-lg">Customer Information</h3>
            </div>
          </div>

          {/* Mobile Customer Content */}
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
            onTouchMove={(e) => {
              // Allow scroll within modal
              e.stopPropagation();
            }}
          >
            {/* User Profile */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-4">
                  <SafeImage
                    src={selectedConv.user.pictureUrl || ''}
                    alt={selectedConv.user.displayName}
                    width={48}
                    height={48}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-medium">{selectedConv.user.displayName}</h4>
                    <p className="text-sm text-gray-500">LINE User</p>
                  </div>
                </div>

                {selectedConv.customer ? (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{selectedConv.customer.name}</span>
                      </div>
                      {selectedConv.customer.phone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{selectedConv.customer.phone}</span>
                        </div>
                      )}
                      {selectedConv.customer.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{selectedConv.customer.email}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLinkModal(true)}
                      disabled={linkingCustomer}
                      className="w-full text-xs"
                    >
                      Edit Customer Link
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">Not linked to customer</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setShowLinkModal(true);
                        setShowMobileCustomer(false); // Close mobile customer modal if open
                      }}
                      disabled={linkingCustomer}
                    >
                      {linkingCustomer ? 'Linking...' : 'Link to Customer'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details (if linked) */}
            {selectedConv.customer && customerDetails && (
              <>
                {/* Customer Stats */}
                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold">{customerDetails.totalVisits || 0}</p>
                        <p className="text-xs text-gray-500">Total Visits</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold">฿{(customerDetails.lifetimeValue || 0).toLocaleString()}</p>
                        <p className="text-xs text-gray-500">Lifetime Value</p>
                      </div>
                    </div>
                    {customerDetails.lastVisitDate && (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-gray-500">
                          Last visit: {new Date(customerDetails.lastVisitDate).toLocaleDateString('en-GB')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Bookings Carousel */}
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        Upcoming Bookings
                      </div>
                      {customerBookings.length > 1 && (
                        <span className="text-xs text-gray-500 font-normal">
                          {customerBookings.length} bookings
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {customerBookings.length > 0 ? (
                      <div className="space-y-3">
                        {/* Current Booking Display */}
                        {(() => {
                          const booking = customerBookings[currentBookingIndex];
                          if (!booking) return null;

                          const bookingDate = new Date(booking.date);
                          const isConfirmed = booking.status === 'confirmed';

                          // Use Thailand timezone for date and time comparisons
                          const thailandNow = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Bangkok"}));
                          const thailandToday = new Date(thailandNow.getFullYear(), thailandNow.getMonth(), thailandNow.getDate());
                          const thailandTomorrow = new Date(thailandToday.getTime() + 24 * 60 * 60 * 1000);

                          // Create full datetime for this booking in Thailand timezone
                          const [hours, minutes] = booking.start_time.split(':').map(Number);
                          const bookingDateTime = new Date(bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate(), hours, minutes);

                          // Booking is upcoming if it's in the future (considering both date and time)
                          const isUpcoming = bookingDateTime > thailandNow;
                          const isToday = bookingDate.toDateString() === thailandToday.toDateString();
                          const isTomorrow = bookingDate.toDateString() === thailandTomorrow.toDateString();

                          // Format date more elegantly
                          let dateDisplay;
                          if (isToday) {
                            dateDisplay = 'Today';
                          } else if (isTomorrow) {
                            dateDisplay = 'Tomorrow';
                          } else {
                            dateDisplay = bookingDate.toLocaleDateString('en-GB', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            });
                          }

                          return (
                            <div key={booking.id} className={`relative p-4 rounded-xl border transition-all duration-200 ${
                              isUpcoming
                                ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm hover:shadow-md hover:border-blue-300'
                                : 'border-gray-200 bg-white hover:bg-gray-50'
                            }`}>
                              {/* Status indicator line */}
                              <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl ${
                                isUpcoming && isConfirmed ? 'bg-green-500' :
                                isUpcoming ? 'bg-yellow-500' : 'bg-gray-300'
                              }`} />

                              {/* Header with Bay and Status */}
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                    isUpcoming ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {booking.bay}
                                  </div>
                                </div>

                                <Badge
                                  variant={isConfirmed ? 'default' : 'secondary'}
                                  className={`text-xs font-medium ${
                                    isConfirmed ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''
                                  }`}
                                >
                                  {booking.status}
                                </Badge>
                              </div>

                              {/* Date and Time - Primary info */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between">
                                  <div className="text-lg font-semibold text-gray-900">
                                    {dateDisplay}
                                  </div>
                                  <div className="flex items-center space-x-3 text-sm text-gray-600">
                                    <div className="flex items-center">
                                      <Calendar className="h-4 w-4 mr-1" />
                                      {booking.start_time}
                                    </div>
                                    <div>
                                      {booking.duration}h
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Action Button */}
                              {isUpcoming && isConfirmed && (
                                <div className="pt-2 border-t border-gray-100">
                                  <Button
                                    size="sm"
                                    className={`w-full h-9 font-medium transition-all duration-200 ${
                                      sendingConfirmation === booking.id
                                        ? 'bg-gray-100 text-gray-600'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md'
                                    }`}
                                    onClick={() => sendBookingConfirmation(booking.id)}
                                    disabled={sendingConfirmation === booking.id}
                                  >
                                    {sendingConfirmation === booking.id ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Confirmation
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Booking Navigation */}
                        {customerBookings.length > 1 && (
                          <div className="flex items-center justify-center space-x-3 pt-3 border-t border-gray-100">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              onClick={() => setCurrentBookingIndex(Math.max(0, currentBookingIndex - 1))}
                              disabled={currentBookingIndex === 0}
                              title="Previous booking"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>

                            <span className="text-sm text-gray-600 font-medium">
                              {currentBookingIndex + 1}/{customerBookings.length}
                            </span>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-gray-100"
                              onClick={() => setCurrentBookingIndex(Math.min(customerBookings.length - 1, currentBookingIndex + 1))}
                              disabled={currentBookingIndex === customerBookings.length - 1}
                              title="Next booking"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No upcoming bookings</p>
                    )}
                  </CardContent>
                </Card>

                {/* Active Packages */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Active Packages ({customerPackages.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {customerPackages.length > 0 ? (
                      <div className="space-y-3">
                        {customerPackages.map((pkg) => {
                          const isUnlimited = pkg.remaining_hours === 'Unlimited';
                          const hoursLeft = Number(pkg.remaining_hours) || 0;
                          const totalHours = hoursLeft + (pkg.used_hours || 0);
                          const usagePercentage = isUnlimited ? 0 : ((totalHours - hoursLeft) / totalHours) * 100;
                          const expiryDate = new Date(pkg.expiration_date);
                          const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                          // Determine urgency level
                          const isExpiringSoon = daysUntilExpiry <= 7;
                          const isLowHours = !isUnlimited && hoursLeft <= 5;

                          return (
                            <div
                              key={pkg.id}
                              className={`relative p-4 rounded-xl border transition-all duration-200 ${
                                isExpiringSoon || isLowHours
                                  ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-white'
                                  : 'border-green-200 bg-gradient-to-br from-green-50 to-white'
                              } hover:shadow-md`}
                            >
                              {/* Package type header */}
                              <div className="flex items-center justify-between mb-3">
                                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                                  isUnlimited
                                    ? 'bg-purple-100 text-purple-800'
                                    : isExpiringSoon || isLowHours
                                      ? 'bg-orange-100 text-orange-800'
                                      : 'bg-green-100 text-green-800'
                                }`}>
                                  {pkg.package_type_name}
                                </div>

                                {(isExpiringSoon || isLowHours) && (
                                  <div className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                    {isExpiringSoon ? 'EXPIRING SOON' : 'LOW HOURS'}
                                  </div>
                                )}
                              </div>

                              {/* Hours remaining display */}
                              <div className="mb-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-lg font-bold text-gray-900">
                                    {isUnlimited ? '∞ Unlimited' : `${hoursLeft}h remaining`}
                                  </span>
                                </div>

                                {/* Progress bar for limited packages */}
                                {!isUnlimited && (
                                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        hoursLeft <= 2 ? 'bg-red-500' :
                                        hoursLeft <= 5 ? 'bg-orange-500' :
                                        'bg-green-500'
                                      }`}
                                      style={{ width: `${Math.max(5, 100 - usagePercentage)}%` }}
                                    />
                                  </div>
                                )}

                                {/* Usage statistics */}
                                {!isUnlimited && (
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>Used: {pkg.used_hours || 0}h</span>
                                    <span>Total: {totalHours}h</span>
                                  </div>
                                )}
                              </div>

                              {/* Expiry information */}
                              <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    {expiryDate.toLocaleDateString('en-GB', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </span>
                                  <span className={`font-medium ${
                                    daysUntilExpiry <= 3 ? 'text-red-600' :
                                    daysUntilExpiry <= 7 ? 'text-orange-600' :
                                    'text-green-600'
                                  }`}>
                                    {daysUntilExpiry > 0 ? `${daysUntilExpiry} days` : 'Expired'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <Package className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">No active packages</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}