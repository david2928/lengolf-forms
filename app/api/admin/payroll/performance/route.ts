/**
 * Performance monitoring API endpoint for payroll system
 * Story #11: Performance Optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { 
  payrollCache, 
  PerformanceAnalyzer, 
  RECOMMENDED_INDEXES,
  invalidatePayrollCache 
} from '@/lib/payroll-performance';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'metrics';

    switch (action) {
      case 'metrics':
        return handleGetMetrics();
      case 'cache-status':
        return handleCacheStatus();
      case 'recommendations':
        return handleRecommendations();
      case 'slow-operations':
        return handleSlowOperations();
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data } = await request.json();

    switch (action) {
      case 'clear-cache':
        return handleClearCache(data);
      case 'invalidate-month':
        return handleInvalidateMonth(data);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Performance API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleGetMetrics() {
  const overall = payrollCache.getAverageMetrics();
  const breakdown = PerformanceAnalyzer.getOperationBreakdown();
  const cacheEfficiency = PerformanceAnalyzer.getCacheEfficiency();

  return NextResponse.json({
    overall,
    breakdown,
    cacheEfficiency,
    timestamp: new Date().toISOString()
  });
}

async function handleCacheStatus() {
  const cacheEfficiency = PerformanceAnalyzer.getCacheEfficiency();
  const metrics = payrollCache.getMetrics();
  
  // Get recent operations (last 10)
  const recentOperations = metrics.slice(-10).map(m => ({
    operation: m.operationName,
    duration: m.duration,
    cacheHit: m.cacheHit,
    timestamp: m.startTime
  }));

  return NextResponse.json({
    cacheEfficiency,
    recentOperations,
    timestamp: new Date().toISOString()
  });
}

async function handleRecommendations() {
  const slowOperations = PerformanceAnalyzer.getSlowOperations(2000); // Operations > 2s
  const cacheEfficiency = PerformanceAnalyzer.getCacheEfficiency();
  
  const recommendations = [];

  // Database indexing recommendations
  if (slowOperations.length > 0) {
    recommendations.push({
      type: 'database',
      priority: 'high',
      title: 'Database Indexing Required',
      description: `${slowOperations.length} slow operations detected. Consider adding recommended indexes.`,
      action: 'add-indexes',
      queries: RECOMMENDED_INDEXES
    });
  }

  // Cache optimization recommendations
  if (cacheEfficiency.hitRate && parseFloat(cacheEfficiency.hitRate) < 70) {
    recommendations.push({
      type: 'cache',
      priority: 'medium',
      title: 'Low Cache Hit Rate',
      description: `Cache hit rate is ${cacheEfficiency.hitRate}. Consider increasing cache TTL or optimizing cache keys.`,
      action: 'optimize-cache'
    });
  }

  // Performance monitoring recommendations
  const metrics = payrollCache.getMetrics();
  if (metrics.length > 0) {
    const avgDuration = metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length;
    if (avgDuration > 3000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'High Average Response Time',
        description: `Average operation duration is ${(avgDuration / 1000).toFixed(1)}s. Consider optimizing queries or adding more caching.`,
        action: 'optimize-performance'
      });
    }
  }

  return NextResponse.json({
    recommendations,
    indexQueries: RECOMMENDED_INDEXES,
    timestamp: new Date().toISOString()
  });
}

async function handleSlowOperations() {
  const slowOperations = PerformanceAnalyzer.getSlowOperations(1000); // Operations > 1s
  
  const grouped = slowOperations.reduce((acc, op) => {
    if (!acc[op.operationName]) {
      acc[op.operationName] = [];
    }
    acc[op.operationName].push(op);
    return acc;
  }, {} as Record<string, typeof slowOperations>);

  const summary = Object.entries(grouped).map(([operationName, operations]) => ({
    operationName,
    count: operations.length,
    avgDuration: operations.reduce((sum, op) => sum + op.duration, 0) / operations.length,
    maxDuration: Math.max(...operations.map(op => op.duration)),
    minDuration: Math.min(...operations.map(op => op.duration))
  }));

  return NextResponse.json({
    slowOperations: summary,
    details: grouped,
    timestamp: new Date().toISOString()
  });
}

async function handleClearCache(data: any) {
  try {
    if (data?.pattern) {
      invalidatePayrollCache.forMonth(data.pattern);
    } else {
      invalidatePayrollCache.all();
    }

    return NextResponse.json({
      success: true,
      message: data?.pattern 
        ? `Cache cleared for pattern: ${data.pattern}`
        : 'All cache cleared'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}

async function handleInvalidateMonth(data: any) {
  try {
    if (!data?.monthYear) {
      return NextResponse.json(
        { error: 'monthYear is required' },
        { status: 400 }
      );
    }

    invalidatePayrollCache.forMonth(data.monthYear);

    return NextResponse.json({
      success: true,
      message: `Cache invalidated for month: ${data.monthYear}`
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to invalidate cache' },
      { status: 500 }
    );
  }
} 