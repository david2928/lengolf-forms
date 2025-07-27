'use client';

import { useState, useEffect } from 'react';
import { PaymentMethodsResponse, PaymentMethodConfig, PaymentMethodGroup } from '@/types/payment-methods';

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodConfig[]>([]);
  const [groupedMethods, setGroupedMethods] = useState<PaymentMethodGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/pos/payment-methods');
        if (!response.ok) {
          throw new Error('Failed to fetch payment methods');
        }

        const data: PaymentMethodsResponse = await response.json();
        
        if (data.success) {
          setPaymentMethods(data.payment_methods);
          setGroupedMethods(data.grouped_methods);
        } else {
          throw new Error('Payment methods API returned error');
        }
      } catch (err) {
        console.error('Error fetching payment methods:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        
        // Fallback to empty arrays
        setPaymentMethods([]);
        setGroupedMethods([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPaymentMethods();
  }, []);

  // Helper functions
  const getMethodByCode = (code: string): PaymentMethodConfig | undefined => {
    return paymentMethods.find(method => method.code === code);
  };

  const getMethodsByGroup = (groupCode: string): PaymentMethodConfig[] => {
    const group = groupedMethods.find(g => g.group_code === groupCode);
    return group?.methods || [];
  };

  const getDisplayName = (code: string): string => {
    const method = getMethodByCode(code);
    return method?.display_name || code;
  };

  const getDatabaseValue = (code: string): string => {
    const method = getMethodByCode(code);
    return method?.database_value || 'other';
  };

  return {
    paymentMethods,
    groupedMethods,
    isLoading,
    error,
    getMethodByCode,
    getMethodsByGroup,
    getDisplayName,
    getDatabaseValue
  };
}