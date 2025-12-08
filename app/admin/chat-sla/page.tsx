/**
 * Chat SLA Dashboard Page
 * Admin dashboard for monitoring staff response times and SLA compliance
 * Tracks 10-minute SLA for all channels (LINE, Website, Meta)
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Calendar } from 'lucide-react';
import {
  useChatSLAOverview,
  useChatSLAByStaff,
  useChatSLADailyTrends,
  useRefreshSLAMetrics,
  useChatSLALoading
} from '@/hooks/useChatSLA';
import KPICards from '@/components/chat-sla/KPICards';
import OwnerResponseMetrics from '@/components/chat-sla/OwnerResponseMetrics';
import StaffPerformanceTable from '@/components/chat-sla/StaffPerformanceTable';
import SLATrendsChart from '@/components/chat-sla/SLATrendsChart';
import ConversationDetailsTable from '@/components/chat-sla/ConversationDetailsTable';
import type { SLADateRange } from '@/types/chat-sla';

// Helper function to get date range presets
function getDateRange(preset: SLADateRange['preset']): { start_date: string; end_date: string } {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  switch (preset) {
    case 'today':
      return {
        start_date: today.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
    case 'yesterday':
      return {
        start_date: yesterday.toISOString().split('T')[0],
        end_date: yesterday.toISOString().split('T')[0]
      };
    case 'last7days': {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return {
        start_date: sevenDaysAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
    }
    case 'last30days': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        start_date: thirtyDaysAgo.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
    }
    case 'thisMonth': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start_date: firstDay.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
    }
    case 'lastMonth': {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      return {
        start_date: firstDayLastMonth.toISOString().split('T')[0],
        end_date: lastDayLastMonth.toISOString().split('T')[0]
      };
    }
    default:
      return {
        start_date: today.toISOString().split('T')[0],
        end_date: today.toISOString().split('T')[0]
      };
  }
}

export default function ChatSLADashboardPage() {
  const [dateRangePreset, setDateRangePreset] = useState<SLADateRange['preset']>('last7days');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const dateRange = getDateRange(dateRangePreset);
  const channelValue = channelFilter === 'all' ? null : channelFilter;

  // Fetch data using custom hooks
  const { data: overviewData, isLoading: overviewLoading } = useChatSLAOverview({
    ...dateRange,
    channel_filter: channelValue as any
  });

  const { data: staffData, isLoading: staffLoading } = useChatSLAByStaff({
    ...dateRange,
    channel_filter: channelValue as any
  });

  const { data: trendsData, isLoading: trendsLoading } = useChatSLADailyTrends({
    ...dateRange,
    channel_filter: channelValue as any
  });

  const { isLoading, isError, error } = useChatSLALoading({
    ...dateRange,
    channel_filter: channelValue as any
  });

  // Refresh mutation
  const refreshMutation = useRefreshSLAMetrics();

  const handleRefresh = async () => {
    try {
      await refreshMutation.mutateAsync();
      setLastRefreshed(new Date());
    } catch (error) {
      console.error('Failed to refresh metrics:', error);
      alert('Failed to refresh metrics. Please try again.');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header with filters and refresh button */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Chat SLA Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor staff response times and SLA compliance (10-minute target)
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={dateRangePreset}
              onValueChange={(value) => setDateRangePreset(value as SLADateRange['preset'])}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last7days">Last 7 Days</SelectItem>
                <SelectItem value="last30days">Last 30 Days</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Channel Filter */}
          <Select value={channelFilter} onValueChange={setChannelFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="line">LINE</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            disabled={refreshMutation.isPending}
            variant="outline"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            Refresh Metrics
          </Button>
        </div>
      </div>

      {/* Last refreshed timestamp */}
      <div className="text-sm text-muted-foreground">
        Last refreshed: {lastRefreshed.toLocaleTimeString()}
      </div>

      {/* Error state */}
      {isError && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Data</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* KPI Cards */}
      <KPICards data={overviewData} isLoading={isLoading} />

      {/* Owner Response Metrics - SEPARATE KPI */}
      <OwnerResponseMetrics data={overviewData} isLoading={isLoading} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6">
        <SLATrendsChart
          data={trendsData}
          isLoading={trendsLoading}
        />
      </div>

      {/* Staff Performance Table */}
      <StaffPerformanceTable
        data={staffData}
        isLoading={staffLoading}
      />

      {/* Conversation Details Table */}
      <ConversationDetailsTable dateRange={dateRange} />
    </div>
  );
}
