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
import { useAISuggestions } from '@/hooks/useAISuggestions';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { AISuggestionCard, AISuggestion } from '@/components/ai/AISuggestionCard';

export default function UnifiedChatPage() {
  // Core state - using unified chat system
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const selectedConversationRef = useRef<string | null>(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileCustomer, setShowMobileCustomer] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Ref for ConversationSidebar to control scrolling
  const conversationSidebarRef = useRef<ConversationSidebarRef>(null);

  // Store scroll position for restoration when returning to list
  const savedScrollPositionRef = useRef<number>(0);

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
    toggleFollowUp,
    toggleSpam
  } = useUnifiedChat();

  // Create refs to avoid callback recreation
  const setConversationsRef = useRef(setConversations);
  setConversationsRef.current = setConversations;

  const refreshConversationsRef = useRef(refreshConversations);
  refreshConversationsRef.current = refreshConversations;

  // Stable callback for conversation updates - wrapped in useCallback to prevent recreation
  const handleConversationUpdate = useCallback((conversationUpdate: any) => {
    // Update existing conversation in the list and re-sort by lastMessageAt
    setConversationsRef.current(prev => {
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

      return sorted;
    });
  }, []); // Empty deps - using ref to access setter

  // Debounce timer for refresh
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable callback for new conversations - wrapped in useCallback to prevent recreation
  const handleNewConversation = useCallback(async (newConv: any) => {
    // Fetch full conversation data with proper formatting from API
    // Add retry logic to handle race conditions with unified_conversations view
    const maxRetries = 3;
    const retryDelay = 500; // 500ms delay between retries

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Add delay before retry attempts (but not on first attempt)
        if (attempt > 0) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        const response = await fetch(`/api/conversations/unified/${newConv.id}`);
        const data = await response.json();

        if (data.success && data.conversation) {
          setConversationsRef.current(prev => {
            // Check if conversation already exists
            const exists = prev.some(conv => conv.id === data.conversation.id);
            if (exists) {
              return prev; // Already exists, will be updated via handleConversationUpdate
            }

            // Add directly with proper formatting - no refresh needed
            const newList = [data.conversation, ...prev];

            // Sort by last message time
            return newList.sort((a, b) => {
              const aTime = new Date(a.lastMessageAt || 0).getTime();
              const bTime = new Date(b.lastMessageAt || 0).getTime();
              return bTime - aTime;
            });
          });
          return; // Success - exit the retry loop
        }

        // If we get here, API returned success: false
        // Continue to next retry or fall through to refresh
      } catch (error) {
        console.error(`Attempt ${attempt + 1}/${maxRetries} failed to fetch new conversation:`, error);
        // Continue to next retry attempt
      }
    }

    // All retries failed - fallback to full refresh
    console.log('All retry attempts exhausted, falling back to full refresh');
    refreshConversationsRef.current();
  }, []); // Empty deps - using ref to access refresh function

  // Set up realtime conversation updates with stable callbacks
  useRealtimeConversations({
    onConversationUpdate: handleConversationUpdate,
    onNewConversation: handleNewConversation
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
  const [linkModalPrefillData, setLinkModalPrefillData] = useState<{ fullName?: string; primaryPhone?: string; email?: string } | undefined>(undefined);

  // AI suggestions toggle - persisted in localStorage, default OFF for safety
  const [aiSuggestionsEnabled, setAiSuggestionsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ai-suggestions-enabled');
      return saved === 'true'; // Default to false (disabled)
    }
    return false;
  });
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

  // Typing indicator integration - fetch current user info
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [currentUserDisplayName, setCurrentUserDisplayName] = useState<string>('');

  useEffect(() => {
    fetch('/api/user/me')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUserEmail(data.data.email || '');
          setCurrentUserDisplayName(data.data.staffDisplayName || 'Staff');
        }
      })
      .catch(error => console.error('Failed to fetch user info:', error));
  }, []);

  // Initialize typing indicator hook
  const { typingUsers, broadcastTyping } = useTypingIndicator({
    conversationId: selectedConversation,
    userEmail: currentUserEmail,
    userDisplayName: currentUserDisplayName,
    enabled: true
  });

  // Message state needs to be managed at this level for realtime to work
  const [messages, setMessages] = useState<any[]>([]);

  // AI prefill message for edit functionality
  const [aiPrefillMessage, setAIPrefillMessage] = useState<string | undefined>(undefined);

  // AI suggestions integration - only active when enabled
  const aiSuggestions = useAISuggestions({
    conversationId: selectedConversation || '',
    channelType: selectedConversationObj?.channelType || 'line',
    customerId: selectedConversationObj?.customer?.id,
    onSuggestionAccepted: async (suggestion, response) => {
      // Send the AI-suggested message directly
      if (response && response.trim()) {
        await chatOps.sendMessage(response.trim());
      }
    },
    onSuggestionEdited: (suggestion, originalResponse, editedResponse) => {
      // Prefill the message input with the AI suggestion for editing
      // This will be handled by the ChatArea component via prop drilling
      setAIPrefillMessage(editedResponse);
    },
    onSuggestionDeclined: (suggestion) => {
      console.log('AI suggestion declined');
    },
    onSuggestionApproved: async (suggestion, bookingResult) => {
      console.log('AI suggestion approved (booking created):', bookingResult);
      // Refresh customer data to show new booking
      if (customerOps && selectedConversationObj?.customer?.id) {
        await customerOps.fetchCustomerDetails(selectedConversationObj.customer.id);
      }
    }
  });

  // Manual AI retrigger function - gets last customer message and generates suggestion
  const handleAIRetrigger = useCallback(() => {
    if (!aiSuggestionsEnabled || !messages.length) return;

    // Find the last customer message
    const lastCustomerMessage = [...messages]
      .reverse()
      .find(m => m.senderType === 'user' && m.text);

    if (lastCustomerMessage && lastCustomerMessage.text) {
      aiSuggestions.generateSuggestion(lastCustomerMessage.text, lastCustomerMessage.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiSuggestionsEnabled, messages]);

  // Clear AI suggestion when conversation changes
  useEffect(() => {
    aiSuggestions.clearSuggestion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);

  // Save AI suggestions toggle to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai-suggestions-enabled', String(aiSuggestionsEnabled));
    }
  }, [aiSuggestionsEnabled]);

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

  // Handle new messages from realtime - updated for unified system
  const handleNewMessage = useCallback((message: any) => {
    const currentSelectedConversation = selectedConversationRef.current;

    // Add message to the messages list ONLY if it's for the currently selected conversation
    if (currentSelectedConversation === message.conversationId) {
      setMessages(prev => {
        // Prevent duplicates
        if (prev.find((m: any) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      // Auto-scroll to bottom for new realtime messages
      setTimeout(() => {
        const messagesEnd = document.querySelector('[data-messages-end]');
        messagesEnd?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

      // Trigger AI suggestion if enabled and message is from customer
      if (aiSuggestionsEnabled && message.senderType === 'user' && message.text && message.text.trim()) {
        // Small delay to avoid race conditions
        setTimeout(() => {
          aiSuggestions.generateSuggestion(message.text, message.id);
        }, 100);
      }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateConversationLastMessage, getConversationById, selectedConversation, aiSuggestionsEnabled]);

  const {
    connectionStatus: messagesConnectionStatus,
    reconnect: reconnectMessages,
    disconnect: disconnectMessages
  } = useRealtimeMessages({
    conversationId: null, // Subscribe to ALL conversations, not just selected
    onNewMessage: handleNewMessage,
    channelType: 'all' // Subscribe to both LINE and website messages
  });


  // Update ref whenever selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    // Save scroll position before navigating to chat
    if (conversationSidebarRef.current) {
      savedScrollPositionRef.current = conversationSidebarRef.current.saveScrollPosition();
    }

    setSelectedConversation(conversationId);
    selectedConversationRef.current = conversationId; // Update ref immediately
    if (isMobile) {
      setShowMobileChat(true);
      // Push a history state so browser back returns to conversation list
      window.history.pushState({ inChat: true }, '', window.location.href);
    }
  };

  // Handle going back from mobile chat to conversation list
  const handleMobileBackToList = useCallback(() => {
    setShowMobileChat(false);
    setSelectedConversation(null);
    selectedConversationRef.current = null;

    // Restore scroll position instead of scrolling to top
    setTimeout(() => {
      if (conversationSidebarRef.current) {
        // Get saved position from ref or sessionStorage as fallback
        const position = savedScrollPositionRef.current ||
          (typeof window !== 'undefined' ? parseInt(sessionStorage.getItem('unified-chat-scroll-position') || '0', 10) : 0);

        conversationSidebarRef.current.restoreScrollPosition(position);
      }
    }, 50); // Small delay to ensure React has finished state updates
  }, []);

  // Handle browser back button on mobile to return to conversation list
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (isMobile && showMobileChat) {
        // Prevent default browser back navigation
        event.preventDefault();
        // Return to conversation list
        handleMobileBackToList();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isMobile, showMobileChat, handleMobileBackToList]);

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

  // Handler for opening link modal with extracted customer data
  const handleShowLinkModalWithPrefill = useCallback((prefillData: { fullName?: string; primaryPhone?: string; email?: string }) => {
    setLinkModalPrefillData(prefillData);
    setShowLinkModal(true);
  }, []);

  const handleEditCustomerLink = () => {
    setShowConfirmationModal(false);
    setSelectedCustomerForLink(null);
    setShowLinkModal(true);
  };

  const linkCustomerToLineUser = async () => {
    if (!selectedCustomerForLink || !selectedConversation) return;

    try {
      // Optimistically update the conversation in state immediately for better UX
      setConversations(prev =>
        prev.map(conv =>
          conv.id === selectedConversation
            ? { ...conv, customerId: selectedCustomerForLink.id, customer: selectedCustomerForLink }
            : conv
        )
      );

      await customerOps.linkCustomer(selectedCustomerForLink.id, selectedCustomerForLink);

      // Refresh conversations to get the updated customer_id and full customer details from database
      await refreshConversations();

      setShowConfirmationModal(false);
      setSelectedCustomerForLink(null);
    } catch (error) {
      console.error('Error linking customer:', error);
      // On error, refresh to revert the optimistic update
      await refreshConversations();
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
    <div className="h-screen bg-gray-50 relative" style={{ height: '100dvh' }}>
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
              toggleSpam={toggleSpam}
              onRefresh={refreshConversations}
            />
          </div>
        )}

        {/* Center - Chat Area */}
        <div className={`flex-1 transition-all duration-300 ease-in-out h-full ${!showMobileChat && selectedConversation ? 'hidden md:flex' : ''} ${!selectedConversation ? 'hidden md:flex' : ''}`}>
          <ChatArea
            selectedConversation={selectedConversation}
            selectedConversationObj={selectedConversationObj}
            chatOperations={chatOps}
            customerOperations={customerOps}
            leftPanelCollapsed={leftPanelCollapsed}
            rightPanelCollapsed={rightPanelCollapsed}
            onTogglePanel={togglePanel}
            messages={messages}
            setMessages={setMessages}
            onShowMobileCustomer={() => setShowMobileCustomer(true)}
            onMarkConversationRead={handleMarkConversationRead}
            onMobileBackToList={handleMobileBackToList}
            enableAISuggestions={aiSuggestionsEnabled}
            onAIRetrigger={handleAIRetrigger}
            aiSuggestion={aiSuggestions.suggestion}
            aiSuggestionLoading={aiSuggestions.isLoading}
            onAcceptSuggestion={aiSuggestions.acceptSuggestion}
            onEditSuggestion={aiSuggestions.editSuggestion}
            onDeclineSuggestion={aiSuggestions.declineSuggestion}
            onApproveSuggestion={aiSuggestions.approveSuggestion}
            aiPrefillMessage={aiPrefillMessage}
            onAIPrefillMessageClear={() => setAIPrefillMessage(undefined)}
            typingUsers={typingUsers}
            onUserTyping={broadcastTyping}
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
              messages={messages}
              onShowLinkModalWithPrefill={handleShowLinkModalWithPrefill}
            />
          </div>
        )}

        {/* Mobile Customer Panel - Full Screen Modal */}
        {showMobileCustomer && selectedConversation && (
          <div className="fixed inset-0 bg-white z-50 md:hidden flex flex-col">
            {/* Mobile Customer Header */}
            <div className="bg-[#1a4d2e] border-b p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowMobileCustomer(false)}
                  className="h-8 w-8 p-0 flex items-center justify-center text-white hover:bg-white/10 rounded"
                >
                  ←
                </button>
                <h3 className="font-semibold text-lg text-white">Customer Information</h3>
              </div>
            </div>

            {/* Mobile Customer Content - Reuse CustomerSidebar */}
            <div className="flex-1 overflow-y-auto">
              <CustomerSidebar
                selectedConversation={selectedConversation}
                selectedConversationObj={selectedConversationObj}
                customerOperations={customerOps}
                onShowLinkModal={() => setShowLinkModal(true)}
                messages={messages}
                onShowLinkModalWithPrefill={handleShowLinkModalWithPrefill}
              />
            </div>
          </div>
        )}

        {/* Existing Modals - Keep as-is for now */}
        <CustomerLinkModal
          isOpen={showLinkModal}
          onClose={() => {
            setShowLinkModal(false);
            setLinkModalPrefillData(undefined); // Clear prefill data when modal closes
          }}
          onCustomerSelect={handleCustomerSelection}
          loading={customerOps.linkingCustomer}
          lineUserName={""} // TODO: Get from selected conversation
          prefillData={linkModalPrefillData}
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
  );
}