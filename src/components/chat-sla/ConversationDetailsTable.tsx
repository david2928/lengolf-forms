/**
 * Conversation Details Table Component for Chat SLA Dashboard
 * Paginated drill-down table showing individual conversation-level SLA data
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import { useChatSLAConversationDetails } from '@/hooks/useChatSLA';
import type { SLAConversationDetailsParams } from '@/types/chat-sla';
import { CHANNEL_LABELS } from '@/types/chat-sla';

interface ConversationDetailsTableProps {
  dateRange: {
    start_date: string;
    end_date: string;
  };
}

export default function ConversationDetailsTable({ dateRange }: ConversationDetailsTableProps) {
  const [slaStatusFilter, setSlaStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const params: SLAConversationDetailsParams = {
    start_date: dateRange.start_date,
    end_date: dateRange.end_date,
    sla_status_filter: slaStatusFilter === 'all' ? undefined : slaStatusFilter as any,
    channel_filter: channelFilter === 'all' ? undefined : channelFilter as any,
    limit: 100
  };

  const { data, isLoading, isError, error } = useChatSLAConversationDetails(params);

  const getSLAStatusBadge = (status: string) => {
    switch (status) {
      case 'met':
        return <Badge className="bg-green-500">Met</Badge>;
      case 'breached':
        return <Badge className="bg-red-500">Breached</Badge>;
      case 'unanswered':
        return <Badge className="bg-gray-500">Unanswered</Badge>;
      case 'outside_business_hours':
        return <Badge className="bg-blue-500">Outside Hours</Badge>;
      case 'abandoned':
        return <Badge className="bg-orange-500">Abandoned</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conversation Details</CardTitle>
          <CardDescription className="text-red-600">
            Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversation Details</CardTitle>
        <CardDescription>
          Detailed conversation-level SLA data for drill-down analysis
        </CardDescription>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">SLA Status</label>
            <Select value={slaStatusFilter} onValueChange={setSlaStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by SLA status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="met">Met</SelectItem>
                <SelectItem value="breached">Breached</SelectItem>
                <SelectItem value="unanswered">Unanswered</SelectItem>
                <SelectItem value="outside_business_hours">Outside Business Hours</SelectItem>
                <SelectItem value="abandoned">Abandoned (&gt;24hr)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Channel</label>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by channel" />
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
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {!data || data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No conversations found for the selected filters
          </div>
        ) : (
          <>
            <div className="mb-4 px-6 pt-4 text-sm text-muted-foreground">
              Showing {data.length} conversations (most recent first)
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/50">
                    <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[18%]">Time</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[25%]">Customer</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] hidden md:table-cell">Channel</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%] hidden lg:table-cell">Staff</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%]">Response</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[13%]">SLA Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data
                    .sort((a: any, b: any) => new Date(b.customer_message_time).getTime() - new Date(a.customer_message_time).getTime())
                    .map((conv: any, index: number) => (
                    <TableRow
                      key={conv.conversation_id + index}
                      className={`hover:bg-gray-50/50 transition-colors ${conv.is_critical ? 'bg-red-50' : ''}`}
                    >
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 font-medium">
                          {formatTimestamp(conv.customer_message_time)}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-xs font-semibold text-purple-700">
                                {conv.customer_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-sm">{conv.customer_name}</p>
                            <div className="md:hidden mt-1 flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {CHANNEL_LABELS[conv.channel_type as keyof typeof CHANNEL_LABELS] || conv.channel_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 hidden md:table-cell">
                        <Badge variant="outline">
                          {CHANNEL_LABELS[conv.channel_type as keyof typeof CHANNEL_LABELS] || conv.channel_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-4 py-4 hidden lg:table-cell">
                        <div className="text-sm text-gray-900">
                          {conv.responding_staff_name}
                        </div>
                        {conv.is_owner_response && (
                          <Badge variant="outline" className="mt-1 text-xs">Owner</Badge>
                        )}
                        {conv.is_critical && (
                          <div className="flex items-center gap-1 text-red-600 text-xs mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span className="font-semibold">Staff Failed</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {conv.response_time_minutes !== null
                            ? `${conv.response_time_minutes.toFixed(1)} min`
                            : '-'}
                        </div>
                        <div className="lg:hidden text-xs text-gray-500 mt-1">
                          {conv.responding_staff_name}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        {getSLAStatusBadge(conv.sla_status)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
