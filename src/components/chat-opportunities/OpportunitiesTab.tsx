'use client';

// OpportunitiesTab component - Main view for the chat opportunities feature
// Displays list of opportunities with filtering and detail view

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Scan,
  TrendingUp,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useChatOpportunities } from '@/hooks/useChatOpportunities';
import { OpportunityCard } from './OpportunityCard';
import { OpportunityDetail } from './OpportunityDetail';
import { OpportunityFilters } from './OpportunityFilters';
import type {
  ChatOpportunityWithConversation,
  OpportunityStatus,
} from '@/types/chat-opportunities';

interface OpportunitiesTabProps {
  onOpenChat: (conversationId: string, channelType: string) => void;
  userEmail?: string;
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
    scanLoading,
    actionLoading,
    error,
    filters,
    setFilters,
    resetFilters,
    fetchOpportunities,
    fetchStats,
    scanForOpportunities,
    updateOpportunity,
    refreshAll,
  } = useChatOpportunities();

  const [selectedOpportunity, setSelectedOpportunity] = useState<ChatOpportunityWithConversation | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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

  // Handle scan for new opportunities with configurable period
  // Uses LLM to classify each potential opportunity
  // Only LINE conversations for now
  const handleScan = useCallback(async (daysThreshold: number = 3, maxAgeDays: number = 30) => {
    setIsScanning(true);
    console.log(`[Scan] Starting scan: daysThreshold=${daysThreshold}, maxAgeDays=${maxAgeDays}`);

    try {
      const potentials = await scanForOpportunities(daysThreshold, maxAgeDays);
      console.log(`[Scan] Found ${potentials.length} potential conversations`);

      // Filter to LINE only and exclude those who already became customers
      const lineOnly = potentials.filter(p => p.channel_type === 'line' && !p.customer_id);
      console.log(`[Scan] Filtered to ${lineOnly.length} LINE conversations (excluding existing customers)`);

      let created = 0;
      let skipped = 0;
      let errors = 0;

      for (let i = 0; i < lineOnly.length; i++) {
        const potential = lineOnly[i];
        console.log(`[Scan] Processing ${i + 1}/${lineOnly.length}: ${potential.customer_name || 'Unknown'} (${potential.conversation_id})`);

        try {
          // Fetch conversation messages for LLM analysis
          console.log(`[Scan]   Fetching messages...`);
          const messagesRes = await fetch(`/api/conversations/unified/${potential.conversation_id}/messages`);
          const messagesData = await messagesRes.json();

          if (!messagesData.success) {
            console.log(`[Scan]   Failed to fetch messages: ${messagesData.error}`);
            errors++;
            continue;
          }

          if (!messagesData.messages?.length) {
            console.log(`[Scan]   No messages found, skipping`);
            skipped++;
            continue;
          }

          console.log(`[Scan]   Found ${messagesData.messages.length} messages, analyzing with LLM...`);

          // Use LLM to analyze the conversation
          const analyzeRes = await fetch('/api/chat-opportunities/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId: potential.conversation_id,
              messages: messagesData.messages.slice(-20), // Last 20 messages
            }),
          });

          const analysis = await analyzeRes.json();

          if (!analysis.success) {
            console.log(`[Scan]   LLM analysis failed: ${analysis.error}`);
            errors++;
            continue;
          }

          console.log(`[Scan]   LLM result: ${analysis.analysis?.opportunityType} (confidence: ${analysis.analysis?.confidenceScore})`);

          // Skip if LLM says it's not an opportunity
          if (analysis.analysis?.opportunityType === 'not_an_opportunity') {
            console.log(`[Scan]   Not an opportunity, skipping`);
            skipped++;
            continue;
          }

          // Create opportunity with LLM analysis
          console.log(`[Scan]   Creating opportunity: ${analysis.analysis.opportunityType}`);
          const createRes = await fetch('/api/chat-opportunities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversation_id: potential.conversation_id,
              channel_type: potential.channel_type,
              opportunity_type: analysis.analysis.opportunityType,
              priority: analysis.analysis.priority,
              confidence_score: analysis.analysis.confidenceScore,
              customer_name: potential.customer_name || analysis.analysis.extractedContactInfo?.name,
              customer_phone: potential.customer_phone || analysis.analysis.extractedContactInfo?.phone,
              customer_email: potential.customer_email || analysis.analysis.extractedContactInfo?.email,
              analysis_summary: analysis.analysis.analysisSummary,
              suggested_action: analysis.analysis.suggestedAction,
              suggested_message: analysis.analysis.suggestedMessage,
            }),
          });

          if (createRes.ok) {
            console.log(`[Scan]   Created successfully`);
            created++;
          } else {
            const createError = await createRes.json();
            console.log(`[Scan]   Failed to create: ${createError.error}`);
            errors++;
          }
        } catch (err) {
          console.error(`[Scan]   Error:`, err);
          errors++;
        }
      }

      console.log(`[Scan] Complete: ${lineOnly.length} analyzed, ${created} created, ${skipped} skipped, ${errors} errors`);
      await refreshAll();
    } finally {
      setIsScanning(false);
    }
  }, [scanForOpportunities, refreshAll]);

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
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Stats badges - hidden on mobile */}
            {stats && !statsLoading && (
              <div className="hidden lg:flex items-center gap-2 text-xs">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  {stats.conversion_rate.toFixed(0)}% converted
                </Badge>
              </div>
            )}

            {/* Scan button with dropdown for period */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isScanning || scanLoading}
                  className="h-7 px-2"
                >
                  {isScanning || scanLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Scan className="w-3.5 h-3.5" />
                  )}
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="text-xs text-gray-500">Scan Period</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleScan(2, 7)}>
                  Last 7 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleScan(3, 30)}>
                  Last 30 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleScan(3, 60)}>
                  Last 60 days
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleScan(3, 90)}>
                  Last 90 days
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAll}
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
                Tap Scan to find leads
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
