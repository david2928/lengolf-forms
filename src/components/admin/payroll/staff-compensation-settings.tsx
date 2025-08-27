'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Edit, Save, X, Plus, DollarSign, Clock, AlertCircle, MoreVertical, TrendingUp } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
// Remove the formatCurrency import since it doesn't exist

interface StaffCompensation {
  id?: number
  staff_id: number
  compensation_type: 'salary' | 'hourly'
  base_salary: number
  hourly_rate: number
  ot_rate_per_hour: number
  holiday_rate_per_hour: number
  is_service_charge_eligible: boolean
  effective_from: string
  effective_to?: string
  created_at?: string
  updated_at?: string
}

interface StaffCompensationData {
  staff_id: number
  staff_name: string
  current_compensation: StaffCompensation | null
  compensation_history: StaffCompensation[]
}

interface CompensationForm {
  staff_id: number
  compensation_type: 'salary' | 'hourly'
  base_salary: string
  hourly_rate: string
  ot_rate_per_hour: string
  holiday_rate_per_hour: string
  is_service_charge_eligible: boolean
  effective_from: string
}

export function StaffCompensationSettings() {
  const [compensationData, setCompensationData] = useState<StaffCompensationData[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStaff, setEditingStaff] = useState<StaffCompensationData | null>(null)
  const [formData, setFormData] = useState<CompensationForm>({
    staff_id: 0,
    compensation_type: 'salary',
    base_salary: '',
    hourly_rate: '',
    ot_rate_per_hour: '',
    holiday_rate_per_hour: '',
    is_service_charge_eligible: true,
    effective_from: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchCompensationData = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/payroll/staff-compensation')
      const data = await response.json()
      
      if (response.ok) {
        setCompensationData(data.staff_compensation || [])
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch compensation data',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching compensation data:', error)
      toast({
        title: 'Error',
        description: 'Failed to connect to server',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    fetchCompensationData()
  }, [fetchCompensationData])

  const handleEditClick = (staff: StaffCompensationData) => {
    setEditingStaff(staff)
    const current = staff.current_compensation
    setFormData({
      staff_id: staff.staff_id,
      compensation_type: (current?.compensation_type as 'salary' | 'hourly') || 'salary',
      base_salary: current?.base_salary?.toString() || '',
      hourly_rate: current?.hourly_rate?.toString() || '',
      ot_rate_per_hour: current?.ot_rate_per_hour?.toString() || '',
      holiday_rate_per_hour: current?.holiday_rate_per_hour?.toString() || '',
      is_service_charge_eligible: current?.is_service_charge_eligible ?? true,
      effective_from: new Date().toISOString().split('T')[0]
    })
    setIsDialogOpen(true)
  }

  const handleSaveCompensation = async () => {
    try {
      setSaving(true)
      
      // Validate form data based on compensation type
      if (!formData.ot_rate_per_hour || !formData.holiday_rate_per_hour) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in overtime and holiday rates',
          variant: 'destructive'
        })
        return
      }

      if (formData.compensation_type === 'salary' && !formData.base_salary) {
        toast({
          title: 'Validation Error',
          description: 'Base salary is required for salary-based staff',
          variant: 'destructive'
        })
        return
      }

      if (formData.compensation_type === 'hourly' && !formData.hourly_rate) {
        toast({
          title: 'Validation Error',
          description: 'Hourly rate is required for hourly-based staff',
          variant: 'destructive'
        })
        return
      }

      const baseSalary = formData.compensation_type === 'salary' ? parseFloat(formData.base_salary) : 0
      const hourlyRate = formData.compensation_type === 'hourly' ? parseFloat(formData.hourly_rate) : 0
      const otRate = parseFloat(formData.ot_rate_per_hour)
      const holidayRate = parseFloat(formData.holiday_rate_per_hour)

      if (formData.compensation_type === 'salary' && baseSalary <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Base salary must be a positive number',
          variant: 'destructive'
        })
        return
      }

      if (formData.compensation_type === 'hourly' && hourlyRate <= 0) {
        toast({
          title: 'Validation Error',
          description: 'Hourly rate must be a positive number',
          variant: 'destructive'
        })
        return
      }

      if (otRate < 0 || holidayRate < 0) {
        toast({
          title: 'Validation Error',
          description: 'Overtime and holiday rates must be positive numbers',
          variant: 'destructive'
        })
        return
      }

      const payload = {
        staff_id: formData.staff_id,
        compensation_type: formData.compensation_type,
        base_salary: baseSalary,
        hourly_rate: hourlyRate,
        ot_rate_per_hour: otRate,
        holiday_rate_per_hour: holidayRate,
        is_service_charge_eligible: formData.is_service_charge_eligible,
        effective_from: formData.effective_from
      }

      const response = await fetch('/api/admin/payroll/staff-compensation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message || 'Compensation settings updated successfully'
        })
        setIsDialogOpen(false)
        setEditingStaff(null)
        await fetchCompensationData()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to update compensation settings',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error saving compensation:', error)
      toast({
        title: 'Error',
        description: 'Failed to save compensation settings',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleFormChange = (field: keyof CompensationForm, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('THB', '₿')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading compensation settings...</p>
        </div>
      </div>
    )
  }

  const staffWithCompensation = compensationData.filter(s => s.current_compensation)
  const staffWithoutCompensation = compensationData.filter(s => !s.current_compensation)

  // Mobile Card Component
  const CompensationCard = ({ staff }: { staff: StaffCompensationData }) => (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-sm font-semibold text-green-700">
                  {staff.staff_name.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-gray-900 text-base">{staff.staff_name}</h3>
              <p className="text-sm text-gray-500">ID: {staff.staff_id}</p>
              
              {staff.current_compensation ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={staff.current_compensation.compensation_type === 'salary' ? 'default' : 'outline'}>
                      {staff.current_compensation.compensation_type === 'salary' ? 'Salary' : 'Hourly'}
                    </Badge>
                    <Badge variant={staff.current_compensation.is_service_charge_eligible ? 'default' : 'secondary'}>
                      {staff.current_compensation.is_service_charge_eligible ? 'SC Eligible' : 'No SC'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Base Pay:</span>
                      <span className="text-sm font-medium">
                        {staff.current_compensation.compensation_type === 'salary' 
                          ? formatCurrency(staff.current_compensation.base_salary)
                          : `₿${staff.current_compensation.hourly_rate}/hr`
                        }
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">OT Rate:</span>
                      <span className="text-sm font-medium">₿{staff.current_compensation.ot_rate_per_hour}/hr</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Holiday Rate:</span>
                      <span className="text-sm font-medium">₿{staff.current_compensation.holiday_rate_per_hour}/hr</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-600">Effective:</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(staff.current_compensation.effective_from)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <Badge variant="outline">Not Set Up</Badge>
                  <p className="text-xs text-gray-500 mt-1">No compensation configured</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex-shrink-0 ml-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEditClick(staff)}
              className="h-8 px-3"
            >
              <Edit className="h-3 w-3 mr-1" />
              {staff.current_compensation ? 'Edit' : 'Set Up'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">

      {/* Staff Compensation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Compensation Settings</CardTitle>
          <CardDescription>
            Manage salary, overtime rates, and service charge eligibility for all staff members
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Card View (md and below) */}
          <div className="block md:hidden">
            {compensationData.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <div className="flex flex-col items-center gap-3">
                  <DollarSign className="h-12 w-12 text-gray-300" />
                  <div>
                    <p className="font-medium text-lg">No staff compensation data available</p>
                    <p className="text-sm text-gray-400 mt-1">Set up compensation for your staff members.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {compensationData.map((staff) => (
                  <CompensationCard key={staff.staff_id} staff={staff} />
                ))}
              </div>
            )}
          </div>
          
          {/* Desktop Table View (md and above) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b bg-gray-50/50">
                  <TableHead className="font-semibold text-gray-900 px-6 py-4 w-[25%]">Staff Member</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%]">Type</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[20%] hidden lg:table-cell">Base Pay</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] hidden xl:table-cell">Rates</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[10%] hidden lg:table-cell">Service Charge</TableHead>
                  <TableHead className="font-semibold text-gray-900 px-4 py-4 w-[15%] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {compensationData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-2">
                        <DollarSign className="h-8 w-8 text-gray-300" />
                        <p className="font-medium">No staff compensation data available</p>
                        <p className="text-sm text-gray-400">Set up compensation for your staff members.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  compensationData.map((staff) => (
                    <TableRow key={staff.staff_id} className="hover:bg-gray-50/50 transition-colors">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                              <span className="text-sm font-semibold text-green-700">
                                {staff.staff_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-gray-900 text-base">{staff.staff_name}</p>
                            <div className="mt-1">
                              <p className="text-sm text-gray-500">Staff ID: {staff.staff_id}</p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4">
                        <div className="flex items-center justify-center">
                          {staff.current_compensation ? (
                            <Badge variant={staff.current_compensation.compensation_type === 'salary' ? 'default' : 'outline'}>
                              {staff.current_compensation.compensation_type === 'salary' ? 'Salary' : 'Hourly'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Set</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 hidden lg:table-cell">
                        {staff.current_compensation ? (
                          <div>
                            {staff.current_compensation.compensation_type === 'salary' ? (
                              <div>
                                <div className="font-semibold text-gray-900">{formatCurrency(staff.current_compensation.base_salary)}</div>
                                <div className="text-xs text-gray-500">Monthly + allowance</div>
                              </div>
                            ) : (
                              <div>
                                <div className="font-semibold text-gray-900">₿{staff.current_compensation.hourly_rate}/hr</div>
                                <div className="text-xs text-gray-500">Hourly only</div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline">Not Set</Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4 hidden xl:table-cell">
                        {staff.current_compensation ? (
                          <div className="space-y-1">
                            <div className="text-sm">
                              <span className="text-gray-600">OT:</span> <span className="font-medium">₿{staff.current_compensation.ot_rate_per_hour}/hr</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Holiday:</span> <span className="font-medium">₿{staff.current_compensation.holiday_rate_per_hour}/hr</span>
                            </div>
                          </div>
                        ) : (
                          <Badge variant="outline">Not Set</Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-4 hidden lg:table-cell">
                        <div className="flex items-center justify-center">
                          {staff.current_compensation ? (
                            <Badge variant={staff.current_compensation.is_service_charge_eligible ? 'default' : 'secondary'}>
                              {staff.current_compensation.is_service_charge_eligible ? 'Eligible' : 'Not Eligible'}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not Set</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(staff)}
                            className="h-8 px-3 hover:bg-gray-100 border-gray-200"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            {staff.current_compensation ? 'Edit' : 'Set Up'}
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

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingStaff?.current_compensation ? 'Edit' : 'Set Up'} Compensation Settings
            </DialogTitle>
            <DialogDescription>
              Update compensation settings for {editingStaff?.staff_name}
            </DialogDescription>
          </DialogHeader>
          
                      <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Compensation Type</Label>
              <div className="flex gap-6 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="compensation_type"
                    value="salary"
                    checked={formData.compensation_type === 'salary'}
                    onChange={(e) => handleFormChange('compensation_type', e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Monthly Salary</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="compensation_type"
                    value="hourly"
                    checked={formData.compensation_type === 'hourly'}
                    onChange={(e) => handleFormChange('compensation_type', e.target.value)}
                    className="w-4 h-4 text-primary"
                  />
                  <span className="text-sm">Hourly Rate</span>
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {formData.compensation_type === 'salary' ? (
                <div>
                  <Label htmlFor="base_salary">Base Salary (THB)</Label>
                  <Input
                    id="base_salary"
                    type="number"
                    min="0"
                    step="1"
                    value={formData.base_salary}
                    onChange={(e) => handleFormChange('base_salary', e.target.value)}
                    placeholder="15000"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Fixed monthly salary + daily allowance
                  </p>
                </div>
              ) : (
                <div>
                  <Label htmlFor="hourly_rate">Hourly Rate (THB/hour)</Label>
                  <Input
                    id="hourly_rate"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.hourly_rate}
                    onChange={(e) => handleFormChange('hourly_rate', e.target.value)}
                    placeholder="150.00"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Paid per hour worked (no allowance)
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="ot_rate">OT Rate (THB/hour)</Label>
                <Input
                  id="ot_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.ot_rate_per_hour}
                  onChange={(e) => handleFormChange('ot_rate_per_hour', e.target.value)}
                  placeholder="108.00"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="holiday_rate">Holiday Rate (THB/hour)</Label>
                <Input
                  id="holiday_rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.holiday_rate_per_hour}
                  onChange={(e) => handleFormChange('holiday_rate_per_hour', e.target.value)}
                  placeholder="72.00"
                />
              </div>
              <div>
                <Label htmlFor="effective_from">Effective From</Label>
                <Input
                  id="effective_from"
                  type="date"
                  value={formData.effective_from}
                  onChange={(e) => handleFormChange('effective_from', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="service_charge"
                checked={formData.is_service_charge_eligible}
                onCheckedChange={(checked) => handleFormChange('is_service_charge_eligible', checked)}
              />
              <Label htmlFor="service_charge">Eligible for Service Charge</Label>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSaveCompensation}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
} 