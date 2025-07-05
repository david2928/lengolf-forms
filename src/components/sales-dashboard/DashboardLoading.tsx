'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  LineChart, 
  Users,
  CreditCard
} from 'lucide-react';

// Loading skeleton for KPI Cards
export function KPICardsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-32" />
                <div className="h-6 bg-gray-200 rounded animate-pulse w-24" />
              </div>
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-1">
                <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
                <div className="flex items-center gap-1">
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-8" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
                </div>
              </div>
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-16 bg-gray-100 rounded animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading skeleton for Chart Components
export function ChartLoading({ 
  title = "Loading Chart...", 
  height = "h-80",
  showHeader = true,
  showInsights = true,
  insightCount = 3
}: {
  title?: string;
  height?: string;
  showHeader?: boolean;
  showInsights?: boolean;
  insightCount?: number;
}) {
  return (
    <Card className="overflow-hidden">
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
              <div className="h-8 bg-gray-200 rounded animate-pulse w-16" />
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        <div className="space-y-6">
          {/* Insights skeleton */}
          {showInsights && (
            <div className={`grid grid-cols-1 md:grid-cols-${insightCount} gap-4`}>
              {Array.from({ length: insightCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-24" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Chart skeleton */}
          <div className={`${height} bg-gray-50 rounded-lg animate-pulse flex items-center justify-center`}>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse mx-auto mb-3" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
            </div>
          </div>

          {/* Summary statistics skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="text-center">
                <div className="h-6 bg-gray-200 rounded animate-pulse w-16 mx-auto mb-2" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Specific loading components for each chart type
export function SimUtilizationLoading() {
  return (
    <ChartLoading 
      title="Sim Utilization" 
      height="h-80"
      showInsights={true}
      insightCount={2}
    />
  );
}

export function RevenueTrendsLoading() {
  return (
    <ChartLoading 
      title="Revenue Trends" 
      height="h-96"
      showInsights={true}
      insightCount={3}
    />
  );
}

export function CategoryBreakdownLoading() {
  return (
    <ChartLoading 
      title="Category Breakdown" 
      height="h-80"
      showInsights={true}
      insightCount={2}
    />
  );
}

export function PaymentMethodsLoading() {
  return (
    <ChartLoading 
      title="Payment Methods" 
      height="h-80"
      showInsights={true}
      insightCount={3}
    />
  );
}

export function CustomerGrowthLoading() {
  return (
    <ChartLoading 
      title="Customer Growth" 
      height="h-80"
      showInsights={true}
      insightCount={3}
    />
  );
}

// Comprehensive dashboard loading state
export function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-48" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-64" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded animate-pulse w-32" />
          <div className="h-10 bg-gray-200 rounded animate-pulse w-24" />
        </div>
      </div>

      {/* KPI Cards */}
      <KPICardsLoading />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SimUtilizationLoading />
        <RevenueTrendsLoading />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CategoryBreakdownLoading />
        <PaymentMethodsLoading />
      </div>

      <CustomerGrowthLoading />
    </div>
  );
}

// Animated loading spinner
export function LoadingSpinner({ size = 'md', className = '' }: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <div className="animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 w-full h-full" />
    </div>
  );
}

// Progressive loading indicator
export function ProgressiveLoading({ 
  progress = 0, 
  message = "Loading dashboard data...",
  className = ""
}: {
  progress?: number;
  message?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
      <div className="w-64 bg-gray-200 rounded-full h-2 mb-4">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <p className="text-sm text-gray-600 text-center">{message}</p>
      <div className="mt-2 text-xs text-gray-500">
        {Math.round(progress)}% complete
      </div>
    </div>
  );
} 