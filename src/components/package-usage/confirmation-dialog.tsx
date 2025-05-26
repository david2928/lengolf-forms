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
import { Maximize2, Minimize2 } from 'lucide-react'

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
  isLoading?: boolean; // Add isLoading prop
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  data,
  onConfirm,
  isLoading, // Destructure isLoading
}: ConfirmationDialogProps) {
  const signaturePadRef = useRef<SignaturePadRef>(null);
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true);
  const signaturePadContainerRef = useRef<HTMLDivElement>(null);
  const [signaturePadSize, setSignaturePadSize] = useState({ width: 300, height: 150 });
  const [signatureHeight, setSignatureHeight] = useState(220);
  const [isTabletMode, setIsTabletMode] = useState(false);
  const [isFullscreenSignature, setIsFullscreenSignature] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (signaturePadContainerRef.current) {
        const containerWidth = signaturePadContainerRef.current.offsetWidth;
        const newWidth = Math.min(containerWidth - 20, 450); 
        const newHeight = Math.max(newWidth * 0.4, 120); 
        setSignaturePadSize({ width: newWidth > 0 ? newWidth : 300, height: newHeight > 0 ? newHeight : 150 });
        
        // Set adaptive signature height based on screen size
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        // Determine device type and set appropriate signature heights
        if (screenWidth >= 768 && screenWidth <= 1200 && screenHeight >= 600) {
          // Tablet devices
          setIsTabletMode(true);
          if (isFullscreenSignature) {
            setSignatureHeight(Math.min(screenHeight * 0.7, 600)); // 70% of screen height in fullscreen
          } else {
            setSignatureHeight(Math.min(screenHeight * 0.4, 450)); // 40% of screen height, max 450px
          }
        } else if (screenWidth > 1200) {
          // Desktop/large screens
          setIsTabletMode(false);
          if (isFullscreenSignature) {
            setSignatureHeight(Math.min(screenHeight * 0.4, 400)); // 40% of screen height in fullscreen, max 400px
          } else {
            setSignatureHeight(300); // Standard desktop height
          }
        } else {
          // Mobile devices
          setIsTabletMode(false);
          if (isFullscreenSignature) {
            setSignatureHeight(Math.min(screenHeight * 0.4, 350)); // 40% of screen height in fullscreen
          } else {
            setSignatureHeight(220); // Standard mobile height
          }
        }
      }
    }
    if (open) {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [open, isFullscreenSignature]);

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
                              sm:h-auto sm:w-auto sm:max-w-xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl 
                              sm:rounded-lg sm:p-6 sm:max-h-[90vh]">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl sm:text-2xl">Confirm Package Usage & Sign</DialogTitle>
          <DialogDescription>
            Please review the usage details below and provide a signature.
          </DialogDescription>
        </DialogHeader>
        
        <div className={`space-y-4 ${isFullscreenSignature ? 'space-y-2' : 'space-y-4'}`}>
          <div className={`grid grid-cols-2 gap-x-4 gap-y-3 mb-3 ${isFullscreenSignature ? 'text-sm' : ''}`}>
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
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-gray-700">Customer Signature</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsFullscreenSignature(!isFullscreenSignature)}
                className="text-xs px-3 py-1 font-medium hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
              >
                {isFullscreenSignature ? (
                  <>
                    <Minimize2 className="w-3 h-3 mr-1" />
                    Minimize
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3 mr-1" />
                    Expand Signature
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs font-semibold text-yellow-900 bg-yellow-100 rounded px-2 py-1 text-center max-w-md mx-auto" aria-live="polite">
              Please sign in the area below using your finger. {!isFullscreenSignature && 'Tap "Expand Signature" for a larger signing area.'} {isFullscreenSignature && 'Expanded signature mode - use the full area to sign.'}
            </p>
            <div ref={signaturePadContainerRef} className="w-full">
              <SignaturePad 
                ref={signaturePadRef} 
                height={signatureHeight}
                className="bg-yellow-50 border-2 border-yellow-200 shadow-sm p-2 rounded-md w-full transition-all duration-300"
                onEnd={() => setIsSignatureEmpty(signaturePadRef.current?.isEmpty() ?? true)}
                onClear={() => setIsSignatureEmpty(true)}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)} className="w-full sm:w-auto" disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirmClick} disabled={isSignatureEmpty || isLoading} className="w-full sm:w-auto">
            {isLoading ? 'Saving...' : 'Confirm & Save Signature'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}