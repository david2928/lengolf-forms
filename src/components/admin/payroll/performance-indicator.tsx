/**
 * Performance indicator component for payroll calculations
 * Story #11: Performance Optimization
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Zap, TrendingUp, Database } from 'lucide-react';
import { LoadingState } from '@/lib/payroll-performance';

interface PerformanceIndicatorProps {
  loadingState: LoadingState;
  showMetrics?: boolean;
  compact?: boolean;
}

interface PerformanceMetrics {
  averageDuration: number;
  cacheHitRate: number;
  totalOperations: number;
  slowOperations: number;
}

export function PerformanceIndicator({ 
  loadingState, 
  showMetrics = true, 
  compact = false 
}: PerformanceIndicatorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);

  useEffect(() => {
    // Simulate fetching performance metrics
    // In a real implementation, this would fetch from the performance analyzer
    if (showMetrics && !loadingState.isLoading) {
      const mockMetrics = {
        averageDuration: 2500,
        cacheHitRate: 0.85,
        totalOperations: 45,
        slowOperations: 2
      };
      setMetrics(mockMetrics);
    }
  }, [loadingState.isLoading, showMetrics]);

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
        {loadingState.isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              {loadingState.operation || 'Processing...'}
            </span>
            {loadingState.progress !== undefined && (
              <div className="flex items-center gap-1 ml-2">
                <Progress value={loadingState.progress} className="w-20 h-2" />
                <span className="text-xs text-muted-foreground">
                  {Math.round(loadingState.progress)}%
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-green-600" />
            <span className="text-sm text-green-600">Ready</span>
            {metrics && (
              <Badge variant="outline" className="text-xs">
                {metrics.cacheHitRate * 100}% cached
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Performance Monitor
        </CardTitle>
        <CardDescription>
          Real-time performance metrics for payroll calculations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Loading State */}
        {loadingState.isLoading && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="font-medium">
                  {loadingState.operation || 'Processing...'}
                </span>
              </div>
              {loadingState.estimatedTimeRemaining && (
                <span className="text-sm text-muted-foreground">
                  ~{Math.round(loadingState.estimatedTimeRemaining / 1000)}s remaining
                </span>
              )}
            </div>
            
            {loadingState.progress !== undefined && (
              <div className="space-y-2">
                <Progress value={loadingState.progress} className="w-full" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{Math.round(loadingState.progress)}% complete</span>
                  {loadingState.estimatedTimeRemaining && (
                    <span>
                      ETA: {Math.round(loadingState.estimatedTimeRemaining / 1000)}s
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Performance Metrics */}
        {showMetrics && metrics && !loadingState.isLoading && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Average Duration</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {(metrics.averageDuration / 1000).toFixed(1)}s
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Cache Hit Rate</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {(metrics.cacheHitRate * 100).toFixed(1)}%
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Total Operations</span>
              </div>
              <div className="text-2xl font-bold text-primary">
                {metrics.totalOperations}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Slow Operations</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.slowOperations}
              </div>
            </div>
          </div>
        )}

        {/* Performance Status */}
        {!loadingState.isLoading && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-sm font-medium">System Ready</span>
            </div>
            <div className="flex gap-2">
              {metrics && (
                <>
                  <Badge 
                    variant={metrics.cacheHitRate > 0.8 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    Cache: {(metrics.cacheHitRate * 100).toFixed(0)}%
                  </Badge>
                  <Badge 
                    variant={metrics.averageDuration < 3000 ? "default" : "destructive"}
                    className="text-xs"
                  >
                    Avg: {(metrics.averageDuration / 1000).toFixed(1)}s
                  </Badge>
                </>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Simple loading spinner component
 */
export function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex items-center gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <span className="text-gray-600">{message}</span>
      </div>
    </div>
  );
}

/**
 * Performance badge component
 */
export function PerformanceBadge({ 
  cacheHitRate, 
  averageDuration 
}: { 
  cacheHitRate: number; 
  averageDuration: number; 
}) {
  const isPerformant = cacheHitRate > 0.8 && averageDuration < 3000;
  
  return (
    <Badge 
      variant={isPerformant ? "default" : "secondary"}
      className="text-xs"
    >
      <Zap className="h-3 w-3 mr-1" />
      {isPerformant ? "High Performance" : "Standard Performance"}
    </Badge>
  );
}

/**
 * Cache status indicator
 */
export function CacheStatusIndicator({ hitRate }: { hitRate: number }) {
  const getStatusColor = (rate: number) => {
    if (rate > 0.8) return "text-green-600";
    if (rate > 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusText = (rate: number) => {
    if (rate > 0.8) return "Excellent";
    if (rate > 0.5) return "Good";
    return "Poor";
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${hitRate > 0.8 ? 'bg-green-500' : hitRate > 0.5 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
      <span className={`text-sm font-medium ${getStatusColor(hitRate)}`}>
        Cache: {(hitRate * 100).toFixed(0)}% ({getStatusText(hitRate)})
      </span>
    </div>
  );
} 