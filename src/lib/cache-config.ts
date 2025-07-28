// Comprehensive caching configuration for staff scheduling system

import { SWRConfiguration } from 'swr'

// Cache TTL constants (in milliseconds)
export const CACHE_TTL = {
  STAFF: 10 * 60 * 1000,        // 10 minutes - staff data changes infrequently
  SCHEDULES: 5 * 60 * 1000,     // 5 minutes - schedule data changes more frequently
  TEAM_SCHEDULE: 3 * 60 * 1000, // 3 minutes - team view needs fresher data
  INDICATORS: 5 * 60 * 1000,    // 5 minutes - date indicators
  ADMIN_DATA: 2 * 60 * 1000,    // 2 minutes - admin data needs to be fresh
  IMAGES: 24 * 60 * 60 * 1000,  // 24 hours - profile images rarely change
  STATIC: 7 * 24 * 60 * 60 * 1000 // 7 days - static assets
} as const

// SWR configuration for different data types
export const swrConfigs = {
  // Configuration for staff data
  staff: {
    refreshInterval: CACHE_TTL.STAFF,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 30000, // 30 seconds
    errorRetryCount: 3,
    errorRetryInterval: 2000,
    loadingTimeout: 10000,
    focusThrottleInterval: 5000,
    onErrorRetry: (error: any, key: string, config: any, revalidate: any, { retryCount }: any) => {
      // Don't retry on 4xx errors
      if (error?.status >= 400 && error?.status < 500) return
      
      // Don't retry more than 3 times
      if (retryCount >= 3) return
      
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000) + Math.random() * 1000
      setTimeout(() => revalidate({ retryCount }), delay)
    }
  } satisfies SWRConfiguration,

  // Configuration for schedule data
  schedules: {
    refreshInterval: CACHE_TTL.SCHEDULES,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 10000, // 10 seconds
    errorRetryCount: 3,
    errorRetryInterval: 1000,
    loadingTimeout: 8000,
    focusThrottleInterval: 3000,
    onErrorRetry: (error: any, key: string, config: any, revalidate: any, { retryCount }: any) => {
      if (error?.status >= 400 && error?.status < 500) return
      if (retryCount >= 3) return
      
      const delay = Math.min(500 * Math.pow(2, retryCount), 5000) + Math.random() * 500
      setTimeout(() => revalidate({ retryCount }), delay)
    }
  } satisfies SWRConfiguration,

  // Configuration for team schedule data
  teamSchedule: {
    refreshInterval: CACHE_TTL.TEAM_SCHEDULE,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 5000, // 5 seconds
    errorRetryCount: 2,
    errorRetryInterval: 1000,
    loadingTimeout: 6000,
    focusThrottleInterval: 2000
  } satisfies SWRConfiguration,

  // Configuration for admin data
  admin: {
    refreshInterval: CACHE_TTL.ADMIN_DATA,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    dedupingInterval: 2000, // 2 seconds
    errorRetryCount: 2,
    errorRetryInterval: 500,
    loadingTimeout: 5000,
    focusThrottleInterval: 1000
  } satisfies SWRConfiguration,

  // Configuration for rarely changing data
  static: {
    refreshInterval: CACHE_TTL.STATIC,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 60000, // 1 minute
    errorRetryCount: 1,
    errorRetryInterval: 5000,
    loadingTimeout: 15000
  } satisfies SWRConfiguration
}

// Browser storage configuration
export const storageConfig = {
  // LocalStorage keys
  keys: {
    STAFF_CACHE: 'staff-schedule-staff-cache',
    SCHEDULE_CACHE: 'staff-schedule-cache',
    TEAM_CACHE: 'staff-schedule-team-cache',
    USER_PREFERENCES: 'staff-schedule-preferences',
    PERFORMANCE_METRICS: 'staff-schedule-performance'
  },
  
  // Storage limits (in bytes)
  limits: {
    MAX_CACHE_SIZE: 5 * 1024 * 1024, // 5MB
    MAX_PERFORMANCE_METRICS: 1 * 1024 * 1024 // 1MB
  },
  
  // Cleanup thresholds
  cleanup: {
    CACHE_CLEANUP_THRESHOLD: 0.8, // Clean when 80% full
    METRICS_CLEANUP_THRESHOLD: 0.9 // Clean when 90% full
  }
}

