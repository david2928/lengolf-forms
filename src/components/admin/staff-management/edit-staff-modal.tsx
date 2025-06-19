'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { StaffMember } from '@/types/staff'

interface EditStaffModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  staff: StaffMember | null
  onSuccess: () => void
}

export function EditStaffModal({ open, onOpenChange, staff, onSuccess }: EditStaffModalProps) {
  const [formData, setFormData] = useState({
    staff_name: '',
    staff_id: '',
    is_active: true,
    reset_pin: false,
    new_pin: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Update form data when staff changes
  useEffect(() => {
    if (staff) {
      setFormData({
        staff_name: staff.name,
        staff_id: '',
        is_active: staff.is_active,
        reset_pin: false,
        new_pin: ''
      })
    }
  }, [staff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!staff || !formData.staff_name.trim()) {
      setError('Staff name is required')
      return
    }

    // Validate PIN if resetting
    if (formData.reset_pin) {
      if (!formData.new_pin.trim()) {
        setError('New PIN is required when resetting PIN')
        return
      }
      if (formData.new_pin.length !== 6 || !/^\d{6}$/.test(formData.new_pin)) {
        setError('PIN must be exactly 6 digits')
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      const updateData: any = {
        staff_name: formData.staff_name.trim(),
        staff_id: formData.staff_id.trim() || undefined,
        is_active: formData.is_active
      }

      // Add PIN reset if requested
      if (formData.reset_pin) {
        updateData.new_pin = formData.new_pin
      }

      const response = await fetch(`/api/staff/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update staff member')
      }

      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error('Error updating staff:', err)
      setError(err instanceof Error ? err.message : 'Failed to update staff member')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setError(null)
      setFormData(prev => ({ ...prev, reset_pin: false, new_pin: '' }))
      onOpenChange(false)
    }
  }

  if (!staff) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Staff Member</DialogTitle>
          <DialogDescription>
            Update staff member information and settings.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff_name">Staff Name *</Label>
            <Input
              id="staff_name"
              value={formData.staff_name}
              onChange={(e) => setFormData(prev => ({ ...prev, staff_name: e.target.value }))}
              placeholder="Enter staff member's name"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff_id">Staff ID (Optional)</Label>
            <Input
              id="staff_id"
              value={formData.staff_id}
              onChange={(e) => setFormData(prev => ({ ...prev, staff_id: e.target.value }))}
              placeholder="Enter employee ID or badge number"
              disabled={loading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              disabled={loading}
            />
            <Label htmlFor="is_active">Active (can use time clock)</Label>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="reset_pin"
                checked={formData.reset_pin}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  reset_pin: checked,
                  new_pin: checked ? prev.new_pin : '' 
                }))}
                disabled={loading}
              />
              <Label htmlFor="reset_pin">Reset PIN</Label>
            </div>

            {formData.reset_pin && (
              <div className="space-y-2">
                <Label htmlFor="new_pin">New PIN *</Label>
                <Input
                  id="new_pin"
                  type="password"
                  value={formData.new_pin}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    new_pin: e.target.value.replace(/\D/g, '').slice(0, 6) 
                  }))}
                  placeholder="Enter new PIN"
                  disabled={loading}
                  maxLength={6}
                  required={formData.reset_pin}
                />
                <p className="text-sm text-muted-foreground">
                  Must be exactly 6 digits. Staff member will use this PIN for time clock access.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Staff Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 