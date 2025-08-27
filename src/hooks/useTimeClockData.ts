import { useState, useCallback, useEffect } from 'react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { getBangkokToday, getBangkokNow, formatBangkokTime } from '@/lib/bangkok-timezone'

// Types
export interface TimeEntry {
  entry_id: number
  staff_id: number
  staff_name: string
  action: 'clock_in' | 'clock_out'
  timestamp: string
  date_only: string
  time_only: string
  photo_captured: boolean
  photo_url?: string | null
  camera_error?: string | null
}

export interface ReportFilters {
  startDate: string
  endDate: string
  staffId: string
  action: string
  photoFilter: string
}

export interface MonthlyComparison {
  currentMonthHours: number
  previousMonthHours: number
  percentageChange: {
    value: string
    isPositive: boolean
  }
}

export interface MonthToDateSummary {
  totalEntries: number
  photoCompliance: number
}

export interface TimeClockData {
  timeEntries: TimeEntry[]
  staffList: Array<{ id: number; name: string }>
  monthlyComparison: MonthlyComparison
  monthToDateSummary: MonthToDateSummary
  loading: boolean
  error: string | null
}

// Custom hook for consolidated time clock data management
export const useTimeClockData = (initialFilters: ReportFilters) => {
  const [data, setData] = useState<TimeClockData>({
    timeEntries: [],
    staffList: [],
    monthlyComparison: {
      currentMonthHours: 0,
      previousMonthHours: 0,
      percentageChange: { value: '0%', isPositive: true }
    },
    monthToDateSummary: {
      totalEntries: 0,
      photoCompliance: 0
    },
    loading: true,
    error: null
  })

  const [filters, setFilters] = useState<ReportFilters>(initialFilters)

  // Format percentage change for display
  const formatPercentageChange = useCallback((current: number, previous: number) => {
    if (previous === 0) {
      return { value: current > 0 ? '+100%' : '0%', isPositive: current > 0 }
    }
    const change = ((current - previous) / previous) * 100
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      isPositive: change >= 0
    }
  }, [])

  // Fetch monthly hours comparison
  const fetchMonthlyHours = useCallback(async (): Promise<MonthlyComparison> => {
    try {
      const bangkokToday = getBangkokNow()
      const currentMonthStart = startOfMonth(bangkokToday)
      const currentMonthToday = bangkokToday
      
      const previousMonth = subMonths(bangkokToday, 1)
      const previousMonthStart = startOfMonth(previousMonth)
      const previousMonthSameDay = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), bangkokToday.getDate())
      
      const [currentResponse, previousResponse] = await Promise.all([
        fetch(`/api/time-clock/entries?start_date=${formatBangkokTime(currentMonthStart, 'yyyy-MM-dd')}&end_date=${formatBangkokTime(currentMonthToday, 'yyyy-MM-dd')}`, {
          credentials: 'include'
        }),
        fetch(`/api/time-clock/entries?start_date=${formatBangkokTime(previousMonthStart, 'yyyy-MM-dd')}&end_date=${formatBangkokTime(previousMonthSameDay, 'yyyy-MM-dd')}`, {
          credentials: 'include'
        })
      ])
      
      if (currentResponse.ok && previousResponse.ok) {
        const [currentData, previousData] = await Promise.all([
          currentResponse.json(),
          previousResponse.json()
        ])
        
        // Note: For now using entry counts as proxy for hours
        // TODO: Move shift calculation to server-side for accurate hours
        const currentHours = (currentData.entries || []).length * 8 // Placeholder calculation
        const previousHours = (previousData.entries || []).length * 8 // Placeholder calculation
        
        return {
          currentMonthHours: currentHours,
          previousMonthHours: previousHours,
          percentageChange: formatPercentageChange(currentHours, previousHours)
        }
      }
      
      return {
        currentMonthHours: 0,
        previousMonthHours: 0,
        percentageChange: { value: '0%', isPositive: true }
      }
    } catch (err) {
      console.error('Error fetching monthly hours:', err)
      return {
        currentMonthHours: 0,
        previousMonthHours: 0,
        percentageChange: { value: '0%', isPositive: true }
      }
    }
  }, [formatPercentageChange])

  // Fetch month to date summary
  const fetchMonthToDateSummary = useCallback(async (): Promise<MonthToDateSummary> => {
    try {
      const bangkokToday = getBangkokNow()
      const currentMonthStart = startOfMonth(bangkokToday)
      
      const response = await fetch(
        `/api/time-clock/entries?start_date=${formatBangkokTime(currentMonthStart, 'yyyy-MM-dd')}&end_date=${formatBangkokTime(bangkokToday, 'yyyy-MM-dd')}`,
        { credentials: 'include' }
      )
      
      if (response.ok) {
        const data = await response.json()
        const entries = data.entries || []
        const entriesWithPhotos = entries.filter((e: any) => e.photo_captured).length
        const complianceRate = entries.length > 0 ? (entriesWithPhotos / entries.length) * 100 : 0
        
        return {
          totalEntries: entries.length,
          photoCompliance: complianceRate
        }
      }
      
      return { totalEntries: 0, photoCompliance: 0 }
    } catch (err) {
      console.error('Error fetching month to date summary:', err)
      return { totalEntries: 0, photoCompliance: 0 }
    }
  }, [])

  // Main data fetching function - consolidates all API calls
  const fetchAllData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }))

      // Parallel API calls for better performance
      const [timeEntriesResponse, staffResponse, monthlyHoursData, monthToDateData] = await Promise.all([
        // Time entries with filters
        fetch(`/api/time-clock/entries?${new URLSearchParams({
          start_date: filters.startDate,
          end_date: filters.endDate,
          ...(filters.staffId !== 'all' && { staff_id: filters.staffId })
        })}`, { credentials: 'include' }),
        
        // Staff list
        fetch('/api/staff?includeInactive=false', { credentials: 'include' }),
        
        // Monthly hours comparison
        fetchMonthlyHours(),
        
        // Month to date summary
        fetchMonthToDateSummary()
      ])

      // Process time entries response
      if (!timeEntriesResponse.ok) {
        throw new Error('Failed to fetch time entries')
      }
      const timeEntriesData = await timeEntriesResponse.json()
      let entries = timeEntriesData.entries || []

      // Apply client-side filters
      if (filters.action !== 'all') {
        entries = entries.filter((entry: TimeEntry) => entry.action === filters.action)
      }
      if (filters.photoFilter === 'with_photo') {
        entries = entries.filter((entry: TimeEntry) => entry.photo_captured)
      } else if (filters.photoFilter === 'without_photo') {
        entries = entries.filter((entry: TimeEntry) => !entry.photo_captured)
      }

      // Process staff response
      const staffData = staffResponse.ok ? await staffResponse.json() : { data: [] }
      const mappedStaff = (staffData.data || []).map((staff: any) => ({
        id: staff.id,
        name: staff.staff_name
      }))

      // Update state with all data
      setData(prev => ({
        ...prev,
        timeEntries: entries,
        staffList: mappedStaff,
        monthlyComparison: monthlyHoursData,
        monthToDateSummary: monthToDateData,
        loading: false,
        error: null
      }))

    } catch (err) {
      console.error('Error fetching time clock data:', err)
      setData(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load data'
      }))
    }
  }, [filters, fetchMonthToDateSummary, fetchMonthlyHours])

  // Quick date filter handlers
  const handleQuickDateFilter = useCallback((days: number) => {
    if (days === 0) {
      const today = getBangkokToday()
      setFilters(prev => ({
        ...prev,
        startDate: today,
        endDate: today
      }))
    } else {
      const end = getBangkokNow()
      const start = subDays(end, days)
      setFilters(prev => ({
        ...prev,
        startDate: formatBangkokTime(start, 'yyyy-MM-dd'),
        endDate: formatBangkokTime(end, 'yyyy-MM-dd')
      }))
    }
  }, [])

  // Filter change handler
  const handleFilterChange = useCallback((key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }, [])

  // Refresh all data
  const refreshData = useCallback(() => {
    fetchAllData()
  }, [fetchAllData])

  // Effect to fetch data when filters change
  useEffect(() => {
    fetchAllData()
  }, [filters, fetchAllData])

  return {
    ...data,
    filters,
    handleFilterChange,
    handleQuickDateFilter,
    refreshData
  }
}