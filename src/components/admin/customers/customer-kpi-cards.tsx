/**
 * Customer KPI Cards Component
 * CMS-010: Customer List UI - KPI Dashboard
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { CustomerKPIs } from '@/hooks/useCustomerManagement';
import { Users, UserPlus, TrendingUp, DollarSign } from 'lucide-react';

interface CustomerKPICardsProps {
  kpis: CustomerKPIs | null;
  loading: boolean;
}

export function CustomerKPICards({ kpis, loading }: CustomerKPICardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[60px] mb-2" />
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!kpis) {
    return null;
  }

  const kpiCards = [
    {
      title: 'Total Customers',
      value: kpis.totalCustomers.toLocaleString(),
      description: 'All registered customers',
      icon: Users,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      change: null
    },
    {
      title: 'Active Customers',
      value: kpis.activeCustomers.toLocaleString(),
      description: 'Visited in last 90 days',
      icon: UserPlus,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      change: null
    },
    {
      title: 'New Last 30 Days',
      value: kpis.newCustomersThisMonth.toLocaleString(),
      description: 'L30d vs previous 30d',
      icon: TrendingUp,
      iconBg: kpis.growthRate >= 0 ? 'bg-emerald-100' : 'bg-red-100',
      iconColor: kpis.growthRate >= 0 ? 'text-emerald-600' : 'text-red-600',
      change: `${kpis.growthRate > 0 ? '+' : ''}${kpis.growthRate.toFixed(1)}%`
    },
    {
      title: 'Total Lifetime Value',
      value: `₿${kpis.totalLifetimeValue.toLocaleString()}`,
      description: `Avg: ₿${kpis.averageLifetimeValue.toFixed(0)} per customer`,
      icon: DollarSign,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      change: null
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpiCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`h-8 w-8 rounded-full ${card.iconBg} flex items-center justify-center`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{card.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
                {card.change && (
                  <span className={`text-xs font-medium ${card.iconColor}`}>
                    {card.change}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}