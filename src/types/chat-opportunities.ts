// TypeScript types for the Chat Opportunity Recovery System
// These types mirror the database schema and provide type safety for the feature

// Define ChannelType locally to avoid circular dependency with chatTypes
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
  phone_number?: string;
  customer_name?: string;
  username?: string;
  full_name?: string;
  name?: string;
  [key: string]: unknown;
}

// ============================================================================
// Core Types
// ============================================================================

export type OpportunityType =
  | 'coaching_inquiry'
  | 'pricing_inquiry'
  | 'booking_failed'
  | 'package_interest'
  | 'equipment_inquiry'
  | 'general_interest';

export type OpportunityPriority = 'high' | 'medium' | 'low';

export type OpportunityStatus =
  | 'pending'      // New opportunity, not yet contacted
  | 'contacted'    // Staff has reached out
  | 'converted'    // Successfully converted (booking/purchase)
  | 'lost'         // Customer declined or no response after contact
  | 'dismissed';   // Staff dismissed as not a real opportunity

export type OpportunityLogAction =
  | 'created'
  | 'analyzed'
  | 'contacted'
  | 'status_changed'
  | 'note_added'
  | 'message_sent'
  | 'expired';

// ============================================================================
// Database Models
// ============================================================================

export interface ChatOpportunity {
  id: string;
  conversation_id: string;
  channel_type: ChannelType;

  // Classification
  opportunity_type: OpportunityType;
  priority: OpportunityPriority;
  confidence_score: number | null;

  // LLM Analysis
  analysis_summary: string | null;
  suggested_action: string | null;
  suggested_message: string | null;

  // Contact info
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;

  // Status tracking
  status: OpportunityStatus;
  contacted_at: string | null;
  contacted_by: string | null;
  outcome: string | null;
  outcome_notes: string | null;

  // Metadata
  created_at: string;
  updated_at: string;
  analyzed_at: string | null;
  expires_at: string | null;
}

export interface ChatOpportunityLog {
  id: string;
  opportunity_id: string;
  action: OpportunityLogAction;
  actor: string | null;
  previous_status: string | null;
  new_status: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// Extended Types (with conversation details)
// ============================================================================

export interface ChatOpportunityWithConversation extends ChatOpportunity {
  // Conversation details
  conv_last_message_at: string | null;
  conv_last_message_text: string | null;
  conv_last_message_by: string | null;
  conv_channel_metadata: ChannelMetadata | null;
  days_cold: number;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface FindOpportunitiesParams {
  daysThreshold?: number;
  maxAgeDays?: number;
}

export interface PotentialOpportunity {
  conversation_id: string;
  channel_type: ChannelType;
  channel_user_id: string;
  last_message_at: string;
  last_message_text: string | null;
  last_message_by: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  days_since_last_message: number;
  has_inquiry_keywords: boolean;
  inquiry_keywords: string[];
  suggested_opportunity_type: OpportunityType;
}

export interface GetOpportunitiesParams {
  status?: OpportunityStatus;
  priority?: OpportunityPriority;
  opportunityType?: OpportunityType;
  channelType?: ChannelType;
  offset?: number;
  limit?: number;
}

export interface GetOpportunitiesResponse {
  success: boolean;
  opportunities: ChatOpportunityWithConversation[];
  total?: number;
  error?: string;
}

export interface CreateOpportunityRequest {
  conversation_id: string;
  channel_type: ChannelType;
  opportunity_type: OpportunityType;
  priority?: OpportunityPriority;
  confidence_score?: number;
  analysis_summary?: string;
  suggested_action?: string;
  suggested_message?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
}

export interface UpdateOpportunityRequest {
  status?: OpportunityStatus;
  priority?: OpportunityPriority;
  outcome?: string;
  outcome_notes?: string;
  contacted_by?: string;
}

export interface OpportunityStats {
  total_pending: number;
  total_contacted: number;
  total_converted: number;
  total_lost: number;
  total_dismissed: number;
  conversion_rate: number;
  avg_days_to_contact: number;
  by_type: Record<OpportunityType, number>;
  by_priority: Record<OpportunityPriority, number>;
  by_channel: Record<ChannelType, number>;
}

export interface OpportunityStatsResponse {
  success: boolean;
  stats?: OpportunityStats;
  error?: string;
}

// ============================================================================
// LLM Analysis Types
// ============================================================================

export interface AnalyzeConversationRequest {
  conversationId: string;
  messages: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  content: string;
  sender_type: 'user' | 'admin' | 'customer' | 'staff';
  sender_name?: string;
  created_at: string;
}

export interface AnalyzeConversationResponse {
  success: boolean;
  analysis?: OpportunityAnalysis;
  error?: string;
}

export interface OpportunityAnalysis {
  opportunityType: OpportunityType | 'not_an_opportunity';
  priority: OpportunityPriority;
  confidenceScore: number;
  analysisSummary: string;
  suggestedAction: string;
  suggestedMessage: string;
  extractedContactInfo?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

// ============================================================================
// UI State Types
// ============================================================================

export type OpportunityViewMode = 'list' | 'detail';

export type OpportunityFilter = 'all' | OpportunityStatus;

export interface OpportunityFilterState {
  status: OpportunityFilter;
  priority: OpportunityPriority | 'all';
  type: OpportunityType | 'all';
  channel: ChannelType | 'all';
}

export interface OpportunityOutcomeFormData {
  status: 'contacted' | 'converted' | 'lost' | 'dismissed';
  outcome?: string;
  outcomeNotes?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getOpportunityTypeLabel(type: OpportunityType): string {
  const labels: Record<OpportunityType, string> = {
    coaching_inquiry: 'Coaching Inquiry',
    pricing_inquiry: 'Pricing Inquiry',
    booking_failed: 'Booking Failed',
    package_interest: 'Package Interest',
    equipment_inquiry: 'Equipment Inquiry',
    general_interest: 'General Interest',
  };
  return labels[type] || type;
}

export function getOpportunityTypeIcon(type: OpportunityType): string {
  const icons: Record<OpportunityType, string> = {
    coaching_inquiry: 'C',
    pricing_inquiry: 'P',
    booking_failed: 'B',
    package_interest: 'K',
    equipment_inquiry: 'E',
    general_interest: 'G',
  };
  return icons[type] || 'G';
}

export function getPriorityColor(priority: OpportunityPriority): string {
  const colors: Record<OpportunityPriority, string> = {
    high: 'red',
    medium: 'yellow',
    low: 'gray',
  };
  return colors[priority] || 'gray';
}

export function getStatusColor(status: OpportunityStatus): string {
  const colors: Record<OpportunityStatus, string> = {
    pending: 'blue',
    contacted: 'yellow',
    converted: 'green',
    lost: 'red',
    dismissed: 'gray',
  };
  return colors[status] || 'gray';
}

export function getStatusLabel(status: OpportunityStatus): string {
  const labels: Record<OpportunityStatus, string> = {
    pending: 'Pending',
    contacted: 'Contacted',
    converted: 'Converted',
    lost: 'Lost',
    dismissed: 'Dismissed',
  };
  return labels[status] || status;
}
