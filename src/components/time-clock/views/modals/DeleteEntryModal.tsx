import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { format, parseISO } from 'date-fns'
import { TimeEntry } from '../../context/TimeClockProvider'

interface DeleteEntryModalProps {
  entry: TimeEntry | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export const DeleteEntryModal: React.FC<DeleteEntryModalProps> = ({
  entry,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [reason, setReason] = useState('')
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!entry) return

    setSubmitting(true)
    
    try {
      const response = await fetch(`/api/admin/time-clock/entries/${entry.entry_id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: reason.trim() || 'Entry deleted by admin',
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete time entry')
      }

      toast({
        title: 'Success',
        description: result.message,
      })

      onSuccess()
      onClose()
      setReason('') // Reset form
    } catch (error) {
      console.error('Error deleting time entry:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete time entry',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (!entry) return null

  const entryDate = parseISO(entry.timestamp)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Delete Time Entry
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-md bg-red-50 p-4">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">
                This action cannot be undone
              </p>
              <p className="text-sm text-red-700 mt-1">
                You are about to permanently delete this time entry.
              </p>
            </div>
          </div>

          <div className="rounded-md bg-gray-50 p-4">
            <h4 className="font-medium text-gray-900 mb-2">Entry Details:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li><strong>Staff:</strong> {entry.staff_name}</li>
              <li><strong>Action:</strong> {entry.action === 'clock_in' ? 'Clock In' : 'Clock Out'}</li>
              <li><strong>Time:</strong> {format(entryDate, 'MMM dd, yyyy h:mm a')}</li>
              <li><strong>Entry ID:</strong> #{entry.entry_id}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-reason">Deletion Reason</Label>
            <Textarea
              id="delete-reason"
              placeholder="Please provide a reason for deleting this entry..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-gray-500">
              This reason will be logged for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            variant="destructive"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Entry
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}