// Cache invalidation patterns
export const invalidationPatterns = {
  // When staff data changes, invalidate related caches
  staff: [
    '/api/staff-schedule/staff',
    '/api/staff-schedule/schedules',
    '/api/staff-schedule/team',
    '/api/admin/staff-scheduling/staff'
  ],
  
  // When schedules change, invalidate schedule-related caches
  schedules: [
    '/api/staff-schedule/schedules',
    '/api/staff-schedule/team',
    '/api/admin/staff-scheduling/schedules',
    '/api/admin/staff-scheduling/overview'
  ],
  
  // When team data changes, invalidate team caches
  team: [
    '/api/staff-schedule/team',
    '/api/admin/staff-scheduling/overview'
  ]
}

// Performance thresholds for monitoring
export const performanceThresholds = {
  // API response time thresholds (in milliseconds)
  api: {
    FAST: 200,
    ACCEPTABLE: 1000,
    SLOW: 3000
  },
  
  // Component render time thresholds (in milliseconds)
  component: {
    FAST: 16, // 60fps
    ACCEPTABLE: 33, // 30fps
    SLOW: 100
  },
  
  // Cache hit rate thresholds (percentage)
  cache: {
    EXCELLENT: 90,
    GOOD: 75,
    POOR: 50
  }
}

// Memory management configuration
export const memoryConfig = {
  // Maximum number of cached items
  maxItems: {
    STAFF: 100,
    SCHEDULES: 500,
    TEAM_SCHEDULES: 200,
    PERFORMANCE_METRICS: 1000
  },
  
  // Cleanup intervals (in milliseconds)
  cleanupIntervals: {
    CACHE: 5 * 60 * 1000,      // 5 minutes
    METRICS: 10 * 60 * 1000,   // 10 minutes
    STORAGE: 30 * 60 * 1000    // 30 minutes
  }
}

// Network-aware caching configuration
export const networkConfig = {
  // Different strategies based on connection type
  strategies: {
    '4g': {
      prefetch: true,
      backgroundSync: true,
      cacheFirst: false
    },
    '3g': {
      prefetch: false,
      backgroundSync: true,
      cacheFirst: true
    },
    '2g': {
      prefetch: false,
      backgroundSync: false,
      cacheFirst: true
    },
    'slow-2g': {
      prefetch: false,
      backgroundSync: false,
      cacheFirst: true
    }
  },
  
  // Timeout adjustments based on connection
  timeouts: {
    '4g': 5000,
    '3g': 8000,
    '2g': 12000,
    'slow-2g': 20000
  }
}

// Development vs production configuration
export const environmentConfig = {
  development: {
    enablePerformanceMonitoring: true,
    enableCacheDebugging: true,
    logCacheHits: true,
    logSlowQueries: true,
    refreshInterval: CACHE_TTL.SCHEDULES / 2 // More frequent updates in dev
  },
  
  production: {
    enablePerformanceMonitoring: false,
    enableCacheDebugging: false,
    logCacheHits: false,
    logSlowQueries: false,
    refreshInterval: CACHE_TTL.SCHEDULES
  }
}

// Get configuration based on current environment
export function getEnvironmentConfig() {
  return process.env.NODE_ENV === 'development' 
    ? environmentConfig.development 
    : environmentConfig.production
}

// Get network-aware configuration
export function getNetworkAwareConfig() {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return networkConfig.strategies['4g'] // Default to 4g
  }
  
  const connection = (navigator as any).connection
  const effectiveType = connection?.effectiveType || '4g'
  
  return networkConfig.strategies[effectiveType as keyof typeof networkConfig.strategies] || networkConfig.strategies['4g']
}

// Get network-aware timeout
export function getNetworkAwareTimeout() {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return networkConfig.timeouts['4g']
  }
  
  const connection = (navigator as any).connection
  const effectiveType = connection?.effectiveType || '4g'
  
  return networkConfig.timeouts[effectiveType as keyof typeof networkConfig.timeouts] || networkConfig.timeouts['4g']
}