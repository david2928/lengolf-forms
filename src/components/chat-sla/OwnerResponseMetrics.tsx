/**
 * Owner Response Metrics Component for Chat SLA Dashboard
 * Tracks owner involvement separately from staff SLA
 * CRITICAL: Highlights when owner had to respond after 10min (staff failure)
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, UserCog, CheckCircle2 } from 'lucide-react';
import type { ChatSLAOverview } from '@/types/chat-sla';

interface OwnerResponseMetricsProps {
  data: ChatSLAOverview | undefined;
  isLoading: boolean;
}

export default function OwnerResponseMetrics({ data, isLoading }: OwnerResponseMetricsProps) {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-5 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-gray-200 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5" />
            Owner Response Tracking
          </CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calculate owner involvement rate
  const ownerInvolvementRate = data.business_hours_messages > 0
    ? (data.total_owner_responses / data.business_hours_messages) * 100
    : 0;

  // Determine if owner involvement is concerning
  const isConcerning = data.owner_forced_after_10min > 0;
  const isHighInvolvement = ownerInvolvementRate > 20; // More than 20% is high

  return (
    <Card className={isConcerning ? 'border-red-500 border-2' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCog className="h-5 w-5" />
          Owner Response Tracking
          {isConcerning && <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse" />}
        </CardTitle>
        <CardDescription>
          Owner responses are tracked separately and do NOT count toward staff SLA metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CRITICAL: Owner forced to respond after 10min */}
          <div className={`p-4 rounded-lg ${isConcerning ? 'bg-red-50 border-2 border-red-500' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-5 w-5 ${isConcerning ? 'text-red-600' : 'text-gray-400'}`} />
              <h3 className="font-semibold text-sm">Staff Failed to Respond</h3>
            </div>
            <div className={`text-3xl font-bold ${isConcerning ? 'text-red-600' : 'text-gray-600'}`}>
              {data.owner_forced_after_10min}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isConcerning ? (
                <span className="text-red-600 font-semibold">
                  ⚠️ Owner had to step in - staff didn&apos;t respond in time
                </span>
              ) : (
                <span className="text-green-600">
                  ✓ No forced owner responses
                </span>
              )}
            </p>
          </div>

          {/* Owner responses within 10min */}
          <div className="p-4 rounded-lg bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-sm">Owner Quick Responses</h3>
            </div>
            <div className="text-3xl font-bold text-blue-600">
              {data.owner_responses_within_10min}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Owner responded within 10 min (proactive or quick assist)
            </p>
          </div>

          {/* Total owner involvement */}
          <div className={`p-4 rounded-lg ${isHighInvolvement ? 'bg-yellow-50 border-2 border-yellow-500' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <UserCog className={`h-5 w-5 ${isHighInvolvement ? 'text-yellow-600' : 'text-gray-600'}`} />
              <h3 className="font-semibold text-sm">Total Owner Responses</h3>
            </div>
            <div className={`text-3xl font-bold ${isHighInvolvement ? 'text-yellow-600' : 'text-gray-600'}`}>
              {data.total_owner_responses}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {ownerInvolvementRate.toFixed(1)}% of all messages
              {isHighInvolvement && (
                <span className="text-yellow-600 font-semibold block mt-1">
                  ⚠️ High owner involvement - consider staff training
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Explanation note */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Note:</strong> Owner responses are separated from staff SLA to accurately measure team performance.
            The &quot;Staff Failed to Respond&quot; metric shows when the owner had to intervene because staff didn&apos;t respond within 10 minutes,
            indicating a critical gap in staff coverage.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
