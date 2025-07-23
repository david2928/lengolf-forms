// React hook for PromptPay QR code generation
// Provides easy integration with React components

import { useState, useCallback, useEffect } from 'react';
import { PromptPayQRResponse, PaymentError } from '@/types/payment';
import { generatePromptPayQR, isPromptPayConfigured, getPromptPayConfigErrors } from '@/services/PromptPayQRGenerator';

interface UsePromptPayQRState {
  qrData: PromptPayQRResponse | null;
  isGenerating: boolean;
  error: string | null;
  isConfigured: boolean;
  configErrors: string[];
}

interface UsePromptPayQRReturn extends UsePromptPayQRState {
  generateQR: (amount: number, transactionId?: string) => Promise<void>;
  clearQR: () => void;
  isExpired: boolean;
  regenerateQR: () => Promise<void>;
}

export function usePromptPayQR(autoCheckExpiry: boolean = true): UsePromptPayQRReturn {
  const [state, setState] = useState<UsePromptPayQRState>({
    qrData: null,
    isGenerating: false,
    error: null,
    isConfigured: isPromptPayConfigured(),
    configErrors: getPromptPayConfigErrors()
  });
  
  const [lastAmount, setLastAmount] = useState<number | null>(null);
  const [lastTransactionId, setLastTransactionId] = useState<string | undefined>(undefined);
  
  // Check if current QR is expired
  const isExpired = state.qrData ? 
    new Date() > state.qrData.expiresAt : 
    false;
  
  const generateQR = useCallback(async (amount: number, transactionId?: string) => {
    setState(prev => ({ 
      ...prev, 
      isGenerating: true, 
      error: null 
    }));
    
    setLastAmount(amount);
    setLastTransactionId(transactionId);
    
    try {
      const qrData = await generatePromptPayQR(amount, transactionId);
      
      setState(prev => ({
        ...prev,
        qrData,
        isGenerating: false
      }));
      
    } catch (error) {
      console.error('Failed to generate PromptPay QR:', error);
      
      const errorMessage = error instanceof PaymentError 
        ? error.message 
        : 'Failed to generate QR code';
      
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isGenerating: false,
        qrData: null
      }));
    }
  }, []);
  
  const regenerateQR = useCallback(async () => {
    if (lastAmount !== null) {
      await generateQR(lastAmount, lastTransactionId);
    }
  }, [generateQR, lastAmount, lastTransactionId]);
  
  const clearQR = useCallback(() => {
    setState(prev => ({
      ...prev,
      qrData: null,
      error: null
    }));
    setLastAmount(null);
    setLastTransactionId(undefined);
  }, []);
  
  // Auto-check for expiry
  useEffect(() => {
    if (!autoCheckExpiry || !state.qrData) return;
    
    const checkExpiry = () => {
      if (state.qrData && new Date() > state.qrData.expiresAt) {
        // QR has expired, could auto-regenerate or notify
        console.log('PromptPay QR has expired');
      }
    };
    
    // Check every 30 seconds
    const interval = setInterval(checkExpiry, 30000);
    
    return () => clearInterval(interval);
  }, [state.qrData, autoCheckExpiry]);
  
  // Update configuration status when component mounts/updates
  useEffect(() => {
    setState(prev => ({
      ...prev,
      isConfigured: isPromptPayConfigured(),
      configErrors: getPromptPayConfigErrors()
    }));
  }, []);
  
  return {
    ...state,
    generateQR,
    clearQR,
    isExpired,
    regenerateQR
  };
}

// Simpler hook for one-time QR generation
export function usePromptPayQRSimple() {
  const { generateQR, qrData, isGenerating, error, isConfigured } = usePromptPayQR(false);
  
  return {
    generateQR,
    qrCode: qrData?.qrCodeDataURL || null,
    amount: qrData?.amount || null,
    isGenerating,
    error,
    isConfigured
  };
}

// Hook for QR status monitoring
export function usePromptPayQRStatus(qrData: PromptPayQRResponse | null) {
  const [isExpired, setIsExpired] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  
  useEffect(() => {
    if (!qrData) {
      setIsExpired(false);
      setTimeRemaining(0);
      return;
    }
    
    const updateStatus = () => {
      const now = new Date();
      const remaining = qrData.expiresAt.getTime() - now.getTime();
      
      if (remaining <= 0) {
        setIsExpired(true);
        setTimeRemaining(0);
      } else {
        setIsExpired(false);
        setTimeRemaining(Math.ceil(remaining / 1000)); // seconds
      }
    };
    
    // Update immediately
    updateStatus();
    
    // Update every second
    const interval = setInterval(updateStatus, 1000);
    
    return () => clearInterval(interval);
  }, [qrData]);
  
  return {
    isExpired,
    timeRemaining,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining)
  };
}

// Utility function to format remaining time
function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}