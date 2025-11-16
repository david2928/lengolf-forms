'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Shield, X } from 'lucide-react';
import { useResponsive } from '@/hooks/use-responsive';

interface VoidPinModalProps {
  isOpen: boolean;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  receiptNumber: string;
}

export const VoidPinModal: React.FC<VoidPinModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  receiptNumber
}) => {
  console.log('🔍 VoidPinModal render - isOpen:', isOpen, 'receiptNumber:', receiptNumber);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const { isMobile, isTablet } = useResponsive();

  // Reset state when modal opens and manage focus
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      isSubmittingRef.current = false;
      // Clear any pending timeout
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
        submitTimeoutRef.current = null;
      }
      
      // Force focus to this modal after a brief delay
      setTimeout(() => {
        if (modalRef.current) {
          console.log('🔍 Setting focus to VoidPinModal');
          modalRef.current.focus();
          
          // Find the first button and focus it
          const firstButton = modalRef.current.querySelector('button');
          if (firstButton) {
            firstButton.focus();
          }
        }
      }, 100);
    }
  }, [isOpen]);

  const handleConfirm = (pinToConfirm?: string) => {
    const finalPin = pinToConfirm || pin;
    
    if (isSubmittingRef.current) return;
    
    if (!finalPin || finalPin.length < 4) {
      setError('Please enter a valid PIN');
      triggerShake();
      return;
    }

    // Check if it's the terminal PIN
    if (finalPin !== '40724') {
      setError('Invalid terminal PIN');
      triggerShake();
      setPin('');
      return;
    }

    isSubmittingRef.current = true;
    onSuccess(finalPin);
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleNumberClick = (num: string) => {
    if (pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      setError(null);
      
      // Auto-submit when PIN reaches expected length
      if (newPin.length === 5) {
        submitTimeoutRef.current = setTimeout(() => {
          handleConfirm(newPin);
        }, 100);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  };

  if (!isOpen) {
    console.log('🔍 VoidPinModal - not open, returning null');
    return null;
  }

  console.log('🔍 VoidPinModal - rendering modal');
  console.log('🔍 VoidPinModal - DOM body exists:', !!document.body);
  console.log('🔍 VoidPinModal - receiptNumber:', receiptNumber);
  
  return (
    <div 
      ref={modalRef}
      data-void-pin-modal
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="void-pin-modal-title"
      className="fixed inset-0 bg-black/50 flex items-center justify-center" 
      style={{ 
        zIndex: 99999,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
      onClick={(e) => {
        console.log('🔍 VoidPinModal backdrop clicked');
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      onMouseDown={(e) => {
        // Prevent parent dialog from capturing mouse events
        e.stopPropagation();
      }}
    >
      <div 
        className={`bg-white rounded-2xl p-8 max-w-md w-full mx-4 transform transition-all duration-300 ${
          isShaking ? 'animate-shake' : ''
        } ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => {
          console.log('🔍 VoidPinModal content clicked');
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h2 id="void-pin-modal-title" className="text-xl font-bold text-gray-900">Terminal Authorization</h2>
              <p className="text-sm text-gray-500">VOID Transaction</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Info */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-sm text-red-800">
            <div className="font-semibold">Receipt: {receiptNumber}</div>
            <div className="text-xs mt-1">Enter terminal PIN to authorize void</div>
          </div>
        </div>

        {/* PIN Display */}
        <div className="mb-6">
          <div className="flex justify-center mb-4">
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-colors ${
                    i < pin.length 
                      ? 'bg-red-500 border-red-500' 
                      : 'border-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-red-600 text-sm mb-4">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              size="lg"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔍 Number button clicked:', num);
                handleNumberClick(num.toString());
              }}
              className="h-14 text-xl font-semibold hover:bg-red-50 hover:border-red-300 cursor-pointer"
              style={{ pointerEvents: 'all' }}
            >
              {num}
            </Button>
          ))}
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔍 Clear button clicked');
              handleClear();
            }}
            className="h-14 text-lg font-semibold hover:bg-gray-50 cursor-pointer"
            style={{ pointerEvents: 'all' }}
          >
            Clear
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔍 Zero button clicked');
              handleNumberClick('0');
            }}
            className="h-14 text-xl font-semibold hover:bg-red-50 hover:border-red-300 cursor-pointer"
            style={{ pointerEvents: 'all' }}
          >
            0
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔍 Backspace button clicked');
              handleBackspace();
            }}
            className="h-14 text-lg font-semibold hover:bg-gray-50 cursor-pointer"
            style={{ pointerEvents: 'all' }}
          >
            ⌫
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔍 Cancel button clicked');
              onCancel();
            }}
            className="flex-1 h-12 font-semibold cursor-pointer"
            style={{ pointerEvents: 'all' }}
          >
            Cancel
          </Button>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔍 Authorize button clicked');
              handleConfirm();
            }}
            disabled={pin.length < 4}
            className="flex-1 h-12 font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:cursor-not-allowed"
            style={{ pointerEvents: 'all' }}
          >
            Authorize VOID
          </Button>
        </div>
      </div>

      <style jsx>{`
        /* Ensure buttons are clickable on all devices including tablets */
        button {
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
          user-select: none !important;
        }
      `}</style>
    </div>
  );
};