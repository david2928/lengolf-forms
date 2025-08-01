'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Calendar, AlertTriangle, Calculator, DollarSign } from 'lucide-react'
import { MonthSelector } from './month-selector'
import { ReviewEntriesTable } from './review-entries-table'
import { PayrollCalculationsTable } from './payroll-calculations-table'
import { ServiceChargeInput } from './service-charge-input'
import { PayrollOverviewTable } from './payroll-overview-table'
import { HolidayHoursTable } from './holiday-hours-table'
import { useToast } from '@/components/ui/use-toast'

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

  // Fetch available months on component mount
  useEffect(() => {
    fetchAvailableMonths()
  }, [fetchAvailableMonths])

  // Fetch payroll summary when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchPayrollSummary()
    }
  }, [selectedMonth, refreshTrigger, fetchPayrollSummary])

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
        </div>
      </div>

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
    </div>
  )
} 