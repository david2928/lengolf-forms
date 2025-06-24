/**
 * Performance Monitoring System
 * 
 * Features:
 * - API endpoint performance tracking
 * - Database query monitoring
 * - Memory usage tracking
 * - Response time analysis
 * - Performance alerts
 */

import { logger } from './logger'

export interface PerformanceMetrics {
  timestamp: string
  operation: string
  component: string
  duration: number
  success: boolean
  metadata?: Record<string, any>
}

export interface ApiPerformanceMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  userAgent?: string
  timestamp: string
}

export interface DatabasePerformanceMetrics {
  operation: string
  table?: string
  duration: number
  rowsAffected?: number
  timestamp: string
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetrics[] = []
  private apiMetrics: ApiPerformanceMetrics[] = []
  private dbMetrics: DatabasePerformanceMetrics[] = []
  private maxStoredMetrics = 1000 // Prevent memory leaks

  // Performance thresholds (in milliseconds)
  private readonly THRESHOLDS = {
    API_FAST: 100,
    API_SLOW: 1000,
    API_CRITICAL: 3000,
    DB_FAST: 50,
    DB_SLOW: 500,
    DB_CRITICAL: 2000,
    COMPONENT_SLOW: 100
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // API Performance Monitoring
  trackApiCall(
    method: string,
    endpoint: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    metadata?: Record<string, any>
  ) {
    const metric: ApiPerformanceMetrics = {
      endpoint,
      method,
      statusCode,
      responseTime,
      userAgent,
      timestamp: new Date().toISOString()
    }

    this.apiMetrics.push(metric)
    this.trimMetrics()

    // Log performance based on thresholds
    if (responseTime > this.THRESHOLDS.API_CRITICAL) {
      logger.error(`Critical API performance: ${method} ${endpoint}`, undefined, 'PERFORMANCE', {
        responseTime: `${responseTime}ms`,
        statusCode,
        threshold: 'CRITICAL',
        ...metadata
      })
    } else if (responseTime > this.THRESHOLDS.API_SLOW) {
      logger.warn(`Slow API performance: ${method} ${endpoint}`, 'PERFORMANCE', {
        responseTime: `${responseTime}ms`,
        statusCode,
        threshold: 'SLOW',
        ...metadata
      })
    } else if (responseTime < this.THRESHOLDS.API_FAST) {
      logger.performance(`API call`, responseTime, 'API', {
        method,
        endpoint,
        statusCode,
        threshold: 'FAST',
        ...metadata
      })
    }
  }

  // Database Performance Monitoring
  trackDatabaseQuery(
    operation: string,
    duration: number,
    table?: string,
    rowsAffected?: number,
    metadata?: Record<string, any>
  ) {
    const metric: DatabasePerformanceMetrics = {
      operation,
      table,
      duration,
      rowsAffected,
      timestamp: new Date().toISOString()
    }

    this.dbMetrics.push(metric)
    this.trimMetrics()

    // Log performance based on thresholds
    if (duration > this.THRESHOLDS.DB_CRITICAL) {
      logger.error(`Critical database performance: ${operation}`, undefined, 'DATABASE', {
        duration: `${duration}ms`,
        table,
        rowsAffected,
        threshold: 'CRITICAL',
        ...metadata
      })
    } else if (duration > this.THRESHOLDS.DB_SLOW) {
      logger.warn(`Slow database query: ${operation}`, 'DATABASE', {
        duration: `${duration}ms`,
        table,
        rowsAffected,
        threshold: 'SLOW',
        ...metadata
      })
    } else {
      logger.performance(`Database ${operation}`, duration, 'DATABASE', {
        table,
        rowsAffected,
        threshold: 'FAST',
        ...metadata
      })
    }
  }

  // Component Performance Monitoring
  trackComponentRender(componentName: string, duration: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetrics = {
      timestamp: new Date().toISOString(),
      operation: 'render',
      component: componentName,
      duration,
      success: true,
      metadata
    }

    this.metrics.push(metric)
    this.trimMetrics()

    if (duration > this.THRESHOLDS.COMPONENT_SLOW) {
      logger.warn(`Slow component render: ${componentName}`, 'COMPONENT', {
        duration: `${duration}ms`,
        threshold: 'SLOW',
        ...metadata
      })
    }
  }

  // Memory Monitoring
  trackMemoryUsage(operation: string, component?: string) {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory
      logger.debug('Memory usage', component || 'MEMORY', {
        operation,
        usedJSHeapSize: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        totalJSHeapSize: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
        jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`
      })
    }
  }

  // Performance Summary Methods
  getApiPerformanceSummary(hours = 1) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const recentMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff)

    if (recentMetrics.length === 0) {
      return null
    }

    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length
    const errorRate = recentMetrics.filter(m => m.statusCode >= 400).length / recentMetrics.length * 100
    const slowRequests = recentMetrics.filter(m => m.responseTime > this.THRESHOLDS.API_SLOW).length

    return {
      totalRequests: recentMetrics.length,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      slowRequests,
      fastRequests: recentMetrics.filter(m => m.responseTime < this.THRESHOLDS.API_FAST).length,
      timeRange: `${hours}h`
    }
  }

  getDatabasePerformanceSummary(hours = 1) {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    const recentMetrics = this.dbMetrics.filter(m => m.timestamp > cutoff)

    if (recentMetrics.length === 0) {
      return null
    }

    const avgDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length
    const slowQueries = recentMetrics.filter(m => m.duration > this.THRESHOLDS.DB_SLOW).length
    const totalRowsAffected = recentMetrics.reduce((sum, m) => sum + (m.rowsAffected || 0), 0)

    return {
      totalQueries: recentMetrics.length,
      avgDuration: Math.round(avgDuration),
      slowQueries,
      fastQueries: recentMetrics.filter(m => m.duration < this.THRESHOLDS.DB_FAST).length,
      totalRowsAffected,
      timeRange: `${hours}h`
    }
  }

  // Performance Alerts
  checkPerformanceAlerts() {
    const apiSummary = this.getApiPerformanceSummary(0.5) // Last 30 minutes
    const dbSummary = this.getDatabasePerformanceSummary(0.5)

    const alerts: string[] = []

    if (apiSummary) {
      if (apiSummary.errorRate > 5) {
        alerts.push(`High API error rate: ${apiSummary.errorRate}%`)
      }
      if (apiSummary.avgResponseTime > this.THRESHOLDS.API_SLOW) {
        alerts.push(`High API response time: ${apiSummary.avgResponseTime}ms`)
      }
    }

    if (dbSummary) {
      if (dbSummary.avgDuration > this.THRESHOLDS.DB_SLOW) {
        alerts.push(`Slow database queries: ${dbSummary.avgDuration}ms average`)
      }
      if (dbSummary.slowQueries > dbSummary.totalQueries * 0.2) {
        alerts.push(`High percentage of slow database queries: ${Math.round(dbSummary.slowQueries / dbSummary.totalQueries * 100)}%`)
      }
    }

    if (alerts.length > 0) {
      logger.warn('Performance alerts detected', 'PERFORMANCE', { alerts })
    }

    return alerts
  }

  // Health Check
  getSystemHealth() {
    const apiSummary = this.getApiPerformanceSummary(1)
    const dbSummary = this.getDatabasePerformanceSummary(1)

    let healthScore = 100

    if (apiSummary) {
      if (apiSummary.errorRate > 5) healthScore -= 20
      if (apiSummary.avgResponseTime > this.THRESHOLDS.API_SLOW) healthScore -= 15
      if (apiSummary.avgResponseTime > this.THRESHOLDS.API_CRITICAL) healthScore -= 25
    }

    if (dbSummary) {
      if (dbSummary.avgDuration > this.THRESHOLDS.DB_SLOW) healthScore -= 15
      if (dbSummary.avgDuration > this.THRESHOLDS.DB_CRITICAL) healthScore -= 25
    }

    const status = healthScore >= 90 ? 'excellent' : 
                   healthScore >= 70 ? 'good' : 
                   healthScore >= 50 ? 'degraded' : 'critical'

    return {
      score: Math.max(0, healthScore),
      status,
      api: apiSummary,
      database: dbSummary,
      timestamp: new Date().toISOString()
    }
  }

  // Utility Methods
  private trimMetrics() {
    if (this.metrics.length > this.maxStoredMetrics) {
      this.metrics = this.metrics.slice(-this.maxStoredMetrics / 2)
    }
    if (this.apiMetrics.length > this.maxStoredMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxStoredMetrics / 2)
    }
    if (this.dbMetrics.length > this.maxStoredMetrics) {
      this.dbMetrics = this.dbMetrics.slice(-this.maxStoredMetrics / 2)
    }
  }

  // Export metrics (for external monitoring systems)
  exportMetrics() {
    return {
      api: this.apiMetrics,
      database: this.dbMetrics,
      components: this.metrics,
      summary: {
        api: this.getApiPerformanceSummary(24), // Last 24 hours
        database: this.getDatabasePerformanceSummary(24),
        health: this.getSystemHealth()
      }
    }
  }

  // Clear old metrics (for memory management)
  clearOldMetrics(hoursOld = 24) {
    const cutoff = new Date(Date.now() - hoursOld * 60 * 60 * 1000).toISOString()
    
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff)
    this.apiMetrics = this.apiMetrics.filter(m => m.timestamp > cutoff)
    this.dbMetrics = this.dbMetrics.filter(m => m.timestamp > cutoff)
    
    logger.debug('Cleared old performance metrics', 'PERFORMANCE', {
      cutoffTime: cutoff,
      remainingMetrics: this.metrics.length + this.apiMetrics.length + this.dbMetrics.length
    })
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Convenience helper functions
export function trackApiPerformance(
  method: string,
  endpoint: string,
  statusCode: number,
  responseTime: number,
  userAgent?: string,
  metadata?: Record<string, any>
) {
  performanceMonitor.trackApiCall(method, endpoint, statusCode, responseTime, userAgent, metadata)
}

export function trackDatabasePerformance(
  operation: string,
  duration: number,
  table?: string,
  rowsAffected?: number,
  metadata?: Record<string, any>
) {
  performanceMonitor.trackDatabaseQuery(operation, duration, table, rowsAffected, metadata)
}

export function trackComponentPerformance(
  componentName: string,
  duration: number,
  metadata?: Record<string, any>
) {
  performanceMonitor.trackComponentRender(componentName, duration, metadata)
}

// Performance timing decorator for functions
export function withPerformanceMonitoring<T extends (...args: any[]) => any>(
  operation: string,
  component: string,
  fn: T
): T {
  return ((...args: any[]) => {
    const startTime = performance.now()
    
    try {
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - startTime
          performanceMonitor.trackComponentRender(component, duration, { operation })
        })
      } else {
        const duration = performance.now() - startTime
        performanceMonitor.trackComponentRender(component, duration, { operation })
        return result
      }
    } catch (error) {
      const duration = performance.now() - startTime
      logger.error(`${operation} failed`, error as Error, component)
      throw error
    }
  }) as T
}

export default performanceMonitor 