'use client'

import { useRef, useState, useEffect } from 'react'
import { format } from 'date-fns' // Ensure format is imported
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { SignaturePad, type SignaturePadRef } from '@/components/ui/signature-pad'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: {
    employeeName: string | null;
    packageName: string | null;
    usedHours: number | null;
    // usedDate: Date | null; // No longer passed or used in this dialog
    currentPackageRemainingHours?: number | null; // Added for remaining hours calculation
    currentPackageExpirationDate?: string | null; // Added for expiration date display
  };
  onConfirm: (signature: string | null) => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
}: ConfirmationDialogProps) {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const signaturePadContainerRef = useRef<HTMLDivElement>(null);
  const [signaturePadSize, setSignaturePadSize] = useState({ width: 300, height: 150 });

  useEffect(() => {
    function handleResize() {
      if (signaturePadContainerRef.current) {
        const containerWidth = signaturePadContainerRef.current.offsetWidth;
        const newWidth = Math.min(containerWidth - 20, 450); 
        const newHeight = Math.max(newWidth * 0.4, 120); 
        setSignaturePadSize({ width: newWidth > 0 ? newWidth : 300, height: newHeight > 0 ? newHeight : 150 });
      }
    }
    if (open) {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [open]);

  // Ensure usedHours is not null before proceeding with dialog display if it's critical
  if (!data.employeeName || !data.packageName || data.usedHours === null || data.usedHours === undefined) return null;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      signaturePadRef.current?.clearSignature();
      setIsSignatureEmpty(true);
    }
    onOpenChange(isOpen);
  };

  const handleConfirmClick = () => {
    const signatureData = signaturePadRef.current?.getSignature();
    onConfirm(signatureData || null);
  };

  const packageParts = data.packageName.split(' - ');
  const customerInfo = packageParts[0];
  const packageType = packageParts[1];
  // const firstUseDate = packageParts[2]; // Removed

  let remainingAfterUsageText = "N/A";
  if (data.currentPackageRemainingHours === null) {
    remainingAfterUsageText = "Unlimited";
  } else if (typeof data.currentPackageRemainingHours === 'number' && data.usedHours !== null) {
    const remaining = data.currentPackageRemainingHours - data.usedHours;
    remainingAfterUsageText = `${remaining} hours`;
  } else if (data.usedHours !== null) {
    // If currentPackageRemainingHours is undefined but usedHours is present, we can't calculate new remaining
    remainingAfterUsageText = "Current remaining unknown";
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full h-full overflow-y-auto p-4 
                              sm:h-auto sm:w-auto sm:max-w-xl md:max-w-3xl lg:max-w-4xl 
                              sm:rounded-lg sm:p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl sm:text-2xl">Confirm Package Usage & Sign</DialogTitle>
          <DialogDescription>
            Please review the usage details below and provide a signature.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-600">Customer Name</p>
              <p className="text-sm text-gray-800">{customerInfo}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600">Package Type</p>
              <p className="text-sm text-gray-800">{packageType}</p>
            </div>
            {/* First Use Date and Used Date Removed */}
          </div>

          <div className="col-span-2 text-center p-3 bg-blue-50 rounded-md border border-blue-200">
            <p className="text-md font-bold text-blue-600">Used Hours This Session</p>
            <p className="text-2xl font-extrabold text-blue-700">{data.usedHours} hours</p>
          </div>

          { (data.currentPackageRemainingHours !== undefined) && (
            <div className="col-span-2 text-center p-3 bg-gray-50 rounded-md border border-gray-200 mt-3">
                <p className="text-sm font-semibold text-gray-600">Remaining Hours After This Session</p>
                <p className="text-lg font-bold text-gray-800">{remainingAfterUsageText}</p>
                {data.currentPackageExpirationDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Expires: {format(new Date(data.currentPackageExpirationDate), 'PP')}
                  </p>
                )}
            </div>
          )}
          
          <div className="pt-4 space-y-2">
            <p className="text-base font-semibold text-gray-700 text-center">Customer Signature</p>
            <p className="text-xs font-semibold text-yellow-900 bg-yellow-100 rounded px-2 py-1 text-center max-w-md mx-auto" aria-live="polite">
              Please sign in the area below using your finger. Tap &apos;Clear Signature&apos; to retry.
            </p>
            <div ref={signaturePadContainerRef} className="w-full">
              <SignaturePad 
                ref={signaturePadRef} 
                height={220}
                className="bg-yellow-50 border-2 border-yellow-200 shadow-sm p-2 rounded-md"
                onEnd={() => setIsSignatureEmpty(signaturePadRef.current?.isEmpty() ?? true)}
                onClear={() => setIsSignatureEmpty(true)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={handleConfirmClick} disabled={isSignatureEmpty} className="w-full sm:w-auto">
            Confirm & Save Signature
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}