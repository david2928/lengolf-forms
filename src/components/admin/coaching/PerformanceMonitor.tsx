'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface PerformanceMetrics {
  coach_id: string;
  coach_name: string;
  current_utilization: number;
  booking_trend: 'up' | 'down' | 'stable';
  booking_change_percent: number;
  cancellation_rate: number;
  available_hours_remaining: number;
  completed_lessons_this_month: number;
  total_scheduled_hours: number;
  last_updated: string;
  health_status: 'excellent' | 'good' | 'warning' | 'critical';
  alerts: string[];
}

interface PerformanceMonitorProps {
  refreshInterval?: number; // milliseconds
  onAlert?: (alert: string) => void;
}

export function PerformanceMonitor({ 
  refreshInterval = 30000, 
  onAlert 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/coaching/performance');
      const data = await response.json();
      
      if (response.ok) {
        setMetrics(data.metrics || []);
        setLastRefresh(new Date());
        setError(null);
        
        // Check for alerts
        data.metrics?.forEach((metric: PerformanceMetrics) => {
          metric.alerts?.forEach(alert => {
            if (onAlert) onAlert(`${metric.coach_name}: ${alert}`);
          });
        });
      } else {
        setError(data.error || 'Failed to fetch performance metrics');
      }
    } catch (err) {
      setError('Network error fetching performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />;
      default: return <div className="h-4 w-4 bg-gray-300 rounded-full" />;
    }
  };

  const formatPercentage = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Coach Performance Monitor</h3>
          <p className="text-sm text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
            {autoRefresh && ` • Auto-refresh enabled`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMetrics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Performance Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => (
          <Card key={metric.coach_id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{metric.coach_name}</CardTitle>
                <Badge className={getHealthStatusColor(metric.health_status)}>
                  {metric.health_status.charAt(0).toUpperCase() + metric.health_status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Utilization */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Current Utilization</span>
                  <span className="text-sm font-bold">{metric.current_utilization.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      metric.current_utilization >= 80
                        ? 'bg-green-500'
                        : metric.current_utilization >= 60
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(metric.current_utilization, 100)}%` }}
                  />
                </div>
              </div>

              {/* Cancellation Rate */}
              <div className="flex justify-between items-center">
                <span className="text-sm">Cancellation Rate</span>
                <span className={`text-sm font-semibold ${
                  metric.cancellation_rate > 15 ? 'text-orange-600' : 
                  metric.cancellation_rate > 10 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metric.cancellation_rate.toFixed(1)}%
                </span>
              </div>

              {/* Completed Lessons */}
              <div className="flex justify-between items-center">
                <span className="text-sm">Completed This Month</span>
                <span className="text-sm font-semibold">{metric.completed_lessons_this_month} lessons</span>
              </div>

              {/* Available Hours */}
              <div className="flex justify-between items-center">
                <span className="text-sm">Hours Remaining</span>
                <span className={`text-sm font-semibold ${
                  metric.available_hours_remaining < 10 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {metric.available_hours_remaining}h
                </span>
              </div>

              {/* Booking Trend */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Booking Trend</span>
                  {getTrendIcon(metric.booking_trend)}
                </div>
                <span className={`text-sm font-semibold ${
                  metric.booking_change_percent > 0 ? 'text-green-600' : 
                  metric.booking_change_percent < 0 ? 'text-orange-600' : 'text-gray-600'
                }`}>
                  {formatPercentage(metric.booking_change_percent)}
                </span>
              </div>

              {/* Alerts */}
              {metric.alerts && metric.alerts.length > 0 && (
                <div className="space-y-1">
                  <span className="text-sm font-medium text-orange-600">Attention:</span>
                  {metric.alerts.map((alert, index) => (
                    <div key={index} className="text-xs bg-orange-50 text-orange-700 p-2 rounded border-l-2 border-orange-200">
                      {alert}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {metrics.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          No performance data available
        </div>
      )}
    </div>
  );
}