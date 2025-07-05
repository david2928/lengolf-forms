// Enhanced KPI Cards Component
// Individual metric cards with WoW/MoM indicators and mini trend visualizations

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, DollarSign, Users, Target, ShoppingCart, Percent, UserPlus, HelpCircle } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { 
  DashboardSummary, 
  KPICardData,
  DASHBOARD_COLORS 
} from '@/types/sales-dashboard';
import { 
  formatCurrency, 
  formatPercentage, 
  formatNumber, 
  formatChangePercentage,
  getChangeDirection,
  generateTrendData,
  getComparisonPeriodLabel
} from '@/lib/dashboard-utils';
import MetricsTooltip, { QuickMetricTooltip } from './MetricsTooltip';

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface KPICardsProps {
  data: DashboardSummary | null;
  isLoading?: boolean;
  comparisonType?: 'previousPeriod' | 'previousMonth' | 'previousYear';
  datePreset?: string;
}

interface IndividualKPICardProps {
  card: KPICardData;
  isLoading?: boolean;
  comparisonLabel?: string;
}

// =============================================================================
// CUSTOM TOOLTIP COMPONENT
// =============================================================================

const CustomTooltip = ({ active, payload, label, format }: any) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    let formattedValue = value;
    
    switch (format) {
      case 'currency':
        formattedValue = formatCurrency(value);
        break;
      case 'percentage':
        formattedValue = formatPercentage(value);
        break;
      case 'number':
        formattedValue = formatNumber(value);
        break;
      default:
        formattedValue = value;
    }

    return (
      <div className="bg-white border rounded-lg shadow-lg p-2 text-xs">
        <p className="text-gray-600">{`Period: ${label || 'N/A'}`}</p>
        <p className="font-semibold text-gray-900">{`Value: ${formattedValue}`}</p>
      </div>
    );
  }

  return null;
};

// =============================================================================
// INDIVIDUAL KPI CARD COMPONENT
// =============================================================================

