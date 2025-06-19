'use client'

import { useState } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface AddStaffModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function AddStaffModal({ open, onOpenChange, onSuccess }: AddStaffModalProps) {
  const [formData, setFormData] = useState({
    staff_name: '',
    staff_id: '',
    pin: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.staff_name.trim() || !formData.pin.trim()) {
      setError('Staff name and PIN are required')
      return
    }

    if (formData.pin.length !== 6 || !/^\d{6}$/.test(formData.pin)) {
      setError('PIN must be exactly 6 digits')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_name: formData.staff_name.trim(),
          staff_id: formData.staff_id.trim() || undefined,
          pin: formData.pin
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create staff member')
      }

      // Reset form and close modal
      setFormData({ staff_name: '', staff_id: '', pin: '' })
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      console.error('Error creating staff:', err)
      setError(err instanceof Error ? err.message : 'Failed to create staff member')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({ staff_name: '', staff_id: '', pin: '' })
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Staff Member</DialogTitle>
          <DialogDescription>
            Create a new staff member with time clock access.
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

          <div className="space-y-2">
            <Label htmlFor="pin">6-Digit PIN *</Label>
            <Input
              id="pin"
              type="password"
              value={formData.pin}
              onChange={(e) => setFormData(prev => ({ ...prev, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))}
              placeholder="123456"
              disabled={loading}
              maxLength={6}
              required
            />
            <p className="text-sm text-muted-foreground">
              Must be exactly 6 digits. This will be used for time clock access.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Staff Member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 