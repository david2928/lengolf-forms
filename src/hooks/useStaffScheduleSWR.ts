'use client'

import useSWR, { mutate } from 'swr'
import { useMemo } from 'react'
import { 
  Staff, 
  StaffSchedule, 
  ScheduleIndicator, 
  ViewMode,
  DateString 
} from '@/types/staff-schedule'
import { scheduleApi } from '@/lib/api-client'
import { ScheduleError } from '@/types/errors'

// SWR configuration with optimized settings
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 5 * 60 * 1000, // 5 minutes
  dedupingInterval: 2000, // 2 seconds
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  loadingTimeout: 10000,
  onErrorRetry: (error: any, key: string, config: any, revalidate: any, { retryCount }: any) => {
    // Don't retry on 4xx errors
    if (error?.status >= 400 && error?.status < 500) return
    
    // Don't retry more than 3 times
    if (retryCount >= 3) return
    
    // Exponential backoff
    setTimeout(() => revalidate({ retryCount }), Math.pow(2, retryCount) * 1000)
  }
}

// Cache key generators
const cacheKeys = {
  staff: () => '/api/staff-schedule/staff',
  schedules: (params: {
    staff_id?: number | null
    start_date?: string
    end_date?: string
    view_mode?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params.staff_id !== undefined && params.staff_id !== null) {
      searchParams.append('staff_id', params.staff_id.toString())
    }
    if (params.start_date) searchParams.append('start_date', params.start_date)
    if (params.end_date) searchParams.append('end_date', params.end_date)
    if (params.view_mode) searchParams.append('view_mode', params.view_mode)
    
    return `/api/staff-schedule/schedules?${searchParams.toString()}`
  },
  teamSchedule: (date: string) => `/api/staff-schedule/team?date=${date}`,
  adminSchedules: (params: {
    staff_id?: string
    start_date: string
    end_date: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params.staff_id) searchParams.append('staff_id', params.staff_id)
    searchParams.append('start_date', params.start_date)
    searchParams.append('end_date', params.end_date)
    
    return `/api/admin/staff-scheduling/schedules?${searchParams.toString()}`
  }
}

// Fetcher functions with error handling
const fetchers = {
  staff: async () => {
    const result = await scheduleApi.getStaff()
    if (result.success) {
      return result.data as { staff: Staff[] }
    }
    throw result.error
  },
  
  schedules: async (url: string) => {
    const urlObj = new URL(url, window.location.origin)
    const params = Object.fromEntries(urlObj.searchParams.entries())
    
    const result = await scheduleApi.getSchedules({
      staff_id: params.staff_id ? parseInt(params.staff_id) : undefined,
      start_date: params.start_date,
      end_date: params.end_date,
      view_mode: params.view_mode
    })
    
    if (result.success) {
      return result.data as { schedules: StaffSchedule[]; indicators: ScheduleIndicator[] }
    }
    throw result.error
  },
  
  teamSchedule: async (url: string) => {
    const urlObj = new URL(url, window.location.origin)
    const date = urlObj.searchParams.get('date')!
    
    const result = await scheduleApi.getTeamSchedule(date)
    if (result.success) {
      return result.data as { team_schedule: any[]; team_stats: any }
    }
    throw result.error
  }
}

// Hook for staff data
export function useStaff() {
  const { data, error, isLoading, mutate: mutateStaff } = useSWR(
    cacheKeys.staff(),
    fetchers.staff,
    swrConfig
  )

  return {
    staff: data?.staff || [],
    staffLoading: isLoading,
    staffError: error as ScheduleError | null,
    refreshStaff: mutateStaff
  }
}

// Hook for schedule data
export function useSchedules(params: {
  staff_id?: number | null
  start_date?: string
  end_date?: string
  view_mode?: string
} = {}) {
  const key = cacheKeys.schedules(params)
  const { data, error, isLoading, mutate: mutateSchedules } = useSWR(
    key,
    fetchers.schedules,
    swrConfig
  )

  return {
    schedules: data?.schedules || [],
    indicators: data?.indicators || [],
    schedulesLoading: isLoading,
    schedulesError: error as ScheduleError | null,
    refreshSchedules: mutateSchedules
  }
}

