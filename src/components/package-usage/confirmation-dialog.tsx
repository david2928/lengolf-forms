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
import { Maximize2, Minimize2, Pen } from 'lucide-react'
import { FullscreenSignature } from './fullscreen-signature'

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
  const [isMobile, setIsMobile] = useState(false);
  const [showFullscreenSignature, setShowFullscreenSignature] = useState(false);
  const [capturedSignature, setCapturedSignature] = useState<string | null>(null);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

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
        
        // Optimized signature heights based on real device testing
        if (screenWidth >= 768 && screenWidth <= 1200 && screenHeight >= 600) {
          // Tablet devices - ideal for signatures
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
            setSignatureHeight(Math.min(screenHeight * 0.5, 500)); // 50% of screen height in fullscreen, max 500px
          } else {
            setSignatureHeight(320); // Slightly increased standard desktop height
          }
        } else {
          // Mobile devices - optimized based on 686x991 testing
          setIsTabletMode(false);
          if (isFullscreenSignature) {
            // For mobile fullscreen, use more screen real estate
            setSignatureHeight(Math.min(screenHeight * 0.6, 600)); // 60% of screen height in fullscreen for better signing
          } else {
            // Optimized standard mobile height - increased from 220px to match recommendation
            const optimalHeight = Math.min(screenHeight * 0.25, 280); // 25% of screen height, max 280px
            setSignatureHeight(Math.max(optimalHeight, 240)); // Minimum 240px for usability
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
      setCapturedSignature(null);
    }
    onOpenChange(isOpen);
  };

  const handleConfirmClick = () => {
    // Use captured signature from fullscreen mode, or get from inline pad
    const signatureData = capturedSignature || signaturePadRef.current?.getSignature();
    onConfirm(signatureData || null);
  };

  const handleFullscreenSignatureSave = (signature: string | null) => {
    setCapturedSignature(signature);
    setIsSignatureEmpty(!signature);
    setShowFullscreenSignature(false);
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
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-full max-w-md mx-auto p-6 sm:max-w-lg md:max-w-xl">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl sm:text-2xl">Confirm Package Usage</DialogTitle>
            <DialogDescription>
              Please review the usage details below and provide your signature.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold text-gray-600">Customer</p>
                <p className="text-gray-800">{customerInfo}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-600">Package</p>
                <p className="text-gray-800">{packageType}</p>
              </div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-600">Used Hours This Session</p>
              <p className="text-2xl font-bold text-blue-700">{data.usedHours} hours</p>
            </div>

            {(data.currentPackageRemainingHours !== undefined) && (
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm font-semibold text-gray-600">Remaining Hours After This Session</p>
                <p className="text-lg font-bold text-gray-800">{remainingAfterUsageText}</p>
                {data.currentPackageExpirationDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Expires: {format(new Date(data.currentPackageExpirationDate), 'PP')}
                  </p>
                )}
              </div>
            )}
            
            {/* Signature Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-700">Customer Signature</h3>
                {capturedSignature && (
                  <span className="text-xs text-green-600 font-medium">✓ Signed</span>
                )}
              </div>
              
              {capturedSignature ? (
                // Show captured signature preview
                <div className="space-y-3">
                  <div className="border-2 border-green-200 rounded-lg p-4 bg-green-50">
                    <img 
                      src={capturedSignature} 
                      alt="Customer Signature" 
                      className="w-full h-24 object-contain bg-white rounded border"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowFullscreenSignature(true)}
                    className="w-full"
                  >
                    <Pen className="h-4 w-4 mr-2" />
                    Re-sign
                  </Button>
                </div>
              ) : (
                // Show signature prompt
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
                    <Pen className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-600 mb-3">
                      Customer signature required
                    </p>
                    <Button
                      onClick={() => setShowFullscreenSignature(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Pen className="h-4 w-4 mr-2" />
                      Sign Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-0 sm:space-x-2">
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)} 
              className="w-full sm:w-auto" 
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmClick} 
              disabled={!capturedSignature || isLoading} 
              className="w-full sm:w-auto"
            >
              {isLoading ? 'Saving...' : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Signature Component */}
      <FullscreenSignature
        isOpen={showFullscreenSignature}
        customerName={customerInfo}
        packageType={packageType}
        usedHours={data.usedHours}
        onSave={handleFullscreenSignatureSave}
        onCancel={() => setShowFullscreenSignature(false)}
      />
    </>
  )
}