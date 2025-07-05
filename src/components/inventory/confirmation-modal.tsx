import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  emptyFields: string[]
  isSubmitting?: boolean
}

export function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  emptyFields,
  isSubmitting = false 
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>Incomplete Fields</DialogTitle>
          </div>
          <DialogDescription>
            You have left the following fields blank. Are you sure you want to submit without completing them?
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-60 w-full rounded-md border p-4 overflow-y-auto">
          <div className="space-y-1">
            {emptyFields.map((field, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                • {field}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Go Back & Edit
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Anyway'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 