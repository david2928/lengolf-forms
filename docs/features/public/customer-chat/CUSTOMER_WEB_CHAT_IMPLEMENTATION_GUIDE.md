# Customer Web Chat Implementation Guide

**Comprehensive Implementation Plan for Unified Chat System**
*Research Date: September 2025*
*Target: Booking Website Integration with Existing Staff LINE Chat System*

## Executive Summary

This document provides a comprehensive implementation plan for adding customer web chat capabilities to your booking website, integrating with your existing LINE chat infrastructure. The solution creates a unified omnichannel messaging platform that allows staff to manage both LINE conversations and web chat conversations from a single interface.

### Key Benefits
- **Unified Staff Experience**: Single interface for both LINE and web chat conversations
- **Leverages Existing Infrastructure**: Builds on your current LINE chat system
- **Modern 2025 Standards**: Implements current best practices for web chat widgets
- **Mobile-First Design**: Responsive chat widget optimized for all devices
- **Real-time Performance**: Powered by Supabase real-time capabilities

## Current System Analysis

### Existing LINE Chat Infrastructure ✅

Your staff panel already has a comprehensive LINE chat system with:

**Database Architecture**:
- `line_conversations` - Conversation management with customer linking
- `line_messages` - Full message history with rich content support
- `line_users` - LINE user profiles with customer association
- `line_message_templates` - Categorized message templates with variables
- `line_curated_images` - Image management and caching
- `line_webhook_logs` - Event tracking and debugging

**API Endpoints** (15+ endpoints):
- Conversation management (`/api/line/conversations/*`)
- Message sending (`/api/line/send-message`, `/api/line/send-rich-message`)
- Template system (`/api/line/templates/*`)
- Customer integration (`/api/line/customers/*/details`)
- User management (`/api/line/users/*/link-customer`)

**Staff Interface Features**:
- Real-time conversation list with customer info
- Advanced image caching (3-layer system: Memory → IndexedDB → Network)
- Template integration with variable substitution
- Customer linking and profile integration
- Mobile-responsive design with accessibility features

## Unified Chat Architecture Design

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UNIFIED CHAT SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│  Customer Channels        │        Staff Interface          │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐ │
│  │ LINE Messaging      │  │  │ Staff LINE Chat Panel      │ │
│  │ (Existing)          │◄─┼─►│ (Existing - Enhanced)       │ │
│  └─────────────────────┘  │  └─────────────────────────────┘ │
│  ┌─────────────────────┐  │  ┌─────────────────────────────┐ │
│  │ Web Chat Widget     │  │  │ Unified Message Templates   │ │
│  │ (New)               │◄─┼─►│ Customer Profile Integration│ │
│  └─────────────────────┘  │  │ Real-time Notifications     │ │
│                           │  └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    SHARED INFRASTRUCTURE                   │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Supabase Database                                       │ │
│  │ • line_* tables (existing)                              │ │
│  │ • web_* tables (new - mirrored structure)               │ │
│  │ • unified_* views (new - combined data)                 │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Real-time Infrastructure (Supabase WebSockets)         │ │
│  │ • Message broadcasting                                  │ │
│  │ • Typing indicators                                     │ │
│  │ • Online presence                                       │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Data Model Extension

The design extends your existing LINE chat data model to support web chat:

