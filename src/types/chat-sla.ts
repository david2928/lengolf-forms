/**
 * TypeScript types for Chat SLA Tracking System
 * Based on database functions in supabase/migrations/20251207100002_create_chat_sla_analytics_functions.sql
 */

/**
 * Overall SLA overview metrics
 * Returned by get_chat_sla_overview(start_date, end_date, channel_filter)
 */
export interface ChatSLAOverview {
  // SLA compliance metrics
  sla_met_count: number;
  sla_breached_count: number;
  unanswered_count: number;
  abandoned_count: number; // Conversations with >24hr response time
  conversation_ended_count: number; // Conversations with >12hr business hours (likely closers)
  business_hours_messages: number;
  total_messages_tracked: number; // Total messages tracked (excludes abandoned and conversation_ended)
  sla_compliance_rate: number; // Percentage (0-100)

  // Response time metrics (in seconds and minutes)
  avg_response_seconds: number;
  avg_response_minutes: number;
  median_response_seconds: number;
  median_response_minutes: number;

  // Owner metrics (SEPARATE from staff SLA)
  owner_responses_within_10min: number;
  owner_forced_after_10min: number; // CRITICAL: Owner had to respond because staff didn't
  total_owner_responses: number;
  owner_response_rate: number; // Percentage (0-100)

  // Historical data tracking
  historical_responses: number;

  // Channel breakdown
  line_messages: number;
  website_messages: number;
  meta_messages: number;
}

/**
 * Per-staff SLA performance metrics
 * Returned by get_chat_sla_by_staff(start_date, end_date, channel_filter)
 */
export interface StaffSLAMetrics {
  staff_email: string;
  staff_name: string;
  total_responses: number;
  sla_met: number;
  sla_breached: number;
  sla_compliance_rate: number; // Percentage (0-100)
  avg_response_minutes: number;
  median_response_minutes: number;
  is_owner: boolean;
  is_historical: boolean;
}

/**
 * Daily SLA trends for chart visualization
 * Returned by get_chat_sla_daily_trends(start_date, end_date, channel_filter)
 */
export interface DailySLATrend {
  date: string; // Date in YYYY-MM-DD format
  total_messages: number;
  sla_met: number;
  sla_breached: number;
  unanswered: number;
  abandoned: number; // Conversations with >24hr response time
  conversation_ended: number; // Conversations with >12hr business hours (likely closers)
  sla_compliance_rate: number; // Percentage (0-100)
  avg_response_minutes: number;
  owner_forced_count: number; // Critical metric: owner had to respond after 10min
}

/**
 * Conversation-level SLA details for drill-down
 * Returned by get_chat_sla_conversation_details(start_date, end_date, status_filter, channel_filter, limit)
 */
export interface ConversationSLADetail {
  conversation_id: string;
  channel_type: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp' | 'meta';
  customer_message_time: string; // ISO timestamp
  first_staff_response_time: string | null; // ISO timestamp
  responding_staff_email: string | null;
  responding_staff_name: string;
  response_time_minutes: number | null;
  sla_status: 'met' | 'breached' | 'unanswered' | 'outside_business_hours' | 'abandoned' | 'conversation_ended';
  response_category: 'staff_response' | 'owner_response' | 'owner_forced_after_10min' | 'historical_staff';
  is_owner_response: boolean;
  is_critical: boolean; // True if owner_forced_after_10min
  customer_name: string;
  customer_id: string | null;
}

/**
 * Parameters for SLA overview API call
 */
export interface SLAOverviewParams {
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
  channel_filter?: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp' | 'meta' | null;
}

/**
 * Parameters for staff metrics API call
 */
export interface SLAStaffParams {
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
  channel_filter?: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp' | 'meta' | null;
}

/**
 * Parameters for daily trends API call
 */
export interface SLADailyTrendsParams {
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
  channel_filter?: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp' | 'meta' | null;
}

/**
 * Parameters for conversation details API call
 */
export interface SLAConversationDetailsParams {
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
  sla_status_filter?: 'met' | 'breached' | 'unanswered' | 'outside_business_hours' | 'abandoned' | 'conversation_ended' | null;
  channel_filter?: 'line' | 'website' | 'facebook' | 'instagram' | 'whatsapp' | 'meta' | null;
  limit?: number; // Default 100
}

/**
 * API response wrapper for SLA endpoints
 */
export interface SLAAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Date range selector state
 */
export interface SLADateRange {
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';
}

/**
 * SLA status color mapping for UI
 */
export const SLA_STATUS_COLORS = {
  met: 'green',
  breached: 'red',
  unanswered: 'gray',
  outside_business_hours: 'blue',
  abandoned: 'orange', // >24hr response time - not tracked in SLA
  conversation_ended: 'purple' // >12hr business hours - likely conversation closer
} as const;

/**
 * Response category color mapping for UI
 */
export const RESPONSE_CATEGORY_COLORS = {
  staff_response: 'green',
  owner_response: 'yellow',
  owner_forced_after_10min: 'red', // CRITICAL
  historical_staff: 'gray'
} as const;

/**
 * Channel type labels for UI
 */
export const CHANNEL_LABELS = {
  line: 'LINE',
  website: 'Website',
  facebook: 'Facebook',
  instagram: 'Instagram',
  whatsapp: 'WhatsApp',
  meta: 'Meta'
} as const;

/**
 * SLA compliance thresholds for color coding
 */
export const SLA_COMPLIANCE_THRESHOLDS = {
  excellent: 95, // >= 95% = Green
  good: 85,      // >= 85% = Yellow
  poor: 85       // < 85% = Red
} as const;
