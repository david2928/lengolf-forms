# Unified Chat System Development Guide

**Complete Developer Implementation Guide for Multi-Channel Chat**
*Last Updated: September 2025*

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ and npm
- Supabase account and project
- LINE Developer account (for LINE integration)
- Basic understanding of Next.js, TypeScript, and React

### Environment Setup

#### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd lengolf-forms
npm install
```

#### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Add required environment variables
echo "SKIP_AUTH=true" >> .env.local  # Development authentication bypass
```

#### 3. Required Environment Variables
```env
# Supabase Configuration
NEXT_PUBLIC_REFAC_SUPABASE_URL=your_supabase_url
REFAC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LINE Integration
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Authentication (Production)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Development Features
SKIP_AUTH=true  # Bypass authentication for development
```

#### 4. Start Development Server
```bash
npm run dev
# Access at: http://localhost:3000/staff/unified-chat
```

## 🏗️ Project Structure

### Core Unified Chat Files
```
app/staff/unified-chat/           # Main unified chat interface
├── page.tsx                     # Primary chat page component
├── components/                  # Shared chat components
│   ├── ConversationSidebar.tsx  # Conversation list management
│   ├── ChatArea.tsx            # Message display and input
│   ├── CustomerSidebar.tsx     # Customer information panel
│   └── MessageInput.tsx        # Message composition
├── hooks/                      # Business logic hooks
│   ├── useUnifiedChat.ts       # Main conversation management
│   ├── useChatOperations.ts    # Message operations
│   ├── useCustomerData.ts      # Customer data management
│   └── usePanelState.ts        # UI state management
└── utils/                      # Utilities and types
    ├── chatTypes.ts            # TypeScript definitions
    └── formatters.ts           # Data formatting

src/hooks/                      # Shared application hooks
├── useRealtimeMessages.ts      # Real-time message subscriptions
└── useRealtimeConversations.ts # Real-time conversation updates

app/api/                        # Backend API endpoints
├── conversations/              # Unified conversation APIs
├── line/                      # LINE-specific endpoints
└── unified/                   # Cross-channel operations
```

### Component Hierarchy
```
UnifiedChatPage                 # Main container
├── ConversationSidebar        # Left panel
│   └── ConversationItem       # Individual conversation
├── ChatArea                   # Center panel
│   ├── ChatHeader            # Conversation header
│   ├── MessageList           # Message display
│   │   └── MessageBubble     # Individual message
│   └── MessageInput          # Message composition
│       ├── FileUpload        # File attachment
│       └── TemplateSelector  # Message templates
└── CustomerSidebar           # Right panel
    ├── CustomerDetails       # Customer information
    ├── BookingsList         # Customer bookings
    └── PackagesList         # Customer packages
```

## 🔧 Implementation Patterns

### 1. Creating a New Component

#### Component Template
```typescript
// components/ExampleComponent.tsx
'use client';

import { useState, useCallback } from 'react';
import type { ComponentProps } from '../utils/chatTypes';

interface ExampleComponentProps {
  data: any;
  onAction: (id: string) => void;
  className?: string;
}

export const ExampleComponent: React.FC<ExampleComponentProps> = ({
  data,
  onAction,
  className = ''
}) => {
  const [loading, setLoading] = useState(false);

  const handleAction = useCallback(async (id: string) => {
    setLoading(true);
    try {
      await onAction(id);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setLoading(false);
    }
  }, [onAction]);

  return (
    <div className={`component-container ${className}`}>
      {/* Component content */}
    </div>
  );
};
```

#### Adding to Type Definitions
```typescript
// utils/chatTypes.ts
export interface ExampleComponentProps {
  data: any;
  onAction: (id: string) => void;
  className?: string;
}
```

### 2. Creating Custom Hooks

#### Hook Template
```typescript
// hooks/useExampleHook.ts
import { useState, useEffect, useCallback } from 'react';

interface UseExampleHookOptions {
  option1: string;
  option2?: boolean;
}

interface UseExampleHookReturn {
  data: any[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  performAction: (id: string) => Promise<void>;
}

export const useExampleHook = (options: UseExampleHookOptions): UseExampleHookReturn => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/example');
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const performAction = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/example/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Action failed');

      await fetchData(); // Refresh data
    } catch (err) {
      console.error('Action failed:', err);
      throw err;
    }
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    performAction
  };
};
```

