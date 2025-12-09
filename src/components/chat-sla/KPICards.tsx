/**
 * KPI Cards Component for Chat SLA Dashboard
 * Displays 4 key performance indicator cards
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, MessageSquare } from 'lucide-react';
import type { ChatSLAOverview } from '@/types/chat-sla';

interface KPICardsProps {
  data: ChatSLAOverview | undefined;
  isLoading: boolean;
}

export default function KPICards({ data, isLoading }: KPICardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">No data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate total answered messages for percentages
  const totalAnswered = data.sla_met_count + data.sla_breached_count;

  // Determine color for SLA compliance rate
  const getSLAColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* SLA Compliance Rate */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">SLA Compliance</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getSLAColor(data.sla_compliance_rate)}`}>
            {data.sla_compliance_rate.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.sla_met_count} met, {data.sla_breached_count} breached
          </p>
          <p className="text-xs text-muted-foreground">
            {totalAnswered} total responses
          </p>
        </CardContent>
      </Card>

      {/* Average Response Time */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.avg_response_minutes.toFixed(1)} min
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Median: {data.median_response_minutes.toFixed(1)} min
          </p>
          <p className="text-xs text-muted-foreground">
            Business hours only
          </p>
        </CardContent>
      </Card>

      {/* Total Messages */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Messages Handled</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data.business_hours_messages}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Business hours messages
          </p>
          <p className="text-xs text-muted-foreground">
            LINE: {data.line_messages}, Web: {data.website_messages}, Meta: {data.meta_messages}
          </p>
        </CardContent>
      </Card>

      {/* Unanswered, Ended & Abandoned Messages */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Non-SLA Messages</CardTitle>
          <XCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${(data.unanswered_count + data.conversation_ended_count + data.abandoned_count) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {data.unanswered_count + data.conversation_ended_count + data.abandoned_count}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {data.unanswered_count} unanswered, {data.conversation_ended_count} ended
          </p>
          <p className="text-xs text-muted-foreground">
            {data.abandoned_count} abandoned (&gt;24hr)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
