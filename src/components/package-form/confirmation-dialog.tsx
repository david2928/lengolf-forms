"use client"

import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { PackageFormData } from '@/types/package-form'

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: PackageFormData | null;
  onConfirm: () => void;
  getPackageTypeName: (id: number) => string;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  formData,
  onConfirm,
  getPackageTypeName,
}: ConfirmationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#005a32]">Confirm Package Creation</DialogTitle>
        </DialogHeader>
        {formData && formData.purchaseDate && formData.firstUseDate && (
          <div className="py-4">
            <div className="space-y-3 text-gray-700">
              <p><strong>Employee Name:</strong> {formData.employeeName}</p>
              <p><strong>Customer Name:</strong> {formData.customerName}</p>
              <p><strong>Package Type:</strong> {getPackageTypeName(formData.packageTypeId)}</p>
              <p><strong>Purchase Date:</strong> {format(formData.purchaseDate, 'PP')}</p>
              <p><strong>First Use Date:</strong> {format(formData.firstUseDate, 'PP')}</p>
            </div>
          </div>
        )}
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-[#005a32] text-white hover:bg-[#004a29]"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}