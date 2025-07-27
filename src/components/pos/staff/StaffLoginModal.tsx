'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, User, Lock, Delete, Eye, EyeOff } from 'lucide-react';
import { usePOSStaffAuth } from '@/hooks/use-pos-staff-auth';

interface StaffLoginModalProps {
  isOpen: boolean;
  onLoginSuccess: () => void;
  title?: string;
  description?: string;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  title = 'Staff Login Required',
  description = 'Please enter your staff PIN to access the POS system'
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  
  const { login } = usePOSStaffAuth();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setShowPin(false);
      setError(null);
      setAttempts(0);
    }
  }, [isOpen]);

  // Keypad handlers
  const handlePinDigit = useCallback((digit: string) => {
    if (isLoading) return;
    if (pin.length >= 6) return; // Limit to 6 digits
    
    setPin(prev => prev + digit);
    setError(null);
  }, [isLoading, pin.length]);

  const handleBackspace = useCallback(() => {
    if (isLoading) return;
    setPin(prev => prev.slice(0, -1));
    setError(null);
  }, [isLoading]);

  const handleClear = useCallback(() => {
    if (isLoading) return;
    setPin('');
    setError(null);
  }, [isLoading]);

  const handleLogin = async () => {
    if (!pin.trim()) {
      setError('Please enter your PIN');
      return;
    }

    if (pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await login(pin);
      
      if (result.success && result.staff) {
        // Success! Close modal and notify parent
        onLoginSuccess();
      } else {
        setAttempts(prev => prev + 1);
        setError(result.error || 'Invalid PIN. Please try again.');
        setPin(''); // Clear PIN on failure
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render numeric keypad (same as time-clock)
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
          const disabled = isLoading;
          
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
              disabled={disabled}
              variant={isSpecial ? "outline" : "default"}
              size="lg"
              className={`
                text-lg font-semibold h-12
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
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
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4" data-testid="staff-login-modal">
      <div 
        className="bg-white rounded-lg max-w-md w-full mx-auto shadow-xl"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-center p-6 border-b">
          <div className="flex items-center gap-2">
            <User className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-sm text-gray-600 text-center">{description}</p>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div className="text-red-800 text-sm">
                  <div className="font-medium mb-1">Authentication Failed</div>
                  <div>{error}</div>
                  {attempts > 0 && (
                    <div className="text-xs mt-1">
                      Attempt {attempts}/10
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PIN Display */}
          <div className="text-center">
            <label className="text-sm font-medium mb-3 block">Enter Your 6-Digit PIN</label>
            
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
                disabled={isLoading}
                className="ml-2"
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Numeric Keypad */}
          {renderNumericKeypad()}

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            disabled={isLoading || pin.length !== 6}
            className="w-full h-12 text-lg font-semibold"
            data-testid="staff-login-submit"
          >
            {isLoading ? 'Authenticating...' : 'Login to POS'}
          </Button>

          {/* Help Text */}
          <div className="text-center text-xs text-gray-500">
            <p>Contact your manager if you need help with your PIN</p>
          </div>
        </div>
      </div>
    </div>
  );
};