'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, User, Delete, Eye, EyeOff, X } from 'lucide-react';

interface StaffPinModalProps {
  isOpen: boolean;
  onSuccess: (pin: string) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export const StaffPinModal: React.FC<StaffPinModalProps> = ({
  isOpen,
  onSuccess,
  onCancel,
  title = 'Staff Authentication Required',
  description = 'Please enter your PIN to complete the payment'
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setShowPin(false);
      setError(null);
    }
  }, [isOpen]);

  const handlePinDigit = useCallback((digit: string) => {
    if (pin.length >= 6) return; // Limit to 6 digits
    
    setPin(prev => prev + digit);
    setError(null);
  }, [pin.length]);

  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(null);
  }, []);

  const handleClear = useCallback(() => {
    setPin('');
    setError(null);
  }, []);

  const handleConfirm = () => {
    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    onSuccess(pin);
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

  // Render numeric keypad
  const renderNumericKeypad = () => {
    const digits = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['Clear', '0', '⌫']
    ];

    return (
      <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto mb-6">
        {digits.flat().map((value, index) => {
          const isSpecial = value === 'Clear' || value === '⌫';
          
          return (
            <Button
              key={index}
              onClick={() => {
                if (value === '⌫') {
                  handleBackspace();
                } else if (value === 'Clear') {
                  handleClear();
                } else {
                  handlePinDigit(value);
                }
              }}
              variant={isSpecial ? "outline" : "default"}
              size="lg"
              className={`
                text-lg font-semibold h-12
                hover:scale-105 active:scale-95 transition-transform
              `}
            >
              {value === '⌫' ? (
                <Delete className="h-5 w-5" />
              ) : (
                value
              )}
            </Button>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-lg max-w-md w-full mx-auto shadow-xl"
        onKeyDown={handleKeyPress}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600 text-center">{description}</p>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            </div>
          )}

          {/* PIN Display */}
          <div className="text-center">
            <label className="text-sm font-medium mb-3 block">Enter Your PIN</label>
            
            <div className="flex items-center justify-center gap-2 mb-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className={`
                    w-8 h-10 border-2 rounded-md flex items-center justify-center
                    text-lg font-mono font-bold
                    transition-all duration-200
                    ${index < pin.length 
                      ? 'border-blue-600 bg-blue-50 text-blue-600' 
                      : 'border-gray-300 bg-gray-50'
                    }
                  `}
                >
                  {index < pin.length ? (
                    showPin ? pin[index] : '●'
                  ) : (
                    <div className="w-4 h-0.5 bg-gray-400 rounded"></div>
                  )}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPin(!showPin)}
                className="ml-2"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Numeric Keypad */}
          {renderNumericKeypad()}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={pin.length < 4}
              className="flex-1"
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};