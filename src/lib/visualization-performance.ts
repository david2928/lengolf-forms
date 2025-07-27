/**
 * Performance utilities for schedule visualization
 * Provides throttling and performance monitoring for visualization components
 */

/**
 * Performance monitoring utility
 */
export const visualizationPerformance = {
  /**
   * Measure the performance of a function
   */
  measure: <T>(name: string, fn: () => T): T => {
    const start = performance.now()
    const result = fn()
    const end = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  },

  /**
   * Measure the performance of an async function
   */
  measureAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now()
    const result = await fn()
    const end = performance.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`)
    }
    
    return result
  }
}

/**
 * Throttle function to limit how often a function can be called
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

/**
 * Debounce function to delay function execution
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  
  return function(this: any, ...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func.apply(this, args), delay)
  }
}

/**
 * Request animation frame throttle for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null
  
  return function(this: any, ...args: Parameters<T>) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(this, args)
        rafId = null
      })
    }
  }
}

/**
 * Performance observer for monitoring visualization performance
 */
export class VisualizationPerformanceObserver {
  private observer: PerformanceObserver | null = null
  private metrics: Map<string, number[]> = new Map()

  constructor() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      this.observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.startsWith('schedule-viz-')) {
            const metricName = entry.name.replace('schedule-viz-', '')
            const existing = this.metrics.get(metricName) || []
            existing.push(entry.duration)
            this.metrics.set(metricName, existing)
          }
        }
      })
      
      this.observer.observe({ entryTypes: ['measure'] })
    }
  }

  /**
   * Mark the start of a performance measurement
   */
  markStart(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`schedule-viz-${name}-start`)
    }
  }

  /**
   * Mark the end of a performance measurement
   */
  markEnd(name: string): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      performance.mark(`schedule-viz-${name}-end`)
      performance.measure(
        `schedule-viz-${name}`,
        `schedule-viz-${name}-start`,
        `schedule-viz-${name}-end`
      )
    }
  }

  /**
   * Get performance metrics for a specific measurement
   */
  getMetrics(name: string): { avg: number; min: number; max: number; count: number } | null {
    const measurements = this.metrics.get(name)
    if (!measurements || measurements.length === 0) {
      return null
    }

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length
    const min = Math.min(...measurements)
    const max = Math.max(...measurements)

    return { avg, min, max, count: measurements.length }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
  }

  /**
   * Disconnect the observer
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect()
    }
  }
}

// Global performance observer instance
export const visualizationPerfObserver = new VisualizationPerformanceObserver()

/**
 * Hook for measuring component render performance
 */
export function useRenderPerformance(componentName: string) {
  React.useEffect(() => {
    visualizationPerfObserver.markStart(`${componentName}-render`)
    
    return () => {
      visualizationPerfObserver.markEnd(`${componentName}-render`)
    }
  })
}

export default visualizationPerformance