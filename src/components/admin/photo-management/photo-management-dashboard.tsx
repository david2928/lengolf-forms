'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
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
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { PhotoGridSkeleton, StatsCardSkeleton } from '@/components/ui/skeleton-loader'
import { ErrorBoundary } from '@/components/ui/error-boundary'
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
  Shield,
  Search,
  ChevronLeft,
  ChevronRight
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
  // PHASE 4 FIX: Add image loading state for modal
  const [imageLoading, setImageLoading] = useState<boolean>(false)
  const [imageError, setImageError] = useState<boolean>(false)
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    staffId: 'all',
    action: 'all'
  })

  // Search and pagination
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm])

  // Filtered and paginated photos
  const filteredPhotos = photos.filter(photo => 
    photo.staff_name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
    photo.action.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  )

  const totalPages = Math.ceil(filteredPhotos.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedPhotos = filteredPhotos.slice(startIndex, startIndex + itemsPerPage)

  // Staff list for filtering
  const [staffList, setStaffList] = useState<{ id: number; name: string }[]>([])

  const fetchStorageStats = useCallback(async () => {
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
  }, [])

  const fetchPhotos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        start_date: filters.startDate,
        end_date: filters.endDate,
        t: Date.now().toString() // Cache busting timestamp
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
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
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
  }, [filters])

  const fetchStaffList = useCallback(async () => {
    try {
      const response = await fetch('/api/staff')
      if (!response.ok) throw new Error('Failed to fetch staff')
      const data = await response.json()
      setStaffList(data.staff?.map((s: any) => ({ id: s.id, name: s.staff_name })) || [])
    } catch (err) {
      console.error('Error fetching staff list:', err)
    }
  }, [])

  useEffect(() => {
    fetchStaffList()
    fetchStorageStats()
    fetchPhotos()
  }, [fetchStaffList, fetchStorageStats, fetchPhotos])

  useEffect(() => {
    fetchPhotos()
  }, [filters, fetchPhotos])

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page when search changes
  }

  // Reset to first page when debounced search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm])

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
        <LoadingSpinner size="lg" text="Loading photo management..." />
      </div>
    )
  }

  return (
    <ErrorBoundary showTechnicalDetails={process.env.NODE_ENV === 'development'}>
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
                <LoadingSpinner variant="inline" size="sm" text="Running Cleanup..." />
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
          {/* Search Bar */}
          <div className="space-y-2">
            <Label htmlFor="search">Search Photos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by staff name or action..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
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

      {/* Photos Display */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle>
              Photos ({filteredPhotos.length}
              {debouncedSearchTerm && ` filtered from ${photos.length}`})
            </CardTitle>
            {totalPages > 1 && (
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-4">
            {paginatedPhotos.length === 0 ? (
              <div className="text-center py-8">
                <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No photos found
                </h3>
                <p className="text-sm text-muted-foreground">
                  {debouncedSearchTerm ? 'Try adjusting your search terms' : 'No photos match the selected criteria'}
                </p>
                {debouncedSearchTerm && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => handleSearchChange('')}>
                    Clear Search
                  </Button>
                )}
              </div>
            ) : (
              paginatedPhotos.map((photo) => (
                <Card key={photo.id} className="border hover:bg-gray-50/50 transition-colors">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">{photo.staff_name}</div>
                        <Badge variant={photo.action === 'clock_in' ? 'default' : 'secondary'} className="text-xs">
                          {photo.action === 'clock_in' ? 'Clock In' : 'Clock Out'}
                        </Badge>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm font-medium">
                          {format(new Date(photo.timestamp), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(photo.timestamp), 'h:mm a')}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Size: {formatFileSize(photo.file_size)}
                      </div>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedPhoto(photo)
                                setImageLoading(true)
                                setImageError(false)
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
                                  <div className="relative">
                                    {imageLoading && !imageError && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg" style={{ minHeight: '200px' }}>
                                        <LoadingSpinner size="lg" text="Loading photo..." />
                                      </div>
                                    )}
                                    
                                    <Image
                                      src={photo.photo_url}
                                      alt={`Time clock photo for ${photo.staff_name}`}
                                      width={400}
                                      height={400}
                                      unoptimized={true}
                                      className={`max-w-full h-auto rounded-lg border shadow-sm transition-opacity duration-300 ${
                                        imageLoading ? 'opacity-0' : 'opacity-100'
                                      }`}
                                      style={{ maxHeight: '400px' }}
                                      onError={() => {
                                        setImageLoading(false)
                                        setImageError(true)
                                      }}
                                      onLoad={() => {
                                        setImageLoading(false)
                                        setImageError(false)
                                      }}
                                    />
                                    
                                    {!imageLoading && !imageError && (
                                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                        {format(new Date(photo.timestamp), 'MMM dd, h:mm a')}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                    <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Photo URL Missing</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                      The photo URL could not be generated for this entry.
                                    </p>
                                  </div>
                                )}
                                
                                {imageError && photo.photo_url && (
                                  <div className="text-center p-8 border-2 border-red-200 rounded-lg bg-red-50">
                                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                                    <h3 className="text-lg font-medium text-red-900 mb-2">Photo Load Failed</h3>
                                    <p className="text-sm text-red-700 mb-4">
                                      The photo could not be displayed.
                                    </p>
                                  </div>
                                )}
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
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDeletePhoto(photo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] text-center">Preview</TableHead>
                    <TableHead className="w-[180px]">Staff</TableHead>
                    <TableHead className="w-[120px] text-center">Action</TableHead>
                    <TableHead className="w-[160px] text-center">Date & Time</TableHead>
                    <TableHead className="w-[100px] text-center">File Size</TableHead>
                    <TableHead className="w-[120px] text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedPhotos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium text-muted-foreground mb-2">
                          No photos found
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {debouncedSearchTerm ? 'Try adjusting your search terms' : 'No photos match the selected criteria'}
                        </p>
                        {debouncedSearchTerm && (
                          <Button variant="outline" size="sm" className="mt-4" onClick={() => handleSearchChange('')}>
                            Clear Search
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedPhotos.map((photo) => (
                    <TableRow key={photo.id}>
                      <TableCell className="text-center">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                console.log('Phase 4: View button clicked for photo:', photo.id, 'URL:', photo.photo_url)
                                setSelectedPhoto(photo)
                                // PHASE 4 FIX: Reset image states when opening modal
                                setImageLoading(true)
                                setImageError(false)
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
                                  <div className="relative">
                                    {/* PHASE 4 FIX: Loading spinner while image loads */}
                                    {imageLoading && !imageError && (
                                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg" style={{ minHeight: '200px' }}>
                                        <LoadingSpinner size="lg" text="Loading photo..." />
                                      </div>
                                    )}
                                    
                                    <Image
                                      src={photo.photo_url}
                                      alt={`Time clock photo for ${photo.staff_name}`}
                                      width={400}
                                      height={400}
                                      unoptimized={true}
                                      className={`max-w-full h-auto rounded-lg border shadow-sm transition-opacity duration-300 ${
                                        imageLoading ? 'opacity-0' : 'opacity-100'
                                      }`}
                                      style={{ maxHeight: '400px' }}
                                      onError={(e) => {
                                        console.error('Phase 4: Image load failed:', {
                                          photo_id: photo.id,
                                          file_path: photo.file_path,
                                          photo_url: photo.photo_url,
                                          staff: photo.staff_name
                                        })
                                        setImageLoading(false)
                                        setImageError(true)
                                      }}
                                      onLoad={() => {
                                        console.log(`Phase 4: Image loaded successfully for ${photo.staff_name}:`, photo.file_path)
                                        setImageLoading(false)
                                        setImageError(false)
                                      }}
                                    />
                                    
                                    {/* Timestamp overlay - only show when image is loaded */}
                                    {!imageLoading && !imageError && (
                                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                                        {format(new Date(photo.timestamp), 'MMM dd, h:mm a')}
                                      </div>
                                    )}
                                  </div>
                                ) : null}
                                
                                {/* PHASE 4 FIX: Improved error states */}
                                {!photo.photo_url ? (
                                  <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                    <Camera className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <h3 className="text-lg font-medium text-gray-900 mb-2">Photo URL Missing</h3>
                                    <p className="text-sm text-gray-600 mb-4">
                                      The photo URL could not be generated for this entry.
                                    </p>
                                    <div className="text-xs text-gray-500 mb-4 font-mono bg-gray-100 p-2 rounded">
                                      Path: {photo.file_path}
                                    </div>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        console.log('Phase 4: Manual refresh requested for photo:', photo.id)
                                        fetchPhotos()
                                      }}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Retry URL Generation
                                    </Button>
                                  </div>
                                ) : null}
                                
                                {/* PHASE 4 FIX: Error state that shows when image fails to load */}
                                {imageError && photo.photo_url && (
                                  <div className="text-center p-8 border-2 border-red-200 rounded-lg bg-red-50">
                                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
                                  <h3 className="text-lg font-medium text-red-900 mb-2">Photo Load Failed</h3>
                                  <p className="text-sm text-red-700 mb-4">
                                    The photo could not be displayed. Common causes:
                                  </p>
                                  <ul className="text-xs text-red-600 mb-4 text-left space-y-1">
                                    <li>• File may not exist in storage bucket</li>
                                    <li>• Storage bucket permissions issue</li>
                                    <li>• Signed URL expired or invalid</li>
                                    <li>• Network connectivity problem</li>
                                  </ul>
                                  <div className="text-xs text-red-500 mb-4 font-mono bg-red-100 p-2 rounded">
                                    Path: {photo.file_path}
                                  </div>
                                  <div className="flex gap-2 justify-center">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        console.log('Phase 4: Retry photo load for:', photo.id)
                                        fetchPhotos()
                                      }}
                                    >
                                      <RefreshCw className="h-4 w-4 mr-2" />
                                      Retry Load
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => {
                                        if (photo.photo_url) {
                                          window.open(photo.photo_url, '_blank')
                                        }
                                      }}
                                      disabled={!photo.photo_url}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      Open Direct
                                    </Button>
                                  </div>
                                </div>
                                )}
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
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredPhotos.length)} of {filteredPhotos.length} photos
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(page => {
                      const diff = Math.abs(page - currentPage);
                      return diff === 0 || diff === 1 || page === 1 || page === totalPages;
                    })
                    .map((page, index, array) => (
                      <span key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 text-muted-foreground">...</span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      </span>
                    ))}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </ErrorBoundary>
  )
} 