'use client';

// OpportunitiesTab component - Main view for the chat opportunities feature
// Displays list of opportunities with filtering and detail view
// Note: Scanning is now automated via daily batch processing (pg_cron)

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  TrendingUp,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useChatOpportunities } from '@/hooks/useChatOpportunities';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityDetail } from './OpportunityDetail';
import { OpportunityFilters } from './OpportunityFilters';
import type {
  ChatOpportunityWithConversation,
  OpportunityStatus,
} from '@/types/chat-opportunities';

interface BatchRunStatus {
  id: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  trigger_type: 'cron' | 'manual';
  scanned: number;
  analyzed: number;
  created: number;
  skipped: number;
  errors: number;
  processing_time_ms: number | null;
  error_message: string | null;
}

interface BatchStatusResponse {
  success: boolean;
  lastRun: BatchRunStatus | null;
  summary: {
    last7DaysCreated: number;
    last7DaysRuns: number;
  };
}

interface OpportunitiesTabProps {
  onOpenChat: (conversationId: string, channelType: string) => void;
  userEmail?: string;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

export function OpportunitiesTab({
  onOpenChat,
  userEmail,
}: OpportunitiesTabProps) {
  const {
    opportunities,
    stats,
    loading,
    statsLoading,
    actionLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    updateOpportunity,
    refreshAll,
  } = useChatOpportunities();

  const [selectedOpportunity, setSelectedOpportunity] = useState<ChatOpportunityWithConversation | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatusResponse | null>(null);
  const [batchStatusLoading, setBatchStatusLoading] = useState(false);

  // Fetch batch processing status
  const fetchBatchStatus = useCallback(async () => {
    setBatchStatusLoading(true);
    try {
      const response = await fetch('/api/chat-opportunities/batch-process/status');
      const data = await response.json();
      if (data.success) {
        setBatchStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch batch status:', err);
    } finally {
      setBatchStatusLoading(false);
    }
  }, []);

  // Fetch batch status on mount
  useEffect(() => {
    fetchBatchStatus();
  }, [fetchBatchStatus]);

  // Handle selecting an opportunity
  const handleSelectOpportunity = useCallback((opportunity: ChatOpportunityWithConversation) => {
    setSelectedOpportunity(prev => prev?.id === opportunity.id ? null : opportunity);
  }, []);

  // Handle opening chat (navigate to main chat view)
  const handleOpenChat = useCallback((opportunity: ChatOpportunityWithConversation) => {
    setSelectedOpportunity(null);
    onOpenChat(opportunity.conversation_id, opportunity.channel_type);
  }, [onOpenChat]);

  // Handle marking as contacted
  const handleMarkContacted = useCallback(async (opportunity: ChatOpportunityWithConversation) => {
    await updateOpportunity(opportunity.id, {
      status: 'contacted',
      contacted_by: userEmail,
    });
  }, [updateOpportunity, userEmail]);

  // Handle dismissing an opportunity
  const handleDismiss = useCallback(async (opportunity: ChatOpportunityWithConversation) => {
    await updateOpportunity(opportunity.id, {
      status: 'dismissed',
      contacted_by: userEmail,
    });
  }, [updateOpportunity, userEmail]);

  // Handle status update from detail view
  const handleUpdateStatus = useCallback(async (
    opportunity: ChatOpportunityWithConversation,
    status: OpportunityStatus,
    outcome?: string,
    notes?: string
  ) => {
    await updateOpportunity(opportunity.id, {
      status,
      outcome,
      outcome_notes: notes,
      contacted_by: userEmail,
    });

    // Close detail view if opportunity was resolved
    if (status === 'converted' || status === 'lost' || status === 'dismissed') {
      setSelectedOpportunity(null);
    }
  }, [updateOpportunity, userEmail]);

  // Close detail view
  const handleCloseDetail = useCallback(() => {
    setSelectedOpportunity(null);
  }, []);

  // Stats summary for filters
  const filterStats = stats ? {
    pending: stats.total_pending,
    contacted: stats.total_contacted,
    converted: stats.total_converted,
    lost: stats.total_lost,
    dismissed: stats.total_dismissed,
  } : undefined;

  // Batch status indicator
  const renderBatchStatus = () => {
    if (batchStatusLoading) {
      return (
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" />
        </div>
      );
    }

    if (!batchStatus?.lastRun) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">No scans yet</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Automated scanning runs daily at 9 AM</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    const lastRun = batchStatus.lastRun;
    const isRecent = lastRun.completed_at &&
      (Date.now() - new Date(lastRun.completed_at).getTime()) < 24 * 60 * 60 * 1000;

    const statusIcon = lastRun.status === 'completed' ? (
      <CheckCircle2 className="w-3 h-3 text-green-500" />
    ) : lastRun.status === 'failed' ? (
      <XCircle className="w-3 h-3 text-red-500" />
    ) : (
      <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
    );

    const tooltipContent = (
      <div className="text-xs space-y-1">
        <p className="font-medium">
          Last scan: {lastRun.completed_at ? formatRelativeTime(lastRun.completed_at) : 'In progress'}
        </p>
        {lastRun.status === 'completed' && (
          <>
            <p>Scanned: {lastRun.scanned} conversations</p>
            <p>Created: {lastRun.created} opportunities</p>
            {lastRun.skipped > 0 && <p>Skipped: {lastRun.skipped}</p>}
            {lastRun.errors > 0 && <p className="text-red-400">Errors: {lastRun.errors}</p>}
          </>
        )}
        {lastRun.status === 'failed' && lastRun.error_message && (
          <p className="text-red-400">{lastRun.error_message}</p>
        )}
        <p className="text-gray-400 mt-1">
          Last 7 days: {batchStatus.summary.last7DaysCreated} opportunities from {batchStatus.summary.last7DaysRuns} scans
        </p>
      </div>
    );

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 text-xs ${
              isRecent ? 'text-gray-600' : 'text-gray-400'
            }`}>
              {statusIcon}
              <span className="hidden sm:inline">
                {lastRun.status === 'running' ? 'Scanning...' : formatRelativeTime(lastRun.completed_at || lastRun.started_at)}
              </span>
              {lastRun.status === 'completed' && lastRun.created > 0 && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  +{lastRun.created}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent align="end" className="max-w-xs">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Compact Header - Filters and Actions */}
      <div className="flex-shrink-0 px-2 py-2 sm:px-3 sm:py-2.5 bg-white border-b">
        <div className="flex items-center justify-between gap-2">
          {/* Filters */}
          <div className="flex-1 min-w-0">
            <OpportunityFilters
              filters={filters}
              onFiltersChange={setFilters}
              onReset={resetFilters}
              stats={filterStats}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Stats badges - hidden on mobile */}
            {stats && !statsLoading && (
              <div className="hidden lg:flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {stats.conversion_rate.toFixed(0)}% converted
                </Badge>
              </div>
            )}

            {/* Batch status indicator */}
            {renderBatchStatus()}

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refreshAll();
                fetchBatchStatus();
              }}
              disabled={loading}
              className="h-7 w-7 p-0"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Opportunities list - hidden on mobile when detail is open */}
        <div className={`overflow-y-auto ${
          selectedOpportunity
            ? 'hidden md:block md:w-64 lg:w-72 flex-shrink-0 border-r'
            : 'flex-1'
        }`}>
          {error && (
            <div className="m-2 p-2 border border-red-200 bg-red-50 rounded flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-8 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500 text-sm">No opportunities found</p>
              <p className="text-xs text-gray-400 mt-1">
                New leads are discovered daily at 9 AM
              </p>
            </div>
          ) : (
            <div className="bg-white">
              {opportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  isSelected={selectedOpportunity?.id === opportunity.id}
                  onSelect={handleSelectOpportunity}
                  onOpenChat={handleOpenChat}
                  onMarkContacted={handleMarkContacted}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detail panel - full screen on mobile */}
        {selectedOpportunity && (
          <div className="flex-1 bg-white overflow-hidden">
            <OpportunityDetail
              opportunity={selectedOpportunity}
              onClose={handleCloseDetail}
              onOpenChat={handleOpenChat}
              onUpdateStatus={handleUpdateStatus}
              loading={actionLoading}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default OpportunitiesTab;
