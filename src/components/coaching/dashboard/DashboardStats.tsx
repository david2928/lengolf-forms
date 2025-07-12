'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, BookOpen, Calendar } from 'lucide-react';
import { formatCurrency } from '@/lib/coachingUtils';
import { CoachDashboardData } from '@/types/coaching';

interface DashboardStatsProps {
  monthly_earnings: CoachDashboardData['monthly_earnings'];
  upcoming_sessions_count: number;
}

export function DashboardStats({ monthly_earnings, upcoming_sessions_count }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 truncate">
            Monthly Earnings
          </CardTitle>
          <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4">
          <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
            {formatCurrency(monthly_earnings.total_earnings)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {monthly_earnings.session_count} sessions
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 truncate">
            Average Rate
          </CardTitle>
          <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4">
          <div className="text-lg sm:text-2xl font-bold text-gray-900 truncate">
            {formatCurrency(monthly_earnings.average_rate)}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            per session
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 truncate">
            Sessions Done
          </CardTitle>
          <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4">
          <div className="text-lg sm:text-2xl font-bold text-gray-900">
            {monthly_earnings.session_count}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            this month
          </p>
        </CardContent>
      </Card>

      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 sm:px-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700 truncate">
            Upcoming
          </CardTitle>
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600 flex-shrink-0" />
        </CardHeader>
        <CardContent className="px-4 sm:px-6 pb-4">
          <div className="text-lg sm:text-2xl font-bold text-gray-900">
            {upcoming_sessions_count}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            scheduled
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 