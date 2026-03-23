'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, AlertTriangle, Calculator, DollarSign, SendIcon, CheckCircleIcon, AlertCircleIcon } from 'lucide-react'
import { MonthSelector } from './month-selector'
import { ReviewEntriesTable } from './review-entries-table'
import { PayrollCalculationsTable } from './payroll-calculations-table'
import { ServiceChargeInput } from './service-charge-input'
import { PayrollOverviewTable } from './payroll-overview-table'
import { HolidayHoursTable } from './holiday-hours-table'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

type SnapshotStatus = 'none' | 'pending' | 'imported' | 'superseded'

interface SnapshotMeta {
  status: SnapshotStatus
  staff_count: number
  total_payout: number
  calculated_at: string | null
  calculated_by: string | null
}

interface StaffPayrollPreview {
  staff_id: number
  staff_name: string
  compensation_type: 'salary' | 'hourly'
  base_salary: number
  ot_pay: number
  holiday_pay: number
  total_allowance: number
  service_charge: number
  total_payout: number
}

// Types
interface PayrollMonth {
  month: string
  display: string
  formatted: string
}

interface PayrollSummary {
  total_staff: number
  total_hours: number
  total_overtime: number
  total_allowance: number
  total_service_charge: number
  flagged_entries: number
}

export function PayrollDashboard() {
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [availableMonths, setAvailableMonths] = useState<PayrollMonth[]>([])
  const [payrollSummary, setPayrollSummary] = useState<PayrollSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { toast } = useToast()

  // Snapshot state
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotMeta | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSupersededWarning, setShowSupersededWarning] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [payrollPreview, setPayrollPreview] = useState<StaffPayrollPreview[]>([])
  const [isFetchingPreview, setIsFetchingPreview] = useState(false)

  const fetchAvailableMonths = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/payroll/months')
      const data = await response.json()
      
      if (response.ok) {
        setAvailableMonths(data.months)
        if (data.months.length > 0) {
          setSelectedMonth(data.months[0].month) // Select most recent month
        }
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch available months',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching months:', error)
      toast({
        title: 'Error',
        description: 'Failed to connect to payroll service',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchPayrollSummary = useCallback(async () => {
    if (!selectedMonth) return
    
    try {
      // Fetch both review entries and calculations for summary
      const [reviewResponse, calculationsResponse] = await Promise.all([
        fetch(`/api/admin/payroll/${selectedMonth}/review-entries`),
        fetch(`/api/admin/payroll/${selectedMonth}/calculations`)
      ])
      
      const reviewData = await reviewResponse.json()
      const calculationsData = await calculationsResponse.json()
      
      if (reviewResponse.ok && calculationsResponse.ok) {
        // Build summary from both responses
        const summary: PayrollSummary = {
          total_staff: calculationsData.staff_payroll?.length || 0,
          total_hours: calculationsData.staff_payroll?.reduce((sum: number, staff: any) => 
            sum + (staff.regular_hours || 0), 0) || 0,
          total_overtime: calculationsData.staff_payroll?.reduce((sum: number, staff: any) => 
            sum + (staff.ot_hours || 0), 0) || 0,
          total_allowance: calculationsData.staff_payroll?.reduce((sum: number, staff: any) => 
            sum + (staff.total_allowance || 0), 0) || 0,
          total_service_charge: calculationsData.service_charge_summary?.total_distributed || 0,
          flagged_entries: reviewData.summary?.total_entries || 0
        }
        
        setPayrollSummary(summary)
      } else {
        console.error('Failed to fetch payroll summary:', { reviewData, calculationsData })
      }
    } catch (error) {
      console.error('Error fetching payroll summary:', error)
    }
  }, [selectedMonth])

  const fetchSnapshotStatus = useCallback(async (month: string) => {
    if (!month) return
    try {
      const res = await fetch(`/api/admin/payroll/${month}/submit`)
      if (res.ok) {
        const data: SnapshotMeta = await res.json()
        setSnapshotMeta(data)
      } else {
        setSnapshotMeta(null)
      }
    } catch {
      setSnapshotMeta(null)
    }
  }, [])

  const doSubmitSnapshot = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/admin/payroll/${selectedMonth}/submit`, { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to submit payroll snapshot')

      const monthLabel = new Date(`${selectedMonth}-01`).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      })

      toast({
        title: 'Payroll submitted to accounting',
        description: `${monthLabel} payroll submitted (${data.staff_count} staff, ฿${data.total_payout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total)`,
      })

      await fetchSnapshotStatus(selectedMonth)
    } catch (err) {
      toast({
        title: 'Submission failed',
        description: err instanceof Error ? err.message : 'Failed to submit payroll snapshot',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitToAccounting = async () => {
    setIsFetchingPreview(true)
    try {
      const res = await fetch(`/api/admin/payroll/${selectedMonth}/calculations`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load payroll data')
      setPayrollPreview(data.staff_payroll ?? [])
      setShowPreviewModal(true)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to load payroll preview',
        variant: 'destructive',
      })
    } finally {
      setIsFetchingPreview(false)
    }
  }

  const handleConfirmSubmit = () => {
    setShowPreviewModal(false)
    if (snapshotMeta && snapshotMeta.status === 'pending') {
      setShowSupersededWarning(true)
    } else {
      doSubmitSnapshot()
    }
  }

  // Fetch available months on component mount
  useEffect(() => {
    fetchAvailableMonths()
  }, [fetchAvailableMonths])

  // Fetch payroll summary and snapshot status when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchPayrollSummary()
      fetchSnapshotStatus(selectedMonth)
    }
  }, [selectedMonth, refreshTrigger, fetchPayrollSummary, fetchSnapshotStatus])

  const handleRefreshData = () => {
    setRefreshTrigger(prev => prev + 1)
    toast({
      title: 'Success',
      description: 'Payroll data refreshed successfully'
    })
  }

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    setActiveTab('overview') // Reset to overview when changing months
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading payroll data...</p>
        </div>
      </div>
    )
  }

  if (availableMonths.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Payroll Data Available</CardTitle>
          <CardDescription>
            No time entries found for payroll processing. Staff must clock in/out to generate payroll data.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile-optimized month selector and controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2 w-full sm:w-auto">
          <div className="w-full sm:w-auto">
            <MonthSelector
              months={availableMonths}
              selectedMonth={selectedMonth}
              onMonthChange={handleMonthChange}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Calculator className="h-4 w-4" />
            <span className="sm:inline">Refresh</span>
          </Button>
          <Button
            size="sm"
            onClick={handleSubmitToAccounting}
            disabled={isSubmitting || isFetchingPreview || snapshotMeta?.status === 'imported'}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-green-700 hover:bg-green-800 text-white"
          >
            {isFetchingPreview ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendIcon className="h-4 w-4" />
            )}
            <span>{isSubmitting ? 'Submitting...' : isFetchingPreview ? 'Loading...' : 'Submit to Accounting'}</span>
          </Button>
        </div>
      </div>

      {/* Snapshot status banner */}
      {snapshotMeta && snapshotMeta.status === 'pending' && (
        <Alert className="border-amber-500 bg-amber-50 text-amber-900">
          <AlertCircleIcon className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            Snapshot pending — submitted by <strong>{snapshotMeta.calculated_by}</strong> on{' '}
            {snapshotMeta.calculated_at ? new Date(snapshotMeta.calculated_at).toLocaleString() : ''}{' '}
            ({snapshotMeta.staff_count} staff, ฿{snapshotMeta.total_payout.toLocaleString()}). Submitting again will supersede it.
          </AlertDescription>
        </Alert>
      )}
      {snapshotMeta && snapshotMeta.status === 'imported' && (
        <Alert className="border-blue-500 bg-blue-50 text-blue-900">
          <CheckCircleIcon className="h-4 w-4 text-blue-600" />
          <AlertDescription>
            Snapshot imported by accounting on{' '}
            {snapshotMeta.calculated_at ? new Date(snapshotMeta.calculated_at).toLocaleString() : ''} —{' '}
            {snapshotMeta.staff_count} staff, ฿{snapshotMeta.total_payout.toLocaleString()}.
          </AlertDescription>
        </Alert>
      )}

      {/* Mobile-optimized Summary Cards */}
      {payrollSummary && (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="p-3 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
              <CardTitle className="text-xs md:text-sm font-medium">Staff</CardTitle>
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="text-lg md:text-2xl font-bold">{payrollSummary.total_staff}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>

          <Card className="p-3 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
              <CardTitle className="text-xs md:text-sm font-medium">Hours</CardTitle>
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="text-lg md:text-2xl font-bold">{payrollSummary.total_hours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                +{payrollSummary.total_overtime.toFixed(1)} OT
              </p>
            </CardContent>
          </Card>

          <Card className="p-3 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
              <CardTitle className="text-xs md:text-sm font-medium">Service</CardTitle>
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="text-lg md:text-2xl font-bold">
                <span className="hidden sm:inline">฿</span>{payrollSummary.total_service_charge.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Distributed</p>
            </CardContent>
          </Card>

          <Card className="p-3 md:p-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0">
              <CardTitle className="text-xs md:text-sm font-medium">Review</CardTitle>
              <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-2">
              <div className="flex items-center gap-1 md:gap-2">
                <div className="text-lg md:text-2xl font-bold">{payrollSummary.flagged_entries}</div>
                {payrollSummary.flagged_entries > 0 && (
                  <Badge variant="destructive" className="text-xs px-1 py-0 md:px-2 md:py-1">
                    <span className="hidden sm:inline">Action Required</span>
                    <span className="sm:hidden">!</span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Flagged</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Mobile-optimized Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 md:space-y-4">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs md:text-sm px-2 py-2 md:px-3 md:py-2">
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs md:text-sm px-2 py-2 md:px-3 md:py-2">
            <span className="flex items-center gap-1 md:gap-2">
              <span className="hidden sm:inline">Review</span>
              <span className="sm:hidden">Review</span>
              {payrollSummary && payrollSummary.flagged_entries > 0 && (
                <Badge variant="destructive" className="text-xs px-1 py-0 md:px-2 md:py-1">
                  {payrollSummary.flagged_entries}
                </Badge>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="service-charge" className="text-xs md:text-sm px-2 py-2 md:px-3 md:py-2">
            <span className="hidden sm:inline">Service Charge</span>
            <span className="sm:hidden">Service</span>
          </TabsTrigger>
          <TabsTrigger value="holidays" className="text-xs md:text-sm px-2 py-2 md:px-3 md:py-2">
            <span className="hidden sm:inline">Holidays</span>
            <span className="sm:hidden">Holidays</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <PayrollOverviewTable
            selectedMonth={selectedMonth}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="review" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <ReviewEntriesTable
            selectedMonth={selectedMonth}
            onEntryUpdated={handleRefreshData}
          />
        </TabsContent>

        <TabsContent value="service-charge" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <ServiceChargeInput
            selectedMonth={selectedMonth}
            onServiceChargeUpdated={handleRefreshData}
          />
        </TabsContent>

        <TabsContent value="holidays" className="space-y-3 md:space-y-4 mt-3 md:mt-4">
          <HolidayHoursTable selectedMonth={selectedMonth} />
        </TabsContent>
      </Tabs>

      {/* Payroll preview / confirm dialog */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Confirm Payroll Submission</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Review the breakdown for{' '}
              <strong className="text-foreground">
                {selectedMonth
                  ? new Date(`${selectedMonth}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })
                  : selectedMonth}
              </strong>{' '}
              before submitting to accounting.
            </DialogDescription>
            {snapshotMeta?.status === 'pending' && (
              <div className="flex items-center gap-2 mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertCircleIcon className="h-4 w-4 shrink-0 text-amber-600" />
                <span>An existing snapshot will be superseded by this submission.</span>
              </div>
            )}
          </DialogHeader>

          {/* Per-employee table */}
          <div className="rounded-md border overflow-hidden">
            <div className="overflow-y-auto max-h-[45vh]">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-gray-50/50">
                    <TableHead className="font-semibold text-gray-900 px-4 py-3">Staff</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-3 text-right">Base</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-3 text-right hidden sm:table-cell">OT</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-3 text-right hidden sm:table-cell">Holiday</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-3 text-right hidden md:table-cell">Allowance</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-3 text-right hidden md:table-cell">Service</TableHead>
                    <TableHead className="font-semibold text-gray-900 px-4 py-3 text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollPreview.map((s) => (
                    <TableRow key={s.staff_id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-semibold text-blue-700">
                              {s.staff_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 text-sm">{s.staff_name}</p>
                            <Badge
                              variant={s.compensation_type === 'salary' ? 'default' : 'secondary'}
                              className={`text-xs mt-0.5 ${s.compensation_type === 'salary' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}
                            >
                              {s.compensation_type === 'salary' ? 'Salary' : 'Hourly'}
                            </Badge>
                            {/* Mobile extras */}
                            <div className="sm:hidden mt-1 space-y-0.5 text-xs text-muted-foreground">
                              {s.ot_pay > 0 && <div>OT: ฿{s.ot_pay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                              {s.holiday_pay > 0 && <div>Holiday: ฿{s.holiday_pay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm">
                        ฿{s.base_salary.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
                        {s.ot_pay > 0 ? `฿${s.ot_pay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm text-muted-foreground hidden sm:table-cell">
                        {s.holiday_pay > 0 ? `฿${s.holiday_pay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm text-muted-foreground hidden md:table-cell">
                        {s.total_allowance > 0 ? `฿${s.total_allowance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right text-sm text-muted-foreground hidden md:table-cell">
                        {s.service_charge > 0 ? `฿${s.service_charge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-right font-semibold text-green-700">
                        ฿{s.total_payout.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Totals row */}
                  {payrollPreview.length > 0 && (() => {
                    const t = payrollPreview.reduce(
                      (acc, s) => ({
                        base: acc.base + s.base_salary,
                        ot: acc.ot + s.ot_pay,
                        holiday: acc.holiday + s.holiday_pay,
                        allowance: acc.allowance + s.total_allowance,
                        service: acc.service + s.service_charge,
                        total: acc.total + s.total_payout,
                      }),
                      { base: 0, ot: 0, holiday: 0, allowance: 0, service: 0, total: 0 }
                    )
                    return (
                      <TableRow className="border-t-2 border-gray-200 bg-gray-50/80">
                        <TableCell className="px-4 py-3 font-semibold text-gray-700 text-sm">
                          {payrollPreview.length} staff total
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-semibold text-sm">
                          ฿{t.base.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-semibold text-sm hidden sm:table-cell">
                          {t.ot > 0 ? `฿${t.ot.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-semibold text-sm hidden sm:table-cell">
                          {t.holiday > 0 ? `฿${t.holiday.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-semibold text-sm hidden md:table-cell">
                          {t.allowance > 0 ? `฿${t.allowance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-semibold text-sm hidden md:table-cell">
                          {t.service > 0 ? `฿${t.service.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right font-bold text-base text-green-700">
                          ฿{t.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    )
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" size="default" onClick={() => setShowPreviewModal(false)}>
              Cancel
            </Button>
            <Button size="default" onClick={handleConfirmSubmit} className="bg-green-700 hover:bg-green-800 text-white">
              <SendIcon className="h-4 w-4 mr-2" />
              Confirm &amp; Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supersede warning dialog */}
      <Dialog open={showSupersededWarning} onOpenChange={setShowSupersededWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Snapshot already exists for this period</DialogTitle>
            <DialogDescription>
              A payroll snapshot already exists for{' '}
              <strong>
                {selectedMonth
                  ? new Date(`${selectedMonth}-01`).toLocaleString('en-US', { month: 'long', year: 'numeric' })
                  : selectedMonth}
              </strong>
              . Submitting will mark it as superseded and replace it with a fresh calculation.
              The accounting app will use the new snapshot when creating a run.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSupersededWarning(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setShowSupersededWarning(false)
                doSubmitSnapshot()
              }}
              disabled={isSubmitting}
            >
              Yes, supersede and resubmit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 