### 3. Adding New API Endpoints

#### API Route Template
```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { refacSupabase } from '@/lib/refac-supabase';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Database operation
    const { data, error } = await refacSupabase
      .from('example_table')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate input
    if (!body.required_field) {
      return NextResponse.json(
        { success: false, error: 'Missing required field' },
        { status: 400 }
      );
    }

    // Database operation
    const { data, error } = await refacSupabase
      .from('example_table')
      .insert({
        ...body,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

## 🔄 Real-time Implementation

### 1. Setting Up Real-time Subscriptions

#### Basic Real-time Hook
```typescript
// hooks/useRealtime.ts
import { useEffect, useCallback, useRef } from 'react';
import { refacSupabase } from '@/lib/refac-supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onEvent: (payload: any) => void;
  enabled?: boolean;
}

export const useRealtime = ({
  table,
  event,
  filter,
  onEvent,
  enabled = true
}: UseRealtimeOptions) => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  const subscribe = useCallback(() => {
    if (!enabled || !refacSupabase) return;

    const channel = refacSupabase.channel(`realtime-${table}-${Date.now()}`);

    const config = {
      event,
      schema: 'public',
      table,
      ...(filter && { filter })
    };

    channel
      .on('postgres_changes', config, onEvent)
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
      });

    channelRef.current = channel;
  }, [table, event, filter, onEvent, enabled]);

  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      refacSupabase?.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, [subscribe, unsubscribe]);

  return { subscribe, unsubscribe };
};
```

#### Multi-Channel Real-time Implementation
```typescript
// Enhanced real-time for multiple tables
export const useMultiTableRealtime = (subscriptions: UseRealtimeOptions[]) => {
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const subscribeAll = useCallback(() => {
    subscriptions.forEach((subscription, index) => {
      const channel = refacSupabase?.channel(`multi-${index}-${Date.now()}`);

      if (channel) {
        channel
          .on('postgres_changes', {
            event: subscription.event,
            schema: 'public',
            table: subscription.table,
            ...(subscription.filter && { filter: subscription.filter })
          }, subscription.onEvent)
          .subscribe();

        channelsRef.current.push(channel);
      }
    });
  }, [subscriptions]);

  const unsubscribeAll = useCallback(() => {
    channelsRef.current.forEach(channel => {
      refacSupabase?.removeChannel(channel);
    });
    channelsRef.current = [];
  }, []);

  useEffect(() => {
    subscribeAll();
    return unsubscribeAll;
  }, [subscribeAll, unsubscribeAll]);
};
```

### 2. Message Broadcasting Implementation

#### Real-time Message Delivery
```typescript
// utils/messageDelivery.ts
import { refacSupabase } from '@/lib/refac-supabase';

export const broadcastMessage = async (
  channelType: 'line' | 'website',
  conversationId: string,
  message: any
) => {
  if (!refacSupabase) return;

  const channel = refacSupabase.channel(`conversation-${conversationId}`);

  await channel.send({
    type: 'broadcast',
    event: 'new_message',
    payload: {
      channel_type: channelType,
      conversation_id: conversationId,
      message
    }
  });
};

export const subscribeToConversation = (
  conversationId: string,
  onMessage: (message: any) => void
) => {
  if (!refacSupabase) return null;

  const channel = refacSupabase.channel(`conversation-${conversationId}`);

  channel
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      onMessage(payload.message);
    })
    .subscribe();

  return channel;
};
```

## 🔀 State Management Patterns

### 1. Component State Organization

#### State Management Best Practices
```typescript
// Organized state management example
const UnifiedChatPage = () => {
  // 1. Core conversation state
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // 2. UI state
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileCustomer, setShowMobileCustomer] = useState(false);

  // 3. Modal state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  // 4. Business logic hooks
  const {
    conversations,
    loading,
    updateConversationUnreadCount
  } = useUnifiedChat();

  const chatOps = useChatOperations(selectedConversation, handleMessageSent);
  const customerOps = useCustomerData(selectedConversation);

  // 5. Event handlers
  const handleConversationSelect = useCallback((conversationId: string) => {
    setSelectedConversation(conversationId);
    setMessages([]); // Clear previous messages
  }, []);

  const handleMessageSent = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
    // Update conversation list
    updateConversationUnreadCount(message.conversationId, 0);
  }, [updateConversationUnreadCount]);

  // Component render...
};
```

### 2. Global State Management

#### Context Provider Pattern
```typescript
// contexts/ChatContext.tsx
interface ChatContextType {
  selectedConversation: string | null;
  setSelectedConversation: (id: string | null) => void;
  conversations: Conversation[];
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const updateConversation = useCallback((id: string, updates: Partial<Conversation>) => {
    setConversations(prev =>
      prev.map(conv => conv.id === id ? { ...conv, ...updates } : conv)
    );
  }, []);

