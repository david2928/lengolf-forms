'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Staff, 
  StaffSchedule, 
  ScheduleIndicator, 
  StaffApiResponse, 
  ScheduleApiResponse,
  TeamScheduleApiResponse,
  ViewMode,
  DateString 
} from '@/types/staff-schedule'
import { handleApiError } from '@/lib/api-client'
import { ScheduleError } from '@/types/errors'
import { scheduleApi } from '@/lib/api-client'

interface UseStaffScheduleOptions {
  staffId?: number | null
  startDate?: DateString
  endDate?: DateString
  viewMode?: ViewMode
}

interface UseStaffScheduleReturn {
  // Staff data
  staff: Staff[]
  staffLoading: boolean
  staffError: ScheduleError | null
  
  // Schedule data
  schedules: StaffSchedule[]
  indicators: ScheduleIndicator[]
  schedulesLoading: boolean
  schedulesError: ScheduleError | null
  
  // Team schedule data
  teamSchedule: any[]
  teamStats: any
  teamLoading: boolean
  teamError: ScheduleError | null
  
  // Actions
  fetchStaff: () => Promise<void>
  fetchSchedules: (options?: UseStaffScheduleOptions) => Promise<void>
  fetchTeamSchedule: (date: DateString) => Promise<void>
  refreshData: () => Promise<void>
  retryStaff: () => Promise<void>
  retrySchedules: () => Promise<void>
  retryTeamSchedule: () => Promise<void>
}

export function useStaffSchedule(initialOptions: UseStaffScheduleOptions = {}): UseStaffScheduleReturn {
  // Staff state
  const [staff, setStaff] = useState<Staff[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [staffError, setStaffError] = useState<ScheduleError | null>(null)
  
  // Schedule state
  const [schedules, setSchedules] = useState<StaffSchedule[]>([])
  const [indicators, setIndicators] = useState<ScheduleIndicator[]>([])
  const [schedulesLoading, setSchedulesLoading] = useState(false)
  const [schedulesError, setSchedulesError] = useState<ScheduleError | null>(null)
  
  // Team schedule state
  const [teamSchedule, setTeamSchedule] = useState<any[]>([])
  const [teamStats, setTeamStats] = useState<any>({})
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState<ScheduleError | null>(null)
  
  // Store last options for retry functionality
  const [lastScheduleOptions, setLastScheduleOptions] = useState<UseStaffScheduleOptions>(initialOptions)
  const [lastTeamDate, setLastTeamDate] = useState<DateString | null>(null)

  // Cache keys for localStorage
  const CACHE_KEYS = {
    staff: 'staff-schedule-staff',
    schedules: 'staff-schedule-schedules',
    indicators: 'staff-schedule-indicators',
    teamSchedule: 'staff-schedule-team',
    teamStats: 'staff-schedule-team-stats'
  }

  // Cache TTL (5 minutes)
  const CACHE_TTL = 5 * 60 * 1000

  // Helper functions for caching
  const getCachedData = (key: string) => {
    try {
      const cached = localStorage.getItem(key)
      if (cached) {
        const { data, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_TTL) {
          return data
        }
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.warn('Error reading cache:', error)
    }
    return null
  }

  const setCachedData = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
      }))
    } catch (error) {
      console.warn('Error writing cache:', error)
    }
  }

  // Fetch staff list
  const fetchStaff = useCallback(async () => {
    try {
      setStaffLoading(true)
      setStaffError(null)
      
      // Try cache first
      const cachedStaff = getCachedData(CACHE_KEYS.staff)
      if (cachedStaff) {
        setStaff(cachedStaff)
        setStaffLoading(false)
        return
      }
      
      const result = await scheduleApi.getStaff()
      
      if (result.success) {
        const data = result.data as { staff: Staff[] }
        setStaff(data.staff)
        setCachedData(CACHE_KEYS.staff, data.staff)
      } else {
        throw result.error
      }
    } catch (error: any) {
      console.error('Error fetching staff:', error)
      setStaffError(handleApiError(error))
      
      // Try to use cached data as fallback
      const cachedStaff = getCachedData(CACHE_KEYS.staff)
      if (cachedStaff) {
        setStaff(cachedStaff)
        console.log('Using cached staff data as fallback')
      }
    } finally {
      setStaffLoading(false)
    }
  }, [getCachedData, setCachedData])

  // Fetch schedules
  const fetchSchedules = useCallback(async (options: UseStaffScheduleOptions = {}) => {
    try {
      setSchedulesLoading(true)
      setSchedulesError(null)
      setLastScheduleOptions(options)
      
      const result = await scheduleApi.getSchedules({
        staff_id: options.staffId,
        start_date: options.startDate,
        end_date: options.endDate,
        view_mode: options.viewMode
      })

      if (result.success) {
        const data = result.data as { schedules: StaffSchedule[]; indicators: ScheduleIndicator[] }
        setSchedules(data.schedules)
        setIndicators(data.indicators)
      } else {
        throw result.error
      }
    } catch (error: any) {
      console.error('Error fetching schedules:', error)
      setSchedulesError(handleApiError(error))
    } finally {
      setSchedulesLoading(false)
    }
  }, [])

  // Fetch team schedule for a specific date
  const fetchTeamSchedule = useCallback(async (date: DateString) => {
    try {
      setTeamLoading(true)
      setTeamError(null)
      setLastTeamDate(date)
      
      const result = await scheduleApi.getTeamSchedule(date)

      if (result.success) {
        const data = result.data as { team_schedule: any[]; team_stats: any }
        setTeamSchedule(data.team_schedule)
        setTeamStats(data.team_stats)
      } else {
        throw result.error
      }
    } catch (error: any) {
      console.error('Error fetching team schedule:', error)
      setTeamError(handleApiError(error))
    } finally {
      setTeamLoading(false)
    }
  }, [])

  // Retry functions
  const retryStaff = useCallback(async () => {
    await fetchStaff()
  }, [fetchStaff])

  const retrySchedules = useCallback(async () => {
    await fetchSchedules(lastScheduleOptions)
  }, [fetchSchedules, lastScheduleOptions])

  const retryTeamSchedule = useCallback(async () => {
    if (lastTeamDate) {
      await fetchTeamSchedule(lastTeamDate)
    }
  }, [fetchTeamSchedule, lastTeamDate])

  // Refresh all data
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchStaff(),
      fetchSchedules(initialOptions)
    ])
  }, [fetchStaff, fetchSchedules, initialOptions])

  // Initial data fetch
  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

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
    fetchStaff,
    fetchSchedules,
    fetchTeamSchedule,
    refreshData,
    retryStaff,
    retrySchedules,
    retryTeamSchedule
  }
}