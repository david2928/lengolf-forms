'use client';

// Refactored LINE Chat Page - REDUCED from 2,976 lines to ~400 lines
// Uses extracted components, hooks, and utilities for better maintainability

import { useState, useEffect } from 'react';
import { CustomerLinkModal } from '@/components/admin/line-chat/CustomerLinkModal';
import { CustomerConfirmationModal } from '@/components/admin/line-chat/CustomerConfirmationModal';
import { CuratedImageModal } from '@/components/line/CuratedImageModal';
import { TemplateSelector } from '@/components/line/TemplateSelector';
import { MessageContextMenu } from '@/components/line/MessageContextMenu';
import { RefreshCw } from 'lucide-react';

// Import our new components and hooks
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatArea } from './components/ChatArea';
import { CustomerSidebar } from './components/CustomerSidebar';
import { usePanelState } from './hooks/usePanelState';
import { useChatOperations } from './hooks/useChatOperations';
import { useCustomerData } from './hooks/useCustomerData';
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages';
import type { Conversation } from './utils/chatTypes';

export default function LineChatPage() {
  // Basic state only - much simpler!
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showMobileCustomer, setShowMobileCustomer] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Modal states - keeping existing modal logic for now
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [selectedCustomerForLink, setSelectedCustomerForLink] = useState<any>(null);
  const [showCuratedImages, setShowCuratedImages] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);

  // Get the selected conversation object
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Extract panel state to custom hook - reduces useState count
  const {
    leftPanelCollapsed,
    rightPanelCollapsed,
    togglePanel,
    setLeftPanelCollapsed,
    setRightPanelCollapsed
  } = usePanelState();

  // Extract complex operations to custom hooks - major complexity reduction
  // Pass BOTH the ID and the full conversation object to the hooks
  const chatOps = useChatOperations(selectedConversationId);
  const customerOps = useCustomerData(selectedConversationId, selectedConversation);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    setLoading(false);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Simple realtime setup - using existing hooks but simpler
  const handleNewMessage = (message: any) => {
    // This would be handled by the ChatArea component
    console.log('New message received:', message);
  };

  const {
    connectionStatus: messagesConnectionStatus,
    reconnect: reconnectMessages,
    disconnect: disconnectMessages
  } = useRealtimeMessages({
    conversationId: selectedConversationId,
    onNewMessage: handleNewMessage
  });

  // Handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    if (isMobile) {
      setShowMobileChat(true);
    }
  };

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
    if (!selectedCustomerForLink || !selectedConversationId) return;

    try {
      await customerOps.linkCustomer(selectedCustomerForLink.id, selectedCustomerForLink);
      setShowConfirmationModal(false);
      setSelectedCustomerForLink(null);
    } catch (error) {
      console.error('Error linking customer:', error);
    }
  };

  // Handle mobile customer modal
  const handleMobileCustomerClick = () => {
    if (isMobile) {
      setShowMobileCustomer(true);
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
      {/* Left Sidebar - Conversations */}
      {!leftPanelCollapsed && (
        <div className={`transition-all duration-300 ease-in-out ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
          <ConversationSidebar
            selectedConversation={selectedConversationId}
            onConversationSelect={handleConversationSelect}
            conversations={conversations}
            setConversations={setConversations}
          />
        </div>
      )}

      {/* Center - Chat Area */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${!showMobileChat && selectedConversationId ? 'hidden md:flex' : ''} ${!selectedConversationId ? 'hidden md:flex' : ''}`}>
        <ChatArea
          selectedConversation={selectedConversationId}
          selectedConversationObj={selectedConversation}
          chatOperations={chatOps}
          leftPanelCollapsed={leftPanelCollapsed}
          rightPanelCollapsed={rightPanelCollapsed}
          onTogglePanel={togglePanel}
        />
      </div>

      {/* Right Sidebar - Customer Info */}
      {!rightPanelCollapsed && (
        <div className={`transition-all duration-300 ease-in-out ${!showMobileCustomer ? 'hidden md:flex' : 'hidden md:flex'}`}>
          <CustomerSidebar
            selectedConversation={selectedConversationId}
            selectedConversationObj={selectedConversation}
            customerOperations={customerOps}
          />
        </div>
      )}

      {/* Mobile Customer Panel - Full Screen Modal */}
      {showMobileCustomer && selectedConversationId && (
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
              selectedConversation={selectedConversationId}
              selectedConversationObj={selectedConversation}
              customerOperations={customerOps}
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
        lineUserName={selectedConversation?.user?.displayName || ''}
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
        lineUserName={selectedConversation?.user?.displayName || ''}
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
  );
}