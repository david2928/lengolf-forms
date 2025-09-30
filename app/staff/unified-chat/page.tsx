'use client';

// Unified Multi-Channel Chat System
// Supports LINE and Website conversations in a single interface
// Access at: http://localhost:3000/staff/unified-chat

import { useState, useEffect, useCallback, useRef } from 'react';
import { CustomerLinkModal } from '@/components/admin/line-chat/CustomerLinkModal';
import { CustomerConfirmationModal } from '@/components/admin/line-chat/CustomerConfirmationModal';
import { CuratedImageModal } from '@/components/line/CuratedImageModal';
import { TemplateSelector } from '@/components/line/TemplateSelector';
import { RefreshCw } from 'lucide-react';

// Import our new components and hooks
import { ConversationSidebar, ConversationSidebarRef } from '../line-chat/components/ConversationSidebar';
import { ChatArea } from '../line-chat/components/ChatArea';
import { CustomerSidebar } from '../line-chat/components/CustomerSidebar';
import { usePanelState } from '../line-chat/hooks/usePanelState';
import { useChatOperations } from '../line-chat/hooks/useChatOperations';
import { useCustomerData } from '../line-chat/hooks/useCustomerData';
import { useUnifiedChat } from '../line-chat/hooks/useUnifiedChat';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import { useRealtimeConversations } from '@/hooks/useRealtimeConversations';
import { supabaseRealtime } from '@/lib/supabase-realtime';