```sql
-- Web Chat Tables (Mirror LINE Structure)
CREATE TABLE web_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    display_name TEXT,
    email TEXT,
    phone TEXT,
    ip_address INET,
    user_agent TEXT,
    first_seen_at TIMESTAMPTZ DEFAULT now(),
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    customer_id UUID REFERENCES backoffice.customers(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE web_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    web_user_id UUID REFERENCES web_users(id),
    customer_id UUID REFERENCES backoffice.customers(id),
    last_message_at TIMESTAMPTZ,
    last_message_text TEXT,
    last_message_by TEXT,
    unread_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    assigned_to TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE web_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    web_user_id UUID NOT NULL,
    conversation_id UUID REFERENCES web_conversations(id),
    message_type TEXT NOT NULL DEFAULT 'text',
    message_text TEXT,
    sender_type TEXT DEFAULT 'user', -- 'user' or 'staff'
    sender_name TEXT,
    is_read BOOLEAN DEFAULT false,
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Unified Views for Staff Interface
CREATE VIEW unified_conversations AS
SELECT
    'line' as channel_type,
    lc.id,
    lc.line_user_id as user_id,
    lu.display_name,
    lu.picture_url,
    lc.customer_id,
    lc.last_message_at,
    lc.last_message_text,
    lc.last_message_by,
    lc.unread_count,
    lc.is_active,
    lc.assigned_to,
    lc.created_at
FROM line_conversations lc
LEFT JOIN line_users lu ON lc.line_user_id = lu.line_user_id
UNION ALL
SELECT
    'web' as channel_type,
    wc.id,
    wu.session_id as user_id,
    wu.display_name,
    NULL as picture_url,
    wc.customer_id,
    wc.last_message_at,
    wc.last_message_text,
    wc.last_message_by,
    wc.unread_count,
    wc.is_active,
    wc.assigned_to,
    wc.created_at
FROM web_conversations wc
LEFT JOIN web_users wu ON wc.web_user_id = wu.id;
```

## Implementation Plan

### Phase 1: Booking Website - Chat Widget Implementation

#### 1.1 Install Dependencies

```bash
# Core chat functionality
npm install @supabase/supabase-js socket.io-client
npm install react-chat-widget lucide-react

# Optional: For advanced features
npm install @tanstack/react-query framer-motion
```

#### 1.2 Environment Setup

```bash
# .env.local (Booking Website)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CHAT_WIDGET_ENABLED=true
```

#### 1.3 Core Chat Widget Component

