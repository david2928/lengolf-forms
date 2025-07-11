/**
 * Performance optimization utilities for payroll system
 * Story #11: Performance Optimization
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

interface PerformanceMetrics {
  operationName: string
  startTime: number
  endTime: number
  duration: number
  cacheHit: boolean
  queryCount: number
}

class PayrollCache {
  private cache = new Map<string, CacheEntry<any>>()
  private defaultTTL = 5 * 60 * 1000 // 5 minutes default
  private metrics: PerformanceMetrics[] = []

  constructor() {
    // Clear expired entries every minute
    setInterval(() => this.cleanup(), 60 * 1000)
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(key)
      return null
    }

    return entry.data as T
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }

    // Remove entries matching pattern
    const regex = new RegExp(pattern)
    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    }
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Performance monitoring
  startOperation(operationName: string): string {
    const operationId = `${operationName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    return operationId
  }

  endOperation(operationId: string, operationName: string, cacheHit: boolean = false, queryCount: number = 0): void {
    const [, startTimeStr] = operationId.split('-')
    const startTime = parseInt(startTimeStr)
    const endTime = Date.now()
    
    this.metrics.push({
      operationName,
      startTime,
      endTime,
      duration: endTime - startTime,
      cacheHit,
      queryCount
    })

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100)
    }
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics]
  }

  getAverageMetrics(operationName?: string): {
    averageDuration: number
    cacheHitRate: number
    totalOperations: number
  } {
    const relevantMetrics = operationName 
      ? this.metrics.filter(m => m.operationName === operationName)
      : this.metrics

    if (relevantMetrics.length === 0) {
      return { averageDuration: 0, cacheHitRate: 0, totalOperations: 0 }
    }

    const averageDuration = relevantMetrics.reduce((sum, m) => sum + m.duration, 0) / relevantMetrics.length
    const cacheHits = relevantMetrics.filter(m => m.cacheHit).length
    const cacheHitRate = cacheHits / relevantMetrics.length

    return {
      averageDuration,
      cacheHitRate,
      totalOperations: relevantMetrics.length
    }
  }
}

// Singleton cache instance
export const payrollCache = new PayrollCache()

/**
 * Cached wrapper for expensive operations
 */
export async function withCache<T>(
  key: string,
  operation: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache first
  const cached = payrollCache.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Execute operation and cache result
  const result = await operation()
  payrollCache.set(key, result, ttl)
  return result
}

/**
 * Performance monitoring wrapper
 */
export async function withPerformanceMonitoring<T>(
  operationName: string,
  operation: () => Promise<T>,
  queryCount?: number
): Promise<T> {
  const operationId = payrollCache.startOperation(operationName)
  
  try {
    const result = await operation()
    payrollCache.endOperation(operationId, operationName, false, queryCount || 0)
    return result
  } catch (error) {
    payrollCache.endOperation(operationId, operationName, false, queryCount || 0)
    throw error
  }
}

/**
 * Combined cache and performance monitoring
 */
export async function withCacheAndPerformance<T>(
  operationName: string,
  cacheKey: string,
  operation: () => Promise<T>,
  ttl?: number,
  queryCount?: number
): Promise<T> {
  const operationId = payrollCache.startOperation(operationName)
  
  // Try cache first
  const cached = payrollCache.get<T>(cacheKey)
  if (cached !== null) {
    payrollCache.endOperation(operationId, operationName, true, 0)
    return cached
  }

  try {
    const result = await operation()
    payrollCache.set(cacheKey, result, ttl)
    payrollCache.endOperation(operationId, operationName, false, queryCount || 0)
    return result
  } catch (error) {
    payrollCache.endOperation(operationId, operationName, false, queryCount || 0)
    throw error
  }
}

/**
 * Batch database operations utility
 */
export class BatchOperations {
  private operations: Array<{
    name: string
    operation: () => Promise<any>
    priority: number
  }> = []

