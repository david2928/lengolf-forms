'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { formatCurrency } from '@/lib/coachingUtils';
import { CoachDashboardData } from '@/types/coaching';

interface EarningsSummaryProps {
  earnings: CoachDashboardData['earnings'];
}

export function EarningsSummary({ earnings }: EarningsSummaryProps) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-gray-400" />
          Recent Earnings
        </CardTitle>
        <CardDescription>Earnings are auto-calculated from POS reconciliation data.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-600">This Month</div>
              <div className="text-xl font-bold text-gray-800">{formatCurrency(earnings.current_month_earnings)}</div>
              <div className="text-xs text-gray-500">{earnings.current_month_sessions} lessons</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Previous Month</div>
              <div className="text-xl font-bold text-gray-800">{formatCurrency(earnings.previous_month_earnings)}</div>
              <div className="text-xs text-gray-500">{/* Placeholder for comparison */}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">All Time</div>
              <div className="text-xl font-bold text-gray-800">{formatCurrency(earnings.total_earnings)}</div>
              <div className="text-xs text-gray-500">{earnings.total_sessions} lessons</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 