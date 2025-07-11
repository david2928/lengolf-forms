'use client'

import { useState, useEffect } from 'react'
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

  // Fetch available months on component mount
  useEffect(() => {
    fetchAvailableMonths()
  }, [])

  // Fetch payroll summary when month changes
  useEffect(() => {
    if (selectedMonth) {
      fetchPayrollSummary()
    }
  }, [selectedMonth, refreshTrigger])

  const fetchAvailableMonths = async () => {
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
  }

  const fetchPayrollSummary = async () => {
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
  }

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
    <div className="space-y-6">
      {/* Header with month selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payroll Processing</h2>
          <p className="text-muted-foreground">
            Review time entries, calculate compensation, and process payroll
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <MonthSelector
            months={availableMonths}
            selectedMonth={selectedMonth}
            onMonthChange={handleMonthChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            className="flex items-center gap-2"
          >
            <Calculator className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {payrollSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Staff Members</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payrollSummary.total_staff}</div>
              <p className="text-xs text-muted-foreground">Active this month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payrollSummary.total_hours.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                + {payrollSummary.total_overtime.toFixed(1)} OT hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Service Charge</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ฿{payrollSummary.total_service_charge.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Distributed amount</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Review Needed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{payrollSummary.flagged_entries}</div>
                {payrollSummary.flagged_entries > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    Action Required
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Flagged entries</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="review">
            <span className="flex items-center gap-2">
              Review
              {payrollSummary && payrollSummary.flagged_entries > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {payrollSummary.flagged_entries}
                </Badge>
              )}
            </span>
          </TabsTrigger>
          <TabsTrigger value="service-charge">Service Charge</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <PayrollOverviewTable
            selectedMonth={selectedMonth}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <ReviewEntriesTable
            selectedMonth={selectedMonth}
            onEntryUpdated={handleRefreshData}
          />
        </TabsContent>

        <TabsContent value="service-charge" className="space-y-4">
          <ServiceChargeInput
            selectedMonth={selectedMonth}
            onServiceChargeUpdated={handleRefreshData}
          />
        </TabsContent>

        <TabsContent value="holidays" className="space-y-4">
          <HolidayHoursTable selectedMonth={selectedMonth} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 