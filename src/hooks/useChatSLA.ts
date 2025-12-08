/**
 * Custom React hooks for Chat SLA data fetching
 * Uses React Query for caching, automatic refetching, and loading states
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ChatSLAOverview,
  StaffSLAMetrics,
  DailySLATrend,
  ConversationSLADetail,
  SLAOverviewParams,
  SLAStaffParams,
  SLADailyTrendsParams,
  SLAConversationDetailsParams,
  SLAAPIResponse
} from '@/types/chat-sla';

/**
 * Hook to fetch overall SLA overview metrics
 */
export function useChatSLAOverview(params: SLAOverviewParams) {
  return useQuery({
    queryKey: ['chat-sla-overview', params.start_date, params.end_date, params.channel_filter],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        start_date: params.start_date,
        end_date: params.end_date,
        ...(params.channel_filter && { channel: params.channel_filter })
      });

      const response = await fetch(`/api/chat-sla/overview?${searchParams}`);
      const result: SLAAPIResponse<ChatSLAOverview> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch SLA overview');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(params.start_date && params.end_date) // Only fetch if dates are provided
  });
}

/**
 * Hook to fetch per-staff SLA metrics
 */
export function useChatSLAByStaff(params: SLAStaffParams) {
  return useQuery({
    queryKey: ['chat-sla-staff', params.start_date, params.end_date, params.channel_filter],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        start_date: params.start_date,
        end_date: params.end_date,
        ...(params.channel_filter && { channel: params.channel_filter })
      });

      const response = await fetch(`/api/chat-sla/staff-metrics?${searchParams}`);
      const result: SLAAPIResponse<StaffSLAMetrics[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch staff SLA metrics');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(params.start_date && params.end_date)
  });
}

/**
 * Hook to fetch daily SLA trends for charts
 */
export function useChatSLADailyTrends(params: SLADailyTrendsParams) {
  return useQuery({
    queryKey: ['chat-sla-daily-trends', params.start_date, params.end_date, params.channel_filter],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        start_date: params.start_date,
        end_date: params.end_date,
        ...(params.channel_filter && { channel: params.channel_filter })
      });

      const response = await fetch(`/api/chat-sla/daily-trends?${searchParams}`);
      const result: SLAAPIResponse<DailySLATrend[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch daily SLA trends');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(params.start_date && params.end_date)
  });
}

/**
 * Hook to fetch conversation-level SLA details
 */
export function useChatSLAConversationDetails(params: SLAConversationDetailsParams) {
  return useQuery({
    queryKey: [
      'chat-sla-conversation-details',
      params.start_date,
      params.end_date,
      params.sla_status_filter,
      params.channel_filter,
      params.limit
    ],
    queryFn: async () => {
      const searchParams = new URLSearchParams({
        start_date: params.start_date,
        end_date: params.end_date,
        ...(params.sla_status_filter && { sla_status: params.sla_status_filter }),
        ...(params.channel_filter && { channel: params.channel_filter }),
        ...(params.limit && { limit: params.limit.toString() })
      });

      const response = await fetch(`/api/chat-sla/conversation-details?${searchParams}`);
      const result: SLAAPIResponse<ConversationSLADetail[]> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to fetch conversation SLA details');
      }

      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(params.start_date && params.end_date)
  });
}

/**
 * Hook to manually refresh SLA metrics materialized view (admin only)
 */
export function useRefreshSLAMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/chat-sla/refresh-metrics', {
        method: 'POST'
      });

      const result: SLAAPIResponse<{ message: string; refreshed_at: string }> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to refresh SLA metrics');
      }

      return result.data;
    },
    onSuccess: () => {
      // Invalidate all SLA queries to refetch with fresh data
      queryClient.invalidateQueries({ queryKey: ['chat-sla-overview'] });
      queryClient.invalidateQueries({ queryKey: ['chat-sla-staff'] });
      queryClient.invalidateQueries({ queryKey: ['chat-sla-daily-trends'] });
      queryClient.invalidateQueries({ queryKey: ['chat-sla-conversation-details'] });
    }
  });
}

/**
 * Helper hook to get loading state for all SLA queries
 */
export function useChatSLALoading(params: SLAOverviewParams) {
  const overviewQuery = useChatSLAOverview(params);
  const staffQuery = useChatSLAByStaff(params);
  const trendsQuery = useChatSLADailyTrends(params);

  return {
    isLoading: overviewQuery.isLoading || staffQuery.isLoading || trendsQuery.isLoading,
    isError: overviewQuery.isError || staffQuery.isError || trendsQuery.isError,
    error: overviewQuery.error || staffQuery.error || trendsQuery.error
  };
}