  const value = {
    selectedConversation,
    setSelectedConversation,
    conversations,
    updateConversation
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};
```

## 🧪 Testing Strategies

### 1. Component Testing

#### Test Template
```typescript
// components/__tests__/ExampleComponent.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExampleComponent } from '../ExampleComponent';

// Mock dependencies
jest.mock('@/lib/refac-supabase', () => ({
  refacSupabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

describe('ExampleComponent', () => {
  const mockProps = {
    data: [{ id: '1', name: 'Test Item' }],
    onAction: jest.fn(),
    className: 'test-class'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ExampleComponent {...mockProps} />);
    expect(screen.getByText('Test Item')).toBeInTheDocument();
  });

  it('handles action correctly', async () => {
    render(<ExampleComponent {...mockProps} />);

    const actionButton = screen.getByRole('button', { name: /action/i });
    fireEvent.click(actionButton);

    await waitFor(() => {
      expect(mockProps.onAction).toHaveBeenCalledWith('1');
    });
  });

  it('shows loading state', () => {
    render(<ExampleComponent {...mockProps} />);
    // Test loading state behavior
  });
});
```

### 2. Hook Testing

#### Hook Test Template
```typescript
// hooks/__tests__/useExampleHook.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExampleHook } from '../useExampleHook';

// Mock fetch
global.fetch = jest.fn();

describe('useExampleHook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: [] })
    });
  });

  it('fetches data on mount', async () => {
    const { result } = renderHook(() =>
      useExampleHook({ option1: 'test' })
    );

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('performs action correctly', async () => {
    const { result } = renderHook(() =>
      useExampleHook({ option1: 'test' })
    );

    await act(async () => {
      await result.current.performAction('test-id');
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/example/test-id/action',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
```

### 3. Integration Testing

#### Full Flow Testing
```typescript
// __tests__/integration/chat-flow.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UnifiedChatPage } from '@/app/staff/unified-chat/page';

// Mock all dependencies
jest.mock('@/hooks/useRealtimeMessages');
jest.mock('@/hooks/useUnifiedChat');

describe('Chat Integration', () => {
  it('complete message flow works', async () => {
    // Mock hook returns
    (useUnifiedChat as jest.Mock).mockReturnValue({
      conversations: [
        { id: 'conv1', channelType: 'line', lastMessageText: 'Hello' }
      ],
      loading: false
    });

    render(<UnifiedChatPage />);

    // Select conversation
    const conversation = screen.getByText('Hello');
    fireEvent.click(conversation);

    // Send message
    const messageInput = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(messageInput, { target: { value: 'Test message' } });

    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);

    // Verify message appears
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });
});
```

## 🚀 Deployment Guide

### 1. Development Deployment

#### Local Development
```bash
# Development server with authentication bypass
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Testing
npm test
```

#### Environment Validation
```typescript
// utils/env-validation.ts
export const validateEnvironment = () => {
  const required = [
    'NEXT_PUBLIC_REFAC_SUPABASE_URL',
    'REFAC_SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};
```

### 2. Production Deployment

#### Pre-deployment Checklist
```bash
# 1. Remove development bypass
# Ensure SKIP_AUTH is not set in production

# 2. Build validation
npm run build

# 3. Type checking
npm run typecheck

# 4. Run tests
npm test

# 5. Environment validation
# Verify all production environment variables are set
```

#### Production Environment Variables
```env
# Production environment (remove SKIP_AUTH)
NEXT_PUBLIC_REFAC_SUPABASE_URL=your_production_supabase_url
REFAC_SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# LINE Production
LINE_CHANNEL_ACCESS_TOKEN=your_production_line_token
LINE_CHANNEL_SECRET=your_production_line_secret

# Authentication
GOOGLE_CLIENT_ID=your_production_google_client_id
GOOGLE_CLIENT_SECRET=your_production_google_client_secret
NEXTAUTH_SECRET=your_production_nextauth_secret
NEXTAUTH_URL=https://your-production-domain.com

# DO NOT SET SKIP_AUTH in production
```

### 3. Database Migration

#### Migration Script Template
```sql
-- migrations/add_new_feature.sql
-- Migration: Add new feature to unified chat
-- Date: 2025-09-23

BEGIN;

-- Add new column
ALTER TABLE unified_conversations
ADD COLUMN new_feature_flag BOOLEAN DEFAULT false;

-- Create index
CREATE INDEX idx_unified_conversations_new_feature
ON unified_conversations(new_feature_flag)
WHERE new_feature_flag = true;

-- Update existing data if needed
UPDATE unified_conversations
SET new_feature_flag = true
WHERE channel_type = 'line';

COMMIT;
```

#### Migration Execution
```bash
# Apply migration via Supabase CLI
supabase db push

# Or via SQL editor in Supabase Dashboard
```

## 🔧 Debugging & Troubleshooting

### 1. Common Issues

#### Real-time Connection Issues
```typescript
// Debug real-time connections
const debugRealtime = () => {
  if (!refacSupabase) {
    console.error('Supabase client not initialized');
    return;
  }

  const channel = refacSupabase.channel('debug-channel');

  channel
    .on('postgres_changes', { event: '*', schema: 'public', table: 'line_messages' },
      (payload) => console.log('Real-time event:', payload)
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Real-time connected successfully');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Real-time connection failed');
      }
    });
};
```

#### Authentication Debugging
```typescript
// Debug authentication issues
const debugAuth = async () => {
  try {
    const response = await fetch('/api/dev-token');
    const data = await response.json();
    console.log('Dev token:', data);

    // Test authenticated endpoint
    const testResponse = await fetch('/api/conversations', {
      headers: {
        'Authorization': `Bearer ${data.token}`
      }
    });
    console.log('Auth test:', testResponse.status);
  } catch (error) {
    console.error('Auth debug failed:', error);
  }
};
```

### 2. Performance Debugging

#### Component Performance
```typescript
// Performance monitoring component
const PerformanceMonitor: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'measure') {
          console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, []);

  return <>{children}</>;
};

// Usage in components
const ExampleComponent = () => {
  useEffect(() => {
    performance.mark('component-start');

    return () => {
      performance.mark('component-end');
      performance.measure('component-lifecycle', 'component-start', 'component-end');
    };
  }, []);

  // Component content...
};
```

#### Database Query Performance
```typescript
// Query performance monitoring
const monitorQuery = async (queryName: string, queryFn: () => Promise<any>) => {
  const start = Date.now();

  try {
    const result = await queryFn();
    const duration = Date.now() - start;

    console.log(`Query ${queryName} completed in ${duration}ms`);

    if (duration > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${duration}ms`);
    }

    return result;
  } catch (error) {
    console.error(`Query ${queryName} failed:`, error);
    throw error;
  }
};
```

### 3. Error Handling Patterns

#### Error Boundary Implementation
```typescript
// components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught error:', error, errorInfo);

    // Report to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // reportError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## 📈 Performance Optimization

### 1. React Optimization

#### Component Memoization
```typescript
// Optimize expensive components
const ConversationItem = React.memo<ConversationItemProps>(({
  conversation,
  isSelected,
  onClick
}) => {
  return (
    <div
      className={`conversation-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(conversation.id)}
    >
      {/* Component content */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.conversation.lastMessageAt === nextProps.conversation.lastMessageAt
  );
});

// Optimize callbacks
const handleConversationSelect = useCallback((conversationId: string) => {
  setSelectedConversation(conversationId);
}, []);

// Optimize computed values
const filteredConversations = useMemo(() =>
  conversations.filter(conv => conv.isActive),
  [conversations]
);
```

#### Virtual Scrolling for Large Lists
```typescript
// Virtual scrolling implementation
const VirtualConversationList: React.FC<{
  conversations: Conversation[];
  onSelect: (id: string) => void;
}> = ({ conversations, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startIndex, setStartIndex] = useState(0);

  const itemHeight = 80;
  const containerHeight = 600;
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount, conversations.length);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    const newStartIndex = Math.floor(scrollTop / itemHeight);
    setStartIndex(newStartIndex);
  }, [itemHeight]);

  return (
    <div
      ref={containerRef}
      className="virtual-list"
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: conversations.length * itemHeight, position: 'relative' }}>
        {conversations.slice(startIndex, endIndex).map((conversation, index) => (
          <div
            key={conversation.id}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%'
            }}
          >
            <ConversationItem
              conversation={conversation}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 2. Database Optimization

#### Query Optimization
```typescript
// Optimized conversation fetching
const fetchConversationsOptimized = async (limit: number = 50, offset: number = 0) => {
  const { data, error } = await refacSupabase
    .from('unified_conversations')
    .select(`
      id,
      channel_type,
      last_message_at,
      last_message_text,
      unread_count,
      channel_metadata
    `)
    .eq('is_active', true)
    .order('last_message_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data, error };
};

// Batch operations
const batchMarkAsRead = async (conversationIds: string[]) => {
  const updates = conversationIds.map(id => ({ id, unread_count: 0 }));

  const { error } = await refacSupabase
    .from('unified_conversations')
    .upsert(updates);

  return { error };
};
```

## 🔮 Extension Points

### 1. Adding New Channel Types

#### Channel Provider Interface
```typescript
// interfaces/ChannelProvider.ts
export interface ChannelProvider {
  type: string;
  name: string;

  // Core methods
  sendMessage: (conversationId: string, content: string, options?: any) => Promise<MessageResult>;
  fetchMessages: (conversationId: string, options?: FetchOptions) => Promise<Message[]>;
  markAsRead: (conversationId: string) => Promise<void>;

  // Optional methods
  subscribeToMessages?: (conversationId: string, callback: MessageCallback) => UnsubscribeFunction;
  sendTyping?: (conversationId: string, typing: boolean) => Promise<void>;
  uploadFile?: (conversationId: string, file: File) => Promise<MessageResult>;
}

// Example implementation
export class WhatsAppProvider implements ChannelProvider {
  type = 'whatsapp';
  name = 'WhatsApp Business';

  async sendMessage(conversationId: string, content: string): Promise<MessageResult> {
    // WhatsApp API implementation
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId, content })
    });

    return response.json();
  }

  async fetchMessages(conversationId: string): Promise<Message[]> {
    // WhatsApp message fetching
    const response = await fetch(`/api/whatsapp/messages/${conversationId}`);
    return response.json();
  }

  async markAsRead(conversationId: string): Promise<void> {
    // WhatsApp read receipt
    await fetch(`/api/whatsapp/read/${conversationId}`, { method: 'PUT' });
  }
}
```

### 2. Plugin System

#### Plugin Registration
```typescript
// plugins/PluginManager.ts
interface Plugin {
  name: string;
  version: string;
  init: (context: PluginContext) => void;
  cleanup?: () => void;
}

interface PluginContext {
  hooks: {
    onMessageSent: (callback: MessageCallback) => void;
    onConversationSelected: (callback: ConversationCallback) => void;
  };
  api: {
    sendMessage: (conversationId: string, content: string) => Promise<void>;
    getConversation: (id: string) => Conversation | null;
  };
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  register(plugin: Plugin) {
    this.plugins.set(plugin.name, plugin);
    plugin.init(this.context);
  }

  unregister(pluginName: string) {
    const plugin = this.plugins.get(pluginName);
    if (plugin?.cleanup) {
      plugin.cleanup();
    }
    this.plugins.delete(pluginName);
  }
}

// Example plugin
const AutoResponsePlugin: Plugin = {
  name: 'auto-response',
  version: '1.0.0',

  init(context) {
    context.hooks.onMessageSent((message) => {
      if (message.content.toLowerCase().includes('hello')) {
        setTimeout(() => {
          context.api.sendMessage(message.conversationId, 'Hello! How can I help you?');
        }, 1000);
      }
    });
  }
};
```

---

*This development guide provides comprehensive instructions for implementing and extending the Unified Chat System. For additional resources, see the [API Reference](./UNIFIED_CHAT_API_REFERENCE.md) and [Architecture Documentation](./UNIFIED_CHAT_ARCHITECTURE.md).*