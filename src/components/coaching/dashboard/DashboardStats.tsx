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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(monthly_earnings.total_earnings)}</div>
          <p className="text-xs text-muted-foreground">
            {monthly_earnings.session_count} sessions
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Average Rate</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(monthly_earnings.average_rate)}</div>
          <p className="text-xs text-muted-foreground">
            per session
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sessions Completed</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{monthly_earnings.session_count}</div>
          <p className="text-xs text-muted-foreground">
            this month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Scheduled Lessons</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{upcoming_sessions_count}</div>
          <p className="text-xs text-muted-foreground">
            upcoming
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 