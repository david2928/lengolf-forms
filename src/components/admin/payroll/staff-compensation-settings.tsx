'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, Edit, Save, X, Plus, DollarSign, Clock, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
// Remove the formatCurrency import since it doesn't exist

interface StaffCompensation {
  id?: number
  staff_id: number
  base_salary: number
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
  base_salary: string
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
    base_salary: '',
    ot_rate_per_hour: '',
    holiday_rate_per_hour: '',
    is_service_charge_eligible: true,
    effective_from: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchCompensationData()
  }, [])

  const fetchCompensationData = async () => {
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
  }

  const handleEditClick = (staff: StaffCompensationData) => {
    setEditingStaff(staff)
    const current = staff.current_compensation
    setFormData({
      staff_id: staff.staff_id,
      base_salary: current?.base_salary?.toString() || '',
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
      
      // Validate form data
      if (!formData.base_salary || !formData.ot_rate_per_hour || !formData.holiday_rate_per_hour) {
        toast({
          title: 'Validation Error',
          description: 'Please fill in all required fields',
          variant: 'destructive'
        })
        return
      }

      const baseSalary = parseFloat(formData.base_salary)
      const otRate = parseFloat(formData.ot_rate_per_hour)
      const holidayRate = parseFloat(formData.holiday_rate_per_hour)

      if (baseSalary < 0 || otRate < 0 || holidayRate < 0) {
        toast({
          title: 'Validation Error',
          description: 'All values must be positive numbers',
          variant: 'destructive'
        })
        return
      }

      const payload = {
        staff_id: formData.staff_id,
        base_salary: baseSalary,
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
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-left">Staff Name</TableHead>
                <TableHead className="text-left">Base Salary</TableHead>
                <TableHead className="text-left">OT Rate</TableHead>
                <TableHead className="text-left">Holiday Rate</TableHead>
                <TableHead className="text-left">Service Charge</TableHead>
                <TableHead className="text-left">Effective From</TableHead>
                <TableHead className="text-left">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compensationData.map((staff) => (
                <TableRow key={staff.staff_id}>
                  <TableCell className="font-medium text-left">{staff.staff_name}</TableCell>
                  <TableCell className="text-left">
                    {staff.current_compensation 
                      ? formatCurrency(staff.current_compensation.base_salary)
                      : <Badge variant="outline">Not Set</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-left">
                    {staff.current_compensation 
                      ? `₿${staff.current_compensation.ot_rate_per_hour}/hr`
                      : <Badge variant="outline">Not Set</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-left">
                    {staff.current_compensation 
                      ? `₿${staff.current_compensation.holiday_rate_per_hour}/hr`
                      : <Badge variant="outline">Not Set</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-left">
                    {staff.current_compensation ? (
                      <Badge variant={staff.current_compensation.is_service_charge_eligible ? 'default' : 'secondary'}>
                        {staff.current_compensation.is_service_charge_eligible ? 'Eligible' : 'Not Eligible'}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not Set</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    {staff.current_compensation 
                      ? formatDate(staff.current_compensation.effective_from)
                      : '-'
                    }
                  </TableCell>
                  <TableCell className="text-left">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(staff)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      {staff.current_compensation ? 'Edit' : 'Set Up'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
            <div className="grid grid-cols-2 gap-4">
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
              </div>
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