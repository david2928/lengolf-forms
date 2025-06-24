'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Skeleton, TableRowSkeleton, StatsCardSkeleton } from '@/components/ui/skeleton-loader'
import { 
  ResponsiveTable, 
  ResponsiveTableHeader, 
  ResponsiveTableBody, 
  ResponsiveTableRow, 
  ResponsiveTableHead, 
  ResponsiveTableCell 
} from '@/components/ui/responsive-table'
import { 
  Clock, 
  Users, 
  Download, 
  Calendar, 
  Filter,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  BarChart3,
  TrendingUp,
  Camera,
  MapPin,
  RefreshCw,
  Eye
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subMonths, isSameMonth, isSameYear } from 'date-fns'
import { getBangkokToday, getBangkokNow, formatBangkokTime, bangkokDateToApiFormat } from '@/lib/bangkok-timezone'
import { 
  calculateWorkShifts, 
  calculateStaffAnalytics, 
  formatShiftDuration, 
  getBusinessRules,
  type WorkShift, 
  type StaffTimeAnalytics,
  type TimeEntry as TimeCalculationEntry
} from '@/lib/time-calculation'

interface TimeEntry {
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

// Legacy interface - keeping for compatibility but will use StaffTimeAnalytics
interface StaffSummary {
  staff_id: number
  staff_name: string
  total_hours: number
  days_worked: number
  total_entries: number
  clock_ins: number
  clock_outs: number
  photos_captured: number
  overtime_hours: number
  has_issues: boolean
}

interface ReportFilters {
  startDate: string
  endDate: string
  staffId: string
  action: string
  photoFilter: string
}

// Photo Dialog Component
interface PhotoDialogProps {
  entry: TimeEntry
  loadPhotoUrl: (photoPath: string) => Promise<string | null>
  photoUrls: Map<string, string>
  loadingPhotos: Set<string>
}

function PhotoDialog({ entry, loadPhotoUrl, photoUrls, loadingPhotos }: PhotoDialogProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = async (open: boolean) => {
    if (open && entry.photo_url && !photoUrl) {
      setIsLoading(true)
      setError(null)
      
      try {
        const url = await loadPhotoUrl(entry.photo_url)
        if (url) {
          setPhotoUrl(url)
        } else {
          setError('Failed to load photo URL')
        }
              } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(`Error loading photo: ${errorMessage}`)
        console.error('Error loading photo:', err)
      } finally {
        setIsLoading(false)
      }
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Time Clock Photo</DialogTitle>
          <DialogDescription>
            {entry.staff_name} - {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'} 
            on {format(new Date(entry.timestamp), 'MMM dd, yyyy at h:mm a')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center">
          {isLoading ? (
            <div className="text-center p-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <div className="text-muted-foreground">Loading photo...</div>
            </div>
          ) : error ? (
            <div className="text-center p-8 border rounded-lg bg-gray-50">
              <div className="text-gray-500 mb-2">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Failed to load photo
              </div>
              <div className="text-xs text-gray-400 mb-2">{error}</div>
              <div className="text-xs text-gray-400 font-mono">
                Path: {entry.photo_url}
              </div>
            </div>
          ) : photoUrl ? (
            <img 
              src={photoUrl} 
              alt="Time clock photo"
              className="max-w-full h-auto rounded-lg border"
              style={{ maxHeight: '400px' }}
              onError={() => {
                setError('Image failed to load')
              }}
              onLoad={() => {
        
              }}
            />
          ) : (
            <div className="text-center p-8 border rounded-lg bg-gray-50">
              <div className="text-gray-500 mb-2">
                <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No photo available
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function TimeReportsDashboard() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [staffSummaries, setStaffSummaries] = useState<StaffSummary[]>([])
  const [staffAnalytics, setStaffAnalytics] = useState<StaffTimeAnalytics[]>([]) // NEW: Enhanced analytics
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([]) // NEW: Calculated shifts
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set())
  const [currentMonthHours, setCurrentMonthHours] = useState(0)
  const [previousMonthHours, setPreviousMonthHours] = useState(0)
  const [monthlyHoursLoading, setMonthlyHoursLoading] = useState(false)
  
  // Month-to-date summary data (independent of filters)
  const [monthToDateEntries, setMonthToDateEntries] = useState(0)
  const [monthToDatePhotoCompliance, setMonthToDatePhotoCompliance] = useState(0)
  const [monthToDateLoading, setMonthToDateLoading] = useState(false)
  
  // Filters - TIMEZONE FIX: Use Bangkok timezone for proper date filtering
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: getBangkokToday(), // Start with today's entries in Bangkok time
    endDate: getBangkokToday(), // Today in Bangkok time
    staffId: 'all',
    action: 'all',
    photoFilter: 'all'
  })

  // Staff list for filter dropdown
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([])

  const fetchStaffList = async () => {
    try {
      const response = await fetch('/api/staff', {
        credentials: 'include' // Include session cookies for authentication
      })
      if (!response.ok) throw new Error('Failed to fetch staff')
      const data = await response.json()
      setStaffList(data.staff?.map((s: any) => ({ id: s.id, name: s.staff_name })) || [])
    } catch (err) {
      console.error('Error fetching staff list:', err)
    }
  }

  // ENHANCED: Calculate staff summaries using new time calculation engine
  const calculateStaffSummaries = (entries: TimeEntry[]): StaffSummary[] => {
    // Convert to TimeCalculationEntry format for the new engine
    const calculationEntries: TimeCalculationEntry[] = entries.map(entry => ({
      entry_id: entry.entry_id,
      staff_id: entry.staff_id,
      staff_name: entry.staff_name,
      action: entry.action,
      timestamp: entry.timestamp,
      date_only: entry.date_only,
      time_only: entry.time_only,
      photo_captured: entry.photo_captured,
      camera_error: entry.camera_error
    }));

    // Calculate work shifts with cross-day support
    const shifts = calculateWorkShifts(calculationEntries);
    setWorkShifts(shifts); // Update state with calculated shifts
    
    // Calculate enhanced analytics
    const analytics = calculateStaffAnalytics(shifts, calculationEntries);
    setStaffAnalytics(analytics); // Update state with analytics

    // Convert analytics back to legacy StaffSummary format for backward compatibility
    const legacySummaries: StaffSummary[] = analytics.map(analytic => ({
      staff_id: analytic.staff_id,
      staff_name: analytic.staff_name,
      total_hours: analytic.total_hours,
      days_worked: analytic.days_worked,
      total_entries: analytic.total_shifts * 2, // Approximate (clock_in + clock_out per shift)
      clock_ins: analytic.total_shifts,
      clock_outs: analytic.complete_shifts,
      photos_captured: Math.round((analytic.photo_compliance_rate / 100) * analytic.total_shifts * 2),
      overtime_hours: analytic.overtime_hours,
      has_issues: analytic.incomplete_shifts > 0 || analytic.shifts_with_issues > 0
    }));

    return legacySummaries;
  }

  const fetchMonthlyHours = async () => {
    try {
      setMonthlyHoursLoading(true)
      
      // TIMEZONE FIX: Use Bangkok timezone for monthly calculations
      const bangkokToday = getBangkokNow()
      const currentMonthStart = startOfMonth(bangkokToday)
      const currentMonthToday = bangkokToday
      
      // Calculate same period in previous month
      const previousMonth = subMonths(bangkokToday, 1)
      const previousMonthStart = startOfMonth(previousMonth)
      const previousMonthSameDay = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), bangkokToday.getDate())
      
      // Fetch current month data (from start of month to today) - Bangkok timezone
      const currentMonthResponse = await fetch(`/api/time-clock/entries?start_date=${formatBangkokTime(currentMonthStart, 'yyyy-MM-dd')}&end_date=${formatBangkokTime(currentMonthToday, 'yyyy-MM-dd')}`, {
        credentials: 'include' // Include session cookies for authentication
      })
      
      // Fetch previous month data (from start of previous month to same day) - Bangkok timezone
      const previousMonthResponse = await fetch(`/api/time-clock/entries?start_date=${formatBangkokTime(previousMonthStart, 'yyyy-MM-dd')}&end_date=${formatBangkokTime(previousMonthSameDay, 'yyyy-MM-dd')}`, {
        credentials: 'include' // Include session cookies for authentication
      })
      
      if (currentMonthResponse.ok && previousMonthResponse.ok) {
        const currentMonthData = await currentMonthResponse.json()
        const previousMonthData = await previousMonthResponse.json()
        
        // Calculate hours for current month using enhanced time calculation
        const currentMonthEntries = currentMonthData.entries || []
        const currentCalculationEntries: TimeCalculationEntry[] = currentMonthEntries.map((entry: any) => ({
          entry_id: entry.entry_id,
          staff_id: entry.staff_id,
          staff_name: entry.staff_name,
          action: entry.action,
          timestamp: entry.timestamp,
          date_only: entry.date_only,
          time_only: entry.time_only,
          photo_captured: entry.photo_captured,
          camera_error: entry.camera_error
        }));
        const currentMonthShifts = calculateWorkShifts(currentCalculationEntries);
        const currentHours = currentMonthShifts
          .filter(shift => shift.is_complete)
          .reduce((total: number, shift: WorkShift) => total + shift.net_hours, 0);
        
        // Calculate hours for previous month using enhanced time calculation
        const previousMonthEntries = previousMonthData.entries || []
        const previousCalculationEntries: TimeCalculationEntry[] = previousMonthEntries.map((entry: any) => ({
          entry_id: entry.entry_id,
          staff_id: entry.staff_id,
          staff_name: entry.staff_name,
          action: entry.action,
          timestamp: entry.timestamp,
          date_only: entry.date_only,
          time_only: entry.time_only,
          photo_captured: entry.photo_captured,
          camera_error: entry.camera_error
        }));
        const previousMonthShifts = calculateWorkShifts(previousCalculationEntries);
        const previousHours = previousMonthShifts
          .filter(shift => shift.is_complete)
          .reduce((total: number, shift: WorkShift) => total + shift.net_hours, 0);
        
        setCurrentMonthHours(currentHours)
        setPreviousMonthHours(previousHours)
      }
    } catch (err) {
      console.error('Error fetching monthly hours:', err)
    } finally {
      setMonthlyHoursLoading(false)
    }
  }

  const fetchMonthToDateSummary = async () => {
    try {
      setMonthToDateLoading(true)
      
      // TIMEZONE FIX: Use Bangkok timezone for monthly calculations
      const bangkokToday = getBangkokNow()
      const currentMonthStart = startOfMonth(bangkokToday)
      
      const apiUrl = `/api/time-clock/entries?start_date=${formatBangkokTime(currentMonthStart, 'yyyy-MM-dd')}&end_date=${formatBangkokTime(bangkokToday, 'yyyy-MM-dd')}`
      
      // Fetch current month data (from start of month to today) - Bangkok timezone
      const response = await fetch(apiUrl, {
        credentials: 'include', // Include session cookies for authentication
      })
      
      if (response.ok) {
        const data = await response.json()
        const entries = data.entries || []
        
        // Calculate total entries
        setMonthToDateEntries(entries.length)
        
        // Calculate photo compliance
        const entriesWithPhotos = entries.filter((e: any) => e.photo_captured).length
        const complianceRate = entries.length > 0 ? (entriesWithPhotos / entries.length) * 100 : 0
        setMonthToDatePhotoCompliance(complianceRate)
      } else {
        const errorText = await response.text()
        console.error('Month-to-date API error:', response.status, errorText)
      }
    } catch (err) {
      console.error('Error fetching month-to-date summary:', err)
    } finally {
      setMonthToDateLoading(false)
    }
  }

  const fetchTimeEntries = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        start_date: filters.startDate,
        end_date: filters.endDate
      })

      if (filters.staffId !== 'all') {
        params.append('staff_id', filters.staffId)
      }

      const response = await fetch(`/api/time-clock/entries?${params}`, {
        credentials: 'include' // Include session cookies for authentication
      })
      if (!response.ok) {
        throw new Error('Failed to fetch time entries')
      }

      const data = await response.json()
      let entries = data.entries || []

      // Apply client-side filters
      if (filters.action !== 'all') {
        entries = entries.filter((entry: TimeEntry) => entry.action === filters.action)
      }

      if (filters.photoFilter === 'with_photo') {
        entries = entries.filter((entry: TimeEntry) => entry.photo_captured)
      } else if (filters.photoFilter === 'without_photo') {
        entries = entries.filter((entry: TimeEntry) => !entry.photo_captured)
      }

      setTimeEntries(entries)
      const summaries = calculateStaffSummaries(entries)
      setStaffSummaries(summaries)
    } catch (err) {
      console.error('Error fetching time entries:', err)
      setError('Failed to load time entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaffList()
    fetchTimeEntries()
    fetchMonthlyHours()
    fetchMonthToDateSummary()
  }, [])

  useEffect(() => {
    fetchTimeEntries()
  }, [filters])

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleQuickDateFilter = (days: number) => {
    // TIMEZONE FIX: Use Bangkok timezone for consistent date filtering
    if (days === 0) {
      // Special case for "Today" - set both start and end to today
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
  }

  const handleExportCSV = async () => {
    try {
      setExporting(true)
      
      // Create CSV content
      const headers = ['Date', 'Time', 'Staff Name', 'Action', 'Photo Captured']
      const rows = timeEntries.map(entry => [
        entry.date_only,
        entry.time_only,
        entry.staff_name,
        entry.action === 'clock_in' ? 'Clock In' : 'Clock Out',
        entry.photo_captured ? 'Yes' : 'No'
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `time-entries-${filters.startDate}-to-${filters.endDate}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Export error:', err)
      setError('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const getTotalHours = () => {
    return staffSummaries.reduce((total, staff) => total + staff.total_hours, 0)
  }

  const getOvertimeHours = () => {
    return staffSummaries.reduce((total, staff) => total + staff.overtime_hours, 0)
  }

  const getIssuesCount = () => {
    return staffSummaries.filter(staff => staff.has_issues).length
  }

  const getPhotoComplianceRate = () => {
    const totalEntries = timeEntries.length
    const entriesWithPhotos = timeEntries.filter(e => e.photo_captured).length
    return totalEntries > 0 ? (entriesWithPhotos / totalEntries) * 100 : 0
  }

  // Function to dynamically load photo URLs
  const loadPhotoUrl = async (photoPath: string): Promise<string | null> => {
    if (!photoPath) return null
    
    // Check if we already have this URL cached
    if (photoUrls.has(photoPath)) {
      return photoUrls.get(photoPath)!
    }
    
    // Check if we're already loading this photo
    if (loadingPhotos.has(photoPath)) {
      return null
    }
    
    try {
      setLoadingPhotos(prev => new Set(prev).add(photoPath))
      
      const response = await fetch('/api/admin/photo-management/simple-photo-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo_path: photoPath }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Photo URL API error:', response.status, errorText)
        throw new Error(`Failed to generate photo URL: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      
      if (data.success && data.photo_url) {
        // Cache the URL
        setPhotoUrls(prev => new Map(prev).set(photoPath, data.photo_url))
        return data.photo_url
      }
      
      throw new Error(`Invalid response from photo URL API: ${JSON.stringify(data)}`)
    } catch (error) {
      console.error('Error loading photo URL:', error)
      return null
    } finally {
      setLoadingPhotos(prev => {
        const newSet = new Set(prev)
        newSet.delete(photoPath)
        return newSet
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading time reports...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours - {format(new Date(), 'MMM yyyy')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {monthlyHoursLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <div className="text-2xl font-bold">Loading...</div>
              </div>
            ) : (
              <>
                <div className="text-2xl font-bold">{currentMonthHours.toFixed(1)}</div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-muted-foreground">
                    vs {format(subMonths(new Date(), 1), 'MMM yyyy')}:
                  </span>
                  {currentMonthHours > previousMonthHours ? (
                    <span className="text-green-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{(currentMonthHours - previousMonthHours).toFixed(1)}
                    </span>
                  ) : currentMonthHours < previousMonthHours ? (
                    <span className="text-red-600 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                      {(currentMonthHours - previousMonthHours).toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No change</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries - {format(new Date(), 'MMM yyyy')}</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {monthToDateLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <div className="text-2xl font-bold">Loading...</div>
              </div>
            ) : (
              <div className="text-2xl font-bold">{monthToDateEntries}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Month-to-date clock records
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Photo Compliance - {format(new Date(), 'MMM yyyy')}</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {monthToDateLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <div className="text-2xl font-bold">Loading...</div>
              </div>
            ) : (
              <div className="text-2xl font-bold">{monthToDatePhotoCompliance.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground">
              Month-to-date photo rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Staff Member</Label>
              <Select value={filters.staffId} onValueChange={(value) => handleFilterChange('staffId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Staff</SelectItem>
                  {staffList.map(staff => (
                    <SelectItem key={staff.id} value={staff.id.toString()}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="clock_in">Clock In</SelectItem>
                  <SelectItem value="clock_out">Clock Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Photo</Label>
              <Select value={filters.photoFilter} onValueChange={(value) => handleFilterChange('photoFilter', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Entries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entries</SelectItem>
                  <SelectItem value="with_photo">With Photo</SelectItem>
                  <SelectItem value="without_photo">Without Photo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Export</Label>
              <Button 
                onClick={handleExportCSV} 
                disabled={exporting || timeEntries.length === 0}
                className="w-full"
              >
                {exporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </>
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(0)}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(7)}>
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(30)}>
              Last 30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              fetchTimeEntries()
              fetchMonthlyHours()
              fetchMonthToDateSummary()
            }}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries">Time Entries ({timeEntries.length})</TabsTrigger>
          <TabsTrigger value="shifts">Work Shifts ({workShifts.length})</TabsTrigger>
          <TabsTrigger value="summaries">Staff Analytics ({staffAnalytics.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Entries ({timeEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable enableKeyboardNavigation>
                <ResponsiveTableHeader>
                  <ResponsiveTableRow>
                    <ResponsiveTableHead>Date</ResponsiveTableHead>
                    <ResponsiveTableHead className="text-center">Time</ResponsiveTableHead>
                    <ResponsiveTableHead>Staff</ResponsiveTableHead>
                    <ResponsiveTableHead className="text-center">Action</ResponsiveTableHead>
                    <ResponsiveTableHead className="text-center">Photo</ResponsiveTableHead>
                    <ResponsiveTableHead className="text-center">View</ResponsiveTableHead>
                  </ResponsiveTableRow>
                </ResponsiveTableHeader>
                <ResponsiveTableBody>
                    {timeEntries.length === 0 ? (
                      <ResponsiveTableRow>
                        <ResponsiveTableCell colSpan={6} className="h-24 text-center">
                          No time entries found for the selected criteria.
                        </ResponsiveTableCell>
                      </ResponsiveTableRow>
                    ) : (
                      timeEntries.map((entry, rowIndex) => (
                        <ResponsiveTableRow key={entry.entry_id} index={rowIndex}>
                          <ResponsiveTableCell index={0} rowIndex={rowIndex}>{format(new Date(entry.date_only + 'T00:00:00+07:00'), 'MMM dd, yyyy')}</ResponsiveTableCell>
                          <ResponsiveTableCell index={1} rowIndex={rowIndex} className="font-mono text-center">{entry.time_only}</ResponsiveTableCell>
                          <ResponsiveTableCell index={2} rowIndex={rowIndex} className="font-medium">{entry.staff_name}</ResponsiveTableCell>
                          <ResponsiveTableCell index={3} rowIndex={rowIndex} className="text-center">
                            <Badge variant={entry.action === 'clock_in' ? 'default' : 'secondary'}>
                              {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
                            </Badge>
                          </ResponsiveTableCell>
                          <ResponsiveTableCell index={4} rowIndex={rowIndex} className="text-center">
                            {entry.photo_captured ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <Camera className="h-3 w-3 mr-1" />
                                Yes
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                No
                              </Badge>
                            )}
                          </ResponsiveTableCell>
                          <ResponsiveTableCell index={5} rowIndex={rowIndex} className="text-center">
                            {entry.photo_captured && entry.photo_url ? (
                              <PhotoDialog 
                                entry={entry} 
                                loadPhotoUrl={loadPhotoUrl}
                                photoUrls={photoUrls}
                                loadingPhotos={loadingPhotos}
                              />
                            ) : (
                              <Button variant="outline" size="sm" disabled>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </ResponsiveTableCell>
                        </ResponsiveTableRow>
                      ))
                    )}
                  </ResponsiveTableBody>
                </ResponsiveTable>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Work Shifts Analysis ({workShifts.length} shifts)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enhanced shift tracking with cross-day support, break deductions, and overtime calculations
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Date</TableHead>
                      <TableHead className="min-w-[150px]">Staff Name</TableHead>
                      <TableHead className="min-w-[100px] text-center">Clock In</TableHead>
                      <TableHead className="min-w-[100px] text-center">Clock Out</TableHead>
                      <TableHead className="min-w-[80px] text-center">Duration</TableHead>
                      <TableHead className="min-w-[80px] text-center">Net Hours</TableHead>
                      <TableHead className="min-w-[80px] text-center">Overtime</TableHead>
                      <TableHead className="min-w-[100px] text-center">Status</TableHead>
                      <TableHead className="min-w-[80px] text-center">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workShifts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          No work shifts calculated for the selected criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      workShifts
                        .sort((a, b) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
                        .map((shift) => (
                        <TableRow key={`${shift.staff_id}-${shift.clock_in_entry_id}`}>
                          <TableCell>{format(new Date(shift.date + 'T00:00:00+07:00'), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="font-medium">{shift.staff_name}</TableCell>
                          <TableCell className="font-mono text-center">
                            {format(new Date(shift.clock_in_time), 'HH:mm')}
                          </TableCell>
                          <TableCell className="font-mono text-center">
                            {shift.clock_out_time ? format(new Date(shift.clock_out_time), 'HH:mm') : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {shift.is_complete ? formatShiftDuration(shift.total_minutes) : '—'}
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {shift.is_complete ? `${shift.net_hours}h` : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {shift.overtime_hours > 0 ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                +{shift.overtime_hours}h
                              </Badge>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {shift.is_complete ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                                {shift.crosses_midnight && (
                                  <Badge variant="outline" className="text-xs">
                                    Cross-day
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Incomplete
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {(shift.shift_notes.length > 0 || shift.validation_issues.length > 0) && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Shift Details - {shift.staff_name}</DialogTitle>
                                    <DialogDescription>
                                      {format(new Date(shift.date + 'T00:00:00+07:00'), 'MMMM dd, yyyy')}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="text-center p-3 border rounded">
                                        <div className="text-2xl font-bold text-blue-600">
                                          {formatShiftDuration(shift.total_minutes)}
                                        </div>
                                        <div className="text-sm text-muted-foreground">Total Duration</div>
                                      </div>
                                      <div className="text-center p-3 border rounded">
                                        <div className="text-2xl font-bold text-green-600">
                                          {shift.net_hours}h
                                        </div>
                                        <div className="text-sm text-muted-foreground">Net Hours</div>
                                      </div>
                                    </div>
                                    
                                    {shift.break_minutes > 0 && (
                                      <div className="p-3 bg-gray-50 rounded">
                                        <div className="text-sm font-medium">Break Deduction</div>
                                                                                 <div className="text-sm text-muted-foreground">
                                           {shift.break_minutes} minutes deducted (shift &gt; 6 hours)
                                         </div>
                                      </div>
                                    )}
                                    
                                    {shift.shift_notes.length > 0 && (
                                      <div>
                                        <div className="text-sm font-medium mb-2">Notes:</div>
                                        <ul className="text-sm text-muted-foreground space-y-1">
                                          {shift.shift_notes.map((note, index) => (
                                            <li key={index}>• {note}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    
                                    {shift.validation_issues.length > 0 && (
                                      <div>
                                        <div className="text-sm font-medium mb-2 text-red-600">Issues:</div>
                                        <ul className="text-sm text-red-600 space-y-1">
                                          {shift.validation_issues.map((issue, index) => (
                                            <li key={index}>• {issue}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summaries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Enhanced Staff Analytics ({staffAnalytics.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comprehensive analytics with accurate time calculations, break deductions, and overtime tracking
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Staff Name</TableHead>
                      <TableHead className="min-w-[80px] text-center">Days</TableHead>
                      <TableHead className="min-w-[80px] text-center">Shifts</TableHead>
                      <TableHead className="min-w-[80px] text-center">Regular</TableHead>
                      <TableHead className="min-w-[80px] text-center">Overtime</TableHead>
                      <TableHead className="min-w-[80px] text-center">Total</TableHead>
                      <TableHead className="min-w-[80px] text-center">Avg/Shift</TableHead>
                      <TableHead className="min-w-[80px] text-center">Photo %</TableHead>
                      <TableHead className="min-w-[100px] text-center">Status</TableHead>
                      <TableHead className="min-w-[80px] text-center">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffAnalytics.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="h-24 text-center">
                          No staff analytics available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffAnalytics.map((analytic) => (
                        <TableRow key={analytic.staff_id}>
                          <TableCell className="font-medium">{analytic.staff_name}</TableCell>
                          <TableCell className="text-center">{analytic.days_worked}</TableCell>
                          <TableCell className="text-center">{analytic.total_shifts}</TableCell>
                          <TableCell className="text-center">{analytic.regular_hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-center">
                            {analytic.overtime_hours > 0 ? (
                              <span className="text-orange-600 font-medium">
                                {analytic.overtime_hours.toFixed(1)}h
                              </span>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell className="text-center font-medium">{analytic.total_hours.toFixed(1)}h</TableCell>
                          <TableCell className="text-center">
                            {analytic.complete_shifts > 0 ? `${analytic.average_shift_hours.toFixed(1)}h` : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant={analytic.photo_compliance_rate >= 80 ? "default" : "secondary"}>
                              {analytic.photo_compliance_rate.toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {analytic.incomplete_shifts > 0 || analytic.shifts_with_issues > 0 ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Issues ({analytic.incomplete_shifts + analytic.shifts_with_issues})
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Good
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Staff Analytics - {analytic.staff_name}</DialogTitle>
                                  <DialogDescription>
                                    Comprehensive work analysis and metrics
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center p-3 border rounded">
                                      <div className="text-2xl font-bold text-blue-600">{analytic.total_shifts}</div>
                                      <div className="text-sm text-muted-foreground">Total Shifts</div>
                                    </div>
                                    <div className="text-center p-3 border rounded">
                                      <div className="text-2xl font-bold text-green-600">{analytic.complete_shifts}</div>
                                      <div className="text-sm text-muted-foreground">Complete</div>
                                    </div>
                                    <div className="text-center p-3 border rounded">
                                      <div className="text-2xl font-bold text-red-600">{analytic.incomplete_shifts}</div>
                                      <div className="text-sm text-muted-foreground">Incomplete</div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 border rounded">
                                      <div className="text-2xl font-bold text-purple-600">{analytic.longest_shift_hours.toFixed(1)}h</div>
                                      <div className="text-sm text-muted-foreground">Longest Shift</div>
                                    </div>
                                    <div className="text-center p-3 border rounded">
                                      <div className="text-2xl font-bold text-teal-600">{analytic.shortest_shift_hours.toFixed(1)}h</div>
                                      <div className="text-sm text-muted-foreground">Shortest Shift</div>
                                    </div>
                                  </div>
                                  
                                  {analytic.total_breaks_minutes > 0 && (
                                    <div className="p-3 bg-gray-50 rounded">
                                      <div className="text-sm font-medium">Break Time Deductions</div>
                                      <div className="text-sm text-muted-foreground">
                                        {Math.round(analytic.total_breaks_minutes / 60 * 10) / 10} hours total breaks deducted
                                      </div>
                                    </div>
                                  )}
                                  
                                  {(analytic.incomplete_shifts > 0 || analytic.shifts_with_issues > 0) && (
                                    <Alert variant="destructive">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertDescription>
                                        {analytic.incomplete_shifts > 0 && `${analytic.incomplete_shifts} incomplete shifts found. `}
                                        {analytic.shifts_with_issues > 0 && `${analytic.shifts_with_issues} shifts have validation issues.`}
                                      </AlertDescription>
                                    </Alert>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 
