'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { SignaturePad, type SignaturePadRef } from '@/components/ui/signature-pad'
import { ArrowLeft, Check, RotateCcw } from 'lucide-react'

interface FullscreenSignatureProps {
  isOpen: boolean
  customerName: string
  packageType: string
  usedHours: number
  onSave: (signature: string | null) => void
  onCancel: () => void
}

export function FullscreenSignature({
  isOpen,
  customerName,
  packageType,
  usedHours,
  onSave,
  onCancel,
}: FullscreenSignatureProps) {
  const signaturePadRef = useRef<SignaturePadRef>(null)
  const [isSignatureEmpty, setIsSignatureEmpty] = useState(true)

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll when fullscreen signature is open
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = () => {
    const signatureData = signaturePadRef.current?.getSignature()
    onSave(signatureData || null)
  }

  const handleClear = () => {
    signaturePadRef.current?.clearSignature()
    setIsSignatureEmpty(true)
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-blue-50 border-b p-4">
        <div className="flex items-center justify-between mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h2 className="text-lg font-semibold">Customer Signature</h2>
          <div></div> {/* Spacer for centering */}
        </div>
        
        {/* Package info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-600">Customer:</span>
            <span className="ml-2">{customerName}</span>
          </div>
          <div>
            <span className="font-medium text-gray-600">Package:</span>
            <span className="ml-2">{packageType}</span>
          </div>
        </div>
        <div className="text-center mt-2">
          <span className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
            {usedHours} hours used this session
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className="flex-shrink-0 bg-yellow-50 border-b px-4 py-3">
        <p className="text-center text-sm font-medium text-yellow-800">
          Please sign in the area below using your finger or stylus. Use the entire area for your signature.
        </p>
      </div>

      {/* Signature Area - This takes up most of the screen */}
      <div className="flex-1 p-4 bg-gray-50">
        <div className="h-full w-full bg-white rounded-lg border-2 border-dashed border-gray-300 p-2">
          <SignaturePad
            ref={signaturePadRef}
            height={undefined} // Let it use full height
            className="w-full h-full bg-white border-2 border-yellow-400 rounded-lg"
            onEnd={() => setIsSignatureEmpty(signaturePadRef.current?.isEmpty() ?? true)}
            onClear={() => setIsSignatureEmpty(true)}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-shrink-0 bg-white border-t p-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handleClear}
            className="flex items-center gap-2"
            disabled={isSignatureEmpty}
          >
            <RotateCcw className="h-4 w-4" />
            Clear
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={isSignatureEmpty}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-4 w-4" />
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  )
} 