// Hook for team schedule data
export function useTeamSchedule(date: string) {
  const key = cacheKeys.teamSchedule(date)
  const { data, error, isLoading, mutate: mutateTeamSchedule } = useSWR(
    key,
    fetchers.teamSchedule,
    swrConfig
  )

  return {
    teamSchedule: data?.team_schedule || [],
    teamStats: data?.team_stats || {},
    teamLoading: isLoading,
    teamError: error as ScheduleError | null,
    refreshTeamSchedule: mutateTeamSchedule
  }
}

// Combined hook for staff schedule with optimized caching
export function useStaffScheduleOptimized(options: {
  staffId?: number | null
  startDate?: DateString
  endDate?: DateString
  viewMode?: ViewMode
  teamDate?: DateString
} = {}) {
  const { staff, staffLoading, staffError, refreshStaff } = useStaff()
  
  const { 
    schedules, 
    indicators, 
    schedulesLoading, 
    schedulesError, 
    refreshSchedules 
  } = useSchedules({
    staff_id: options.staffId,
    start_date: options.startDate,
    end_date: options.endDate,
    view_mode: options.viewMode
  })
  
  const { 
    teamSchedule, 
    teamStats, 
    teamLoading, 
    teamError, 
    refreshTeamSchedule 
  } = useTeamSchedule(options.teamDate || new Date().toISOString().split('T')[0])

  // Memoized refresh function to avoid unnecessary re-renders
  const refreshAll = useMemo(() => async () => {
    await Promise.all([
      refreshStaff(),
      refreshSchedules(),
      refreshTeamSchedule()
    ])
  }, [refreshStaff, refreshSchedules, refreshTeamSchedule])

  return {
    // Staff data
    staff,
    staffLoading,
    staffError,
    
    // Schedule data
    schedules,
    indicators,
    schedulesLoading,
    schedulesError,
    
    // Team schedule data
    teamSchedule,
    teamStats,
    teamLoading,
    teamError,
    
    // Actions
    refreshStaff,
    refreshSchedules,
    refreshTeamSchedule,
    refreshAll
  }
}

// Cache invalidation utilities
export const scheduleCache = {
  // Invalidate all staff-related caches
  invalidateStaff: () => mutate(cacheKeys.staff()),
  
  // Invalidate schedules for specific parameters
  invalidateSchedules: (params?: {
    staff_id?: number | null
    start_date?: string
    end_date?: string
    view_mode?: string
  }) => {
    if (params) {
      mutate(cacheKeys.schedules(params))
    } else {
      // Invalidate all schedule caches
      mutate(key => typeof key === 'string' && key.startsWith('/api/staff-schedule/schedules'))
    }
  },
  
  // Invalidate team schedule for specific date
  invalidateTeamSchedule: (date?: string) => {
    if (date) {
      mutate(cacheKeys.teamSchedule(date))
    } else {
      // Invalidate all team schedule caches
      mutate(key => typeof key === 'string' && key.startsWith('/api/staff-schedule/team'))
    }
  },
  
  // Invalidate all caches
  invalidateAll: () => {
    mutate(key => typeof key === 'string' && key.startsWith('/api/staff-schedule'))
  },
  
  // Preload data for better UX
  preloadSchedules: (params: {
    staff_id?: number | null
    start_date?: string
    end_date?: string
    view_mode?: string
  }) => {
    mutate(cacheKeys.schedules(params), fetchers.schedules(cacheKeys.schedules(params)))
  },
  
  preloadTeamSchedule: (date: string) => {
    mutate(cacheKeys.teamSchedule(date), fetchers.teamSchedule(cacheKeys.teamSchedule(date)))
  }
}