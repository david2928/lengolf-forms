/**
 * Production-Ready Logging System
 * 
 * Features:
 * - Environment-based log levels
 * - Structured logging with metadata
 * - Performance tracking
 * - Error categorization
 * - Safe production logging (no sensitive data)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'performance'

export interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  component?: string
  userId?: string
  sessionId?: string
  metadata?: Record<string, any>
  performance?: {
    duration?: number
    operation?: string
  }
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'
  private enablePerformanceLogging = process.env.ENABLE_PERFORMANCE_LOGS === 'true'

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, component, message, metadata } = entry
    
    let logString = `[${timestamp}] ${level.toUpperCase()}`
    
    if (component) {
      logString += ` [${component}]`
    }
    
    logString += `: ${message}`
    
    if (metadata && Object.keys(metadata).length > 0) {
      logString += ` | ${JSON.stringify(this.sanitizeMetadata(metadata))}`
    }
    
    return logString
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized = { ...metadata }
    
    // Remove sensitive data in production
    if (this.isProduction) {
      const sensitiveKeys = ['pin', 'password', 'token', 'secret', 'key', 'auth']
      
      Object.keys(sanitized).forEach(key => {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          sanitized[key] = '[REDACTED]'
        }
        
        // Truncate long strings in production
        if (typeof sanitized[key] === 'string' && sanitized[key].length > 100) {
          sanitized[key] = sanitized[key].substring(0, 100) + '...'
        }
      })
    }
    
    return sanitized
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    component?: string,
    metadata?: Record<string, any>
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      component,
      metadata: metadata ? this.sanitizeMetadata(metadata) : undefined,
    }
  }

  debug(message: string, component?: string, metadata?: Record<string, any>) {
    if (!this.isDevelopment) return
    
    const entry = this.createLogEntry('debug', message, component, metadata)
    console.debug(this.formatLogEntry(entry))
  }

  info(message: string, component?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry('info', message, component, metadata)
    console.info(this.formatLogEntry(entry))
  }

  warn(message: string, component?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry('warn', message, component, metadata)
    console.warn(this.formatLogEntry(entry))
  }

  error(message: string, error?: Error, component?: string, metadata?: Record<string, any>) {
    const entry = this.createLogEntry('error', message, component, metadata)
    
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      }
    }
    
    console.error(this.formatLogEntry(entry))
    
    // In production, you could send this to an error tracking service
    if (this.isProduction) {
      this.sendToErrorService(entry)
    }
  }

  performance(operation: string, duration: number, component?: string, metadata?: Record<string, any>) {
    if (!this.enablePerformanceLogging && this.isProduction) return
    
    const entry = this.createLogEntry('performance', `${operation} completed`, component, metadata)
    entry.performance = { operation, duration }
    
    const perfColor = duration > 1000 ? '\x1b[31m' : duration > 500 ? '\x1b[33m' : '\x1b[32m'
    const resetColor = '\x1b[0m'
    
    if (this.isDevelopment) {
      console.log(`${perfColor}🚀 PERFORMANCE${resetColor}: ${this.formatLogEntry(entry)} (${duration}ms)`)
    } else {
      console.log(this.formatLogEntry(entry))
    }
  }

  // Specialized logging methods for common scenarios
  auth(message: string, userId?: string, metadata?: Record<string, any>) {
    this.info(message, 'AUTH', { userId, ...metadata })
  }

  api(method: string, endpoint: string, duration: number, status: number, metadata?: Record<string, any>) {
    const level = status >= 400 ? 'warn' : 'info'
    this[level](`${method} ${endpoint} - ${status}`, 'API', {
      method,
      endpoint,
      status,
      duration: `${duration}ms`,
      ...metadata
    })
  }

  database(operation: string, table?: string, duration?: number, metadata?: Record<string, any>) {
    const message = `Database ${operation}${table ? ` on ${table}` : ''}`
    
    if (duration !== undefined) {
      this.performance(message, duration, 'DATABASE', metadata)
    } else {
      this.debug(message, 'DATABASE', metadata)
    }
  }

  userAction(action: string, userId?: string, metadata?: Record<string, any>) {
    this.info(`User action: ${action}`, 'USER', { userId, ...metadata })
  }

  // Critical system events
  system(message: string, metadata?: Record<string, any>) {
    this.info(message, 'SYSTEM', metadata)
  }

  private sendToErrorService(entry: LogEntry) {
    // In a real production environment, send to error tracking service
    // Examples: Sentry, LogRocket, Datadog, etc.
    // For now, we'll just structure it for future integration
    
    if (typeof window !== 'undefined') {
      // Browser environment - could send to client-side error service
      // window.errorTracker?.captureException(entry)
    } else {
      // Server environment - could send to server-side monitoring
      // serverErrorTracker?.captureException(entry)
    }
  }

  // Performance timing helpers
  startTimer(operation: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      this.performance(operation, duration)
      return duration
    }
  }

  // Rate limiting for repeated log messages
  private logCache = new Map<string, { count: number; lastLogged: number }>()
  
  throttledWarn(key: string, message: string, component?: string, metadata?: Record<string, any>, throttleMs = 60000) {
    const now = Date.now()
    const cached = this.logCache.get(key)
    
    if (!cached || now - cached.lastLogged > throttleMs) {
      this.warn(message, component, metadata)
      this.logCache.set(key, { count: 1, lastLogged: now })
    } else {
      cached.count++
      if (cached.count % 10 === 0) {
        this.warn(`${message} (repeated ${cached.count} times)`, component, metadata)
        cached.lastLogged = now
      }
    }
  }
}

// Create singleton logger instance
export const logger = new Logger()

// Convenience exports for easier usage
export const logDebug = logger.debug.bind(logger)
export const logInfo = logger.info.bind(logger)
export const logWarn = logger.warn.bind(logger)
export const logError = logger.error.bind(logger)
export const logPerformance = logger.performance.bind(logger)
export const logAuth = logger.auth.bind(logger)
export const logApi = logger.api.bind(logger)
export const logDatabase = logger.database.bind(logger)
export const logUserAction = logger.userAction.bind(logger)
export const logSystem = logger.system.bind(logger)

// Performance timing helper
export function withPerformanceLogging<T>(
  operation: string,
  fn: () => T | Promise<T>,
  component?: string
): Promise<T> {
  const stopTimer = logger.startTimer(operation)
  
  try {
    const result = fn()
    
    if (result instanceof Promise) {
      return result.finally(() => {
        stopTimer()
      })
    } else {
      stopTimer()
      return Promise.resolve(result)
    }
  } catch (error) {
    stopTimer()
    logger.error(`${operation} failed`, error as Error, component)
    throw error
  }
}

export default logger 