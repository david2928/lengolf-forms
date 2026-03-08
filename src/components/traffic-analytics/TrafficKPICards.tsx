'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  UserPlus,
  Eye,
  Target,
  Activity,
} from 'lucide-react';
import { TrafficKPIs } from '@/hooks/useTrafficAnalytics';

interface TrafficKPICardsProps {
  data: TrafficKPIs;
  days: number;
  isLoading?: boolean;
}

const formatNumber = (num: number) => num.toLocaleString();

const getTrendBadgeClass = (change: number, inverse: boolean = false) => {
  if (inverse) {
    if (change > 0) return 'bg-red-100 text-red-800 border-red-200';
    if (change < 0) return 'bg-green-100 text-green-800 border-green-200';
  } else {
    if (change > 0) return 'bg-green-100 text-green-800 border-green-200';
    if (change < 0) return 'bg-red-100 text-red-800 border-red-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const TrafficKPICards: React.FC<TrafficKPICardsProps> = ({ data, days, isLoading = false }) => {
  const avgDAU = days > 0 ? Math.round(data.users / days) : 0;
  const avgDailyNew = days > 0 ? Math.round(data.newUsers / days) : 0;
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Sessions',
      value: formatNumber(data.sessions),
      change: data.sessionsChange,
      icon: Activity,
      inverse: false,
    },
    {
      title: 'Avg. DAU',
      value: formatNumber(avgDAU),
      change: data.usersChange,
      icon: Users,
      inverse: false,
    },
    {
      title: 'Avg. Daily New',
      value: formatNumber(avgDailyNew),
      change: data.newUsersChange,
      icon: UserPlus,
      inverse: false,
    },
    {
      title: 'Page Views',
      value: formatNumber(data.pageViews),
      change: data.pageViewsChange,
      icon: Eye,
      inverse: false,
    },
    {
      title: 'Bounce Rate',
      value: `${data.bounceRate.toFixed(1)}%`,
      change: data.bounceRateChange,
      icon: TrendingDown,
      inverse: true,
    },
    {
      title: 'Conversions',
      value: formatNumber(data.conversions),
      change: data.conversionsChange,
      icon: Target,
      inverse: false,
    },
    {
      title: 'Conversion Rate',
      value: `${data.conversionRate.toFixed(2)}%`,
      change: data.conversionRateChange,
      icon: TrendingUp,
      inverse: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpiCards.map((kpi) => {
        const IconComponent = kpi.icon;
        const badgeClass = getTrendBadgeClass(kpi.change, kpi.inverse);

        return (
          <Card key={kpi.title} className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {kpi.title}
              </CardTitle>
              <IconComponent className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <div className="text-2xl font-bold text-gray-900">
                  {kpi.value}
                </div>
                <Badge variant="outline" className={`text-xs ${badgeClass}`}>
                  {kpi.change > 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default TrafficKPICards;