  add<T>(name: string, operation: () => Promise<T>, priority: number = 0): this {
    this.operations.push({ name, operation, priority })
    return this
  }

  async execute(): Promise<Record<string, any>> {
    // Sort by priority (higher priority first)
    this.operations.sort((a, b) => b.priority - a.priority)
    
    // Execute all operations in parallel
    const results = await Promise.all(
      this.operations.map(async op => {
        try {
          const result = await op.operation()
          return { name: op.name, result, error: null }
        } catch (error) {
          return { name: op.name, result: null, error }
        }
      })
    )

    // Convert to object with operation names as keys
    const resultMap: Record<string, any> = {}
    for (const { name, result, error } of results) {
      if (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        throw new Error(`Operation ${name} failed: ${errorMessage}`)
      }
      resultMap[name] = result
    }

    return resultMap
  }

  clear(): this {
    this.operations = []
    return this
  }
}

/**
 * Optimized database query builder for time entries
 */
export interface TimeEntryQueryOptions {
  monthYear: string
  staffIds?: number[]
  includeStaffInfo?: boolean
  includePhotoUrls?: boolean
}

export function buildOptimizedTimeEntryQuery(options: TimeEntryQueryOptions) {
  const { monthYear, staffIds, includeStaffInfo = false, includePhotoUrls = false } = options
  
  // Use Bangkok timezone to ensure correct month filtering
  const startDate = `${monthYear}-01T00:00:00+07:00`
  const endDate = new Date(monthYear + '-01')
  endDate.setMonth(endDate.getMonth() + 1)
  endDate.setDate(0)
  const endDateStr = endDate.toISOString().split('T')[0]
  const endDateTime = `${endDateStr}T23:59:59+07:00`

  // Build select fields
  const selectFields = ['id', 'staff_id', 'timestamp', 'action']
  if (includePhotoUrls) {
    selectFields.push('photo_url')
  }
  if (includeStaffInfo) {
    selectFields.push('staff!inner(staff_name, is_active)')
  }

  return {
    select: selectFields.join(', '),
    filters: {
      timestamp_gte: startDate,
      timestamp_lte: endDateTime,
      staff_ids: staffIds
    },
    orderBy: { field: 'timestamp', ascending: true }
  }
}

/**
 * Cache invalidation utilities
 */
export const CacheKeys = {
  // Time entry related
  timeEntries: (monthYear: string) => `time_entries_${monthYear}`,
  dailyHours: (monthYear: string) => `daily_hours_${monthYear}`,
  weeklyHours: (monthYear: string) => `weekly_hours_${monthYear}`,
  holidayHours: (monthYear: string) => `holiday_hours_${monthYear}`,
  workingDays: (monthYear: string) => `working_days_${monthYear}`,
  
  // Payroll calculation related
  payrollCalculation: (monthYear: string) => `payroll_calculation_${monthYear}`,
  reviewEntries: (monthYear: string) => `review_entries_${monthYear}`,
  
  // Settings related
  staffCompensation: (monthYear: string) => `staff_compensation_${monthYear}`,
  dailyAllowance: () => 'daily_allowance',
  serviceCharge: (monthYear: string) => `service_charge_${monthYear}`,
  publicHolidays: (monthYear: string) => `public_holidays_${monthYear}`,
  
  // Staff related
  activeStaff: () => 'active_staff'
}

export const invalidatePayrollCache = {
  // Invalidate specific month data
  forMonth: (monthYear: string) => {
    payrollCache.invalidate(`.*_${monthYear}$`)
  },
  
  // Invalidate staff-related data
  forStaffChanges: () => {
    payrollCache.invalidate('active_staff')
    payrollCache.invalidate('staff_compensation_.*')
  },
  
  // Invalidate settings
  forSettings: () => {
    payrollCache.invalidate('daily_allowance')
    payrollCache.invalidate('public_holidays_.*')
  },
  
  // Clear all payroll cache
  all: () => {
    payrollCache.invalidate()
  }
}

