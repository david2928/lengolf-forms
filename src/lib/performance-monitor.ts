// Performance monitoring utilities for staff scheduling system

interface PerformanceMetric {
  name: string
  duration: number
  timestamp: number
  metadata?: Record<string, any>
}

interface CacheMetrics {
  hits: number
  misses: number
  hitRate: number
  totalRequests: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private cacheMetrics: Map<string, CacheMetrics> = new Map()
  private maxMetrics = 1000 // Keep last 1000 metrics

  // Measure function execution time
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    const start = performance.now()
    
    try {
      const result = await fn()
      const duration = performance.now() - start
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, success: true }
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      })
      
      throw error
    }
  }

  // Measure synchronous function execution time
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    const start = performance.now()
    
    try {
      const result = fn()
      const duration = performance.now() - start
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, success: true }
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - start
      
      this.addMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: { ...metadata, success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      })
      
      throw error
    }
  }

  // Record cache hit/miss
  recordCacheHit(cacheKey: string, hit: boolean) {
    const current = this.cacheMetrics.get(cacheKey) || {
      hits: 0,
      misses: 0,
      hitRate: 0,
      totalRequests: 0
    }

    if (hit) {
      current.hits++
    } else {
      current.misses++
    }

    current.totalRequests = current.hits + current.misses
    current.hitRate = current.totalRequests > 0 ? (current.hits / current.totalRequests) * 100 : 0

    this.cacheMetrics.set(cacheKey, current)
  }

  // Add metric to collection
  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric)
    
    // Keep only the last N metrics to prevent memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics)
    }
  }

  // Get performance statistics
  getStats(timeWindow?: number): {
    totalMetrics: number
    averageDuration: number
    slowestOperations: PerformanceMetric[]
    fastestOperations: PerformanceMetric[]
    errorRate: number
    operationCounts: Record<string, number>
  } {
    const now = Date.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    
    const filteredMetrics = this.metrics.filter(m => m.timestamp >= windowStart)
    
    if (filteredMetrics.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        slowestOperations: [],
        fastestOperations: [],
        errorRate: 0,
        operationCounts: {}
      }
    }

    const totalDuration = filteredMetrics.reduce((sum, m) => sum + m.duration, 0)
    const averageDuration = totalDuration / filteredMetrics.length
    
    const sortedByDuration = [...filteredMetrics].sort((a, b) => b.duration - a.duration)
    const slowestOperations = sortedByDuration.slice(0, 10)
    const fastestOperations = sortedByDuration.slice(-10).reverse()
    
    const errorCount = filteredMetrics.filter(m => m.metadata?.success === false).length
    const errorRate = (errorCount / filteredMetrics.length) * 100
    
    const operationCounts = filteredMetrics.reduce((counts, m) => {
      counts[m.name] = (counts[m.name] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    return {
      totalMetrics: filteredMetrics.length,
      averageDuration,
      slowestOperations,
      fastestOperations,
      errorRate,
      operationCounts
    }
  }

  // Get cache statistics
  getCacheStats(): Record<string, CacheMetrics> {
    return Object.fromEntries(this.cacheMetrics.entries())
  }

  // Clear all metrics
  clear() {
    this.metrics = []
    this.cacheMetrics.clear()
  }

  // Export metrics for analysis
  exportMetrics(): {
    metrics: PerformanceMetric[]
    cacheMetrics: Record<string, CacheMetrics>
    exportTime: number
  } {
    return {
      metrics: [...this.metrics],
      cacheMetrics: this.getCacheStats(),
      exportTime: Date.now()
    }
  }

  // Log performance summary to console
  logSummary(timeWindow?: number) {
    const stats = this.getStats(timeWindow)
    const cacheStats = this.getCacheStats()
    
    console.group('🚀 Performance Summary')
    console.log(`📊 Total Operations: ${stats.totalMetrics}`)
    console.log(`⏱️  Average Duration: ${stats.averageDuration.toFixed(2)}ms`)
    console.log(`❌ Error Rate: ${stats.errorRate.toFixed(2)}%`)
    
    if (stats.slowestOperations.length > 0) {
      console.log(`🐌 Slowest Operation: ${stats.slowestOperations[0].name} (${stats.slowestOperations[0].duration.toFixed(2)}ms)`)
    }
    
    console.log('📈 Operation Counts:', stats.operationCounts)
    
    if (Object.keys(cacheStats).length > 0) {
      console.log('💾 Cache Performance:')
      Object.entries(cacheStats).forEach(([key, metrics]) => {
        console.log(`  ${key}: ${metrics.hitRate.toFixed(1)}% hit rate (${metrics.hits}/${metrics.totalRequests})`)
      })
    }
    
    console.groupEnd()
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const measureAsync = performanceMonitor.measureAsync.bind(performanceMonitor)
  const measure = performanceMonitor.measure.bind(performanceMonitor)
  const recordCacheHit = performanceMonitor.recordCacheHit.bind(performanceMonitor)
  
  return {
    measureAsync,
    measure,
    recordCacheHit,
    getStats: () => performanceMonitor.getStats(),
    getCacheStats: () => performanceMonitor.getCacheStats(),
    logSummary: () => performanceMonitor.logSummary()
  }
}

// Decorator for measuring API endpoint performance
export function measureApiEndpoint(name: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = async function (...args: any[]) {
      return performanceMonitor.measureAsync(
        `api.${name}`,
        () => originalMethod.apply(this, args),
        { endpoint: name, args: args.length }
      )
    }
    
    return descriptor
  }
}

// Utility to measure component render time
export function measureComponentRender(componentName: string) {
  return function <T extends React.ComponentType<any>>(Component: T): T {
    const MeasuredComponent = (props: any) => {
      return performanceMonitor.measure(
        `component.${componentName}`,
        () => React.createElement(Component, props),
        { componentName }
      )
    }
    
    MeasuredComponent.displayName = `Measured(${Component.displayName || Component.name})`
    
    return MeasuredComponent as T
  }
}

// Browser performance observer integration
if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
  try {
    // Observe navigation timing
    const navObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          performanceMonitor.addMetric({
            name: 'page.navigation',
            duration: navEntry.loadEventEnd - navEntry.navigationStart,
            timestamp: Date.now(),
            metadata: {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.navigationStart,
              firstPaint: navEntry.loadEventStart - navEntry.navigationStart,
              type: navEntry.type
            }
          })
        }
      }
    })
    
    navObserver.observe({ entryTypes: ['navigation'] })
    
    // Observe resource timing for API calls
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('/api/staff-schedule')) {
          performanceMonitor.addMetric({
            name: 'api.request',
            duration: entry.duration,
            timestamp: Date.now(),
            metadata: {
              url: entry.name,
              transferSize: (entry as PerformanceResourceTiming).transferSize,
              responseStart: (entry as PerformanceResourceTiming).responseStart - entry.startTime
            }
          })
        }
      }
    })
    
    resourceObserver.observe({ entryTypes: ['resource'] })
  } catch (error) {
    console.warn('Performance observer not supported:', error)
  }
}

// Development-only performance logging
if (process.env.NODE_ENV === 'development') {
  // Log performance summary every 30 seconds
  setInterval(() => {
    if (performanceMonitor.getStats().totalMetrics > 0) {
      performanceMonitor.logSummary(30000) // Last 30 seconds
    }
  }, 30000)
}