'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Users, Calculator, Download } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface StaffPayrollData {
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

interface PayrollData {
  month: string
  summary: {
    total_staff: number
    total_regular_hours: number
    total_ot_hours: number
    total_payroll: number
  }
  staff_payroll: StaffPayrollData[]
  service_charge_summary: {
    total_amount: number
    eligible_staff_count: number
    per_staff_amount: number
    total_distributed: number
  }
}

interface PayrollOverviewTableProps {
  selectedMonth: string
  refreshTrigger: number
}

export function PayrollOverviewTable({ selectedMonth, refreshTrigger }: PayrollOverviewTableProps) {
  const [payrollData, setPayrollData] = useState<PayrollData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (selectedMonth) {
      fetchPayrollData()
    }
  }, [selectedMonth, refreshTrigger])

  const fetchPayrollData = async () => {
    if (!selectedMonth) return
    
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/admin/payroll/${selectedMonth}/calculations`)
      const data = await response.json()
      
      if (response.ok) {
        setPayrollData(data)
      } else {
        const errorMessage = data.userMessage || data.error || 'Failed to fetch payroll data'
        const isCompensationError = data.code === 'MISSING_COMPENSATION_SETTINGS'
        
        setError(errorMessage)
        toast({
          title: isCompensationError ? 'Configuration Required' : 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching payroll data:', error)
      setError('Failed to connect to payroll service')
      toast({
        title: 'Error',
        description: 'Failed to connect to payroll service',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    if (!payrollData || !payrollData.staff_payroll) return
    
    const headers = ['Staff Name', 'Base Salary', 'Allowance', 'OT Pay', 'Holiday Pay', 'Service Charge', 'Total Payout']
    const rows = payrollData.staff_payroll.map(staff => [
      staff.staff_name,
      staff.base_salary.toFixed(2),
      staff.total_allowance.toFixed(2),
      staff.ot_pay.toFixed(2),
      staff.holiday_pay.toFixed(2),
      staff.service_charge.toFixed(2),
      staff.total_payout.toFixed(2)
    ])
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payroll-overview-${selectedMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Payroll Overview
          </CardTitle>
          <CardDescription>Loading payroll data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !payrollData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Payroll Overview
          </CardTitle>
          <CardDescription>Error loading payroll data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">{error || 'No payroll data available'}</p>
            <Button 
              variant="outline" 
              onClick={fetchPayrollData}
              className="mt-4"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!payrollData.staff_payroll || payrollData.staff_payroll.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Payroll Overview
          </CardTitle>
          <CardDescription>
            No payroll data available for {selectedMonth}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Staff Payroll Data</h3>
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
          <Users className="h-5 w-5" />
          Payroll Overview
        </CardTitle>
        <CardDescription>
          Payroll calculations for {selectedMonth}
        </CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="text-2xl font-bold">{payrollData.summary.total_staff}</div>
              <div className="text-sm text-muted-foreground">Total Staff</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">{payrollData.summary.total_regular_hours.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">Regular Hours</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">{payrollData.summary.total_ot_hours.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">OT Hours</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold">฿{payrollData.summary.total_payroll.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Payroll</div>
            </Card>
          </div>

          {/* Staff Payroll Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead className="text-right">Base Salary</TableHead>
                  <TableHead className="text-right">Allowance</TableHead>
                  <TableHead className="text-right">OT Pay</TableHead>
                  <TableHead className="text-right">Holiday Pay</TableHead>
                  <TableHead className="text-right">Service Charge</TableHead>
                  <TableHead className="text-right">Total Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.staff_payroll.map((staff) => (
                  <TableRow key={staff.staff_id}>
                    <TableCell className="font-medium">{staff.staff_name}</TableCell>
                    <TableCell className="text-right">฿{staff.base_salary.toLocaleString()}</TableCell>
                    <TableCell className="text-right">฿{staff.total_allowance.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="text-right">
                        <div>฿{staff.ot_pay.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {staff.ot_hours.toFixed(1)}h
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-right">
                        <div>฿{staff.holiday_pay.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {staff.holiday_hours.toFixed(1)}h
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-right">
                        <div>฿{staff.service_charge.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">
                          {staff.service_charge > 0 ? (
                            <Badge variant="secondary" className="text-xs">Eligible</Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">Not Eligible</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ฿{staff.total_payout.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Service Charge Summary */}
          {payrollData.service_charge_summary && payrollData.service_charge_summary.total_amount > 0 && (
            <Card className="p-4">
              <h3 className="font-medium mb-2">Service Charge Distribution</h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Total Amount</div>
                  <div className="font-medium">฿{payrollData.service_charge_summary.total_amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Eligible Staff</div>
                  <div className="font-medium">{payrollData.service_charge_summary.eligible_staff_count}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Per Staff</div>
                  <div className="font-medium">฿{payrollData.service_charge_summary.per_staff_amount.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Distributed</div>
                  <div className="font-medium">฿{payrollData.service_charge_summary.total_distributed.toLocaleString()}</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 