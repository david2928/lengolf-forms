import React, { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'

interface Staff {
  id: number
  staff_name: string
  is_active: boolean
}

interface ManualEntryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Form state
  const [staffId, setStaffId] = useState<string>('')
  const [action, setAction] = useState<'clock_in' | 'clock_out'>('clock_in')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  const loadStaff = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/staff')
      if (!response.ok) {
        throw new Error('Failed to load staff')
      }
      const data = await response.json()
      setStaff(data.staff || [])
    } catch (error) {
      console.error('Error loading staff:', error)
      toast({
        title: 'Error',
        description: 'Failed to load staff list',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  // Initialize form with current date/time
  useEffect(() => {
    if (isOpen) {
      const now = new Date()
      setDate(format(now, 'yyyy-MM-dd'))
      setTime(format(now, 'HH:mm'))
      setStaffId('')
      setAction('clock_in')
      setNotes('')
      loadStaff()
    }
  }, [isOpen, loadStaff])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!staffId || !date || !time) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    
    try {
      // The user enters Bangkok local time, but we need to store as UTC
      // Create a proper Bangkok timezone timestamp
      const bangkokDateTime = `${date}T${time}:00+07:00`
      const timestamp = new Date(bangkokDateTime).toISOString()
      
      const response = await fetch('/api/admin/time-clock/entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: parseInt(staffId),
          action,
          timestamp,
          notes: notes.trim() || undefined,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to create time entry')
      }

      toast({
        title: 'Success',
        description: result.message,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating time entry:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create time entry',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const selectedStaff = staff.find(s => s.id === parseInt(staffId))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Manual Time Entry
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff">Staff Member *</Label>
            <Select value={staffId} onValueChange={setStaffId} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading staff..." : "Select staff member"} />
              </SelectTrigger>
              <SelectContent>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.staff_name}
                    {!member.is_active && ' (Inactive)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="action">Action *</Label>
            <Select value={action} onValueChange={(value) => setAction(value as 'clock_in' | 'clock_out')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clock_in">Clock In</SelectItem>
                <SelectItem value="clock_out">Clock Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes about this entry"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {selectedStaff && (
            <div className="rounded-md bg-blue-50 p-3">
              <p className="text-sm text-blue-800">
                <strong>Creating:</strong> {action === 'clock_in' ? 'Clock In' : 'Clock Out'} entry for{' '}
                <strong>{selectedStaff.staff_name}</strong> on{' '}
                <strong>{date && format(new Date(date), 'MMM dd, yyyy')}</strong> at{' '}
                <strong>{time}</strong>
              </p>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !staffId || !date || !time}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}