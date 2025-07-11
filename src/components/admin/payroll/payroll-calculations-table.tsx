'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Calculator, Download, DollarSign } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface StaffPayroll {
  staff_id: number
  staff_name: string
  base_salary: number
  regular_hours: number
  ot_hours: number
  ot_pay: number
  holiday_hours: number
  holiday_pay: number
  working_days: number
  total_allowance: number
  service_charge: number
  total_payout: number
}

interface PayrollCalculationsData {
  month: string
  staff_payroll: StaffPayroll[]
  service_charge_summary: {
    total_amount: number
    eligible_staff_count: number
    per_staff_amount: number
    total_distributed: number
  }
  summary: {
    total_staff: number
    total_regular_hours: number
    total_ot_hours: number
    total_payroll: number
  }
}

interface PayrollCalculationsTableProps {
  selectedMonth: string
  refreshTrigger: number
}

export function PayrollCalculationsTable({ selectedMonth, refreshTrigger }: PayrollCalculationsTableProps) {
  const [payrollData, setPayrollData] = useState<PayrollCalculationsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (selectedMonth) {
      fetchPayrollCalculations()
    }
  }, [selectedMonth, refreshTrigger])

  const fetchPayrollCalculations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/payroll/${selectedMonth}/calculations`)
      const data = await response.json()
      
      if (response.ok) {
        setPayrollData(data)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch payroll calculations',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching payroll calculations:', error)
      toast({
        title: 'Error',
        description: 'Failed to connect to payroll service',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefreshCalculations = async () => {
    try {
      setRefreshing(true)
      const response = await fetch(`/api/admin/payroll/${selectedMonth}/calculations`, {
        method: 'POST'
      })
      const data = await response.json()
      
      if (response.ok) {
        setPayrollData(data)
        toast({
          title: 'Success',
          description: 'Payroll calculations refreshed successfully'
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to refresh calculations',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error refreshing calculations:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh calculations',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  const exportToCSV = () => {
    if (!payrollData) return

    const headers = [
      'Staff Name',
      'Base Salary',
      'Regular Hours',
      'OT Hours',
      'OT Pay',
      'Holiday Hours',
      'Holiday Pay',
      'Working Days',
      'Allowance',
      'Service Charge',
      'Total Payout'
    ]

    const rows = payrollData.staff_payroll.map(staff => [
      staff.staff_name,
      staff.base_salary.toFixed(2),
      staff.regular_hours.toFixed(1),
      staff.ot_hours.toFixed(1),
      staff.ot_pay.toFixed(2),
      staff.holiday_hours.toFixed(1),
      staff.holiday_pay.toFixed(2),
      staff.working_days.toString(),
      staff.total_allowance.toFixed(2),
      staff.service_charge.toFixed(2),
      staff.total_payout.toFixed(2)
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `payroll-${selectedMonth}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payroll Calculations</CardTitle>
          <CardDescription>Loading payroll data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-[100px]" />
              <Skeleton className="h-[100px]" />
              <Skeleton className="h-[100px]" />
            </div>
            <Skeleton className="h-[300px]" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!payrollData || payrollData.staff_payroll.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payroll Calculations</CardTitle>
          <CardDescription>
            No payroll data available for {selectedMonth}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calculator className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Payroll Data</h3>
            <p className="text-muted-foreground">
              No time entries found for {selectedMonth} or staff compensation settings are missing.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Payroll Calculations
        </CardTitle>
        <CardDescription>
          Final payroll calculations for {selectedMonth} - {payrollData.staff_payroll.length} staff members
        </CardDescription>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshCalculations}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Staff</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payrollData.summary.total_staff}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {payrollData.summary.total_regular_hours.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground">
                + {payrollData.summary.total_ot_hours.toFixed(1)} OT
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ฿{payrollData.summary.total_payroll.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Service Charge Summary */}
        {payrollData.service_charge_summary.total_amount > 0 && (
          <Card className="mb-6 bg-accent">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Service Charge Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium ml-2">
                    ฿{payrollData.service_charge_summary.total_amount.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Eligible Staff:</span>
                  <span className="font-medium ml-2">
                    {payrollData.service_charge_summary.eligible_staff_count}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Per Staff:</span>
                  <span className="font-medium ml-2">
                    ฿{payrollData.service_charge_summary.per_staff_amount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payroll Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Regular Hrs</TableHead>
                <TableHead>OT</TableHead>
                <TableHead>Holiday</TableHead>
                <TableHead>Allowance</TableHead>
                <TableHead>Service Charge</TableHead>
                <TableHead>Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrollData.staff_payroll.map((staff) => (
                <TableRow key={staff.staff_id}>
                  <TableCell className="font-medium">
                    {staff.staff_name}
                  </TableCell>
                  <TableCell>
                    ฿{staff.base_salary.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{staff.regular_hours.toFixed(1)}h</div>
                      <div className="text-muted-foreground">
                        {staff.working_days} days
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {staff.ot_hours > 0 ? (
                      <div className="text-sm">
                        <div>{staff.ot_hours.toFixed(1)}h</div>
                        <div className="text-muted-foreground">
                          ฿{staff.ot_pay.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {staff.holiday_hours > 0 ? (
                      <div className="text-sm">
                        <div>{staff.holiday_hours.toFixed(1)}h</div>
                        <div className="text-muted-foreground">
                          ฿{staff.holiday_pay.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {staff.total_allowance > 0 ? (
                      <span>฿{staff.total_allowance.toLocaleString()}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {staff.service_charge > 0 ? (
                      <Badge variant="secondary">
                        ฿{staff.service_charge.toLocaleString()}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold">
                      ฿{staff.total_payout.toLocaleString()}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
} 