// Clear cache for May 2025 to ensure the timezone and OT calculation fixes take effect
invalidatePayrollCache.forMonth('2025-05')
// Also clear all cache to ensure OT calculation changes are applied  
invalidatePayrollCache.all()

/**
 * Query optimization hints for database indexes
 */
export const RECOMMENDED_INDEXES = [
  // Time entries table
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_timestamp ON backoffice.time_entries(timestamp);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_staff_timestamp ON backoffice.time_entries(staff_id, timestamp);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_month_staff ON backoffice.time_entries(DATE_TRUNC(\'month\', timestamp), staff_id);',
  
  // Staff compensation table
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_compensation_staff_effective ON backoffice.staff_compensation(staff_id, effective_from, effective_to);',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_compensation_active ON backoffice.staff_compensation(staff_id) WHERE effective_to IS NULL;',
  
  // Public holidays table
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_public_holidays_date_active ON backoffice.public_holidays(holiday_date) WHERE is_active = true;',
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_public_holidays_month ON backoffice.public_holidays(DATE_TRUNC(\'month\', holiday_date)) WHERE is_active = true;',
  
  // Staff table
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_staff_active ON backoffice.staff(is_active) WHERE is_active = true;',
  
  // Monthly service charge table
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_monthly_service_charge_month ON backoffice.monthly_service_charge(month_year);'
]

/**
 * Performance analysis utilities
 */
export const PerformanceAnalyzer = {
  getSlowOperations: (thresholdMs: number = 1000) => {
    return payrollCache.getMetrics().filter(m => m.duration > thresholdMs)
  },

  getCacheEfficiency: () => {
    const metrics = payrollCache.getMetrics()
    const totalOps = metrics.length
    const cacheHits = metrics.filter(m => m.cacheHit).length
    
    return {
      totalOperations: totalOps,
      cacheHits,
      cacheMisses: totalOps - cacheHits,
      hitRate: totalOps > 0 ? (cacheHits / totalOps * 100).toFixed(2) + '%' : '0%'
    }
  },

  getOperationBreakdown: () => {
    const metrics = payrollCache.getMetrics()
    const breakdown = new Map<string, { count: number, totalDuration: number, avgDuration: number }>()
    
    for (const metric of metrics) {
      const existing = breakdown.get(metric.operationName) || { count: 0, totalDuration: 0, avgDuration: 0 }
      existing.count++
      existing.totalDuration += metric.duration
      existing.avgDuration = existing.totalDuration / existing.count
      breakdown.set(metric.operationName, existing)
    }
    
    return Object.fromEntries(breakdown)
  }
}

/**
 * Loading state utilities
 */
export interface LoadingState {
  isLoading: boolean
  operation?: string
  progress?: number
  estimatedTimeRemaining?: number
}

export class LoadingStateManager {
  private listeners = new Set<(state: LoadingState) => void>()
  private currentState: LoadingState = { isLoading: false }
  private operationStartTime?: number

  subscribe(listener: (state: LoadingState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  startOperation(operation: string, estimatedDurationMs?: number): void {
    this.operationStartTime = Date.now()
    this.currentState = {
      isLoading: true,
      operation,
      progress: 0,
      estimatedTimeRemaining: estimatedDurationMs
    }
    this.notifyListeners()
  }

  updateProgress(progress: number): void {
    if (!this.currentState.isLoading) return
    
    const elapsed = this.operationStartTime ? Date.now() - this.operationStartTime : 0
    const estimatedTimeRemaining = progress > 0 ? (elapsed / progress) * (100 - progress) : undefined
    
    this.currentState = {
      ...this.currentState,
      progress,
      estimatedTimeRemaining
    }
    this.notifyListeners()
  }

  endOperation(): void {
    this.currentState = { isLoading: false }
    this.operationStartTime = undefined
    this.notifyListeners()
  }

  private notifyListeners(): void {
    for (const listener of Array.from(this.listeners)) {
      listener(this.currentState)
    }
  }
}

export const loadingStateManager = new LoadingStateManager() 