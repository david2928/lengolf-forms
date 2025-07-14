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
  Eye,
  MoreVertical,
  Timer,
  User
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open)
    
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
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="h-8 px-3 hover:bg-blue-50 text-blue-600 border-blue-200"
          title="View Time Entry Photo"
        >
          <Eye className="h-3 w-3 mr-1" />
          View Photo
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

// Mobile Card Components
const TimeEntryCard = ({ entry, loadPhotoUrl, photoUrls, loadingPhotos }: { 
  entry: TimeEntry, 
  loadPhotoUrl: (photoPath: string) => Promise<string | null>,
  photoUrls: Map<string, string>,
  loadingPhotos: Set<string>
}) => (
  <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500">
    <CardContent className="p-5">
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-blue-700">
                  {entry.staff_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-lg truncate">{entry.staff_name}</h3>
              <p className="text-sm text-gray-500">{format(new Date(entry.date_only + 'T00:00:00+07:00'), 'MMM dd, yyyy')}</p>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            {entry.photo_captured && entry.photo_url ? (
              <PhotoDialog 
                entry={entry} 
                loadPhotoUrl={loadPhotoUrl}
                photoUrls={photoUrls}
                loadingPhotos={loadingPhotos}
              />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                disabled
                className="text-gray-400"
                title="No photo available"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Action and Time Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge 
              variant={entry.action === 'clock_in' ? 'default' : 'secondary'}
              className="text-sm py-1 px-3"
            >
              {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
            </Badge>
            <span className="text-lg font-mono font-semibold text-gray-900">{entry.time_only}</span>
          </div>
          
          {entry.photo_captured ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <Camera className="h-3 w-3 mr-1" />
              Photo
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">No Photo</Badge>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
)

const WorkShiftCard = ({ shift }: { shift: WorkShift }) => (
  <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-orange-500">
    <CardContent className="p-5">
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-orange-700">
                  {shift.staff_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-lg truncate">{shift.staff_name}</h3>
              <p className="text-sm text-gray-500">{format(new Date(shift.date + 'T00:00:00+07:00'), 'MMM dd, yyyy')}</p>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            {((shift.shift_notes || []).length > 0 || (shift.validation_issues || []).length > 0) ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
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
                    
                    {(shift.shift_notes || []).length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2">Notes:</div>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {(shift.shift_notes || []).map((note, index) => (
                            <li key={index}>• {note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {(shift.validation_issues || []).length > 0 && (
                      <div>
                        <div className="text-sm font-medium mb-2 text-red-600">Issues:</div>
                        <ul className="text-sm text-red-600 space-y-1">
                          {(shift.validation_issues || []).map((issue, index) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <Button variant="outline" size="sm" disabled className="text-gray-400">
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Details Grid */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Clock In:</span>
            <span className="text-base font-mono font-semibold">{format(new Date(shift.clock_in_time), 'HH:mm')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Clock Out:</span>
            <span className="text-base font-mono font-semibold">
              {shift.clock_out_time ? format(new Date(shift.clock_out_time), 'HH:mm') : '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Net Hours:</span>
            <span className="text-base font-semibold">
              {shift.is_complete ? `${shift.net_hours}h` : '—'}
            </span>
          </div>
          {shift.overtime_hours > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overtime:</span>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                +{shift.overtime_hours}h
              </Badge>
            </div>
          )}
        </div>
        
        {/* Status and Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {shift.is_complete ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Incomplete
            </Badge>
          )}
          
          {shift.crosses_midnight && (
            <Badge variant="outline">
              Cross-day
            </Badge>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
)

const StaffAnalyticsCard = ({ analytic }: { analytic: StaffTimeAnalytics }) => (
  <Card className="hover:shadow-md transition-shadow duration-200 border-l-4 border-l-purple-500">
    <CardContent className="p-5">
      <div className="space-y-4">
        {/* Header Row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-purple-700">
                  {analytic.staff_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-lg truncate">{analytic.staff_name}</h3>
              <p className="text-sm text-gray-500">{analytic.days_worked} days worked</p>
            </div>
          </div>
          
          <div className="flex-shrink-0">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
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
          </div>
        </div>
        
        {/* Metrics Grid */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Total Hours:</span>
            <span className="text-base font-semibold">{analytic.total_hours.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Regular:</span>
            <span className="text-base">{analytic.regular_hours.toFixed(1)}h</span>
          </div>
          {analytic.overtime_hours > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overtime:</span>
              <span className="text-base text-orange-600 font-semibold">{analytic.overtime_hours.toFixed(1)}h</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Avg/Shift:</span>
            <span className="text-base">
              {analytic.complete_shifts > 0 ? `${analytic.average_shift_hours.toFixed(1)}h` : '—'}
            </span>
          </div>
        </div>
        
        {/* Status Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={analytic.photo_compliance_rate >= 80 ? "default" : "secondary"}>
            Photo: {analytic.photo_compliance_rate.toFixed(0)}%
          </Badge>
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
        </div>
      </div>
    </CardContent>
  </Card>
)

export function TimeClockDashboard() {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [workShifts, setWorkShifts] = useState<WorkShift[]>([])
  const [staffAnalytics, setStaffAnalytics] = useState<StaffTimeAnalytics[]>([])
  const [staffSummaries, setStaffSummaries] = useState<StaffSummary[]>([])
  const [staffList, setStaffList] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  
  // Photo loading states
  const [photoUrls, setPhotoUrls] = useState(new Map<string, string>())
  const [loadingPhotos, setLoadingPhotos] = useState(new Set<string>())

  // Monthly hours comparison
  const [currentMonthHours, setCurrentMonthHours] = useState(0)
  const [previousMonthHours, setPreviousMonthHours] = useState(0)
  const [monthlyHoursLoading, setMonthlyHoursLoading] = useState(true)

  // Month-to-date summary
  const [monthToDateEntries, setMonthToDateEntries] = useState(0)
  const [monthToDatePhotoCompliance, setMonthToDatePhotoCompliance] = useState(0)
  const [monthToDateLoading, setMonthToDateLoading] = useState(true)

  const [filters, setFilters] = useState<ReportFilters>({
    startDate: subDays(getBangkokNow(), 7).toISOString().split('T')[0],
    endDate: getBangkokToday(),
    staffId: 'all',
    action: 'all',
    photoFilter: 'all'
  })

  // Photo URL loading function
  const loadPhotoUrl = async (photoPath: string): Promise<string | null> => {
    if (photoUrls.has(photoPath)) {
      return photoUrls.get(photoPath) || null
    }

    if (loadingPhotos.has(photoPath)) {
      return null
    }

    try {
      setLoadingPhotos(prev => new Set(prev).add(photoPath))
      
      const response = await fetch(`/api/time-clock/photos/url?path=${encodeURIComponent(photoPath)}`)
      if (!response.ok) {
        throw new Error('Failed to get photo URL')
      }
      
      const data = await response.json()
      if (data.url) {
        setPhotoUrls(prev => new Map(prev).set(photoPath, data.url))
        return data.url
      }
      
      return null
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
    })
    
    return Array.from(staffMap.values())
  }

  const fetchStaffList = async () => {
    try {
      const response = await fetch('/api/staff?includeInactive=false')
      if (response.ok) {
        const data = await response.json()
        const mappedStaff = (data.data || []).map((staff: any) => ({
          id: staff.id,
          name: staff.staff_name
        }))
        setStaffList(mappedStaff)
      }
    } catch (err) {
      console.error('Error fetching staff list:', err)
    }
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

  // Calculate work shifts and staff analytics from time entries
  useEffect(() => {
    if (timeEntries.length > 0) {
      // Convert TimeEntry to TimeCalculationEntry
      const calculationEntries: TimeCalculationEntry[] = timeEntries.map(entry => ({
        entry_id: entry.entry_id,
        staff_id: entry.staff_id,
        staff_name: entry.staff_name,
        action: entry.action,
        timestamp: entry.timestamp,
        date_only: entry.date_only,
        time_only: entry.time_only,
        photo_captured: entry.photo_captured,
        camera_error: entry.camera_error
      }))

      // Calculate work shifts
      const shifts = calculateWorkShifts(calculationEntries)
      setWorkShifts(shifts)

      // Calculate staff analytics
      const analytics = calculateStaffAnalytics(shifts, calculationEntries)
      setStaffAnalytics(analytics)
    } else {
      setWorkShifts([])
      setStaffAnalytics([])
    }
  }, [timeEntries])

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
      const rows = (timeEntries || []).map(entry => [
        format(new Date(entry.date_only + 'T00:00:00+07:00'), 'yyyy-MM-dd'),
        entry.time_only,
        entry.staff_name,
        entry.action === 'clock_in' ? 'Clock In' : 'Clock Out',
        entry.photo_captured ? 'Yes' : 'No'
      ])

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `time-entries-${filters.startDate}-to-${filters.endDate}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Error exporting CSV:', error)
    } finally {
      setExporting(false)
    }
  }

  // Format percentage change for display
  const formatPercentageChange = (current: number, previous: number): { value: string; isPositive: boolean } => {
    if (previous === 0) {
      return { value: current > 0 ? '+100%' : '0%', isPositive: current > 0 }
    }
    const change = ((current - previous) / previous) * 100
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      isPositive: change >= 0
    }
  }

  const monthlyChange = formatPercentageChange(currentMonthHours, previousMonthHours)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{timeEntries.length}</div>
            <p className="text-xs text-muted-foreground">
              {filters.startDate === filters.endDate ? 'Today' : `${filters.startDate} to ${filters.endDate}`}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Photo Compliance</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeEntries.length > 0 
                ? `${Math.round((timeEntries.filter(e => e.photo_captured).length / timeEntries.length) * 100)}%`
                : '0%'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {timeEntries.filter(e => e.photo_captured).length} of {timeEntries.length} entries
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {monthlyHoursLoading ? (
              <StatsCardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{currentMonthHours.toFixed(1)}h</div>
                <div className="flex items-center text-xs">
                  <span className={`font-medium ${monthlyChange.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {monthlyChange.value}
                  </span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Month Entries</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {monthToDateLoading ? (
              <StatsCardSkeleton />
            ) : (
              <>
                <div className="text-2xl font-bold">{monthToDateEntries}</div>
                <p className="text-xs text-muted-foreground">
                  {monthToDatePhotoCompliance.toFixed(0)}% photo compliance
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Export
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Mobile-Optimized Filters Layout */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-6">
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
                                  {(staffList || []).map(staff => (
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
          
          {/* Mobile-Optimized Quick Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
              <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(0)} className="text-xs sm:text-sm">
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(7)} className="text-xs sm:text-sm">
                Last 7 Days
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleQuickDateFilter(30)} className="text-xs sm:text-sm">
                Last 30 Days
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              fetchTimeEntries()
              fetchMonthlyHours()
              fetchMonthToDateSummary()
            }} className="text-xs sm:text-sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Tabs */}
      <Tabs defaultValue="entries" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="entries" className="sm:text-sm">
            <span className="hidden sm:inline">Time Entries ({timeEntries.length})</span>
            <span className="sm:hidden text-xs">Entries ({timeEntries.length})</span>
          </TabsTrigger>
          <TabsTrigger value="shifts" className="sm:text-sm">
            <span className="hidden sm:inline">Work Shifts ({workShifts.length})</span>
            <span className="sm:hidden text-xs">Shifts ({workShifts.length})</span>
          </TabsTrigger>
          <TabsTrigger value="summaries" className="sm:text-sm">
            <span className="hidden sm:inline">Staff Analytics ({staffAnalytics.length})</span>
            <span className="sm:hidden text-xs">Analytics ({staffAnalytics.length})</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="entries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Time Entries ({(timeEntries || []).length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Individual clock-in and clock-out entries with photo verification
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile Card View (md and below) */}
              <div className="block md:hidden">
                {(timeEntries || []).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <FileText className="h-12 w-12 text-gray-300" />
                      <div>
                        <p className="font-medium text-lg">No time entries found</p>
                        <p className="text-sm text-gray-400 mt-1">for the selected criteria.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {(timeEntries || []).map((entry) => (
                      <TimeEntryCard 
                        key={entry.entry_id} 
                        entry={entry}
                        loadPhotoUrl={loadPhotoUrl}
                        photoUrls={photoUrls}
                        loadingPhotos={loadingPhotos}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Desktop Table View (md and above) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[30%]">Staff & Date</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">Time</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">Action</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden lg:table-cell">Photo Status</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[13%] text-center hidden xl:table-cell">Verification</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(timeEntries || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-8 w-8 text-gray-300" />
                            <p className="font-medium">No time entries found for the selected criteria.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (timeEntries || []).map((entry) => (
                        <TableRow key={entry.entry_id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-blue-700">
                                    {entry.staff_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 text-base">{entry.staff_name}</p>
                                <div className="mt-1">
                                  <p className="text-sm text-gray-500">{format(new Date(entry.date_only + 'T00:00:00+07:00'), 'MMM dd, yyyy')}</p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="font-mono font-semibold text-gray-900 text-base">
                              {entry.time_only}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <Badge variant={entry.action === 'clock_in' ? 'default' : 'secondary'}>
                              {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center hidden lg:table-cell">
                            {entry.photo_captured ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <Camera className="h-3 w-3 mr-1" />
                                Captured
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                No Photo
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center hidden xl:table-cell">
                            {entry.camera_error ? (
                              <div className="text-xs text-red-500">Camera Error</div>
                            ) : entry.photo_captured ? (
                              <div className="text-xs text-green-600">Verified</div>
                            ) : (
                              <div className="text-xs text-gray-400">None</div>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-2">
                              {entry.photo_captured && entry.photo_url ? (
                                <PhotoDialog 
                                  entry={entry} 
                                  loadPhotoUrl={loadPhotoUrl}
                                  photoUrls={photoUrls}
                                  loadingPhotos={loadingPhotos}
                                />
                              ) : (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  disabled
                                  className="h-8 px-3 text-gray-400 border-gray-200"
                                  title="No photo available"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  No Photo
                                </Button>
                              )}
                            </div>
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

        <TabsContent value="shifts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Work Shifts ({(workShifts || []).length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Enhanced shift tracking with cross-day support, break deductions, and overtime calculations
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile Card View (md and below) */}
              <div className="block md:hidden">
                {(workShifts || []).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <Clock className="h-12 w-12 text-gray-300" />
                      <div>
                        <p className="font-medium text-lg">No work shifts calculated</p>
                        <p className="text-sm text-gray-400 mt-1">for the selected criteria.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {(workShifts || [])
                      .sort((a, b) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
                      .map((shift) => (
                        <WorkShiftCard key={`${shift.staff_id}-${shift.clock_in_entry_id}`} shift={shift} />
                      ))}
                  </div>
                )}
              </div>
              
              {/* Desktop Table View (md and above) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[25%]">Staff & Date</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center">Clock In</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center">Clock Out</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden lg:table-cell">Duration</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center">Net Hours</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden xl:table-cell">Overtime</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(workShifts || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <Clock className="h-8 w-8 text-gray-300" />
                            <p className="font-medium">No work shifts calculated for the selected criteria.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (workShifts || [])
                        .sort((a, b) => new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime())
                        .map((shift) => (
                        <TableRow key={`${shift.staff_id}-${shift.clock_in_entry_id}`} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-orange-700">
                                    {shift.staff_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 text-base">{shift.staff_name}</p>
                                <div className="mt-1">
                                  <p className="text-sm text-gray-500">{format(new Date(shift.date + 'T00:00:00+07:00'), 'MMM dd, yyyy')}</p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="font-mono font-semibold text-gray-900 text-base">
                              {format(new Date(shift.clock_in_time), 'HH:mm')}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="font-mono font-semibold text-gray-900 text-base">
                              {shift.clock_out_time ? format(new Date(shift.clock_out_time), 'HH:mm') : '—'}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center hidden lg:table-cell">
                            <div className="font-semibold text-gray-900">
                              {shift.is_complete ? formatShiftDuration(shift.total_minutes) : '—'}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="font-semibold text-gray-900 text-base">
                              {shift.is_complete ? `${shift.net_hours}h` : '—'}
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center hidden xl:table-cell">
                            {shift.overtime_hours > 0 ? (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                +{shift.overtime_hours}h
                              </Badge>
                            ) : (
                              <div className="text-gray-400">—</div>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="flex flex-col items-center gap-2">
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
                              {((shift.shift_notes || []).length > 0 || (shift.validation_issues || []).length > 0) && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 px-3 hover:bg-gray-100 border-gray-200"
                                      title="View shift details"
                                    >
                                      <Eye className="h-3 w-3 mr-1" />
                                      Details
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
                                      
                                      {(shift.shift_notes || []).length > 0 && (
                                        <div>
                                          <div className="text-sm font-medium mb-2">Notes:</div>
                                          <ul className="text-sm text-muted-foreground space-y-1">
                                            {(shift.shift_notes || []).map((note, index) => (
                                              <li key={index}>• {note}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      
                                      {(shift.validation_issues || []).length > 0 && (
                                        <div>
                                          <div className="text-sm font-medium mb-2 text-red-600">Issues:</div>
                                          <ul className="text-sm text-red-600 space-y-1">
                                            {(shift.validation_issues || []).map((issue, index) => (
                                              <li key={index}>• {issue}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
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
                Staff Analytics ({(staffAnalytics || []).length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Comprehensive analytics with accurate time calculations, break deductions, and overtime tracking
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile Card View (md and below) */}
              <div className="block md:hidden">
                {(staffAnalytics || []).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <BarChart3 className="h-12 w-12 text-gray-300" />
                      <div>
                        <p className="font-medium text-lg">No staff analytics available</p>
                        <p className="text-sm text-gray-400 mt-1">for the selected criteria.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {(staffAnalytics || []).map((analytic) => (
                      <StaffAnalyticsCard key={analytic.staff_id} analytic={analytic} />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Desktop Table View (md and above) */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[25%]">Staff Member</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">Days</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">Shifts</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden lg:table-cell">Regular</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden xl:table-cell">Overtime</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">Total</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[8%] text-center hidden lg:table-cell">Photo %</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[8%] text-center">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[5%] text-center">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(staffAnalytics || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-32 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-2">
                            <BarChart3 className="h-8 w-8 text-gray-300" />
                            <p className="font-medium">No staff analytics available for the selected criteria.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      (staffAnalytics || []).map((analytic) => (
                        <TableRow key={analytic.staff_id} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                                  <span className="text-sm font-semibold text-purple-700">
                                    {analytic.staff_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 text-base">{analytic.staff_name}</p>
                                <div className="mt-1">
                                  <p className="text-sm text-gray-500">Avg: {analytic.complete_shifts > 0 ? `${analytic.average_shift_hours.toFixed(1)}h/shift` : 'No complete shifts'}</p>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="font-semibold text-gray-900">{analytic.days_worked}</div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="font-semibold text-gray-900">{analytic.total_shifts}</div>
                            <div className="text-xs text-gray-500">{analytic.complete_shifts} complete</div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center hidden lg:table-cell">
                            <div className="font-semibold text-gray-900">{analytic.regular_hours.toFixed(1)}h</div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center hidden xl:table-cell">
                            {analytic.overtime_hours > 0 ? (
                              <div className="font-semibold text-orange-600">
                                {analytic.overtime_hours.toFixed(1)}h
                              </div>
                            ) : (
                              <div className="text-gray-400">—</div>
                            )}
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="font-semibold text-gray-900 text-base">{analytic.total_hours.toFixed(1)}h</div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center hidden lg:table-cell">
                            <Badge variant={analytic.photo_compliance_rate >= 80 ? "default" : "secondary"}>
                              {analytic.photo_compliance_rate.toFixed(0)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
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
                          <TableCell className="px-4 py-4 text-center">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-3 hover:bg-gray-100 border-gray-200"
                                  title="View detailed analytics"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
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