```typescript
// components/chat/ChatWidget.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { MessageCircle, X, Send, Paperclip } from 'lucide-react';

interface Message {
  id: string;
  message_text: string;
  sender_type: 'user' | 'staff';
  sender_name?: string;
  created_at: string;
  file_url?: string;
  file_name?: string;
}

interface ChatSession {
  sessionId: string;
  conversationId?: string;
  isActive: boolean;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [session, setSession] = useState<ChatSession | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const supabase = createClientComponentClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat session
  useEffect(() => {
    initializeChatSession();
  }, []);

  // Subscribe to real-time messages
  useEffect(() => {
    if (session?.conversationId) {
      const channel = supabase
        .channel(`web-chat-${session.conversationId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'web_messages',
          filter: `conversation_id=eq.${session.conversationId}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);

          // Update unread count if widget is closed
          if (!isOpen && newMessage.sender_type === 'staff') {
            setUnreadCount(prev => prev + 1);
          }

          scrollToBottom();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session?.conversationId, isOpen]);

  const initializeChatSession = async () => {
    try {
      // Get or create session ID
      let sessionId = localStorage.getItem('chat_session_id');
      if (!sessionId) {
        sessionId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('chat_session_id', sessionId);
      }

      // Initialize user in database
      const { data: user, error: userError } = await supabase
        .from('web_users')
        .upsert({
          session_id: sessionId,
          last_seen_at: new Date().toISOString()
        }, {
          onConflict: 'session_id'
        })
        .select()
        .single();

      if (userError) throw userError;

      // Get or create conversation
      let conversation;
      const { data: existingConv } = await supabase
        .from('web_conversations')
        .select('*')
        .eq('web_user_id', user.id)
        .eq('is_active', true)
        .single();

      if (existingConv) {
        conversation = existingConv;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('web_conversations')
          .insert({
            web_user_id: user.id,
            last_message_at: new Date().toISOString()
          })
          .select()
          .single();

        if (convError) throw convError;
        conversation = newConv;
      }

      setSession({
        sessionId,
        conversationId: conversation.id,
        isActive: true
      });

      // Load message history
      await loadMessages(conversation.id);
      setIsConnected(true);

    } catch (error) {
      console.error('Error initializing chat session:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('web_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      setMessages(data || []);
      scrollToBottom();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !session?.conversationId) return;

    try {
      const { error } = await supabase
        .from('web_messages')
        .insert({
          web_user_id: session.sessionId,
          conversation_id: session.conversationId,
          message_text: newMessage.trim(),
          sender_type: 'user',
          message_type: 'text'
        });

      if (error) throw error;

      // Update conversation last message
      await supabase
        .from('web_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: newMessage.trim(),
          last_message_by: 'user'
        })
        .eq('id', session.conversationId);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0);
    setTimeout(scrollToBottom, 100);
  };

  return (
    <>
      {/* Chat Widget Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 z-50"
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 h-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col z-50 md:w-96 md:h-[500px]">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-semibold">Customer Support</h3>
              <p className="text-xs opacity-90">
                {isConnected ? 'Online' : 'Connecting...'}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-700 rounded p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Welcome! How can we help you today?</p>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender_type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.sender_type === 'staff' && message.sender_name && (
                    <p className="text-xs font-semibold mb-1">{message.sender_name}</p>
                  )}

                  {message.file_url ? (
                    <div>
                      <img
                        src={message.file_url}
                        alt={message.file_name}
                        className="max-w-full rounded mb-2"
                      />
                      {message.message_text && <p>{message.message_text}</p>}
                    </div>
                  ) : (
                    <p>{message.message_text}</p>
                  )}

                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                  <p className="text-sm">Staff is typing...</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={!isConnected}
              />
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || !isConnected}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg px-3 py-2 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

#### 1.4 Integration in Main Layout

```typescript
// app/layout.tsx or components/Layout.tsx
import ChatWidget from '@/components/chat/ChatWidget';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
```

#### 1.5 API Routes for Web Chat

```typescript
// app/api/chat/messages/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { conversationId, message, sessionId } = await request.json();

    // Insert message
    const { data, error } = await supabase
      .from('web_messages')
      .insert({
        web_user_id: sessionId,
        conversation_id: conversationId,
        message_text: message,
        sender_type: 'user',
        message_type: 'text'
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation
    await supabase
      .from('web_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        last_message_text: message,
        last_message_by: 'user'
      })
      .eq('id', conversationId);

    return NextResponse.json({ success: true, message: data });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// app/api/chat/conversations/route.ts
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { sessionId, customerInfo } = await request.json();

    // Create or get user
    const { data: user, error: userError } = await supabase
      .from('web_users')
      .upsert({
        session_id: sessionId,
        display_name: customerInfo?.name,
        email: customerInfo?.email,
        phone: customerInfo?.phone,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'session_id' })
      .select()
      .single();

    if (userError) throw userError;

    // Create conversation
    const { data: conversation, error: convError } = await supabase
      .from('web_conversations')
      .insert({
        web_user_id: user.id,
        customer_id: customerInfo?.customerId,
        last_message_at: new Date().toISOString()
      })
      .select()
      .single();

    if (convError) throw convError;

    return NextResponse.json({
      success: true,
      conversation,
      user
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
```

### Phase 2: Staff Panel - Enhanced Interface

#### 2.1 Enhanced Staff Chat Interface

The existing staff interface (`/staff/line-chat`) needs to be enhanced to support both LINE and web chat conversations.

```typescript
// src/components/admin/line-chat/UnifiedChatInterface.tsx
'use client';

import { useState, useEffect } from 'react';
import { ConversationList } from './ConversationList';
import { ChatWindow } from './ChatWindow';
import { useUnifiedConversations } from '@/hooks/useUnifiedConversations';

interface UnifiedConversation {
  id: string;
  channel_type: 'line' | 'web';
  user_id: string;
  display_name: string;
  picture_url?: string;
  customer_id?: string;
  last_message_at: string;
  last_message_text: string;
  last_message_by: string;
  unread_count: number;
  is_active: boolean;
  assigned_to?: string;
}

export default function UnifiedChatInterface() {
  const [selectedConversation, setSelectedConversation] = useState<UnifiedConversation | null>(null);
  const [filter, setFilter] = useState<'all' | 'line' | 'web'>('all');

  const { conversations, loading, error, refreshConversations } = useUnifiedConversations(filter);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Conversation List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header with Channel Filter */}
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Customer Conversations
          </h2>

          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              onClick={() => setFilter('line')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'line'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              LINE ({conversations.filter(c => c.channel_type === 'line').length})
            </button>
            <button
              onClick={() => setFilter('web')}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === 'web'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Web Chat ({conversations.filter(c => c.channel_type === 'web').length})
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading conversations...</div>
          ) : error ? (
            <div className="p-4 text-center text-red-500">Error loading conversations</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations found</div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={`${conversation.channel_type}-${conversation.id}`}
                conversation={conversation}
                isSelected={selectedConversation?.id === conversation.id}
                onClick={() => setSelectedConversation(conversation)}
              />
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <ChatWindow
            conversation={selectedConversation}
            onConversationUpdate={refreshConversations}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Conversation Item Component with Channel Indicators
function ConversationItem({
  conversation,
  isSelected,
  onClick
}: {
  conversation: UnifiedConversation;
  isSelected: boolean;
  onClick: () => void;
}) {
  const getChannelIcon = () => {
    switch (conversation.channel_type) {
      case 'line':
        return <div className="w-3 h-3 bg-green-500 rounded-full" />;
      case 'web':
        return <div className="w-3 h-3 bg-purple-500 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getChannelLabel = () => {
    switch (conversation.channel_type) {
      case 'line':
        return 'LINE';
      case 'web':
        return 'Web Chat';
      default:
        return 'Unknown';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Profile Image or Fallback */}
        <div className="flex-shrink-0">
          {conversation.picture_url ? (
            <img
              src={conversation.picture_url}
              alt={conversation.display_name}
              className="w-10 h-10 rounded-full"
            />
          ) : (
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {conversation.display_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {conversation.display_name || 'Anonymous User'}
            </h3>
            <div className="flex items-center space-x-2">
              {getChannelIcon()}
              <span className="text-xs text-gray-500">{getChannelLabel()}</span>
            </div>
          </div>

          <p className="text-sm text-gray-600 truncate mb-1">
            {conversation.last_message_text || 'No messages yet'}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {new Date(conversation.last_message_at).toLocaleTimeString()}
            </span>
            {conversation.unread_count > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                {conversation.unread_count}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 2.2 Unified Conversations Hook

```typescript
// src/hooks/useUnifiedConversations.ts
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function useUnifiedConversations(filter: 'all' | 'line' | 'web' = 'all') {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('unified_conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('channel_type', filter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setConversations(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refreshConversations = () => {
    fetchConversations();
  };

  useEffect(() => {
    fetchConversations();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('unified-conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'line_conversations'
      }, refreshConversations)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'web_conversations'
      }, refreshConversations)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  return {
    conversations,
    loading,
    error,
    refreshConversations
  };
}
```

#### 2.3 Enhanced API Endpoints

```typescript
// app/api/chat/staff/conversations/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel') || 'all';

    let query = supabase
      .from('unified_conversations')
      .select(`
        *,
        customer:customer_id(
          id,
          name,
          phone,
          email
        )
      `)
      .order('last_message_at', { ascending: false });

    if (channel !== 'all') {
      query = query.eq('channel_type', channel);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      conversations: data
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// app/api/chat/staff/send-message/route.ts
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const {
      conversationId,
      channelType,
      message,
      staffName,
      templateId
    } = await request.json();

    let messageData;

    if (channelType === 'web') {
      // Send web chat message
      const { data, error } = await supabase
        .from('web_messages')
        .insert({
          conversation_id: conversationId,
          message_text: message,
          sender_type: 'staff',
          sender_name: staffName,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) throw error;
      messageData = data;

      // Update conversation
      await supabase
        .from('web_conversations')
        .update({
          last_message_at: new Date().toISOString(),
          last_message_text: message,
          last_message_by: 'staff'
        })
        .eq('id', conversationId);

    } else if (channelType === 'line') {
      // Use existing LINE message sending logic
      // This would integrate with your existing LINE API endpoints
      const response = await fetch('/api/line/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: request.user_id, // from conversation data
          message: message
        })
      });

      if (!response.ok) throw new Error('Failed to send LINE message');
      messageData = await response.json();
    }

    return NextResponse.json({
      success: true,
      message: messageData
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
```

### Phase 3: Advanced Features

#### 3.1 Customer Information Integration

```typescript
// src/components/chat/CustomerInfoPanel.tsx
interface CustomerInfo {
  id?: string;
  name?: string;
  phone?: string;
  email?: string;
  totalBookings?: number;
  lastBooking?: {
    date: string;
    time: string;
    bay: string;
  };
}

export function CustomerInfoPanel({
  conversation,
  onLinkCustomer
}: {
  conversation: UnifiedConversation;
  onLinkCustomer: (customerId: string) => void;
}) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Load customer information
  useEffect(() => {
    if (conversation.customer_id) {
      loadCustomerInfo(conversation.customer_id);
    }
  }, [conversation.customer_id]);

  const loadCustomerInfo = async (customerId: string) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/details`);
      if (response.ok) {
        const data = await response.json();
        setCustomerInfo(data.customer);
      }
    } catch (error) {
      console.error('Error loading customer info:', error);
    }
  };

  return (
    <div className="bg-white border-l border-gray-200 w-80 p-4">
      <h3 className="text-lg font-semibold mb-4">Customer Information</h3>

      {customerInfo ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Name</label>
            <p className="text-gray-900">{customerInfo.name}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Contact</label>
            <p className="text-gray-900">{customerInfo.phone}</p>
            <p className="text-gray-600 text-sm">{customerInfo.email}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-500">Booking History</label>
            <p className="text-gray-900">{customerInfo.totalBookings} total bookings</p>
            {customerInfo.lastBooking && (
              <p className="text-gray-600 text-sm">
                Last: {customerInfo.lastBooking.date} at {customerInfo.lastBooking.time}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-500 mb-4">No customer linked</p>
          <button
            onClick={() => setIsLinking(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            Link Customer
          </button>
        </div>
      )}

      {isLinking && (
        <CustomerLinkModal
          conversation={conversation}
          onLink={(customerId) => {
            onLinkCustomer(customerId);
            setIsLinking(false);
          }}
          onClose={() => setIsLinking(false)}
        />
      )}
    </div>
  );
}
```

#### 3.2 Template System Integration

The existing LINE template system can be extended to work with web chat:

```typescript
// src/components/chat/TemplateSelector.tsx
export function TemplateSelector({
  onSelectTemplate,
  channelType
}: {
  onSelectTemplate: (template: MessageTemplate) => void;
  channelType: 'line' | 'web';
}) {
  const [templates, setTemplates] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Load templates compatible with channel type
  useEffect(() => {
    loadTemplates();
  }, [channelType, selectedCategory]);

  const loadTemplates = async () => {
    try {
      const response = await fetch(
        `/api/templates?channel=${channelType}&category=${selectedCategory}`
      );
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  return (
    <div className="bg-white border rounded-lg shadow-lg p-4 max-w-md">
      <h3 className="text-lg font-semibold mb-4">Message Templates</h3>

      {/* Category Filter */}
      <div className="flex space-x-2 mb-4">
        {['all', 'greeting', 'booking', 'info', 'support'].map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-3 py-1 rounded-full text-sm capitalize ${
              selectedCategory === category
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Template List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <h4 className="font-medium text-gray-900">{template.title}</h4>
            <p className="text-sm text-gray-600 truncate">{template.content}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

#### 3.3 Real-time Typing Indicators

```typescript
// src/hooks/useTypingIndicator.ts
export function useTypingIndicator(conversationId: string, userType: 'staff' | 'customer') {
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const supabase = createClientComponentClient();

  const startTyping = () => {
    setIsTyping(true);

    // Broadcast typing event
    supabase
      .channel(`typing-${conversationId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_type: userType,
          is_typing: true,
          timestamp: Date.now()
        }
      });
  };

  const stopTyping = () => {
    setIsTyping(false);

    // Broadcast stop typing event
    supabase
      .channel(`typing-${conversationId}`)
      .send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          user_type: userType,
          is_typing: false,
          timestamp: Date.now()
        }
      });
  };

  // Subscribe to typing events
  useEffect(() => {
    const channel = supabase
      .channel(`typing-${conversationId}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { user_type, is_typing } = payload.payload;

        if (user_type !== userType) {
          if (is_typing) {
            setTypingUsers(prev => [...prev.filter(u => u !== user_type), user_type]);
          } else {
            setTypingUsers(prev => prev.filter(u => u !== user_type));
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userType]);

  return {
    isTyping,
    typingUsers,
    startTyping,
    stopTyping
  };
}
```

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up database schema for web chat
- [ ] Create basic chat widget component
- [ ] Implement session management
- [ ] Set up real-time messaging with Supabase

### Week 2: Core Features
- [ ] Complete chat widget UI/UX
- [ ] Implement message sending/receiving
- [ ] Add file upload support
- [ ] Create API endpoints for web chat

### Week 3: Staff Integration
- [ ] Enhance staff interface for unified chat
- [ ] Implement conversation filtering (LINE/Web)
- [ ] Add customer linking functionality
- [ ] Integrate template system

### Week 4: Advanced Features
- [ ] Add typing indicators
- [ ] Implement customer information panel
- [ ] Add mobile responsive improvements
- [ ] Performance optimization

### Week 5: Testing & Polish
- [ ] End-to-end testing
- [ ] Performance testing
- [ ] UI/UX refinements
- [ ] Documentation updates

## Technical Considerations

### Performance Optimization

1. **Message Pagination**: Load messages in chunks to avoid performance issues
2. **Image Optimization**: Extend existing image caching system to web chat
3. **Connection Management**: Implement reconnection logic for WebSocket connections
4. **Database Indexing**: Add proper indexes for unified conversation queries

### Security Measures

1. **Rate Limiting**: Prevent spam messages from web chat users
2. **Input Validation**: Sanitize all user inputs before database storage
3. **Session Security**: Implement secure session management for web chat users
4. **File Upload Security**: Validate file types and sizes for uploads

### Scalability Considerations

1. **Connection Limits**: Monitor Supabase real-time connection limits
2. **Database Performance**: Optimize queries for unified conversation views
3. **Caching Strategy**: Implement Redis caching for frequently accessed data
4. **Load Balancing**: Consider CDN for static assets and file uploads

## Integration with Existing Systems

### Customer Management Integration

The web chat system integrates seamlessly with your existing customer management:

- **Customer Linking**: Staff can link web chat users to existing customer records
- **Booking Integration**: Direct access to customer booking history from chat
- **Profile Information**: Display customer packages and preferences in chat

### Template System Compatibility

Your existing LINE template system can be extended:

- **Shared Templates**: Use same templates for both LINE and web chat
- **Channel-Specific Templates**: Create templates specific to web chat
- **Variable Substitution**: Maintain existing `{{customer_name}}` functionality

### API Consistency

New web chat APIs follow your existing patterns:

- **Authentication**: Same staff-level access requirements
- **Error Handling**: Consistent error response format
- **Rate Limiting**: Same rate limiting policies

## Mobile Optimization

### Responsive Design

The chat widget is designed mobile-first:

- **Touch-Friendly**: Large touch targets for mobile interaction
- **Adaptive Layout**: Adjusts to screen size (320px to 1920px+)
- **Keyboard Handling**: Proper mobile keyboard behavior
- **Performance**: Optimized for mobile data connections

### iOS/Android Considerations

- **Safari Compatibility**: Handles iOS Safari's unique viewport behavior
- **Android WebView**: Compatible with Android app WebViews
- **Push Notifications**: Ready for future web push notification integration

## Monitoring and Analytics

### Key Metrics to Track

1. **Engagement Metrics**:
   - Chat widget open rate
   - Message response time
   - Customer satisfaction scores
   - Conversation duration

2. **Performance Metrics**:
   - Message delivery time
   - Connection stability
   - Error rates
   - Page load impact

3. **Business Metrics**:
   - Lead conversion from chat
   - Support ticket reduction
   - Customer retention impact

### Implementation

```typescript
// src/utils/chatAnalytics.ts
export class ChatAnalytics {
  static trackWidgetOpen() {
    // Track when customers open the chat widget
    this.trackEvent('chat_widget_opened');
  }

  static trackMessageSent(channelType: 'web' | 'line', senderType: 'customer' | 'staff') {
    // Track message volume by channel and sender
    this.trackEvent('message_sent', {
      channel_type: channelType,
      sender_type: senderType,
      timestamp: new Date().toISOString()
    });
  }

  static trackResponseTime(responseTimeMs: number) {
    // Track staff response times
    this.trackMetric('staff_response_time', responseTimeMs);
  }

  private static trackEvent(event: string, properties?: any) {
    // Integrate with your analytics service
    // Example: Google Analytics, Mixpanel, or custom analytics
  }

  private static trackMetric(metric: string, value: number) {
    // Track numerical metrics
  }
}
```

## Best Practices Summary

### Development Best Practices

1. **Code Organization**: Follow existing project structure and conventions
2. **TypeScript**: Maintain strict typing throughout the implementation
3. **Error Handling**: Implement comprehensive error handling and logging
4. **Testing**: Write unit tests for core chat functionality
5. **Documentation**: Keep inline documentation for complex chat logic

### UX Best Practices

1. **Progressive Enhancement**: Ensure basic functionality without JavaScript
2. **Accessibility**: Implement ARIA labels and keyboard navigation
3. **Loading States**: Provide clear feedback for all user actions
4. **Offline Handling**: Graceful degradation when connection is lost

### Performance Best Practices

1. **Lazy Loading**: Load chat widget only when needed
2. **Bundle Optimization**: Keep chat widget bundle size minimal
3. **Memory Management**: Properly clean up WebSocket connections
4. **Caching**: Leverage existing image caching for chat media

## Conclusion

This implementation plan provides a comprehensive approach to adding customer web chat capabilities while leveraging your existing LINE chat infrastructure. The unified architecture ensures consistency in staff experience while providing customers with modern, responsive chat functionality.

The phased approach allows for iterative development and testing, ensuring a stable rollout. The integration with existing systems (customer management, templates, real-time infrastructure) minimizes development overhead while maximizing feature compatibility.

Key advantages of this approach:

1. **Unified Staff Experience**: Single interface for all customer conversations
2. **Leveraged Infrastructure**: Builds on existing Supabase and LINE systems
3. **Modern UX**: Implements 2025 best practices for web chat
4. **Scalable Architecture**: Ready for future channel additions (WhatsApp, Facebook, etc.)
5. **Performance Optimized**: Uses proven real-time messaging architecture

The implementation timeline of 5 weeks provides adequate time for development, testing, and refinement while ensuring high-quality delivery.