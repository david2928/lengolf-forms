import React, { useState, useEffect } from 'react'
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
import { Edit, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { format, parseISO } from 'date-fns'
import { TimeEntry } from '../../context/TimeClockProvider'

interface EditEntryModalProps {
  entry: TimeEntry | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({
  entry,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Form state
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  // Initialize form when entry changes
  useEffect(() => {
    if (entry && isOpen) {
      const entryDate = parseISO(entry.timestamp)
      setDate(format(entryDate, 'yyyy-MM-dd'))
      setTime(format(entryDate, 'HH:mm'))
      setNotes('')
    }
  }, [entry, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!entry || !date || !time) {
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
      
      const response = await fetch(`/api/admin/time-clock/entries/${entry.entry_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timestamp,
          notes: notes.trim() || `Updated ${entry.action} time`,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to update time entry')
      }

      toast({
        title: 'Success',
        description: result.message,
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error updating time entry:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update time entry',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!entry) return null

  const originalDate = parseISO(entry.timestamp)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Time Entry
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="rounded-md bg-gray-50 p-3">
            <p className="text-sm text-gray-700">
              <strong>Entry:</strong> {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'} for{' '}
              <strong>{entry.staff_name}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Original time: {format(originalDate, 'MMM dd, yyyy h:mm a')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Time *</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Update Notes</Label>
              <Textarea
                id="edit-notes"
                placeholder="Reason for this change"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            {date && time && (
              <div className="rounded-md bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>New time:</strong> {format(new Date(`${date}T${time}`), 'MMM dd, yyyy h:mm a')}
                </p>
              </div>
            )}
          </form>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !date || !time}
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}