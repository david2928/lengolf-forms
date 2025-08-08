import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Clock, CheckCircle, AlertTriangle, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { useTimeClockContext, WorkShift } from '../context/TimeClockProvider'
import { BaseStaffCard } from '../shared/BaseStaffCard'
import { ResponsiveDataView } from '../shared/ResponsiveDataView'
import { formatShiftDuration } from '@/lib/time-calculation'

// Mobile card component for work shifts
const WorkShiftCard: React.FC<{ shift: WorkShift }> = ({ shift }) => {
  return (
    <BaseStaffCard staffName={shift.staff_name} borderColor="orange">
      <div className="space-y-2">
        {/* Date and Detail Action Row */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {format(new Date(shift.date + 'T00:00:00+07:00'), 'MMM dd, yyyy')}
          </p>
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
        
        {/* Shift Times */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Clock In:</span>
            <span className="text-base font-mono font-semibold">
              {format(new Date(shift.clock_in_time), 'HH:mm')}
            </span>
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
        
        {/* Status Badges */}
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
            <Badge variant="outline">Cross-day</Badge>
          )}
        </div>
      </div>
    </BaseStaffCard>
  )
}

// Desktop table component for work shifts
const WorkShiftsTable: React.FC<{ shifts: WorkShift[] }> = ({ shifts }) => {
  const sortedShifts = [...shifts].sort((a, b) => 
    new Date(b.clock_in_time).getTime() - new Date(a.clock_in_time).getTime()
  )

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b bg-gray-50/50">
          <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[25%]">
            Staff & Date
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center">
            Clock In
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center">
            Clock Out
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden lg:table-cell">
            Duration
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center">
            Net Hours
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[12%] text-center hidden xl:table-cell">
            Overtime
          </TableHead>
          <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center">
            Status
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedShifts.map((shift) => (
          <TableRow 
            key={`${shift.staff_id}-${shift.clock_in_entry_id}`} 
            className="hover:bg-gray-50/50 transition-colors"
          >
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
                    <p className="text-sm text-gray-500">
                      {format(new Date(shift.date + 'T00:00:00+07:00'), 'MMM dd, yyyy')}
                    </p>
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
                      <Badge variant="outline" className="text-xs">Cross-day</Badge>
                    )}
                  </div>
                ) : (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Incomplete
                  </Badge>
                )}
                {/* Details Button */}
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
        ))}
      </TableBody>
    </Table>
  )
}

export const WorkShiftsView: React.FC = () => {
  const { workShifts } = useTimeClockContext()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Work Shifts ({workShifts.length})
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Enhanced shift tracking with cross-day support, break deductions, and overtime calculations
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <ResponsiveDataView
          data={workShifts}
          emptyStateMessage="No work shifts calculated"
          emptyStateIcon={<Clock className="h-12 w-12 text-gray-300" />}
          renderMobileCard={(shift) => (
            <WorkShiftCard key={`${shift.staff_id}-${shift.clock_in_entry_id}`} shift={shift} />
          )}
          renderDesktopTable={(shifts) => <WorkShiftsTable shifts={shifts} />}
        />
      </CardContent>
    </Card>
  )
}