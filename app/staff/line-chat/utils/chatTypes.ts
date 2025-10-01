// TypeScript interfaces extracted from the main LINE chat component
// This file centralizes all type definitions for better organization and reusability
// Extended to support unified multi-channel chat (LINE + Website)

import React from 'react';

export interface LineUser {
  displayName: string;
  pictureUrl?: string;
  lineUserId?: string;
  customerId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}

export interface Conversation {
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
  channelType?: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp'; // Add channel type for unified conversations
  channelMetadata?: ChannelMetadata;
  // Follow-up and unread features
  isFollowing?: boolean;
  markedUnreadAt?: string;
  followUpAt?: string;
}

export interface Message {
  id: string;
  platformMessageId?: string; // Original platform message ID (LINE message_id, Facebook mid, etc)
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

export interface CustomerDetails {
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

export interface Booking {
  id: string;
  date: string;
  start_time: string;
  duration: number;
  bay: string;
  number_of_people: number;
  status: string;
  booking_type?: string;
  package_name?: string;
}

export interface Package {
  id: string;
  package_type_name: string;
  remaining_hours: number | string;
  used_hours?: number;
  expiration_date: string;
  package_type: string;
  hours_remaining?: number | null; // For numeric calculations, null for unlimited packages
}

export interface Transaction {
  id: string;
  transaction_date: string;
  total_amount: number;
  payment_method: string;
  receipt_number: string;
}

// Message preview interface for enhanced display
export interface MessagePreview {
  text: string;
  type: string;
  enhanced: boolean;
}

// Hook return types
export interface ChatOperations {
  sendMessage: (content: string, type?: MessageType, replyToMessageId?: string) => Promise<void>;
  sendingMessage: boolean;
  handleFileUpload: (file: File) => Promise<void>;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  sendBatchImages: (imageIds: string[]) => Promise<void>;
  sendingProgress: {current: number, total: number} | null;
  sendUnifiedMessage?: (content: string, conversation: UnifiedConversation, type?: MessageType, replyToMessageId?: string) => Promise<void>;
  channelType?: ChannelType | null;
}

export interface CustomerOperations {
  customerDetails: CustomerDetails | null;
  customerBookings: Booking[];
  customerPackages: Package[];
  customerTransactions: Transaction[];
  currentBookingIndex: number;
  fetchCustomerDetails: (customerId: string) => Promise<void>;
  linkCustomer: (customerId: string, customer: any) => Promise<void>;
  sendBookingConfirmation: (bookingId: string) => Promise<void>;
  setCurrentBookingIndex: (index: number) => void;
  linkingCustomer: boolean;
  sendingConfirmation: string | null;
}

export interface PanelState {
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  togglePanel: (panel: 'left' | 'right') => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
}

// Component prop types
export interface ConversationSidebarProps {
  selectedConversation: string | null;
  onConversationSelect: (id: string) => void;
  conversations?: Conversation[];
  setConversations?: React.Dispatch<React.SetStateAction<Conversation[]>>;
  // AI configuration
  enableAISuggestions?: boolean;
  onToggleAI?: (enabled: boolean) => void;
  // Follow-up and unread features
  markAsUnread?: (conversationId: string, channelType: string) => Promise<void>;
  toggleFollowUp?: (conversationId: string, channelType: string, currentFollowingStatus: boolean) => Promise<void>;
  // Refresh function
  onRefresh?: () => void;
}

// Ref interface for ConversationSidebar
export interface ConversationSidebarRef {
  scrollToTop: () => void;
}

export interface ChatAreaProps {
  selectedConversation: string | null;
  selectedConversationObj?: Conversation | null;
  chatOperations: ChatOperations;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  onTogglePanel: (panel: 'left' | 'right') => void;
  messages?: Message[];
  setMessages?: React.Dispatch<React.SetStateAction<Message[]>>;
  onShowMobileCustomer?: () => void;
  onMarkConversationRead?: (conversationId: string) => void;
  onMobileBackToList?: () => void;
}

export interface CustomerSidebarProps {
  selectedConversation: string | null;
  selectedConversationObj?: Conversation | null;
  customerOperations: CustomerOperations;
  onShowLinkModal?: () => void;
}

export interface MessageInputProps {
  onSendMessage: (content: string, type?: MessageType, replyToMessageId?: string) => Promise<void>;
  replyingToMessage: Message | null;
  onCancelReply: () => void;
  disabled: boolean;
  isMobile: boolean;
  selectedConversationObj?: Conversation | null;
  onTemplateSelect?: (template: any) => Promise<void>;
  onCuratedImagesSelect?: (imageIds: string[]) => Promise<void>;
  onFileUpload?: (file: File) => Promise<void>;
  // AI suggestions
  onAIRetrigger?: () => void;
  enableAISuggestions?: boolean;
}

// ========== UNIFIED MULTI-CHANNEL TYPES ==========

export type ChannelType = 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp';

export interface ChannelMetadata {
  // LINE specific metadata
  line_user_id?: string;
  display_name?: string;
  picture_url?: string;
  // Website specific metadata
  session_id?: string;
  email?: string;
  // Meta platforms specific metadata
  platform?: 'facebook' | 'instagram' | 'whatsapp';
  platform_user_id?: string;
  profile_pic?: string;
  phone_number?: string; // For WhatsApp
  customer_name?: string;
  username?: string; // Meta username (Instagram/Facebook)
  full_name?: string;
  name?: string;
  // Unified metadata
  [key: string]: any;
}

export interface UnifiedConversation {
  id: string;
  channel_type: ChannelType;
  channel_user_id: string;
  customer_id?: string;
  last_message_at: string;
  last_message_text?: string;
  last_message_by: string;
  unread_count: number;
  is_active: boolean;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
  channel_metadata: ChannelMetadata;
  // Follow-up and unread features
  is_following?: boolean;
  marked_unread_at?: string;
  follow_up_at?: string;
}

export interface UnifiedMessage {
  id: string;
  channel_type: ChannelType;
  conversation_id: string;
  channel_user_id: string;
  content: string;
  content_type: string;
  sender_type: string;
  sender_name?: string;
  is_read: boolean;
  created_at: string;
  channel_metadata: ChannelMetadata;
}

export interface WebsiteChatSession {
  id: string;
  session_id: string;
  user_id?: string;
  customer_id?: string;
  display_name?: string;
  email?: string;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}

export interface WebsiteChatConversation {
  id: string;
  session_id: string;
  is_active: boolean;
  last_message_at: string;
  last_message_text?: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebsiteChatMessage {
  id: string;
  conversation_id: string;
  session_id: string;
  message_text: string;
  sender_type: 'customer' | 'staff';
  sender_name?: string;
  is_read: boolean;
  created_at: string;
}

// Extended hook return types for multi-channel support
export interface UnifiedChatOperations extends ChatOperations {
  sendUnifiedMessage: (content: string, conversation: UnifiedConversation, type?: MessageType, replyToMessageId?: string) => Promise<void>;
  channelType: ChannelType | null;
}

// Utility types
export type MessageType = 'text' | 'image' | 'file' | 'sticker' | 'batch_images';

export interface SendingProgress {
  current: number;
  total: number;
}
