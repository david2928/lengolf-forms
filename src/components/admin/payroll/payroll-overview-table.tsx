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
  compensation_type: 'salary' | 'hourly'
  base_salary: number
  hourly_rate: number
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
    
    const headers = ['Staff Name', 'Base Salary', 'Hourly Rate', 'Hourly Hours', 'Allowance', 'OT Pay', 'Holiday Pay', 'Service Charge', 'Total Payout']
    const rows = payrollData.staff_payroll.map(staff => [
      staff.staff_name,
      staff.base_salary.toFixed(2),
      staff.compensation_type === 'hourly' ? staff.hourly_rate.toFixed(2) : '-',
      staff.compensation_type === 'hourly' ? staff.regular_hours.toFixed(1) : '-',
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
        </div>
      </CardContent>
      
      {/* Staff Payroll Table */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/50">
                  <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[30%]">Staff & Type</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center hidden md:table-cell">Base/Rate</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center hidden lg:table-cell">Overtime</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center hidden lg:table-cell">Allowance</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-center hidden xl:table-cell">Service</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] text-center">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.staff_payroll.map((staff) => (
                  <TableRow key={staff.staff_id} className="hover:bg-gray-50/50 transition-colors border-l-4 border-l-transparent hover:border-l-blue-300">
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            staff.staff_id % 5 === 0 ? 'bg-purple-100' :
                            staff.staff_id % 4 === 0 ? 'bg-green-100' :
                            staff.staff_id % 3 === 0 ? 'bg-orange-100' :
                            staff.staff_id % 2 === 0 ? 'bg-pink-100' : 'bg-blue-100'
                          }`}>
                            <span className={`text-sm font-semibold ${
                              staff.staff_id % 5 === 0 ? 'text-purple-700' :
                              staff.staff_id % 4 === 0 ? 'text-green-700' :
                              staff.staff_id % 3 === 0 ? 'text-orange-700' :
                              staff.staff_id % 2 === 0 ? 'text-pink-700' : 'text-blue-700'
                            }`}>
                              {staff.staff_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 text-base">{staff.staff_name}</p>
                          <div className="mt-1">
                            <Badge 
                              variant={staff.compensation_type === 'salary' ? 'default' : 'secondary'} 
                              className={`text-xs ${
                                staff.compensation_type === 'salary' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : 'bg-blue-100 text-blue-800 border-blue-200'
                              }`}
                            >
                              {staff.compensation_type === 'salary' ? 'Salary' : 'Hourly'}
                            </Badge>
                          </div>
                          {/* Mobile info */}
                          <div className="md:hidden mt-2 space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Base:</span>
                              <span className="font-medium">
                                {staff.base_salary > 0 ? `฿${staff.base_salary.toLocaleString()}` : 
                                 staff.compensation_type === 'hourly' ? `฿${staff.hourly_rate.toLocaleString()}/hr` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm lg:hidden">
                              <span className="text-gray-500">OT:</span>
                              <span className="font-medium">
                                {staff.ot_pay > 0 ? `฿${staff.ot_pay.toLocaleString()}` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm xl:hidden">
                              <span className="text-gray-500">Service:</span>
                              <span className="font-medium">
                                {staff.service_charge > 0 ? `฿${staff.service_charge.toLocaleString()}` : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm font-semibold">
                              <span className="text-gray-700">Total:</span>
                              <span className="text-green-600">฿{staff.total_payout.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center hidden md:table-cell">
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-base">
                          {staff.base_salary > 0 ? `฿${staff.base_salary.toLocaleString()}` : 
                           staff.compensation_type === 'hourly' ? `฿${staff.hourly_rate.toLocaleString()}/hr` : '-'}
                        </span>
                        {staff.compensation_type === 'hourly' && (
                          <span className="text-xs text-gray-500">{staff.regular_hours.toFixed(1)}h worked</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center hidden lg:table-cell">
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-base">
                          {staff.ot_pay > 0 ? `฿${staff.ot_pay.toLocaleString()}` : '-'}
                        </span>
                        {staff.ot_hours > 0 && (
                          <span className="text-xs text-gray-500">{staff.ot_hours.toFixed(1)}h OT</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center hidden lg:table-cell">
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-base">
                          {staff.total_allowance > 0 ? `฿${staff.total_allowance.toLocaleString()}` : '-'}
                        </span>
                        {staff.total_allowance > 0 && (
                          <span className="text-xs text-gray-500">Daily allowance</span>
                        )}
                        {staff.holiday_pay > 0 && (
                          <div className="mt-1">
                            <span className="text-xs text-orange-600">+฿{staff.holiday_pay.toLocaleString()} holiday</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center hidden xl:table-cell">
                      <div className="flex flex-col items-center">
                        <span className="font-medium text-base">
                          {staff.service_charge > 0 ? `฿${staff.service_charge.toLocaleString()}` : '-'}
                        </span>
                        <Badge variant={staff.service_charge > 0 ? 'secondary' : 'outline'} className="text-xs mt-1">
                          {staff.service_charge > 0 ? 'Eligible' : 'Not Eligible'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-lg text-green-600">
                          ฿{staff.total_payout.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-500">Total payout</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        
        {/* Service Charge Summary */}
        {payrollData.service_charge_summary && payrollData.service_charge_summary.total_amount > 0 && (
          <CardContent>
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
          </CardContent>
        )}
      </Card>
  )
} 