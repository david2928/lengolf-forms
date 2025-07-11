'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Plus, Edit, Trash2, Calendar, AlertCircle, Upload, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface PublicHoliday {
  holiday_date: string
  holiday_name: string
  created_at?: string
  updated_at?: string
}

export function PublicHolidaysManagement() {
  const [holidays, setHolidays] = useState<PublicHoliday[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  const fetchHolidays = async () => {
    try {
      setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolidays()
  }, [])

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
      
      await fetchHolidays()
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
      await fetchHolidays()
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
          holiday_name: 'deleted', // Required but ignored for delete
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
      
      await fetchHolidays()
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

  const isUpcoming = (dateString: string) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const holidayDate = new Date(dateString)
    return holidayDate >= today
  }

  // Get next 12 months of holidays starting from previous month
  const getNext12MonthsHolidays = () => {
    const today = new Date()
    const currentYear = today.getFullYear()
    const currentMonth = today.getMonth() // 0-based
    
    // Start from the previous month to include the full previous calendar month
    const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
    
    const next12MonthsStart = new Date(previousYear, previousMonth, 1)
    const next12MonthsEnd = new Date(currentYear + 1, currentMonth, 0) // Last day of same month next year
    
    return holidays.filter(holiday => {
      const holidayDate = new Date(holiday.holiday_date)
      return holidayDate >= next12MonthsStart && holidayDate <= next12MonthsEnd
    }).sort((a, b) => a.holiday_date.localeCompare(b.holiday_date))
  }

  const next12MonthsHolidays = getNext12MonthsHolidays()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading holidays...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Public Holidays Management</h2>
          <p className="text-muted-foreground">
            Manage public holidays for accurate payroll calculations
          </p>
        </div>
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



      {/* Next 12 Months Holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next 12 Months ({next12MonthsHolidays.length} holidays)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing holidays from {new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} to {new Date(new Date().getFullYear() + 1, new Date().getMonth(), 0).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Holiday Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {next12MonthsHolidays.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No holidays in the next 12 months
                    </TableCell>
                  </TableRow>
                ) : (
                  next12MonthsHolidays.map((holiday) => (
                    <TableRow key={holiday.holiday_date}>
                      <TableCell className="font-medium">
                        {formatDate(holiday.holiday_date)}
                      </TableCell>
                      <TableCell>{holiday.holiday_name}</TableCell>
                      <TableCell>
                        {isUpcoming(holiday.holiday_date) ? (
                          <Badge variant="default">Upcoming</Badge>
                        ) : (
                          <Badge variant="secondary">Past</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(holiday)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(holiday.holiday_date)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {holidays.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No holidays configured</h3>
            <p className="text-muted-foreground mb-4">
              Add holidays to ensure accurate payroll calculations
            </p>
            <Button onClick={handleInitializeHolidays} disabled={initializing}>
              {initializing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Load Default Holidays
            </Button>
          </CardContent>
        </Card>
      )}

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