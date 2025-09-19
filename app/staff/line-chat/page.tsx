'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { enhanceMessageDisplay, createMessagePreview, type MessagePreview } from '@/lib/line/emoji-display-utils';
import { CustomerLinkModal } from '@/components/admin/line-chat/CustomerLinkModal';
import { StickerMessage } from '@/components/line/StickerMessage';
import { ImageMessage } from '@/components/line/ImageMessage';
import { FileMessage } from '@/components/line/FileMessage';
import { CuratedImageModal } from '@/components/line/CuratedImageModal';
import { TemplateSelector } from '@/components/line/TemplateSelector';
import { compressImage } from '@/lib/image-compression';
import { imageCache } from '@/lib/image-cache';
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
  CheckCircle
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
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
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
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [sendingConfirmation, setSendingConfirmation] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastOpenedConversationRef = useRef<string | null>(null);

  // Link LINE user to customer
  const linkCustomerToLineUser = async (customerId: string, customer: any) => {
    if (!selectedConv?.user.lineUserId) return;

    try {
      setLinkingCustomer(true);

      const response = await fetch(`/api/line/users/${selectedConv.user.lineUserId}/link-customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
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
                    id: customerId,
                    name: customer.customer_name,
                    phone: customer.contact_number,
                    email: customer.email
                  },
                  user: {
                    ...conv.user,
                    customerId
                  }
                }
              : conv
          )
        );

        // Fetch detailed customer information
        fetchCustomerDetails(customerId);
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
            senderName: 'Admin'
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
        // Add message to current messages
        setMessages(prev => [...prev, data.message]);

        // Clear input states
        setNewMessage('');
        setSelectedFile(null);
        setShowAttachmentMenu(false);
        setShowCuratedImages(false);

        // Scroll to bottom when user sends a message
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        // Refresh conversations
        fetchConversations();
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

  // Handle curated image selection
  const handleCuratedImageSelect = (imageId: string) => {
    sendMessage('image', imageId);
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
        // Add message to current messages
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        }

        // Scroll to bottom when user sends a template
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        // Refresh conversations
        fetchConversations();
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
        // Add message to current messages if returned
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
        } else {
          // Fallback display
          const displayText = messageType === 'booking_confirmation'
            ? '📋 Sent booking confirmation with interactive buttons'
            : '⏰ Sent booking reminder with action buttons';

          setMessages(prev => [...prev, {
            id: `mock-${Date.now()}`,
            text: displayText,
            type: 'flex',
            senderType: 'admin',
            senderName: 'Admin',
            createdAt: new Date().toISOString()
          }]);
        }

        // Scroll to bottom when user sends a rich message
        setTimeout(() => {
          scrollToBottom();
        }, 100);

        // Refresh conversations
        fetchConversations();
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
        // Refresh conversations to show the new message
        fetchConversations();

        // Refresh messages if this conversation is selected
        if (selectedConversation) {
          fetchMessages(selectedConversation);
        }
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

  // Setup polling for new messages
  useEffect(() => {
    fetchConversations();
    setLoading(false);

    // Poll for updates every 5 seconds when window is focused
    const startPolling = () => {
      if (pollIntervalRef.current) return;

      pollIntervalRef.current = setInterval(() => {
        if (!document.hidden) {
          fetchConversations();
          if (selectedConversation) {
            fetchMessages(selectedConversation);
          }
        }
      }, 5000);
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
        startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    startPolling();

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchConversations, fetchMessages, selectedConversation]);

  // Fetch messages when conversation is selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation);
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
    }
  }, [selectedConv?.customer?.id]);

  // Only auto-scroll when sending new messages (not when receiving or loading)
  // Removed automatic scrolling on messages change to prevent interrupting reading

  // Handle Enter key in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-gray-50">
      {/* Left Sidebar - Conversations List */}
      <div className={`w-full md:w-80 bg-white border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b">
          <h1 className="text-xl font-semibold mb-3">LINE Conversations</h1>
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
                        {conversation.user.displayName}
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

      {/* Center - Chat Window */}
      <div className={`flex-1 flex flex-col ${!showMobileChat && selectedConversation ? 'hidden md:flex' : ''} ${!selectedConversation ? 'hidden md:flex' : ''}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden"
                  onClick={() => setShowMobileChat(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <SafeImage
                  src={selectedConv?.user.pictureUrl || ''}
                  alt={selectedConv?.user.displayName || 'User'}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                />

                <div>
                  <h2 className="font-semibold">
                    {selectedConv?.customer?.name || selectedConv?.user.displayName}
                  </h2>
                  {selectedConv?.customer && (
                    <p className="text-sm text-gray-500">
                      LINE: {selectedConv.user.displayName}
                    </p>
                  )}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="md:hidden"
                onClick={() => setShowMobileCustomer(true)}
              >
                <Users className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 messages-container" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  {/* Render stickers and images without background container */}
                  {message.type === 'sticker' && message.stickerId ? (
                    <div className={`flex flex-col space-y-1 ${message.senderType === 'admin' ? 'items-end' : 'items-start'}`}>
                      <StickerMessage
                        packageId={message.packageId || ''}
                        stickerId={message.stickerId}
                        keywords={message.stickerKeywords}
                        size="large"
                        className=""
                      />
                      <span className="text-xs text-gray-400">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  ) : message.type === 'image' && (message.fileUrl || message.imageUrl) ? (
                    <div className={`flex flex-col space-y-1 ${message.senderType === 'admin' ? 'items-end' : 'items-start'}`}>
                      <ImageMessage
                        imageUrl={message.fileUrl || message.imageUrl!}
                        fileName={message.fileName}
                        fileSize={message.fileSize}
                        altText="Shared image"
                        className=""
                        showControls={true}
                      />
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
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderType === 'admin'
                            ? 'bg-blue-500 text-white'
                            : 'bg-white border shadow-sm'
                        }`}
                      >
                        {((message.type === 'file' || message.type === 'video' || message.type === 'audio') && message.fileUrl) ? (
                          <FileMessage
                            fileUrl={message.fileUrl}
                            fileName={message.fileName}
                            fileSize={message.fileSize}
                            fileType={message.fileType}
                            className="my-2"
                          />
                        ) : message.text ? (
                          <p className="text-sm whitespace-pre-wrap">{enhanceMessageDisplay(message.text)}</p>
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

            {/* Message Input */}
            <div className="bg-white border-t p-4 sticky bottom-0">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Link href="/create-booking">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Create Booking
                  </Button>
                </Link>
              </div>

              <div className="flex space-x-2 relative">
                {/* Template button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTemplateSelector(true)}
                  disabled={sendingMessage}
                  title="Select template"
                >
                  <FileText className="h-4 w-4" />
                </Button>

                {/* Attachment button */}
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    disabled={sendingMessage}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>

                  {/* Attachment menu */}
                  {showAttachmentMenu && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10 min-w-[180px]">
                      <div className="space-y-1">
                        {/* Upload from device */}
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

                        {/* Select curated image */}
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

                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={sendingMessage}
                  className="flex-1"
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={sendingMessage || !newMessage.trim()}
                  size="sm"
                >
                  {sendingMessage ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the left to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Customer Info */}
      <div className={`w-full md:w-80 bg-white border-l ${!showMobileCustomer ? 'hidden md:block' : ''}`}>
        {selectedConv ? (
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Customer Information</h3>
              <Button
                variant="ghost"
                size="sm"
                className="md:hidden"
                onClick={() => setShowMobileCustomer(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
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
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500 mb-2">Not linked to customer</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowLinkModal(true)}
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

                {/* Upcoming Booking */}
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Next Upcoming Booking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {customerBookings.length > 0 ? (
                      <div className="space-y-3">
                        {customerBookings.map((booking) => {
                          const bookingDate = new Date(booking.date);
                          const isUpcoming = bookingDate >= new Date(new Date().toDateString());
                          const isConfirmed = booking.status === 'confirmed';
                          const today = new Date();
                          const isToday = bookingDate.toDateString() === today.toDateString();
                          const isTomorrow = bookingDate.toDateString() === new Date(today.getTime() + 24 * 60 * 60 * 1000).toDateString();

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
                                  {isToday && (
                                    <div className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                                      TODAY
                                    </div>
                                  )}
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
                        })}
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
          <div className="p-4 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Select a conversation to view customer information</p>
          </div>
        )}
      </div>

      {/* Customer Link Modal */}
      <CustomerLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onCustomerSelect={linkCustomerToLineUser}
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
    </div>
  );
}