export default function UnifiedChatPage() {
  // Core state - using unified chat system
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const selectedConversationRef = useRef<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileCustomer, setShowMobileCustomer] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Ref for ConversationSidebar to control scrolling
  const conversationSidebarRef = useRef<ConversationSidebarRef>(null);

  // Use unified chat hook for multi-channel conversations
  const {
    conversations,
    setConversations,
    loading,
    refreshConversations,
    getConversationById,
    updateConversationLastMessage,
    updateConversationUnreadCount,
    markAsUnread,
    toggleFollowUp
  } = useUnifiedChat();

  // Set up realtime conversation updates
  useRealtimeConversations({
    onConversationUpdate: (conversationUpdate) => {
      // Update existing conversation in the list and re-sort by lastMessageAt
      console.log('🔄 Conversation update received:', conversationUpdate);

      setConversations(prev => {
        const updated = prev.map(conv =>
          conv.id === conversationUpdate.id
            ? { ...conv, ...conversationUpdate }
            : conv
        );

        // Re-sort conversations by lastMessageAt (most recent first)
        const sorted = updated.sort((a, b) => {
          const aTime = new Date(a.lastMessageAt || 0).getTime();
          const bTime = new Date(b.lastMessageAt || 0).getTime();
          return bTime - aTime; // Descending order (newest first)
        });

        console.log('🔄 Conversations after sort:', sorted.map(c => ({
          id: c.id.slice(-8),
          lastMessageAt: c.lastMessageAt,
          lastMessageText: c.lastMessageText?.slice(0, 20)
        })));

        return sorted;
      });
    },
    onNewConversation: () => {
      // Refresh the entire conversation list when a new conversation is created
      console.log('🔔 New conversation detected - refreshing list');
      refreshConversations();
    }
  });

  // Memoize the callback to prevent infinite re-renders
  const handleMarkConversationRead = useCallback((conversationId: string) => {
    updateConversationUnreadCount(conversationId, 0);
  }, [updateConversationUnreadCount]);

  // Get the full conversation object for the selected conversation
  const selectedConversationObj = selectedConversation ? getConversationById(selectedConversation) : null;

  // Modal states - keeping existing modal logic for now
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedCustomerForLink, setSelectedCustomerForLink] = useState<any>(null);
  const [showCuratedImages, setShowCuratedImages] = useState(false);

  // AI suggestions toggle
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Additional modal states from original component
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showMobileQuickActions, setShowMobileQuickActions] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);

  // Extract panel state to custom hook - reduces useState count
  const {
    leftPanelCollapsed,
    rightPanelCollapsed,
    togglePanel,
    setLeftPanelCollapsed,
    setRightPanelCollapsed
  } = usePanelState();

  // Handle when a message is sent - only update conversations list, let realtime handle message addition
  const handleMessageSent = useCallback((message: any) => {
    // Don't add message to messages array - let realtime handle that
    // Only update the conversations list for immediate UI feedback and sort
    setConversations(prev => {
      const updated = prev.map(conv => {
        if (conv.id === message.conversationId) {
          return {
            ...conv,
            lastMessageAt: message.createdAt,
            lastMessageText: message.text || (message.type === 'image' ? '📷 Image' : message.type),
            lastMessageBy: message.senderType,
            lastMessageType: message.type
          };
        }
        return conv;
      });

      // Sort immediately after updating to move the conversation to the top
      return updated.sort((a, b) => {
        const aTime = new Date(a.lastMessageAt || 0).getTime();
        const bTime = new Date(b.lastMessageAt || 0).getTime();
        return bTime - aTime; // Descending order (newest first)
      });
    });
  }, [setConversations]);

  // Extract complex operations to custom hooks - major complexity reduction
  const chatOps = useChatOperations(selectedConversation, handleMessageSent, selectedConversationObj);
  const customerOps = useCustomerData(selectedConversation, selectedConversationObj);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Message state needs to be managed at this level for realtime to work
  const [messages, setMessages] = useState<any[]>([]);

  // Handle new messages from realtime - updated for unified system
  const handleNewMessage = useCallback((message: any) => {
    console.log('[Unified Chat] 📬 handleNewMessage called:', {
      messageId: message.id,
      conversationId: message.conversationId,
      currentSelectedConversation: selectedConversationRef.current,
      messageText: message.text?.substring(0, 50),
      type: message.type,
      senderType: message.senderType
    });

    const currentSelectedConversation = selectedConversationRef.current;

    // Add message to the messages list ONLY if it's for the currently selected conversation
    if (currentSelectedConversation === message.conversationId) {
      console.log('[Unified Chat] ✅ Message is for current conversation - adding to UI');
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find((m: any) => m.id === message.id)) {
          console.log('[Unified Chat] ⏭️  Message already exists in UI, skipping');
          return prev;
        }
        console.log('[Unified Chat] ➕ Adding message to UI, new count:', prev.length + 1);
        return [...prev, message];
      });

      // Auto-scroll to bottom for new realtime messages
      setTimeout(() => {
        const messagesEnd = document.querySelector('[data-messages-end]');
        messagesEnd?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      console.log('[Unified Chat] ⏭️  Message is for different conversation, not adding to UI', {
        messageConversationId: message.conversationId,
        currentConversationId: currentSelectedConversation
      });
    }

    // Determine channel type from the selected conversation or message context
    const selectedConv = selectedConversation ? getConversationById(selectedConversation) : null;
    const channelType = selectedConv?.channelType || 'line'; // Default to LINE if unknown

    // Use unified conversation update function (this already handles sorting internally)
    updateConversationLastMessage(message.conversationId, {
      id: message.id,
      channel_type: channelType,
      conversation_id: message.conversationId,
      channel_user_id: message.lineUserId || message.sessionId,
      content: message.text || message.messageText || (message.type === 'image' ? '📷 Image' : message.type),
      content_type: message.type || 'text',
      sender_type: message.senderType,
      sender_name: message.senderName,
      is_read: false,
      created_at: message.createdAt,
      channel_metadata: {}
    });

    // NOTE: Sorting is now handled inside updateConversationLastMessage() to avoid race conditions
  }, [updateConversationLastMessage, getConversationById, selectedConversation]);

  const {
    connectionStatus: messagesConnectionStatus,
    reconnect: reconnectMessages,
    disconnect: disconnectMessages
  } = useRealtimeMessages({
    conversationId: null, // Subscribe to ALL conversations, not just selected
    onNewMessage: handleNewMessage,
    channelType: 'all' // Subscribe to both LINE and website messages
  });

  // Log connection status changes for debugging
  useEffect(() => {
    console.log('[Unified Chat] 🔗 Messages connection status:', messagesConnectionStatus);
  }, [messagesConnectionStatus]);

  // Update ref whenever selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    selectedConversationRef.current = conversationId; // Update ref immediately
    if (isMobile) {
      setShowMobileChat(true);
    }
  };

  // Handle going back from mobile chat to conversation list
  const handleMobileBackToList = useCallback(() => {
    setShowMobileChat(false);
    setSelectedConversation(null);
    selectedConversationRef.current = null;

    // Use ref to scroll to top - much more reliable than querySelector
    setTimeout(() => {
      if (conversationSidebarRef.current) {
        conversationSidebarRef.current.scrollToTop();

        // Also try scrolling parent containers as backup
        setTimeout(() => {
          // Try scrolling various containers that might be the actual scroll parent
          const containers = [
            document.querySelector('[data-conversations-list]'),
            document.querySelector('.conversations-container'),
            document.querySelector('.w-full.md\\:w-80'), // sidebar
            document.body,
            document.documentElement
          ];

          containers.forEach((container) => {
            if (container) {
              if ('scrollTo' in container) {
                (container as any).scrollTo({ top: 0, behavior: 'smooth' });
              }
              if ('scrollTop' in container) {
                (container as any).scrollTop = 0;
              }
            }
          });
        }, 150);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50); // Small delay to ensure React has finished state updates
  }, []);

  // Clear messages when conversation changes and fetch new ones
  useEffect(() => {
    if (selectedConversation) {
      setMessages([]); // Clear current messages
      // Messages will be loaded by ChatArea component
    }
  }, [selectedConversation]);

  // Note: Scroll handling is now done via ref in handleMobileBackToList

  // Customer linking functions - simplified
  const handleCustomerSelection = (customerId: string, customer: any) => {
    setSelectedCustomerForLink(customer);
    setShowLinkModal(false);
    setShowConfirmationModal(true);
  };

  const handleEditCustomerLink = () => {
    setShowConfirmationModal(false);
    setSelectedCustomerForLink(null);
    setShowLinkModal(true);
  };

  const linkCustomerToLineUser = async () => {
    if (!selectedCustomerForLink || !selectedConversation) return;

    try {
      await customerOps.linkCustomer(selectedCustomerForLink.id, selectedCustomerForLink);
      setShowConfirmationModal(false);
      setSelectedCustomerForLink(null);
    } catch (error) {
      console.error('Error linking customer:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading unified chat system...</span>
      </div>
    );
  }

  return (
    <>
      {/* Debug Connection Status Bar - Always visible for debugging */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white text-xs px-4 py-1 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="font-semibold">Realtime Debug:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              messagesConnectionStatus.status === 'connected' ? 'bg-green-500' :
              messagesConnectionStatus.status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
              messagesConnectionStatus.status === 'error' ? 'bg-red-500' :
              'bg-gray-500'
            }`}></div>
            <span>Messages: {messagesConnectionStatus.status}</span>
            {messagesConnectionStatus.error && (
              <span className="text-red-400">({messagesConnectionStatus.error})</span>
            )}
          </div>
          <span className="text-gray-400">|</span>
          <span>Selected: {selectedConversation?.slice(-8) || 'none'}</span>
          <span className="text-gray-400">|</span>
          <span>Messages in UI: {messages.length}</span>
          <span className="text-gray-400">|</span>
          <span className="text-xs text-gray-400">Client: {!!supabaseRealtime ? '✅' : '❌'}</span>
        </div>
        <button
          onClick={() => {
            console.log('=== REALTIME DEBUG INFO ===');
            console.log('Connection Status:', messagesConnectionStatus);
            console.log('Selected Conversation:', selectedConversation);
            console.log('Messages in UI:', messages.length);
            console.log('Supabase Realtime Client:', !!supabaseRealtime);
            console.log('Messages:', messages);
          }}
          className="px-2 py-0.5 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
        >
          Log Debug Info
        </button>
      </div>
      {/* Main content with padding for debug bar */}
      <div className="h-screen bg-gray-50 relative pt-8" style={{ height: '100dvh' }}>
        <div className="h-full flex flex-col md:flex-row">
        {/* Left Sidebar - Conversations */}
        {!leftPanelCollapsed && (
          <div className={`transition-all duration-300 ease-in-out ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
            <ConversationSidebar
              ref={conversationSidebarRef}
              selectedConversation={selectedConversation}
              onConversationSelect={handleConversationSelect}
              conversations={conversations}
              setConversations={setConversations}
              enableAISuggestions={aiSuggestionsEnabled}
              onToggleAI={setAiSuggestionsEnabled}
              markAsUnread={markAsUnread}
              toggleFollowUp={toggleFollowUp}
            />
          </div>
        )}

        {/* Center - Chat Area */}
        <div className={`flex-1 transition-all duration-300 ease-in-out h-full ${!showMobileChat && selectedConversation ? 'hidden md:flex' : ''} ${!selectedConversation ? 'hidden md:flex' : ''}`}>
          <ChatArea
            selectedConversation={selectedConversation}
            selectedConversationObj={selectedConversationObj}
            chatOperations={chatOps}
            leftPanelCollapsed={leftPanelCollapsed}
            rightPanelCollapsed={rightPanelCollapsed}
            onTogglePanel={togglePanel}
            messages={messages}
            setMessages={setMessages}
            onShowMobileCustomer={() => setShowMobileCustomer(true)}
            onMarkConversationRead={handleMarkConversationRead}
            onMobileBackToList={handleMobileBackToList}
          />
        </div>

        {/* Right Sidebar - Customer Info */}
        {!rightPanelCollapsed && (
          <div className={`transition-all duration-300 ease-in-out ${!showMobileCustomer ? 'hidden md:flex' : 'hidden md:flex'}`}>
            <CustomerSidebar
              selectedConversation={selectedConversation}
              selectedConversationObj={selectedConversationObj}
              customerOperations={customerOps}
              onShowLinkModal={() => setShowLinkModal(true)}
            />
          </div>
        )}

        {/* Mobile Customer Panel - Full Screen Modal */}
        {showMobileCustomer && selectedConversation && (
          <div className="fixed inset-0 bg-white z-50 md:hidden flex flex-col">
            {/* Mobile Customer Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowMobileCustomer(false)}
                  className="h-8 w-8 p-0 flex items-center justify-center"
                >
                  ←
                </button>
                <h3 className="font-semibold text-lg">Customer Information</h3>
              </div>
            </div>

            {/* Mobile Customer Content - Reuse CustomerSidebar */}
            <div className="flex-1 overflow-y-auto">
              <CustomerSidebar
                selectedConversation={selectedConversation}
                selectedConversationObj={selectedConversationObj}
                customerOperations={customerOps}
                onShowLinkModal={() => setShowLinkModal(true)}
              />
            </div>
          </div>
        )}

        {/* Existing Modals - Keep as-is for now */}
        <CustomerLinkModal
          isOpen={showLinkModal}
          onClose={() => setShowLinkModal(false)}
          onCustomerSelect={handleCustomerSelection}
          loading={customerOps.linkingCustomer}
          lineUserName={""} // TODO: Get from selected conversation
        />

        <CustomerConfirmationModal
          isOpen={showConfirmationModal}
          onClose={() => {
            setShowConfirmationModal(false);
            setSelectedCustomerForLink(null);
          }}
          onConfirm={linkCustomerToLineUser}
          onEdit={handleEditCustomerLink}
          customer={selectedCustomerForLink}
          lineUserName={""} // TODO: Get from selected conversation
          loading={customerOps.linkingCustomer}
        />

        <CuratedImageModal
          isOpen={showCuratedImages}
          onClose={() => setShowCuratedImages(false)}
          onSelect={(imageIds) => {
            console.log('Selected images:', imageIds);
            setShowCuratedImages(false);
          }}
        />

        <TemplateSelector
          isOpen={showTemplateSelector}
          onClose={() => setShowTemplateSelector(false)}
          onSelect={(template) => {
            console.log('Selected template:', template);
            setShowTemplateSelector(false);
          }}
          customerName={""} // TODO: Get from selected conversation
        />
        </div>
      </div>
    </>
  );
}