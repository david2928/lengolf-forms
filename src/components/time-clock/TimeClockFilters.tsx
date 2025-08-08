import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Filter, 
  Download, 
  Loader2, 
  RefreshCw, 
  Settings,
  Calendar,
  Clock,
  AlertTriangle
} from 'lucide-react'
{/* Using custom collapsible with basic state since Collapsible component not available */}
import { format } from 'date-fns'
import { useTimeClockContext } from './context/TimeClockProvider'

// Filter preset definitions
const FILTER_PRESETS = [
  { 
    name: 'Today', 
    icon: Calendar,
    description: 'Today\'s entries only',
    action: () => 0 // days parameter for handleQuickDateFilter
  },
  { 
    name: 'Last 7 Days', 
    icon: Clock,
    description: 'Past week entries',
    action: () => 7
  },
  { 
    name: 'Last 30 Days', 
    icon: Clock,
    description: 'Past month entries', 
    action: () => 30
  }
] as const

export const TimeClockFilters: React.FC = () => {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [exporting, setExporting] = useState(false)
  
  const {
    timeEntries,
    staffList,
    filters,
    handleFilterChange,
    handleQuickDateFilter,
    refreshData
  } = useTimeClockContext()

  // CSV Export functionality
  const handleExportCSV = async () => {
    try {
      setExporting(true)
      
      // Create CSV content
      const headers = ['Date', 'Time', 'Staff Name', 'Action', 'Photo Captured']
      const rows = timeEntries.map(entry => [
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filters & Export
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Filter Presets */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Quick Filters</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {FILTER_PRESETS.map((preset) => {
              const IconComponent = preset.icon
              return (
                <Button
                  key={preset.name}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter(preset.action())}
                  className="h-12 flex flex-col items-center gap-1 text-xs"
                  title={preset.description}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{preset.name}</span>
                </Button>
              )
            })}
          </div>
        </div>

        {/* Advanced Filters - Custom Collapsible */}
        <div>
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Advanced Filters
            <span className="ml-auto text-xs text-muted-foreground">
              {showAdvanced ? 'Hide' : 'Show'}
            </span>
          </Button>
          {showAdvanced && (
            <div className="mt-4">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {/* Date Range */}
              <div className="space-y-2 lg:col-span-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="startDate" className="text-xs text-muted-foreground">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate" className="text-xs text-muted-foreground">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              {/* Staff Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Staff Member</Label>
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
              
              {/* Action Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Action</Label>
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
              
              {/* Photo Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Photo Status</Label>
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
            </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t">
          <div className="flex gap-2 flex-1">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleExportCSV} 
              disabled={exporting || timeEntries.length === 0}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV ({timeEntries.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Filter Summary */}
        {(filters.staffId !== 'all' || filters.action !== 'all' || filters.photoFilter !== 'all') && (
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>Active Filters:</strong>
            {filters.staffId !== 'all' && (
              <span className="ml-2">Staff: {staffList.find(s => s.id.toString() === filters.staffId)?.name}</span>
            )}
            {filters.action !== 'all' && (
              <span className="ml-2">Action: {filters.action}</span>
            )}
            {filters.photoFilter !== 'all' && (
              <span className="ml-2">Photo: {filters.photoFilter.replace('_', ' ')}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}