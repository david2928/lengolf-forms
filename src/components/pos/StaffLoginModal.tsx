'use client';

import { useState, useEffect, useCallback } from 'react';
import { Fingerprint, ArrowLeft } from 'lucide-react';

interface StaffLoginModalProps {
  isOpen: boolean;
  onLogin: (pin: string) => Promise<{ success: boolean; error?: string }>;
  isLoading: boolean;
}

export function StaffLoginModal({ isOpen, onLogin, isLoading }: StaffLoginModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
    }
  }, [isOpen]);

  const handleLogin = useCallback(async () => {
    if (isLoading) return;

    setError(null);
    const result = await onLogin(pin);

    if (!result.success) {
      setError(result.error || 'Login failed');
      setPin('');
    }
  }, [isLoading, onLogin, pin]);

  // Auto-submit when PIN reaches 6 digits
  useEffect(() => {
    if (pin.length === 6 && !isLoading) {
      handleLogin();
    }
  }, [pin, isLoading, handleLogin]);

  const handleDigit = (digit: string) => {
    if (pin.length < 6 && !isLoading) {
      setPin(prev => prev + digit);
    }
  };

  const handleBackspace = () => {
    if (!isLoading) {
      setPin(prev => prev.slice(0, -1));
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx>{`
        @media (min-width: 686px) and (max-width: 991px) {
          .tablet-modal-container {
            max-width: 42rem !important;
          }
          .tablet-logo-outer {
            width: 8rem !important;
            height: 8rem !important;
          }
          .tablet-logo-inner {
            width: 7rem !important;
            height: 7rem !important;
          }
          .tablet-logo-icon {
            width: 4rem !important;
            height: 4rem !important;
          }
          .tablet-title {
            font-size: 2.25rem !important;
          }
          .tablet-subtitle {
            font-size: 1.25rem !important;
          }
          .tablet-pin-circle {
            width: 1.5rem !important;
            height: 1.5rem !important;
          }
          .tablet-pin-gap {
            gap: 1rem !important;
          }
          .tablet-back-button {
            width: 3rem !important;
            height: 3rem !important;
          }
          .tablet-back-icon {
            width: 1.5rem !important;
            height: 1.5rem !important;
          }
          .tablet-keypad-container {
            max-width: 28rem !important;
          }
          .tablet-keypad-gap {
            gap: 1.5rem !important;
            margin-bottom: 1.5rem !important;
          }
          .tablet-keypad-button {
            width: 5rem !important;
            height: 5rem !important;
            font-size: 1.5rem !important;
          }
        }
      `}</style>
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#265020] via-green-800 to-[#265020]">
        <div className="h-full flex items-center justify-center p-4">
          <div className="tablet-modal-container max-w-md w-full text-center">
          {/* Logo */}
          <div className="tablet-logo-outer inline-flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-2xl mb-6">
            <div className="tablet-logo-inner w-20 h-20 rounded-full bg-gradient-to-br from-[#265020] to-green-700 flex items-center justify-center">
              <Fingerprint className="tablet-logo-icon h-12 w-12 text-white" />
            </div>
          </div>
          
          <h1 className="tablet-title text-2xl font-bold text-white mb-2">POS Staff Login</h1>
          <p className="tablet-subtitle text-green-100 mb-8">Enter your 6-digit PIN</p>

          {/* Error */}
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-300/30 rounded-lg p-3">
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}

          {/* PIN Circles */}
          <div className="tablet-pin-gap flex items-center justify-center gap-3 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={`tablet-pin-circle w-4 h-4 rounded-full border-2 transition-all ${
                  i < pin.length ? 'bg-white border-white' : 'border-white/40'
                }`}
              />
            ))}
            
            {/* Back Button */}
            <button
              onClick={handleBackspace}
              disabled={isLoading}
              className="tablet-back-button ml-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="tablet-back-icon w-4 h-4 text-white" />
            </button>
          </div>

          {/* Keypad */}
          <div className="tablet-keypad-container max-w-xs mx-auto">
            {/* Rows 1-3 */}
            {[
              [1, 2, 3],
              [4, 5, 6], 
              [7, 8, 9]
            ].map((row, i) => (
              <div key={i} className="tablet-keypad-gap flex gap-4 mb-4 justify-center">
                {row.map(digit => (
                  <button
                    key={digit}
                    onClick={() => handleDigit(digit.toString())}
                    disabled={isLoading}
                    className="tablet-keypad-button w-16 h-16 rounded-full bg-white/90 hover:bg-white text-[#265020] text-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {digit}
                  </button>
                ))}
              </div>
            ))}
            
            {/* Row 4: Just 0 */}
            <div className="flex justify-center">
              <button
                onClick={() => handleDigit('0')}
                disabled={isLoading}
                className="tablet-keypad-button w-16 h-16 rounded-full bg-white/90 hover:bg-white text-[#265020] text-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                0
              </button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="mt-6">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mx-auto"></div>
              <p className="text-white/80 text-sm mt-2">Authenticating...</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );
}