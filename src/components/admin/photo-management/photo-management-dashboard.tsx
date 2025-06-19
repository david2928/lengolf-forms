'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  Calendar, 
  Filter,
  AlertTriangle,
  CheckCircle,
  Loader2,
  FileText,
  HardDrive,
  Settings,
  RefreshCw,
  Eye,
  Camera,
  Clock,
  Users,
  BarChart3,
  Zap,
  Shield
} from 'lucide-react'
import { format, subDays, formatDistanceToNow } from 'date-fns'

interface PhotoRecord {
  id: string
  staff_id: number
  staff_name: string
  action: 'clock_in' | 'clock_out'
  timestamp: string
  photo_url: string
  file_path: string
  file_size: number
  created_at: string
}

interface StorageStats {
  total_photos: number
  total_size_bytes: number
  oldest_photo_date: string
  newest_photo_date: string
  storage_bucket: string
  retention_days: number
  photos_eligible_for_cleanup: number
  estimated_cleanup_size: number
}

interface CleanupResult {
  deleted_count: number
  errors_count: number
  size_freed: number
  duration_ms: number
}

export function PhotoManagementDashboard() {
  const [photos, setPhotos] = useState<PhotoRecord[]>([])
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecord | null>(null)
  const [cleanupRunning, setCleanupRunning] = useState(false)
  const [lastCleanupResult, setLastCleanupResult] = useState<CleanupResult | null>(null)
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    staffId: 'all',
    action: 'all'
  })

  // Staff list for filtering
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([])

  const fetchStorageStats = async () => {
    try {
      console.log('Fetching storage stats...')
      
      const response = await fetch('/api/admin/photo-management/stats', {
        method: 'GET',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('Storage stats API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Storage stats API error:', response.status, errorText)
        throw new Error(`Failed to fetch storage stats: ${response.status} - ${errorText}`)
      }
      
      const data = await response.json()
      console.log('Storage stats API response data:', data)
      setStorageStats(data.stats)
    } catch (err) {
      console.error('Error fetching storage stats:', err)
      setError('Failed to load storage statistics')
    }
  }

  const fetchPhotos = async () => {
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

      if (filters.action !== 'all') {
        params.append('action', filters.action)
      }

      console.log('Fetching photos with params:', params.toString())
      
      const response = await fetch(`/api/admin/photo-management/photos?${params}`, {
        method: 'GET',
        credentials: 'include', // Include session cookies
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('Photos API response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Photos API error:', response.status, errorText)
        throw new Error(`Failed to fetch photos: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('Photos API response data:', data)
      
      if (!data.photos) {
        console.warn('No photos property in response:', data)
      }
      
      // Debug: Check photo URLs
      if (data.photos && data.photos.length > 0) {
        console.log('Sample photo data:', data.photos[0])
        console.log('Photos with URLs:', data.photos.filter((p: any) => p.photo_url).length)
        console.log('Photos without URLs:', data.photos.filter((p: any) => !p.photo_url).length)
      }
      
      setPhotos(data.photos || [])
      console.log(`Successfully loaded ${data.photos?.length || 0} photos`)
    } catch (err) {
      console.error('Error fetching photos:', err)
      setError(`Failed to load photos: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => {
    fetchStaffList()
    fetchStorageStats()
    fetchPhotos()
  }, [])

  useEffect(() => {
    fetchPhotos()
  }, [filters])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/photo-management/photos/${photoId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete photo')

      setPhotos(prev => prev.filter(p => p.id !== photoId))
      setSelectedPhoto(null)
      await fetchStorageStats() // Refresh stats
    } catch (err) {
      console.error('Error deleting photo:', err)
      setError('Failed to delete photo')
    }
  }

  const handleCleanupOldPhotos = async () => {
    if (!confirm(`Are you sure you want to run cleanup? This will permanently delete photos older than ${storageStats?.retention_days} days.`)) {
      return
    }

    try {
      setCleanupRunning(true)
      const response = await fetch('/api/admin/photo-management/cleanup', {
        method: 'POST'
      })

      if (!response.ok) throw new Error('Cleanup failed')

      const result = await response.json()
      setLastCleanupResult(result)
      await fetchStorageStats()
      await fetchPhotos()
    } catch (err) {
      console.error('Error running cleanup:', err)
      setError('Failed to run cleanup')
    } finally {
      setCleanupRunning(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStorageUsagePercentage = (): number => {
    if (!storageStats) return 0
    // Assuming 1GB limit for demo purposes
    const limitBytes = 1024 * 1024 * 1024
    return (storageStats.total_size_bytes / limitBytes) * 100
  }

  if (loading && !photos.length) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading photo management...</p>
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

      {/* Storage Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Photos</CardTitle>
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageStats?.total_photos.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground">
              {storageStats?.photos_eligible_for_cleanup || 0} eligible for cleanup
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(storageStats?.total_size_bytes || 0)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${Math.min(getStorageUsagePercentage(), 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getStorageUsagePercentage().toFixed(1)}% of estimated limit
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retention Period</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storageStats?.retention_days || 30} days</div>
            <p className="text-xs text-muted-foreground">
              Auto-cleanup after retention period
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleanup Savings</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatFileSize(storageStats?.estimated_cleanup_size || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available to clean up
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Storage Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={handleCleanupOldPhotos}
              disabled={cleanupRunning || !storageStats?.photos_eligible_for_cleanup}
              variant="outline"
            >
              {cleanupRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running Cleanup...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Run Cleanup ({storageStats?.photos_eligible_for_cleanup || 0} photos)
                </>
              )}
            </Button>
            
            <Button onClick={() => { fetchStorageStats(); fetchPhotos() }} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>
          
          {lastCleanupResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Last cleanup: Deleted {lastCleanupResult.deleted_count} photos, 
                freed {formatFileSize(lastCleanupResult.size_freed)}, 
                completed in {(lastCleanupResult.duration_ms / 1000).toFixed(1)}s
                {lastCleanupResult.errors_count > 0 && ` (${lastCleanupResult.errors_count} errors)`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Photo Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Photos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Photos ({photos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px] text-center">Preview</TableHead>
                  <TableHead className="min-w-[150px]">Staff</TableHead>
                  <TableHead className="min-w-[100px] text-center">Action</TableHead>
                  <TableHead className="min-w-[140px] text-center">Date & Time</TableHead>
                  <TableHead className="min-w-[100px] text-center">File Size</TableHead>
                  <TableHead className="min-w-[120px] text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {photos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No photos found for the selected criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  photos.map((photo) => (
                    <TableRow key={photo.id}>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                console.log('View button clicked for photo:', photo.id, 'URL:', photo.photo_url)
                                setSelectedPhoto(photo)
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Time Clock Photo</DialogTitle>
                              <DialogDescription>
                                {photo.staff_name} - {photo.action === 'clock_in' ? 'Clock In' : 'Clock Out'} 
                                on {format(new Date(photo.timestamp), 'MMM dd, yyyy at h:mm a')}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="flex justify-center">
                                {photo.photo_url ? (
                                  <img 
                                    src={photo.photo_url} 
                                    alt="Time clock photo"
                                    className="max-w-full h-auto rounded-lg border"
                                    style={{ maxHeight: '400px' }}
                                    onError={(e) => {
                                      console.error('Failed to load photo:', photo.file_path)
                                      console.error('Photo URL:', photo.photo_url)
                                      e.currentTarget.style.display = 'none'
                                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement
                                      if (nextElement) {
                                        nextElement.style.display = 'block'
                                      }
                                    }}
                                    onLoad={() => {
                                      console.log('Successfully loaded photo:', photo.file_path)
                                    }}
                                  />
                                ) : (
                                  <div className="text-center p-8 border rounded-lg bg-gray-50">
                                    <div className="text-gray-500 mb-2">
                                      <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                      No photo URL available
                                    </div>
                                    <div className="text-xs text-gray-400 mb-2">Photo URL generation failed</div>
                                    <div className="text-xs text-gray-400 font-mono">
                                      Path: {photo.file_path}
                                    </div>
                                  </div>
                                )}
                                <div 
                                  className="text-center p-8 border rounded-lg bg-red-50" 
                                  style={{ display: photo.photo_url ? 'none' : 'block' }}
                                >
                                  <div className="text-red-500 mb-2">
                                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                                    Failed to load photo
                                  </div>
                                  <div className="text-xs text-red-400 mb-2">
                                    The photo could not be displayed. This may be due to:
                                  </div>
                                  <div className="text-xs text-red-400 mb-2">
                                    • File may not exist in storage<br/>
                                    • Bucket permissions issue<br/>
                                    • Signed URL generation failed
                                  </div>
                                  <div className="text-xs text-red-400 font-mono">
                                    Path: {photo.file_path}
                                  </div>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="mt-2"
                                    onClick={() => window.location.reload()}
                                  >
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Retry
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <strong>File Size:</strong> {formatFileSize(photo.file_size)}
                                </div>
                                <div>
                                  <strong>File Path:</strong> {photo.file_path}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button 
                                  variant="destructive" 
                                  onClick={() => handleDeletePhoto(photo.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Photo
                                </Button>
                                <Button 
                                  variant="outline" 
                                  disabled={!photo.photo_url}
                                  asChild={!!photo.photo_url}
                                >
                                  {photo.photo_url ? (
                                    <a href={photo.photo_url} download target="_blank" rel="noopener noreferrer">
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </a>
                                  ) : (
                                    <>
                                      <Download className="h-4 w-4 mr-2" />
                                      Download
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                      <TableCell className="font-medium">{photo.staff_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={photo.action === 'clock_in' ? 'default' : 'secondary'}>
                          {photo.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <div>{format(new Date(photo.timestamp), 'MMM dd, yyyy')}</div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(photo.timestamp), 'h:mm a')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-center">
                        {formatFileSize(photo.file_size)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeletePhoto(photo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </div>
  )
} 