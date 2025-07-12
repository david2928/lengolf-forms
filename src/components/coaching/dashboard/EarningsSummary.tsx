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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
          Recent Earnings
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Earnings are auto-calculated from POS reconciliation data.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <div className="bg-gradient-to-br from-emerald-50 to-blue-50 p-4 sm:p-6 rounded-lg border border-emerald-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center sm:text-left">
              <div className="text-xs sm:text-sm font-medium text-emerald-700 mb-1">This Month</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">
                {formatCurrency(earnings.current_month_earnings)}
              </div>
              <div className="text-xs text-gray-600">{earnings.current_month_sessions} lessons</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs sm:text-sm font-medium text-blue-700 mb-1">Previous Month</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">
                {formatCurrency(earnings.previous_month_earnings)}
              </div>
              <div className="text-xs text-gray-600">for comparison</div>
            </div>
            <div className="text-center sm:text-left">
              <div className="text-xs sm:text-sm font-medium text-purple-700 mb-1">All Time</div>
              <div className="text-lg sm:text-xl font-bold text-gray-900">
                {formatCurrency(earnings.total_earnings)}
              </div>
              <div className="text-xs text-gray-600">{earnings.total_sessions} lessons total</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 