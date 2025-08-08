import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BarChart3, CheckCircle, AlertTriangle, Eye } from 'lucide-react'
import { useTimeClockContext, StaffTimeAnalytics } from '../context/TimeClockProvider'
import { BaseStaffCard } from '../shared/BaseStaffCard'
import { ResponsiveDataView } from '../shared/ResponsiveDataView'

// Mobile card component for staff analytics
const StaffAnalyticsCard: React.FC<{ analytic: StaffTimeAnalytics }> = ({ analytic }) => {
  return (
    <BaseStaffCard staffName={analytic.staff_name} borderColor="purple">
      <div className="space-y-2">
        {/* Days Worked and Detail Action Row */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{analytic.days_worked} days worked</p>
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
    </BaseStaffCard>
  )
}

// Desktop table component for staff analytics
const StaffAnalyticsTable: React.FC<{ analytics: StaffTimeAnalytics[] }> = ({ analytics }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-gray-50/50">
          <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[25%]">
            Staff Member
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">
            Days
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">
            Shifts
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden lg:table-cell">
            Regular
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden xl:table-cell">
            Overtime
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">
            Total
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[8%] text-center hidden lg:table-cell">
            Photo %
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[8%] text-center">
            Status
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[5%] text-center">
            Details
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {analytics.map((analytic) => (
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
                    <p className="text-sm text-gray-500">
                      Avg: {analytic.complete_shifts > 0 ? `${analytic.average_shift_hours.toFixed(1)}h/shift` : 'No complete shifts'}
                    </p>
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
        ))}
      </TableBody>
    </Table>
  )
}

export const StaffAnalyticsView: React.FC = () => {
  const { staffAnalytics } = useTimeClockContext()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Staff Analytics ({staffAnalytics.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Comprehensive analytics with accurate time calculations, break deductions, and overtime tracking
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveDataView
          data={staffAnalytics}
          emptyStateMessage="No staff analytics available"
          emptyStateIcon={<BarChart3 className="h-12 w-12 text-gray-300" />}
          renderMobileCard={(analytic) => (
            <StaffAnalyticsCard key={analytic.staff_id} analytic={analytic} />
          )}
          renderDesktopTable={(analytics) => <StaffAnalyticsTable analytics={analytics} />}
        />
      </CardContent>
    </Card>
  )
}