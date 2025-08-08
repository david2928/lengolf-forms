import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCardSkeleton } from '@/components/ui/skeleton-loader'
import { FileText, Camera, Clock, BarChart3 } from 'lucide-react'
import { useTimeClockContext } from './context/TimeClockProvider'

export const TimeClockSummaryCards: React.FC = () => {
  const {
    timeEntries,
    monthlyComparison,
    monthToDateSummary,
    loading,
    filters
  } = useTimeClockContext()

  // Calculate photo compliance for current filtered data
  const photoComplianceRate = timeEntries.length > 0 
    ? Math.round((timeEntries.filter(e => e.photo_captured).length / timeEntries.length) * 100)
    : 0

  const photoComplianceText = `${timeEntries.filter(e => e.photo_captured).length} of ${timeEntries.length} entries`

  // Format date range for display
  const dateRangeText = filters.startDate === filters.endDate 
    ? 'Today' 
    : `${filters.startDate} to ${filters.endDate}`

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Entries Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{timeEntries.length}</div>
          <p className="text-xs text-muted-foreground">
            {dateRangeText}
          </p>
        </CardContent>
      </Card>
      
      {/* Photo Compliance Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Photo Compliance</CardTitle>
          <Camera className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{photoComplianceRate}%</div>
          <p className="text-xs text-muted-foreground">
            {photoComplianceText}
          </p>
        </CardContent>
      </Card>
      
      {/* Monthly Hours Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Month Hours</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatsCardSkeleton />
          ) : (
            <>
              <div className="text-2xl font-bold">
                {monthlyComparison.currentMonthHours.toFixed(1)}h
              </div>
              <div className="flex items-center text-xs">
                <span className={`font-medium ${
                  monthlyComparison.percentageChange.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {monthlyComparison.percentageChange.value}
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {/* Monthly Entries Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Month Entries</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <StatsCardSkeleton />
          ) : (
            <>
              <div className="text-2xl font-bold">{monthToDateSummary.totalEntries}</div>
              <p className="text-xs text-muted-foreground">
                {monthToDateSummary.photoCompliance.toFixed(0)}% photo compliance
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}