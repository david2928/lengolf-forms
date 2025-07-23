// React hook for bill splitting functionality
// Manages bill split state and operations

import { useState, useCallback, useMemo } from 'react';
import { 
  BillSplit, 
  BillSplitType, 
  PaymentMethod, 
  PaymentError 
} from '@/types/payment';
import { OrderItem } from '@/types/pos';
import { billSplittingService } from '@/services/BillSplittingService';

interface UseBillSplittingState {
  billSplit: BillSplit | null;
  splitType: BillSplitType | null;
  isValid: boolean;
  errors: string[];
  summary: any;
}

interface UseBillSplittingReturn extends UseBillSplittingState {
  // Split creation
  createEvenSplit: (numberOfPeople: number, defaultMethod?: PaymentMethod) => void;
  createItemBasedSplit: (itemAllocations: { [personId: string]: string[] }, defaultMethod?: PaymentMethod) => void;
  createCustomAmountSplit: (customAmounts: { personId: string; amount: number; customerInfo?: string }[], defaultMethod?: PaymentMethod) => void;
  
  // Split management
  updateSplitPaymentMethod: (splitId: string, paymentMethod: PaymentMethod) => void;
  markSplitAsPaid: (splitId: string, transactionRef?: string) => void;
  clearSplit: () => void;
  
  // Validation and processing
  validateSplit: () => boolean;
  getPaymentAllocations: () => any[];
  
  // Utilities
  canProcessPayment: boolean;
  allSplitsCompleted: boolean;
}

export function useBillSplitting(
  orderItems: OrderItem[], 
  totalAmount: number
): UseBillSplittingReturn {
  
  const [state, setState] = useState<UseBillSplittingState>({
    billSplit: null,
    splitType: null,
    isValid: false,
    errors: [],
    summary: null
  });

  // Derived state
  const canProcessPayment = useMemo(() => {
    return state.billSplit !== null && state.isValid && state.errors.length === 0;
  }, [state.billSplit, state.isValid, state.errors]);

  const allSplitsCompleted = useMemo(() => {
    if (!state.billSplit) return false;
    return state.billSplit.splits.every(split => split.paymentStatus === 'completed');
  }, [state.billSplit]);

  // Update state helper
  const updateState = useCallback((billSplit: BillSplit | null) => {
    if (!billSplit) {
      setState({
        billSplit: null,
        splitType: null,
        isValid: false,
        errors: [],
        summary: null
      });
      return;
    }

    const validation = billSplittingService.validateBillSplit(billSplit);
    const summary = billSplittingService.getBillSplitSummary(billSplit);

    setState({
      billSplit,
      splitType: billSplit.type,
      isValid: validation.isValid,
      errors: validation.errors,
      summary
    });
  }, []);

  // Split creation methods
  const createEvenSplit = useCallback((numberOfPeople: number, defaultMethod: PaymentMethod = PaymentMethod.CASH) => {
    try {
      const split = billSplittingService.createEvenSplit(totalAmount, numberOfPeople, defaultMethod);
      updateState(split);
    } catch (error) {
      console.error('Failed to create even split:', error);
      setState(prev => ({
        ...prev,
        errors: [error instanceof PaymentError ? error.message : 'Failed to create even split']
      }));
    }
  }, [totalAmount, updateState]);

  const createItemBasedSplit = useCallback((
    itemAllocations: { [personId: string]: string[] }, 
    defaultMethod: PaymentMethod = PaymentMethod.CASH
  ) => {
    try {
      const split = billSplittingService.createItemBasedSplit(orderItems, itemAllocations, defaultMethod);
      updateState(split);
    } catch (error) {
      console.error('Failed to create item-based split:', error);
      setState(prev => ({
        ...prev,
        errors: [error instanceof PaymentError ? error.message : 'Failed to create item-based split']
      }));
    }
  }, [orderItems, updateState]);

  const createCustomAmountSplit = useCallback((
    customAmounts: { personId: string; amount: number; customerInfo?: string }[], 
    defaultMethod: PaymentMethod = PaymentMethod.CASH
  ) => {
    try {
      const split = billSplittingService.createCustomAmountSplit(totalAmount, customAmounts, defaultMethod);
      updateState(split);
    } catch (error) {
      console.error('Failed to create custom amount split:', error);
      setState(prev => ({
        ...prev,
        errors: [error instanceof PaymentError ? error.message : 'Failed to create custom amount split']
      }));
    }
  }, [totalAmount, updateState]);

  // Split management methods
  const updateSplitPaymentMethod = useCallback((splitId: string, paymentMethod: PaymentMethod) => {
    if (!state.billSplit) return;

    try {
      const updatedSplit = billSplittingService.updateSplitPaymentMethod(
        state.billSplit, 
        splitId, 
        paymentMethod
      );
      updateState(updatedSplit);
    } catch (error) {
      console.error('Failed to update payment method:', error);
    }
  }, [state.billSplit, updateState]);

  const markSplitAsPaid = useCallback((splitId: string, transactionRef?: string) => {
    if (!state.billSplit) return;

    try {
      const updatedSplit = billSplittingService.markSplitAsPaid(
        state.billSplit, 
        splitId, 
        transactionRef
      );
      updateState(updatedSplit);
    } catch (error) {
      console.error('Failed to mark split as paid:', error);
    }
  }, [state.billSplit, updateState]);

  const clearSplit = useCallback(() => {
    updateState(null);
  }, [updateState]);

  // Validation and processing
  const validateSplit = useCallback(() => {
    if (!state.billSplit) return false;
    
    const validation = billSplittingService.validateBillSplit(state.billSplit);
    setState(prev => ({
      ...prev,
      isValid: validation.isValid,
      errors: validation.errors
    }));
    
    return validation.isValid;
  }, [state.billSplit]);

  const getPaymentAllocations = useCallback(() => {
    if (!state.billSplit) return [];
    return billSplittingService.convertToPaymentAllocations(state.billSplit);
  }, [state.billSplit]);

  return {
    ...state,
    createEvenSplit,
    createItemBasedSplit,
    createCustomAmountSplit,
    updateSplitPaymentMethod,
    markSplitAsPaid,
    clearSplit,
    validateSplit,
    getPaymentAllocations,
    canProcessPayment,
    allSplitsCompleted
  };
}

// Simpler hook for basic split scenarios
export function useSimpleBillSplit(totalAmount: number) {
  const { 
    billSplit, 
    createEvenSplit, 
    createCustomAmountSplit, 
    clearSplit,
    isValid,
    errors 
  } = useBillSplitting([], totalAmount);

  return {
    split: billSplit,
    createEvenSplit,
    createCustomSplit: createCustomAmountSplit,
    clearSplit,
    isValid,
    errors,
    hasSplit: billSplit !== null
  };
}

// Hook for tracking split payment progress
export function useSplitPaymentProgress(billSplit: BillSplit | null) {
  const progress = useMemo(() => {
    if (!billSplit) {
      return {
        totalSplits: 0,
        completedSplits: 0,
        pendingSplits: 0,
        progressPercentage: 0,
        isComplete: false
      };
    }

    const totalSplits = billSplit.splits.length;
    const completedSplits = billSplit.splits.filter(s => s.paymentStatus === 'completed').length;
    const pendingSplits = totalSplits - completedSplits;
    const progressPercentage = totalSplits > 0 ? (completedSplits / totalSplits) * 100 : 0;

    return {
      totalSplits,
      completedSplits,
      pendingSplits,
      progressPercentage,
      isComplete: completedSplits === totalSplits && totalSplits > 0
    };
  }, [billSplit]);

  return progress;
}