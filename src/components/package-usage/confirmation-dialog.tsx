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

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: {
    employeeName: string | null;
    packageName: string | null;
    usedHours: number | null;
    usedDate: Date | null;
  };
  onConfirm: () => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
}: ConfirmationDialogProps) {
  if (!data.employeeName || !data.packageName || !data.usedHours || !data.usedDate) return null

  // Parse the package name which is in format "Customer (ID) - Package Type - Date"
  const packageParts = data.packageName.split(' - ');
  const customerInfo = packageParts[0];  // "Customer (ID)"
  const packageType = packageParts[1];   // "Package Type"
  const firstUseDate = packageParts[2];  // "Date"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Package Usage</DialogTitle>
          <DialogDescription>
            Please review the usage details below
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Employee Name</p>
              <p className="text-sm">{data.employeeName}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Customer Name</p>
              <p className="text-sm">{customerInfo}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Package Type</p>
              <p className="text-sm">{packageType}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">First Use Date</p>
              <p className="text-sm">{firstUseDate}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Used Hours</p>
              <p className="text-sm">{data.usedHours} hours</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Used Date</p>
              <p className="text-sm">{format(data.usedDate, 'PP')}</p>
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