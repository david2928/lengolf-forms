// Sim Utilization Trend Chart Component
// Line chart with trend analysis and target reference lines (addressing user feedback)

'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { 
  SimUtilizationPoint, 
  DASHBOARD_COLORS, 
  CHART_COLORS 
} from '@/types/sales-dashboard';
import { 
  formatPercentage, 
  formatDisplayDate,
  calculateMovingAverage 
} from '@/lib/dashboard-utils';

// =============================================================================
// COMPONENT INTERFACES
// =============================================================================

interface SimUtilizationChartProps {
  data: SimUtilizationPoint[];
  isLoading?: boolean;
  targetUtilization?: number;
  showMovingAverage?: boolean;
  showRevenue?: boolean;
}

interface UtilizationTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

interface UtilizationStatsProps {
  data: SimUtilizationPoint[];
  targetUtilization: number;
}

// =============================================================================
// CUSTOM TOOLTIP COMPONENT
// =============================================================================

const UtilizationTooltip: React.FC<UtilizationTooltipProps> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (active && payload && payload.length && label) {
    const data = payload[0].payload;
    
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 text-sm mb-2">
          {formatDisplayDate(label)}
        </p>
        
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Utilization</span>
            </div>
            <span className="text-xs font-medium">
              {formatPercentage(data.utilization_pct, 1)}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-xs text-gray-600">Sim Sessions</span>
            </div>
            <span className="text-xs font-medium">
              {data.sim_usage_count}
            </span>
          </div>
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-xs text-gray-600">Total Transactions</span>
            </div>
            <span className="text-xs font-medium">
              {data.total_transactions}
            </span>
          </div>
          
          {payload.find(p => p.dataKey === 'movingAverage') && (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                <span className="text-xs text-gray-600">7-Day Average</span>
              </div>
              <span className="text-xs font-medium">
                {formatPercentage(data.movingAverage, 1)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

// =============================================================================
// UTILIZATION STATS COMPONENT
// =============================================================================

const UtilizationStats: React.FC<UtilizationStatsProps> = ({ 
  data, 
  targetUtilization 
}) => {
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        average: 0,
        highest: 0,
        lowest: 0,
        trend: 'neutral' as const,
        daysAboveTarget: 0,
        totalSessions: 0
      };
    }

    const utilizationRates = data.map(d => d.utilization_pct);
    const average = utilizationRates.reduce((acc, val) => acc + val, 0) / utilizationRates.length;
    const highest = Math.max(...utilizationRates);
    const lowest = Math.min(...utilizationRates);
    
    // Calculate trend (comparing first half vs second half)
    const midpoint = Math.floor(data.length / 2);
    const firstHalf = utilizationRates.slice(0, midpoint);
    const secondHalf = utilizationRates.slice(midpoint);
    
    const firstAvg = firstHalf.reduce((acc, val) => acc + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((acc, val) => acc + val, 0) / secondHalf.length;
    
    const trend = secondAvg > firstAvg + 1 ? 'up' : 
                  secondAvg < firstAvg - 1 ? 'down' : 'neutral';
    
    const daysAboveTarget = utilizationRates.filter(rate => rate >= targetUtilization).length;
    const totalSessions = data.reduce((acc, d) => acc + d.sim_usage_count, 0);

    return {
      average,
      highest,
      lowest,
      trend,
      daysAboveTarget,
      totalSessions
    };
  }, [data, targetUtilization]);

  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (stats.trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Average</p>
        <p className="text-lg font-semibold text-gray-900">
          {formatPercentage(stats.average, 1)}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Peak</p>
        <p className="text-lg font-semibold text-green-600">
          {formatPercentage(stats.highest, 1)}
        </p>
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-500 mb-1">Days Above Target</p>
        <p className="text-lg font-semibold text-blue-600">
          {stats.daysAboveTarget}/{data.length}
        </p>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center gap-1 mb-1">
          {getTrendIcon()}
          <p className="text-xs text-gray-500">Trend</p>
        </div>
        <p className={`text-lg font-semibold ${getTrendColor()}`}>
          {stats.trend === 'up' ? 'Improving' : 
           stats.trend === 'down' ? 'Declining' : 'Stable'}
        </p>
      </div>
    </div>
  );
};

// =============================================================================
// LOADING COMPONENT
// =============================================================================

const SimUtilizationChartLoading: React.FC = () => {
  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-3 w-12 mx-auto mb-1" />
              <Skeleton className="h-6 w-16 mx-auto" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[350px] w-full" />
      </CardContent>
    </Card>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const SimUtilizationChart: React.FC<SimUtilizationChartProps> = ({ 
  data, 
  isLoading = false,
  targetUtilization = 70, // Default 70% target
  showMovingAverage = true,
  showRevenue = false
}) => {
  // Process data with moving average - moved before early returns to satisfy Rules of Hooks
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const processedData = data.map(point => ({
      ...point,
      date: point.date,
      utilization_pct: Number(point.utilization_pct.toFixed(1)),
      sim_revenue: point.sim_revenue || 0
    }));

    if (showMovingAverage) {
      const withMovingAverage = calculateMovingAverage(
        processedData.map(d => ({ date: d.date, value: d.utilization_pct })),
        7
      );

      return processedData.map((point, index) => ({
        ...point,
        movingAverage: withMovingAverage[index]?.movingAverage || point.utilization_pct
      }));
    }

    return processedData;
  }, [data, showMovingAverage]);

  // Calculate Y-axis domain - moved before early returns to satisfy Rules of Hooks
  const yAxisDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];
    
    const values = chartData.map(d => d.utilization_pct);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return [
      Math.max(0, Math.floor(min - 5)),
      Math.min(100, Math.ceil(max + 5))
    ];
  }, [chartData]);

  // Show loading state
  if (isLoading) {
    return <SimUtilizationChartLoading />;
  }

  if (!data || data.length === 0) {
    return (
      <Card className="col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Sim Utilization Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[350px] text-gray-500">
            <div className="text-center">
              <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No utilization data available</p>
              <p className="text-sm">Check back later for sim usage trends.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Sim Utilization Trends
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Daily utilization rates with {targetUtilization}% target benchmark
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Target</p>
            <p className="text-lg font-semibold text-orange-600">
              {formatPercentage(targetUtilization)}
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <UtilizationStats data={data} targetUtilization={targetUtilization} />
        
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatDisplayDate(value)}
              stroke="#6b7280"
            />
            
            <YAxis 
              domain={yAxisDomain}
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Utilization %', 
                angle: -90, 
                position: 'insideLeft',
                style: { textAnchor: 'middle' }
              }}
              stroke="#6b7280"
            />
            
            <Tooltip content={<UtilizationTooltip />} />
            
            {/* Target line */}
            <ReferenceLine 
              y={targetUtilization} 
              stroke={DASHBOARD_COLORS.warning}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{ 
                value: `Target: ${targetUtilization}%`, 
                position: 'top',
                offset: 10
              }}
            />
            
            {/* Moving average line */}
            {showMovingAverage && (
              <Line 
                type="monotone" 
                dataKey="movingAverage" 
                stroke={DASHBOARD_COLORS.orange}
                strokeWidth={2}
                dot={false}
                strokeDasharray="2 2"
                name="7-Day Average"
              />
            )}
            
            {/* Main utilization line */}
            <Line 
              type="monotone" 
              dataKey="utilization_pct" 
              stroke={DASHBOARD_COLORS.primary}
              strokeWidth={3}
              dot={{ 
                fill: DASHBOARD_COLORS.primary, 
                strokeWidth: 2, 
                r: 4 
              }}
              activeDot={{ 
                r: 6, 
                stroke: DASHBOARD_COLORS.primary,
                strokeWidth: 2,
                fill: '#fff'
              }}
              name="Daily Utilization"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-blue-500"></div>
            <span className="text-gray-600">Daily Utilization</span>
          </div>
          {showMovingAverage && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-orange-500" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-gray-600">7-Day Average</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-yellow-500" style={{ borderStyle: 'dashed' }}></div>
            <span className="text-gray-600">Target ({targetUtilization}%)</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SimUtilizationChart; 