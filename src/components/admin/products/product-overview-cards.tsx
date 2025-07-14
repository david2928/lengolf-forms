'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  EyeOff,
  Archive
} from 'lucide-react';
import { useProductAnalytics } from '@/hooks/use-product-analytics';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  className?: string;
}

function MetricCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  variant = 'default',
  className 
}: MetricCardProps) {
  const variantStyles = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-green-50/50',
    warning: 'border-yellow-200 bg-yellow-50/50',
    destructive: 'border-red-200 bg-red-50/50'
  };

  const iconStyles = {
    default: 'text-gray-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    destructive: 'text-red-600'
  };

  return (
    <Card className={cn(variantStyles[variant], className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{value}</p>
              {trend && (
                <Badge variant={trend.isPositive ? 'default' : 'secondary'} className="text-xs hidden sm:inline-flex">
                  {trend.value}
                </Badge>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{subtitle}</p>
            )}
          </div>
          <div className={cn('h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center bg-white shadow-sm flex-shrink-0', iconStyles[variant])}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ProductOverviewCardsProps {
  className?: string;
}

export function ProductOverviewCards({ className }: ProductOverviewCardsProps) {
  const { overview, computedMetrics, isLoading, error } = useProductAnalytics();

  if (error) {
    return (
      <Card className={cn('border-red-200 bg-red-50/50', className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">Failed to load product overview</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4', className)}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gray-200 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatCurrency = (value: number) => `฿${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4', className)}>
      <MetricCard
        title="Total Products"
        value={overview.total_products}
        subtitle={`${overview.active_products} active, ${overview.inactive_products} inactive`}
        icon={Package}
        variant="default"
      />

      <MetricCard
        title="Catalog Value"
        value={formatCurrency(overview.total_catalog_value)}
        subtitle={`Avg: ${formatCurrency(overview.avg_price)}`}
        icon={DollarSign}
        variant="success"
      />

      <MetricCard
        title="Profit Margin"
        value={formatPercentage(overview.avg_profit_margin)}
        subtitle={computedMetrics?.profitHealthStatus ? `Status: ${computedMetrics.profitHealthStatus}` : undefined}
        icon={TrendingUp}
        variant={
          computedMetrics?.profitHealthStatus === 'excellent' ? 'success' :
          computedMetrics?.profitHealthStatus === 'good' ? 'default' :
          computedMetrics?.profitHealthStatus === 'fair' ? 'warning' : 'destructive'
        }
      />

      <MetricCard
        title="Categories"
        value={overview.categories_count}
        subtitle={`${overview.products_without_cost} missing costs`}
        icon={Archive}
        variant={overview.products_without_cost > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}

interface QuickStatsProps {
  className?: string;
}

export function QuickStats({ className }: QuickStatsProps) {
  const { overview, computedMetrics, insights, isLoading } = useProductAnalytics();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-4 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = [
    {
      label: 'Active Products',
      value: computedMetrics?.activePercentage,
      format: (v: number) => `${v.toFixed(1)}%`,
      color: 'text-green-600'
    },
    {
      label: 'Cost Coverage',
      value: computedMetrics?.costCoveragePercentage,
      format: (v: number) => `${v.toFixed(1)}%`,
      color: (computedMetrics?.costCoveragePercentage ?? 0) >= 80 ? 'text-green-600' : 'text-yellow-600'
    },
    {
      label: 'Custom Products',
      value: computedMetrics?.customProductsPercentage,
      format: (v: number) => `${v.toFixed(1)}%`,
      color: 'text-blue-600'
    }
  ];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Quick Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{stat.label}</span>
              <span className={cn('text-sm font-medium', stat.color)}>
                {stat.value ? stat.format(stat.value) : 'N/A'}
              </span>
            </div>
          ))}
          
          {insights.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Insights</h4>
              <div className="space-y-2">
                {insights.slice(0, 2).map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full mt-2 flex-shrink-0',
                      insight.type === 'success' ? 'bg-green-500' :
                      insight.type === 'warning' ? 'bg-yellow-500' :
                      insight.type === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                    )} />
                    <div>
                      <p className="text-xs font-medium text-gray-900">{insight.title}</p>
                      <p className="text-xs text-gray-600">{insight.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}