const KPICard: React.FC<IndividualKPICardProps & { metricKey?: string }> = ({ 
  card, 
  isLoading = false, 
  comparisonLabel = 'WoW',
  metricKey 
}) => {
  if (isLoading) {
    return (
      <Card className="h-[180px]">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[100px]" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[120px] mb-2" />
          <Skeleton className="h-4 w-[80px] mb-3" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const getChangeIcon = (direction: 'up' | 'down' | 'neutral') => {
    const baseClassName = "h-4 w-4";
    switch (direction) {
      case 'up':
        return <TrendingUp className={`${baseClassName} text-green-600`} />;
      case 'down':
        return <TrendingDown className={`${baseClassName} text-red-600`} />;
      default:
        return <Minus className={`${baseClassName} text-gray-500`} />;
    }
  };

  const getChangeColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getValueColor = (direction: 'up' | 'down' | 'neutral') => {
    switch (direction) {
      case 'up':
        return 'text-green-700';
      case 'down':
        return 'text-red-700';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <Card className="h-[180px] transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <QuickMetricTooltip metric={metricKey || card.label.toLowerCase().replace(/ /g, '_')} className="flex-1">
          <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1 cursor-help">
            {card.label}
            <HelpCircle className="h-3 w-3 text-gray-400 opacity-50" />
          </CardTitle>
        </QuickMetricTooltip>
        {card.icon && (
          <card.icon className="h-4 w-4 text-gray-400" />
        )}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold mb-1 ${getValueColor(card.changeDirection)}`}>
          {card.value}
        </div>
        
        <div className={`flex items-center text-xs mb-3 ${getChangeColor(card.changeDirection)}`}>
          {getChangeIcon(card.changeDirection)}
          <span className="ml-1">
            {formatChangePercentage(card.changePercent)} {comparisonLabel}
          </span>
        </div>

        {/* Enhanced Mini Trend Chart with Hover Points */}
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={card.trendData}>
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip content={<CustomTooltip format={card.format} />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={card.changeDirection === 'up' ? DASHBOARD_COLORS.success : 
                        card.changeDirection === 'down' ? DASHBOARD_COLORS.danger : 
                        DASHBOARD_COLORS.primary} 
                strokeWidth={2}
                dot={{ r: 3, fill: card.changeDirection === 'up' ? DASHBOARD_COLORS.success : 
                              card.changeDirection === 'down' ? DASHBOARD_COLORS.danger : 
                              DASHBOARD_COLORS.primary, stroke: '#ffffff', strokeWidth: 1 }}
                activeDot={{ r: 5, fill: card.changeDirection === 'up' ? DASHBOARD_COLORS.success : 
                              card.changeDirection === 'down' ? DASHBOARD_COLORS.danger : 
                              DASHBOARD_COLORS.primary, stroke: '#ffffff', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

// =============================================================================
// LOADING SKELETON COMPONENT
// =============================================================================

const KPICardsLoading: React.FC = () => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <KPICard key={index} card={{} as KPICardData} isLoading={true} comparisonLabel="WoW" />
      ))}
    </div>
  );
};

// =============================================================================
// MAIN KPI CARDS COMPONENT
// =============================================================================

export const KPICards: React.FC<KPICardsProps> = ({ 
  data, 
  isLoading = false, 
  comparisonType = 'previousPeriod',
  datePreset = 'last30days'
}) => {
  // Show loading state
  if (isLoading || !data) {
    return <KPICardsLoading />;
  }

  // Additional safety checks for data structure
  if (!data.current || !data.changes || !data.trend_data) {
    console.warn('KPICards: Invalid data structure received', data);
    return <KPICardsLoading />;
  }

  // Get the correct comparison period label
  const comparisonLabel = getComparisonPeriodLabel(comparisonType, datePreset as any);

  // Ensure all required properties exist with default values
  const safeData = {
    current: {
      net_revenue: data.current?.net_revenue ?? 0,
      gross_profit: data.current?.gross_profit ?? 0,
      sim_utilization_pct: data.current?.sim_utilization_pct ?? 0,
      new_customers: data.current?.new_customers ?? 0,
      avg_transaction_value: data.current?.avg_transaction_value ?? 0,
      gross_margin_pct: data.current?.gross_margin_pct ?? 0,
      transaction_count: data.current?.transaction_count ?? 0,
      unique_customers: data.current?.unique_customers ?? 0,
      sim_utilization_count: data.current?.sim_utilization_count ?? 0,
    },
    changes: {
      revenue_change_pct: data.changes?.revenue_change_pct ?? null,
      profit_change_pct: data.changes?.profit_change_pct ?? null,
      sim_utilization_change_pct: data.changes?.sim_utilization_change_pct ?? null,
      customer_acquisition_change_pct: data.changes?.customer_acquisition_change_pct ?? null,
      transaction_change_pct: data.changes?.transaction_change_pct ?? null,
      margin_change_pct: data.changes?.margin_change_pct ?? null,
    },
    trend_data: {
      revenue: data.trend_data?.revenue ?? [],
      profit: data.trend_data?.profit ?? [],
      utilization: data.trend_data?.utilization ?? [],
      customers: data.trend_data?.customers ?? [],
      transaction: data.trend_data?.transaction ?? [],
      margin: data.trend_data?.margin ?? [],
    }
  };

  // Build KPI card data from dashboard summary with metric keys for tooltips
  const kpiCards: Array<KPICardData & { metricKey: string }> = [
    {
      label: 'Net Revenue',
      value: formatCurrency(safeData.current.net_revenue),
      changePercent: safeData.changes.revenue_change_pct,
      changeDirection: getChangeDirection(safeData.changes.revenue_change_pct),
      trendData: safeData.trend_data.revenue,
      format: 'currency',
      icon: DollarSign,
      metricKey: 'net_revenue'
    },
    {
      label: 'Gross Profit',
      value: formatCurrency(safeData.current.gross_profit),
      changePercent: safeData.changes.profit_change_pct,
      changeDirection: getChangeDirection(safeData.changes.profit_change_pct),
      trendData: safeData.trend_data.profit,
      format: 'currency',
      icon: TrendingUp,
      metricKey: 'gross_profit'
    },
    {
      label: 'Sim Utilization',
      value: formatPercentage(safeData.current.sim_utilization_pct),
      changePercent: safeData.changes.sim_utilization_change_pct,
      changeDirection: getChangeDirection(safeData.changes.sim_utilization_change_pct),
      trendData: safeData.trend_data.utilization,
      format: 'percentage',
      icon: Target,
      metricKey: 'sim_utilization_pct'
    },
    {
      label: 'Customer Acquisition',
      value: formatNumber(safeData.current.new_customers),
      changePercent: safeData.changes.customer_acquisition_change_pct,
      changeDirection: getChangeDirection(safeData.changes.customer_acquisition_change_pct),
      trendData: safeData.trend_data.customers,
      format: 'number',
      icon: UserPlus,
      metricKey: 'new_customers'
    },
    {
      label: 'Avg Transaction',
      value: formatCurrency(safeData.current.avg_transaction_value),
      changePercent: safeData.changes.transaction_change_pct,
      changeDirection: getChangeDirection(safeData.changes.transaction_change_pct),
      trendData: safeData.trend_data.transaction,
      format: 'currency',
      icon: ShoppingCart,
      metricKey: 'avg_transaction_value'
    },
    {
      label: 'Gross Margin',
      value: formatPercentage(safeData.current.gross_margin_pct),
      changePercent: safeData.changes.margin_change_pct,
      changeDirection: getChangeDirection(safeData.changes.margin_change_pct),
      trendData: safeData.trend_data.margin,
      format: 'percentage',
      icon: Percent,
      metricKey: 'gross_margin_pct'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Key Performance Indicators</h2>
          <p className="text-sm text-gray-600 mt-1">
            Real-time business metrics with week-over-week comparisons
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <MetricsTooltip 
            position="left"
            className="relative"
          />
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span>Improvement</span>
            </div>
            <div className="flex items-center space-x-1">
              <TrendingDown className="h-3 w-3 text-red-600" />
              <span>Decline</span>
            </div>
            <div className="flex items-center space-x-1">
              <Minus className="h-3 w-3 text-gray-500" />
              <span>No Change</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((card, index) => (
          <KPICard 
            key={index} 
            card={card} 
            comparisonLabel={comparisonLabel} 
            metricKey={card.metricKey}
          />
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mt-6">
        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">Total Transactions</p>
                <p className="text-2xl font-bold text-blue-900">
                  {formatNumber(safeData.current.transaction_count)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Unique Customers</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatNumber(safeData.current.unique_customers)}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800">Sim Usage Count</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatNumber(safeData.current.sim_utilization_count)}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// =============================================================================
// ERROR BOUNDARY COMPONENT
// =============================================================================

interface KPICardsErrorProps {
  error: Error;
  retry?: () => void;
}

export const KPICardsError: React.FC<KPICardsErrorProps> = ({ error, retry }) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-6 text-center">
        <div className="flex flex-col items-center space-y-4">
          <TrendingDown className="h-12 w-12 text-red-500" />
          <div>
            <h3 className="text-lg font-semibold text-red-800">Failed to Load KPIs</h3>
            <p className="text-sm text-red-600 mt-1">
              {error.message || 'An error occurred while loading the dashboard metrics.'}
            </p>
          </div>
          {retry && (
            <button
              onClick={retry}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICards; 