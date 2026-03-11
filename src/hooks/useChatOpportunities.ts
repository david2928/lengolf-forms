// React hook for managing chat opportunities
// Provides data fetching, state management, and actions for the opportunities feature

import { useState, useCallback, useEffect } from 'react';
import type {
  ChatOpportunityWithConversation,
  OpportunityStats,
  OpportunityStatus,
  OpportunityPriority,
  OpportunityType,
  PotentialOpportunity,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  OpportunityFilterState,
  OpportunityAnalysis,
  ConversationMessage,
} from '@/types/chat-opportunities';
import type { ChannelType } from '@/types/chat-opportunities';

interface UseChatOpportunitiesOptions {
  autoFetch?: boolean;
  defaultFilters?: Partial<OpportunityFilterState>;
}

interface UseChatOpportunitiesReturn {
  // Data
  opportunities: ChatOpportunityWithConversation[];
  stats: OpportunityStats | null;
  potentialOpportunities: PotentialOpportunity[];

  // Loading states
  loading: boolean;
  statsLoading: boolean;
  scanLoading: boolean;
  actionLoading: boolean;

  // Error state
  error: string | null;

  // Filters
  filters: OpportunityFilterState;
  setFilters: (filters: Partial<OpportunityFilterState>) => void;
  resetFilters: () => void;

  // Actions
  fetchOpportunities: () => Promise<void>;
  fetchStats: () => Promise<void>;
  scanForOpportunities: (daysThreshold?: number, maxAgeDays?: number) => Promise<PotentialOpportunity[]>;
  createOpportunity: (data: CreateOpportunityRequest) => Promise<ChatOpportunityWithConversation | null>;
  updateOpportunity: (id: string, data: UpdateOpportunityRequest) => Promise<ChatOpportunityWithConversation | null>;
  analyzeConversation: (conversationId: string, messages: ConversationMessage[]) => Promise<OpportunityAnalysis | null>;
  refreshAll: () => Promise<void>;
}

const defaultFilters: OpportunityFilterState = {
  status: 'all',
  priority: 'all',
  type: 'all',
  channel: 'all',
};

export function useChatOpportunities(
  options: UseChatOpportunitiesOptions = {}
): UseChatOpportunitiesReturn {
  const { autoFetch = true, defaultFilters: initialFilters } = options;

  // State
  const [opportunities, setOpportunities] = useState<ChatOpportunityWithConversation[]>([]);
  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [potentialOpportunities, setPotentialOpportunities] = useState<PotentialOpportunity[]>([]);

  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFiltersState] = useState<OpportunityFilterState>({
    ...defaultFilters,
    ...initialFilters,
  });

  // Fetch opportunities with current filters
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (filters.status !== 'all') {
        params.append('status', filters.status);
      }
      if (filters.priority !== 'all') {
        params.append('priority', filters.priority);
      }
      if (filters.type !== 'all') {
        params.append('opportunityType', filters.type);
      }
      if (filters.channel !== 'all') {
        params.append('channelType', filters.channel);
      }

      const response = await fetch(`/api/chat-opportunities?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch opportunities');
      }

      setOpportunities(data.opportunities || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error fetching opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const response = await fetch('/api/chat-opportunities/stats');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      setStats(data.stats || null);
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Scan for potential opportunities
  const scanForOpportunities = useCallback(async (
    daysThreshold = 3,
    maxAgeDays = 30
  ): Promise<PotentialOpportunity[]> => {
    setScanLoading(true);
    console.log(`[Hook] Scanning with daysThreshold=${daysThreshold}, maxAgeDays=${maxAgeDays}`);

    try {
      const params = new URLSearchParams();
      params.append('daysThreshold', String(daysThreshold));
      params.append('maxAgeDays', String(maxAgeDays));

      const response = await fetch(`/api/chat-opportunities/scan?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to scan for opportunities');
      }

      const results = data.potentialOpportunities || [];
      console.log(`[Hook] API returned ${results.length} potential opportunities (count: ${data.count})`);
      setPotentialOpportunities(results);
      return results;
    } catch (err) {
      console.error('[Hook] Error scanning for opportunities:', err);
      return [];
    } finally {
      setScanLoading(false);
    }
  }, []);

  // Create a new opportunity
  const createOpportunity = useCallback(async (
    data: CreateOpportunityRequest
  ): Promise<ChatOpportunityWithConversation | null> => {
    setActionLoading(true);

    try {
      const response = await fetch('/api/chat-opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create opportunity');
      }

      // Refresh the list after creating
      await fetchOpportunities();
      await fetchStats();

      return result.opportunity;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error creating opportunity:', err);
      return null;
    } finally {
      setActionLoading(false);
    }
  }, [fetchOpportunities, fetchStats]);

  // Update an opportunity
  const updateOpportunity = useCallback(async (
    id: string,
    data: UpdateOpportunityRequest
  ): Promise<ChatOpportunityWithConversation | null> => {
    setActionLoading(true);

    try {
      const response = await fetch(`/api/chat-opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to update opportunity');
      }

      // Update local state - if the status changed and we're filtering by status,
      // the item may no longer belong in the current list, so re-fetch
      const updatedOpp = result.opportunity;
      const statusChanged = data.status && updatedOpp.status !== undefined;

      if (statusChanged) {
        // Re-fetch to ensure the list matches the current filter
        await fetchOpportunities();
      } else {
        setOpportunities(prev =>
          prev.map(opp => opp.id === id ? { ...opp, ...updatedOpp } : opp)
        );
      }

      // Refresh stats
      await fetchStats();

      return result.opportunity;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error updating opportunity:', err);
      return null;
    } finally {
      setActionLoading(false);
    }
  }, [fetchOpportunities, fetchStats]);

  // Analyze a conversation with AI
  const analyzeConversation = useCallback(async (
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<OpportunityAnalysis | null> => {
    setActionLoading(true);

    try {
      const response = await fetch('/api/chat-opportunities/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, messages }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to analyze conversation');
      }

      return result.analysis || null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Error analyzing conversation:', err);
      return null;
    } finally {
      setActionLoading(false);
    }
  }, []);

  // Set filters
  const setFilters = useCallback((newFilters: Partial<OpportunityFilterState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([fetchOpportunities(), fetchStats()]);
  }, [fetchOpportunities, fetchStats]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchOpportunities();
      fetchStats();
    }
  }, [autoFetch, fetchOpportunities, fetchStats]);

  // Re-fetch when filters change
  useEffect(() => {
    if (autoFetch) {
      fetchOpportunities();
    }
  }, [filters, autoFetch, fetchOpportunities]);

  return {
    // Data
    opportunities,
    stats,
    potentialOpportunities,

    // Loading states
    loading,
    statsLoading,
    scanLoading,
    actionLoading,

    // Error state
    error,

    // Filters
    filters,
    setFilters,
    resetFilters,

    // Actions
    fetchOpportunities,
    fetchStats,
    scanForOpportunities,
    createOpportunity,
    updateOpportunity,
    analyzeConversation,
    refreshAll,
  };
}

export default useChatOpportunities;
