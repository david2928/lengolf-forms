'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Zap
} from 'lucide-react';

interface LineUser {
  displayName: string;
  pictureUrl?: string;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileCustomer, setShowMobileCustomer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Send message
  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    try {
      setSendingMessage(true);

      const response = await fetch(`/api/line/conversations/${selectedConversation}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          senderName: 'Admin' // You can make this dynamic based on logged-in user
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add message to current messages
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');

        // Refresh conversations
        fetchConversations();
      } else {
        alert('Failed to send message: ' + data.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
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

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

                    {conversation.customer && (
                      <p className="text-xs text-gray-500 truncate">
                        LINE: {conversation.user.displayName}
                      </p>
                    )}

                    {conversation.lastMessageText && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {conversation.lastMessageBy === 'admin' ? '✓ ' : ''}
                        {conversation.lastMessageText}
                      </p>
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.senderType === 'admin'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white border shadow-sm'
                    }`}
                  >
                    {message.text && (
                      <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs ${
                        message.senderType === 'admin'
                          ? 'text-blue-100'
                          : 'text-gray-500'
                      }`}>
                        {message.senderType === 'admin'
                          ? message.senderName || 'Admin'
                          : selectedConv?.user.displayName
                        }
                      </span>
                      <span className={`text-xs ml-2 ${
                        message.senderType === 'admin'
                          ? 'text-blue-100'
                          : 'text-gray-400'
                      }`}>
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t p-4 sticky bottom-0">
              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mb-3">
                <Button
                  onClick={() => sendRichMessage('booking_confirmation')}
                  disabled={sendingMessage}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  Booking Confirmation
                </Button>
                <Button
                  onClick={() => sendRichMessage('booking_reminder')}
                  disabled={sendingMessage}
                  size="sm"
                  variant="outline"
                  className="text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Booking Reminder
                </Button>
              </div>

              <div className="flex space-x-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  disabled={sendingMessage}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
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
                    <Button size="sm" variant="outline">
                      Link to Customer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Details (if linked) */}
            {selectedConv.customer && (
              <>
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Recent Bookings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-500">
                      Feature coming soon - will show last booking and next booking
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center">
                      <Package className="h-4 w-4 mr-2" />
                      Active Packages
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-500">
                      Feature coming soon - will show active packages and hours remaining
                    </p>
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
    </div>
  );
}