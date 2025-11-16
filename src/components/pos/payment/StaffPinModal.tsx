'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, User, ArrowLeft, Shield } from 'lucide-react';
import { useResponsive } from '@/hooks/use-responsive';

interface StaffPinModalProps {
  isOpen: boolean;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  branchName?: string;
  staffName?: string;
}

export const StaffPinModal: React.FC<StaffPinModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  title = 'PIN Access',
  description = 'Enter your PIN to continue',
  branchName = 'Lengolf Branch',
  staffName
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const submitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSubmittingRef = useRef(false);
  const { isMobile, isTablet } = useResponsive();

  // Reset state when modal opens
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
    }
  }, [isOpen]);

  const handleConfirm = useCallback((pinToConfirm?: string) => {
    const finalPin = pinToConfirm || pin;
    
    // Prevent duplicate submissions
    if (isSubmittingRef.current) {
      return;
    }
    
    if (!finalPin.trim()) {
      setError('Please enter your PIN');
      triggerShake();
      return;
    }

    if (finalPin.length < 4) {
      setError('PIN must be at least 4 digits');
      triggerShake();
      return;
    }

    isSubmittingRef.current = true;
    onSuccess(finalPin);
  }, [pin, onSuccess]);

  // Auto-submit when PIN reaches 6 digits
  useEffect(() => {
    if (pin.length === 6 && !isSubmittingRef.current) {
      // Clear any existing timeout to prevent multiple submissions
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
      
      submitTimeoutRef.current = setTimeout(() => {
        handleConfirm(pin);
        submitTimeoutRef.current = null;
      }, 100);
      
      return () => {
        if (submitTimeoutRef.current) {
          clearTimeout(submitTimeoutRef.current);
          submitTimeoutRef.current = null;
        }
      };
    }
  }, [pin, handleConfirm]);

  const handlePinDigit = useCallback((digit: string) => {
    if (pin.length >= 6) return;
    
    const newPin = pin + digit;
    setPin(newPin);
    setError(null);
  }, [pin]);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  }, []);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handlePinDigit(e.key);
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-gradient-to-br from-green-50 via-white to-green-50"
      onKeyDown={handleKeyPress}
      tabIndex={-1}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 bg-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <div>
              <h1 className="text-sm font-medium text-gray-600">Connected to</h1>
              <p className="text-lg font-semibold text-[#265020]">{branchName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Shield className="h-5 w-5" />
            <span className="text-sm hidden sm:inline">Secure PIN Entry</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="h-full flex items-center justify-center p-4 pt-20">
        <div className="max-w-md w-full">
          {/* Logo/Icon Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-[#265020] to-green-700 shadow-lg mb-4">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
            <p className="text-gray-600">{description}</p>
            {staffName && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full">
                <User className="h-4 w-4 text-[#265020]" />
                <span className="text-sm font-medium text-[#265020]">{staffName}</span>
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className={`mb-6 bg-red-50 border border-red-200 rounded-lg p-4 ${
              isShaking ? 'animate-shake' : ''
            }`}>
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* PIN Circles Display */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={`
                    w-4 h-4 rounded-full border-2 transition-all duration-200
                    ${index < pin.length 
                      ? 'bg-[#265020] border-[#265020]' 
                      : 'bg-transparent border-gray-400'
                    }
                  `}
                />
              ))}
              {/* Always visible back button next to circles */}
              <button
                onClick={handleBackspace}
                className="ml-2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                title="Remove last digit"
              >
                <ArrowLeft className="w-3 h-3 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Numeric Keypad */}
          <div className="flex flex-col items-center gap-4 max-w-sm mx-auto">
            {/* Row 1: 1, 2, 3 */}
            <div className="flex gap-6">
              {[1, 2, 3].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinDigit(digit.toString())}
                  className="w-20 h-20 rounded-full text-3xl font-semibold bg-gradient-to-br from-green-50 to-green-100 hover:from-[#265020] hover:to-green-700 hover:text-white hover:shadow-lg active:scale-95 transform transition-all duration-150 border border-green-200 hover:border-transparent"
                >
                  {digit}
                </button>
              ))}
            </div>
            
            {/* Row 2: 4, 5, 6 */}
            <div className="flex gap-6">
              {[4, 5, 6].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinDigit(digit.toString())}
                  className="w-20 h-20 rounded-full text-3xl font-semibold bg-gradient-to-br from-green-50 to-green-100 hover:from-[#265020] hover:to-green-700 hover:text-white hover:shadow-lg active:scale-95 transform transition-all duration-150 border border-green-200 hover:border-transparent"
                >
                  {digit}
                </button>
              ))}
            </div>
            
            {/* Row 3: 7, 8, 9 */}
            <div className="flex gap-6">
              {[7, 8, 9].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinDigit(digit.toString())}
                  className="w-20 h-20 rounded-full text-3xl font-semibold bg-gradient-to-br from-green-50 to-green-100 hover:from-[#265020] hover:to-green-700 hover:text-white hover:shadow-lg active:scale-95 transform transition-all duration-150 border border-green-200 hover:border-transparent"
                >
                  {digit}
                </button>
              ))}
            </div>
            
            {/* Row 4: 0 centered with Cancel below */}
            <div className="flex justify-center">
              <button
                onClick={() => handlePinDigit('0')}
                className="w-20 h-20 rounded-full text-3xl font-semibold bg-gradient-to-br from-green-50 to-green-100 hover:from-[#265020] hover:to-green-700 hover:text-white hover:shadow-lg active:scale-95 transform transition-all duration-150 border border-green-200 hover:border-transparent"
              >
                0
              </button>
            </div>
            
            {/* Row 5: Cancel button */}
            <div className="flex justify-center mt-2">
              <button
                onClick={onCancel}
                className="px-6 py-2 rounded-full text-sm font-medium bg-gray-100 hover:bg-gray-200 active:scale-95 transform transition-all duration-150 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        /* Ensure buttons are clickable on all devices including tablets */
        button {
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
          user-select: none !important;
          cursor: pointer !important;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};