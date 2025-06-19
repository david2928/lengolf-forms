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
                console.log('Photo loaded successfully:', photoUrl)
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<Map<string, string>>(new Map())
  const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set())
  const [currentMonthHours, setCurrentMonthHours] = useState(0)
  const [previousMonthHours, setPreviousMonthHours] = useState(0)
  const [monthlyHoursLoading, setMonthlyHoursLoading] = useState(false)
  
  // Filters
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'), // Last 7 days
    endDate: format(new Date(), 'yyyy-MM-dd'),
    staffId: 'all',
    action: 'all',
    photoFilter: 'all'
  })

  // Staff list for filter dropdown
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([])

  const fetchStaffList = async () => {
    try {
      const response = await fetch('/api/staff')
      if (!response.ok) throw new Error('Failed to fetch staff')
      const data = await response.json()
      setStaffList(data.staff?.map((s: any) => ({ id: s.id, name: s.staff_name })) || [])
    } catch (err) {
      console.error('Error fetching staff list:', err)
    }
  }

  // Helper function to calculate staff summaries without setting state
  const calculateStaffSummaries = (entries: TimeEntry[]): StaffSummary[] => {
    const staffMap = new Map<number, StaffSummary>()

    entries.forEach(entry => {
      if (!staffMap.has(entry.staff_id)) {
        staffMap.set(entry.staff_id, {
          staff_id: entry.staff_id,
          staff_name: entry.staff_name,
          total_hours: 0,
          days_worked: 0,
          total_entries: 0,
          clock_ins: 0,
          clock_outs: 0,
          photos_captured: 0,
          overtime_hours: 0,
          has_issues: false
        })
      }

      const summary = staffMap.get(entry.staff_id)!
      summary.total_entries++
      
      if (entry.action === 'clock_in') {
        summary.clock_ins++
      } else {
        summary.clock_outs++
      }

      if (entry.photo_captured) {
        summary.photos_captured++
      }

      // Check for issues (mismatched clock ins/outs)
      if (summary.clock_ins !== summary.clock_outs) {
        summary.has_issues = true
      }
    })

    // Calculate days worked and hours
    staffMap.forEach(summary => {
      const staffEntries = entries.filter(e => e.staff_id === summary.staff_id)
      const uniqueDates = new Set(staffEntries.map(e => e.date_only))
      summary.days_worked = uniqueDates.size

      // Simple hour calculation (this could be enhanced)
      summary.total_hours = summary.clock_outs * 8 // Assuming 8-hour shifts
      summary.overtime_hours = Math.max(0, summary.total_hours - (summary.days_worked * 8))
    })

    return Array.from(staffMap.values())
  }

  const fetchMonthlyHours = async () => {
    try {
      setMonthlyHoursLoading(true)
      
      const today = new Date()
      const currentMonthStart = startOfMonth(today)
      const currentMonthToday = today
      
      // Calculate same period in previous month
      const previousMonth = subMonths(today, 1)
      const previousMonthStart = startOfMonth(previousMonth)
      const previousMonthSameDay = new Date(previousMonth.getFullYear(), previousMonth.getMonth(), today.getDate())
      
      // Fetch current month data (from start of month to today)
      const currentMonthResponse = await fetch(`/api/time-clock/entries?start_date=${format(currentMonthStart, 'yyyy-MM-dd')}&end_date=${format(currentMonthToday, 'yyyy-MM-dd')}`)
      
      // Fetch previous month data (from start of previous month to same day)
      const previousMonthResponse = await fetch(`/api/time-clock/entries?start_date=${format(previousMonthStart, 'yyyy-MM-dd')}&end_date=${format(previousMonthSameDay, 'yyyy-MM-dd')}`)
      
      if (currentMonthResponse.ok && previousMonthResponse.ok) {
        const currentMonthData = await currentMonthResponse.json()
        const previousMonthData = await previousMonthResponse.json()
        
        // Calculate hours for current month
        const currentMonthEntries = currentMonthData.entries || []
        const currentMonthSummaries = calculateStaffSummaries(currentMonthEntries)
        const currentHours = currentMonthSummaries.reduce((total: number, staff: StaffSummary) => total + staff.total_hours, 0)
        
        // Calculate hours for previous month
        const previousMonthEntries = previousMonthData.entries || []
        const previousMonthSummaries = calculateStaffSummaries(previousMonthEntries)
        const previousHours = previousMonthSummaries.reduce((total: number, staff: StaffSummary) => total + staff.total_hours, 0)
        
        setCurrentMonthHours(currentHours)
        setPreviousMonthHours(previousHours)
      }
    } catch (err) {
      console.error('Error fetching monthly hours:', err)
    } finally {
      setMonthlyHoursLoading(false)
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

      const response = await fetch(`/api/time-clock/entries?${params}`)
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
      generateStaffSummaries(entries)
    } catch (err) {
      console.error('Error fetching time entries:', err)
      setError('Failed to load time entries')
    } finally {
      setLoading(false)
    }
  }

  const generateStaffSummaries = (entries: TimeEntry[]) => {
    const staffMap = new Map<number, StaffSummary>()

    entries.forEach(entry => {
      if (!staffMap.has(entry.staff_id)) {
        staffMap.set(entry.staff_id, {
          staff_id: entry.staff_id,
          staff_name: entry.staff_name,
          total_hours: 0,
          days_worked: 0,
          total_entries: 0,
          clock_ins: 0,
          clock_outs: 0,
          photos_captured: 0,
          overtime_hours: 0,
          has_issues: false
        })
      }

      const summary = staffMap.get(entry.staff_id)!
      summary.total_entries++
      
      if (entry.action === 'clock_in') {
        summary.clock_ins++
      } else {
        summary.clock_outs++
      }

      if (entry.photo_captured) {
        summary.photos_captured++
      }

      // Check for issues (mismatched clock ins/outs)
      if (summary.clock_ins !== summary.clock_outs) {
        summary.has_issues = true
      }
    })

    // Calculate days worked and hours
    staffMap.forEach(summary => {
      const staffEntries = entries.filter(e => e.staff_id === summary.staff_id)
      const uniqueDates = new Set(staffEntries.map(e => e.date_only))
      summary.days_worked = uniqueDates.size

      // Simple hour calculation (this could be enhanced)
      summary.total_hours = summary.clock_outs * 8 // Assuming 8-hour shifts
      summary.overtime_hours = Math.max(0, summary.total_hours - (summary.days_worked * 8))
    })

    setStaffSummaries(Array.from(staffMap.values()))
  }

  useEffect(() => {
    fetchStaffList()
    fetchTimeEntries()
    fetchMonthlyHours()
  }, [])

  useEffect(() => {
    fetchTimeEntries()
  }, [filters])

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleQuickDateFilter = (days: number) => {
    const end = new Date()
    const start = subDays(end, days)
    setFilters(prev => ({
      ...prev,
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd')
    }))
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
      
      console.log('Requesting photo URL for path:', photoPath)
      const response = await fetch('/api/admin/photo-management/simple-photo-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photo_path: photoPath }),
      })
      
      console.log('Photo URL API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Photo URL API error:', response.status, errorText)
        throw new Error(`Failed to generate photo URL: ${response.status} ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Photo URL API response:', data)
      
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
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeEntries.length}</div>
            <p className="text-xs text-muted-foreground">
              Clock in/out records
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Photo Compliance</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getPhotoComplianceRate().toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Entries with photos
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
            <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(1)}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(7)}>
              Last 7 Days
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(30)}>
              Last 30 Days
            </Button>
            <Button variant="outline" size="sm" onClick={fetchTimeEntries}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entries">Time Entries</TabsTrigger>
          <TabsTrigger value="summaries">Staff Summaries</TabsTrigger>
        </TabsList>
        
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Entries ({timeEntries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[120px]">Date</TableHead>
                      <TableHead className="min-w-[100px] text-center">Time</TableHead>
                      <TableHead className="min-w-[150px]">Staff</TableHead>
                      <TableHead className="min-w-[100px] text-center">Action</TableHead>
                      <TableHead className="min-w-[100px] text-center">Photo</TableHead>
                      <TableHead className="min-w-[80px] text-center">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No time entries found for the selected criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      timeEntries.map((entry) => (
                        <TableRow key={entry.entry_id}>
                          <TableCell>{format(new Date(entry.date_only), 'MMM dd, yyyy')}</TableCell>
                          <TableCell className="font-mono text-center">{entry.time_only}</TableCell>
                          <TableCell className="font-medium">{entry.staff_name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={entry.action === 'clock_in' ? 'default' : 'secondary'}>
                              {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
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
                          </TableCell>
                          <TableCell className="text-center">
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
              <CardTitle>Staff Summaries ({staffSummaries.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[150px]">Staff Name</TableHead>
                      <TableHead className="min-w-[100px] text-center">Days Worked</TableHead>
                      <TableHead className="min-w-[100px] text-center">Total Entries</TableHead>
                      <TableHead className="min-w-[90px] text-center">Clock Ins</TableHead>
                      <TableHead className="min-w-[90px] text-center">Clock Outs</TableHead>
                      <TableHead className="min-w-[80px] text-center">Photos</TableHead>
                      <TableHead className="min-w-[100px] text-center">Status</TableHead>
                      <TableHead className="min-w-[100px] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staffSummaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center">
                          No staff summaries available.
                        </TableCell>
                      </TableRow>
                    ) : (
                      staffSummaries.map((summary) => (
                        <TableRow key={summary.staff_id}>
                          <TableCell className="font-medium">{summary.staff_name}</TableCell>
                          <TableCell className="text-center">{summary.days_worked}</TableCell>
                          <TableCell className="text-center">{summary.total_entries}</TableCell>
                          <TableCell className="text-center">{summary.clock_ins}</TableCell>
                          <TableCell className="text-center">{summary.clock_outs}</TableCell>
                          <TableCell className="text-center">{summary.photos_captured}</TableCell>
                          <TableCell className="text-center">
                            {summary.has_issues ? (
                              <Badge variant="destructive">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Issues
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Good
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {summary.has_issues ? (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <AlertTriangle className="h-4 w-4 mr-1" />
                                    View Issues
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-md">
                                  <DialogHeader>
                                    <DialogTitle>Issues for {summary.staff_name}</DialogTitle>
                                    <DialogDescription>
                                      Time clock entry issues that require attention.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div className="text-center p-3 border rounded">
                                        <div className="text-2xl font-bold text-blue-600">{summary.clock_ins}</div>
                                        <div className="text-sm text-muted-foreground">Clock Ins</div>
                                      </div>
                                      <div className="text-center p-3 border rounded">
                                        <div className="text-2xl font-bold text-orange-600">{summary.clock_outs}</div>
                                        <div className="text-sm text-muted-foreground">Clock Outs</div>
                                      </div>
                                    </div>
                                    <Alert variant="destructive">
                                      <AlertTriangle className="h-4 w-4" />
                                      <AlertDescription>
                                        {summary.clock_ins > summary.clock_outs 
                                          ? `Missing ${summary.clock_ins - summary.clock_outs} clock out entries. Staff may still be clocked in.`
                                          : `Missing ${summary.clock_outs - summary.clock_ins} clock in entries. Check for manual corrections needed.`                                        }
                                      </AlertDescription>
                                    </Alert>
                                    <div className="text-sm text-muted-foreground">
                                      <strong>Recommendation:</strong> Review individual time entries for this staff member to identify and correct missing entries.
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-muted-foreground text-sm">No issues</span>
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
      </Tabs>
    </div>
  )
} 
