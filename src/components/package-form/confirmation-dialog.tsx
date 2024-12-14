'use client'

import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PackageFormData } from '@/types/package-form'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formData: PackageFormData | null
  onConfirm: () => void
  getPackageTypeName: (id: number) => string
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  formData,
  onConfirm,
  getPackageTypeName,
}: ConfirmationDialogProps) {
  if (!formData || !formData.purchaseDate || !formData.firstUseDate) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Package Creation</DialogTitle>
          <DialogDescription>
            Please review the package details below
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Employee Name</p>
              <p className="text-sm">{formData.employeeName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Customer Name</p>
              <p className="text-sm">{formData.customerName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Package Type</p>
              <p className="text-sm">{getPackageTypeName(formData.packageTypeId)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Purchase Date</p>
              <p className="text-sm">{format(formData.purchaseDate, 'PP')}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">First Use Date</p>
              <p className="text-sm">{format(formData.firstUseDate, 'PP')}</p>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}