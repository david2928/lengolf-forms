'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Calendar, Settings, Plus, Edit, Trash2, Upload, Calculator } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

interface PublicHoliday {
  holiday_date: string
  holiday_name: string
  created_at?: string
  updated_at?: string
}

interface HolidayHours {
  staff_id: number
  staff_name: string
  holiday_date: string
  hours_worked: number
}

interface HolidayHoursTableProps {
  selectedMonth: string
}

export function HolidayHoursTable({ selectedMonth }: HolidayHoursTableProps) {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [monthHolidays, setMonthHolidays] = useState<PublicHoliday[]>([])
  const [holidayHours, setHolidayHours] = useState<HolidayHours[]>([])
  const [staffMembers, setStaffMembers] = useState<{id: number, staff_name: string}[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Holiday management modal state
  const [showManageModal, setShowManageModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(null)
  const [formData, setFormData] = useState({
    holiday_date: '',
    holiday_name: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const { toast } = useToast()

  // Pre-defined holidays for 2025 and 2026
  const predefinedHolidays: PublicHoliday[] = [
    // 2025 holidays
    { holiday_date: '2025-01-01', holiday_name: "New Year's Day" },
    { holiday_date: '2025-02-12', holiday_name: 'Makha Bucha Day' },
    { holiday_date: '2025-04-06', holiday_name: 'Chakri Day' },
    { holiday_date: '2025-04-13', holiday_name: 'Songkran Festival' },
    { holiday_date: '2025-04-14', holiday_name: 'Songkran Festival' },
    { holiday_date: '2025-04-15', holiday_name: 'Songkran Festival' },
    { holiday_date: '2025-05-01', holiday_name: 'Labour Day' },
    { holiday_date: '2025-05-04', holiday_name: 'Coronation Day' },
    { holiday_date: '2025-05-12', holiday_name: 'Visakha Bucha Day' },
    { holiday_date: '2025-07-10', holiday_name: 'Asanha Bucha Day' },
    { holiday_date: '2025-07-11', holiday_name: 'Buddhist Lent Day' },
    { holiday_date: '2025-07-28', holiday_name: 'King Vajiralongkorn\'s Birthday' },
    { holiday_date: '2025-08-12', holiday_name: 'Queen Sirikit\'s Birthday (Mother\'s Day)' },
    { holiday_date: '2025-10-13', holiday_name: 'King Bhumibol Memorial Day' },
    { holiday_date: '2025-10-23', holiday_name: 'Chulalongkorn Day' },
    { holiday_date: '2025-12-05', holiday_name: 'King Bhumibol\'s Birthday (Father\'s Day)' },
    { holiday_date: '2025-12-10', holiday_name: 'Constitution Day' },
    { holiday_date: '2025-12-31', holiday_name: 'New Year\'s Eve' },
    { holiday_date: '2026-01-01', holiday_name: 'New Year\'s Day' },
    { holiday_date: '2026-03-01', holiday_name: 'Makha Bucha Day' },
    { holiday_date: '2026-04-06', holiday_name: 'Chakri Memorial Day' },
    { holiday_date: '2026-05-01', holiday_name: 'Labour Day' },
    { holiday_date: '2026-05-04', holiday_name: 'Coronation Day' },
    { holiday_date: '2026-06-01', holiday_name: 'Visakha Bucha Day' },
    { holiday_date: '2026-06-03', holiday_name: 'Queen Suthida\'s Birthday' },
    { holiday_date: '2026-07-29', holiday_name: 'Asanha Bucha Day' },
    { holiday_date: '2026-07-30', holiday_name: 'Buddhist Lent Day' },
    { holiday_date: '2026-08-12', holiday_name: 'Queen Sirikit\'s Birthday (Mother\'s Day)' },
    { holiday_date: '2026-10-13', holiday_name: 'King Bhumibol Memorial Day' },
    { holiday_date: '2026-10-23', holiday_name: 'Chulalongkorn Day' },
    { holiday_date: '2026-12-07', holiday_name: 'King Bhumibol\'s Birthday (Father\'s Day)' },
    { holiday_date: '2026-12-10', holiday_name: 'Constitution Day' },
    { holiday_date: '2026-12-31', holiday_name: 'New Year\'s Eve' }
  ]

  const fetchData = useCallback(async () => {
    if (!selectedMonth) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Fetch holidays and staff members in parallel
      const [holidaysResponse, staffResponse] = await Promise.all([
        fetch('/api/admin/payroll/public-holidays'),
        fetch('/api/staff')
      ])

      console.log('API responses:', {
        holidaysOk: holidaysResponse.ok,
        staffOk: staffResponse.ok,
        holidaysStatus: holidaysResponse.status,
        staffStatus: staffResponse.status
      })

      if (!holidaysResponse.ok || !staffResponse.ok) {
        console.error('API responses failed:', {
          holidays: holidaysResponse.status,
          staff: staffResponse.status
        })
        throw new Error('Failed to fetch data')
      }

      const holidaysData = await holidaysResponse.json()
      const staffData = await staffResponse.json()
      
      console.log('Raw API data:', { holidaysData, staffData })
      
      setHolidays(holidaysData.holidays || [])
      
      // Process staff data - handle the actual API response structure
      let processedStaff: any[] = []
      
      if (staffData.data && Array.isArray(staffData.data)) {
        // Actual API response: { success: true, data: [...], count: number }
        processedStaff = staffData.data.map((staff: any) => ({
          id: staff.id,
          staff_name: staff.staff_name
        }))
      } else if (staffData.staff && Array.isArray(staffData.staff)) {
        // Fallback: { staff: [...] }
        processedStaff = staffData.staff.map((staff: any) => ({
          id: staff.id,
          staff_name: staff.staff_name || staff.name
        }))
      } else if (Array.isArray(staffData)) {
        // Direct array response: [...]
        processedStaff = staffData.map((staff: any) => ({
          id: staff.id,
          staff_name: staff.staff_name || staff.name
        }))
      } else {
        console.error('Unexpected staff data structure:', staffData)
      }
      
      setStaffMembers(processedStaff)
      console.log('Processed staff members:', processedStaff)

      if (processedStaff.length === 0) {
        console.warn('No staff members loaded! Check API response structure.')
      }

      // Filter holidays for the selected month
      const monthStart = `${selectedMonth}-01`
      const monthEnd = `${selectedMonth}-31`
      const currentMonthHolidays = (holidaysData.holidays || []).filter((holiday: PublicHoliday) => 
        holiday.holiday_date >= monthStart && holiday.holiday_date <= monthEnd
      )
      setMonthHolidays(currentMonthHolidays)

      console.log('Month holidays:', currentMonthHolidays)
      console.log('Final state:', { 
        staffCount: processedStaff.length, 
        holidayCount: currentMonthHolidays.length 
      })

      // Always use our API endpoint to get holiday hours
      if (currentMonthHolidays.length > 0) {
        console.log(`Fetching holiday hours for month: ${selectedMonth}`)
        const response = await fetch(`/api/admin/payroll/${selectedMonth}/holiday-hours`)
        if (response.ok) {
          const data = await response.json()
          console.log('Holiday hours API response:', data)
          setHolidayHours(data.holiday_hours || [])
        } else {
          console.error('Failed to fetch holiday hours from API:', response.status, response.statusText)
          setHolidayHours([])
        }
      } else {
        setHolidayHours([])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load holiday data')
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])


  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Holiday management functions
  const fetchHolidays = async () => {
    try {
      const response = await fetch('/api/admin/payroll/public-holidays')
      if (!response.ok) {
        throw new Error('Failed to fetch holidays')
      }
      const data = await response.json()
      setHolidays(data.holidays)
      setError(null)
    } catch (err) {
      console.error('Error fetching holidays:', err)
      setError('Failed to load holidays')
    }
  }

  const handleInitializeHolidays = async () => {
    try {
      setInitializing(true)
      const response = await fetch('/api/admin/payroll/public-holidays', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holidays: predefinedHolidays
        })
      })

      if (!response.ok) {
        throw new Error('Failed to initialize holidays')
      }

      const data = await response.json()
      toast({
        title: 'Success',
        description: data.message,
      })
      
      await fetchData()
    } catch (err) {
      console.error('Error initializing holidays:', err)
      toast({
        title: 'Error',
        description: 'Failed to initialize holidays',
        variant: 'destructive',
      })
    } finally {
      setInitializing(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.holiday_date || !formData.holiday_name) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch('/api/admin/payroll/public-holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holiday_date: formData.holiday_date,
          holiday_name: formData.holiday_name,
          action: 'upsert'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save holiday')
      }

      const data = await response.json()
      toast({
        title: 'Success',
        description: data.message,
      })
      
      setFormData({ holiday_date: '', holiday_name: '' })
      setShowAddModal(false)
      setEditingHoliday(null)
      await fetchData()
    } catch (err) {
      console.error('Error saving holiday:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save holiday',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (holidayDate: string) => {
    try {
      const response = await fetch('/api/admin/payroll/public-holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          holiday_date: holidayDate,
          holiday_name: 'deleted',
          action: 'delete'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to delete holiday')
      }

      const data = await response.json()
      toast({
        title: 'Success',
        description: data.message,
      })
      
      await fetchData()
    } catch (err) {
      console.error('Error deleting holiday:', err)
      toast({
        title: 'Error',
        description: 'Failed to delete holiday',
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (holiday: PublicHoliday) => {
    setEditingHoliday(holiday)
    setFormData({
      holiday_date: holiday.holiday_date,
      holiday_name: holiday.holiday_name
    })
    setShowAddModal(true)
  }

  const handleModalClose = () => {
    setShowAddModal(false)
    setEditingHoliday(null)
    setFormData({ holiday_date: '', holiday_name: '' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getHoursForStaffAndDate = (staffId: number, holidayDate: string) => {
    const hours = holidayHours.find(h => h.staff_id === staffId && h.holiday_date === holidayDate)
    return hours?.hours_worked || 0
  }

  const getTotalHoursForStaff = (staffId: number) => {
    return holidayHours
      .filter(h => h.staff_id === staffId)
      .reduce((total, h) => total + h.hours_worked, 0)
  }

  const getTotalHoursForHoliday = (holidayDate: string) => {
    return holidayHours
      .filter(h => h.holiday_date === holidayDate)
      .reduce((total, h) => total + h.hours_worked, 0)
  }

  const getSelectedMonthName = () => {
    const [year, month] = selectedMonth.split('-')
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading holiday data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Holiday Hours Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Holiday Hours - {getSelectedMonthName()}
              </CardTitle>
              <CardDescription>
                Hours worked by each staff member on public holidays ({monthHolidays.length} holiday{monthHolidays.length !== 1 ? 's' : ''} in {getSelectedMonthName()})
              </CardDescription>
            </div>
            <Dialog open={showManageModal} onOpenChange={setShowManageModal}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Manage Holidays
                </Button>
              </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Public Holidays</DialogTitle>
              <DialogDescription>
                Configure public holidays for accurate payroll calculations
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Management Header */}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleInitializeHolidays}
                    disabled={initializing}
                  >
                    {initializing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    Load Default Holidays
                  </Button>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Holiday
                  </Button>
                </div>
              </div>

              {/* Holidays Table - Mobile & Desktop Responsive */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[40%]">Holiday Details</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%] text-center hidden md:table-cell">Status</TableHead>
                      <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[40%] text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Calendar className="h-8 w-8 text-gray-300" />
                            <p className="text-gray-500">No holidays configured</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      holidays.slice(0, 50).map((holiday) => (
                        <TableRow key={holiday.holiday_date} className="hover:bg-gray-50/50 transition-colors">
                          <TableCell className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                  <Calendar className="h-5 w-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold text-gray-900 text-base">{holiday.holiday_name}</p>
                                <p className="text-sm text-gray-500">{formatDate(holiday.holiday_date)}</p>
                                {/* Mobile status */}
                                <div className="md:hidden mt-1">
                                  <Badge variant="default" className="text-xs">Active</Badge>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center hidden md:table-cell">
                            <Badge variant="default">Active</Badge>
                          </TableCell>
                          <TableCell className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(holiday)}
                                className="h-8 px-3 hover:bg-blue-50 text-blue-600 border-blue-200"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(holiday.holiday_date)}
                                className="h-8 px-3 hover:bg-red-50 text-red-600 border-red-200"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

        </CardHeader>
        <CardContent>
          {monthHolidays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No holidays in {getSelectedMonthName()}</h3>
              <p className="text-muted-foreground">
                There are no public holidays configured for this month.
              </p>
            </div>
          ) : staffMembers.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No staff members found</h3>
              <p className="text-muted-foreground">
                Unable to load staff members. Please check your permissions.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mobile Card View */}
              <div className="block lg:hidden space-y-4">
                {monthHolidays.map((holiday) => (
                  <Card key={holiday.holiday_date} className="border-l-4 border-l-orange-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-orange-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{holiday.holiday_name}</CardTitle>
                          <CardDescription className="text-sm">
                            {formatDate(holiday.holiday_date)}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Total:</div>
                          <Badge variant="outline" className="font-mono font-bold">
                            {getTotalHoursForHoliday(holiday.holiday_date).toFixed(1)}h
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {staffMembers.map((staff) => {
                          const hours = getHoursForStaffAndDate(staff.id, holiday.holiday_date)
                          return (
                            <div key={staff.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    hours > 0 ? 'bg-green-100' : 'bg-gray-100'
                                  }`}>
                                    <span className={`text-sm font-semibold ${
                                      hours > 0 ? 'text-green-700' : 'text-gray-600'
                                    }`}>
                                      {staff.staff_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">{staff.staff_name}</p>
                                </div>
                              </div>
                              <div>
                                {hours > 0 ? (
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {hours.toFixed(1)}h
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Mobile Monthly Summary */}
                {monthHolidays.length > 0 && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-blue-600" />
                        Monthly Holiday Hours Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {staffMembers.map((staff) => {
                          const totalHours = getTotalHoursForStaff(staff.id)
                          return (
                            <div key={staff.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="flex-shrink-0">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    totalHours > 0 ? 'bg-blue-100' : 'bg-gray-100'
                                  }`}>
                                    <span className={`text-sm font-semibold ${
                                      totalHours > 0 ? 'text-blue-700' : 'text-gray-600'
                                    }`}>
                                      {staff.staff_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">{staff.staff_name}</p>
                                  <p className="text-xs text-gray-500">Total this month</p>
                                </div>
                              </div>
                              <div>
                                {totalHours > 0 ? (
                                  <Badge variant="default" className="font-mono font-bold text-xs">
                                    {totalHours.toFixed(1)}h
                                  </Badge>
                                ) : (
                                  <span className="text-gray-400 font-mono text-sm">0.0h</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b bg-gray-50/50">
                      <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[200px]">Holiday Details</TableHead>
                      {staffMembers.map((staff) => (
                        <TableHead key={staff.id} className="font-semibold text-gray-900 px-4 py-4 text-center min-w-[120px]">
                          <div className="flex flex-col items-center gap-1">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mb-1">
                              <span className="text-xs font-semibold text-blue-700">
                                {staff.staff_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="font-medium text-sm">{staff.staff_name}</div>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthHolidays.map((holiday) => (
                      <TableRow key={holiday.holiday_date} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-orange-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-gray-900 text-base">{holiday.holiday_name}</p>
                              <p className="text-sm text-gray-500">{formatDate(holiday.holiday_date)}</p>
                              <div className="mt-1">
                                <span className="text-xs text-gray-500">Total: </span>
                                <Badge variant="outline" className="text-xs font-mono">
                                  {getTotalHoursForHoliday(holiday.holiday_date).toFixed(1)}h
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {staffMembers.map((staff) => {
                          const hours = getHoursForStaffAndDate(staff.id, holiday.holiday_date)
                          return (
                            <TableCell key={staff.id} className="px-4 py-4 text-center">
                              {hours > 0 ? (
                                <div className="flex flex-col items-center">
                                  <Badge variant="secondary" className="font-mono text-sm">
                                    {hours.toFixed(1)}h
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-sm">-</span>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    ))}
                    {/* Desktop Totals Row */}
                    {monthHolidays.length > 0 && (
                      <TableRow className="border-t-2 bg-blue-50/50">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <Calculator className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-gray-900 text-base">Monthly Total</p>
                              <p className="text-sm text-gray-600">Holiday hours for {getSelectedMonthName()}</p>
                            </div>
                          </div>
                        </TableCell>
                        {staffMembers.map((staff) => {
                          const totalHours = getTotalHoursForStaff(staff.id)
                          return (
                            <TableCell key={staff.id} className="px-4 py-4 text-center">
                              {totalHours > 0 ? (
                                <div className="flex flex-col items-center">
                                  <Badge variant="default" className="font-mono font-bold">
                                    {totalHours.toFixed(1)}h
                                  </Badge>
                                </div>
                              ) : (
                                <span className="text-gray-400 font-mono">0.0h</span>
                              )}
                            </TableCell>
                          )
                        })}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Holiday Modal */}
      <Dialog open={showAddModal} onOpenChange={handleModalClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingHoliday ? 'Edit Holiday' : 'Add Holiday'}
            </DialogTitle>
            <DialogDescription>
              {editingHoliday ? 'Update the holiday details' : 'Add a new public holiday'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="holiday_date">Date *</Label>
              <Input
                id="holiday_date"
                type="date"
                value={formData.holiday_date}
                onChange={(e) => setFormData(prev => ({ ...prev, holiday_date: e.target.value }))}
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="holiday_name">Holiday Name *</Label>
              <Input
                id="holiday_name"
                value={formData.holiday_name}
                onChange={(e) => setFormData(prev => ({ ...prev, holiday_name: e.target.value }))}
                placeholder="Enter holiday name"
                disabled={submitting}
                required
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleModalClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingHoliday ? 'Update' : 'Add'} Holiday
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
} 