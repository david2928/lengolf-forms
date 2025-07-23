// Bill Splitting Service
// Handles complex bill splitting scenarios for group payments

import { 
  BillSplit, 
  BillSplitPart, 
  BillSplitType, 
  PaymentAllocation, 
  PaymentMethod,
  PaymentError 
} from '@/types/payment';
import { OrderItem } from '@/types/pos';
import { validateSplitPayments } from '@/config/payment-methods';

export class BillSplittingService {
  
  /**
   * Create an even split for a group
   */
  createEvenSplit(
    totalAmount: number, 
    numberOfPeople: number, 
    defaultPaymentMethod: PaymentMethod = PaymentMethod.CASH
  ): BillSplit {
    if (numberOfPeople < 2) {
      throw new PaymentError('Even split requires at least 2 people');
    }
    
    if (totalAmount <= 0) {
      throw new PaymentError('Total amount must be greater than zero');
    }
    
    const amountPerPerson = Math.round((totalAmount / numberOfPeople) * 100) / 100;
    const remainder = Math.round((totalAmount - (amountPerPerson * numberOfPeople)) * 100) / 100;
    
    const splits: BillSplitPart[] = [];
    
    for (let i = 0; i < numberOfPeople; i++) {
      const amount = i === 0 ? amountPerPerson + remainder : amountPerPerson; // Add remainder to first person
      
      splits.push({
        id: `split-${i + 1}`,
        customerInfo: `Person ${i + 1}`,
        items: [], // Will be populated if needed
        amount: amount,
        paymentMethod: defaultPaymentMethod,
        paymentStatus: 'pending'
      });
    }
    
    return {
      id: `even-split-${Date.now()}`,
      type: BillSplitType.EVEN,
      totalAmount,
      splits
    };
  }
  
  /**
   * Create item-based split where specific items are assigned to each person
   */
  createItemBasedSplit(
    orderItems: OrderItem[], 
    itemAllocations: { [personId: string]: string[] }, // personId -> itemIds[]
    defaultPaymentMethod: PaymentMethod = PaymentMethod.CASH
  ): BillSplit {
    const allItemIds = orderItems.map(item => item.id);
    const allocatedItemIds = Object.values(itemAllocations).flat();
    
    // Validate all items are allocated
    const unallocatedItems = allItemIds.filter(id => !allocatedItemIds.includes(id));
    if (unallocatedItems.length > 0) {
      throw new PaymentError(`Some items are not allocated: ${unallocatedItems.join(', ')}`);
    }
    
    // Validate no item is double-allocated
    const duplicateItems = allocatedItemIds.filter((id, index) => allocatedItemIds.indexOf(id) !== index);
    if (duplicateItems.length > 0) {
      throw new PaymentError(`Items are allocated to multiple people: ${duplicateItems.join(', ')}`);
    }
    
    const totalAmount = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const splits: BillSplitPart[] = [];
    
    Object.entries(itemAllocations).forEach(([personId, itemIds], index) => {
      const personItems = orderItems.filter(item => itemIds.includes(item.id));
      const personAmount = personItems.reduce((sum, item) => sum + item.totalPrice, 0);
      
      if (personAmount > 0) {
        splits.push({
          id: personId,
          customerInfo: `Person ${index + 1}`,
          items: itemIds,
          amount: personAmount,
          paymentMethod: defaultPaymentMethod,
          paymentStatus: 'pending'
        });
      }
    });
    
    return {
      id: `item-split-${Date.now()}`,
      type: BillSplitType.BY_ITEM,
      totalAmount,
      splits
    };
  }
  
  /**
   * Create custom amount split where each person pays a specific amount
   */
  createCustomAmountSplit(
    totalAmount: number,
    customAmounts: { personId: string; amount: number; customerInfo?: string }[],
    defaultPaymentMethod: PaymentMethod = PaymentMethod.CASH
  ): BillSplit {
    const allocatedTotal = customAmounts.reduce((sum, allocation) => sum + allocation.amount, 0);
    
    // Validate amounts
    const validation = validateSplitPayments(
      customAmounts.map(a => ({ method: defaultPaymentMethod, amount: a.amount })),
      totalAmount
    );
    
    if (!validation.isValid) {
      throw new PaymentError(validation.error || 'Invalid custom amount split');
    }
    
    const splits: BillSplitPart[] = customAmounts.map((allocation, index) => ({
      id: allocation.personId,
      customerInfo: allocation.customerInfo || `Person ${index + 1}`,
      items: [], // Custom amounts don't track specific items
      amount: allocation.amount,
      paymentMethod: defaultPaymentMethod,
      paymentStatus: 'pending'
    }));
    
    return {
      id: `custom-split-${Date.now()}`,
      type: BillSplitType.BY_AMOUNT,
      totalAmount,
      splits
    };
  }
  
  /**
   * Update payment method for a specific split
   */
  updateSplitPaymentMethod(
    billSplit: BillSplit, 
    splitId: string, 
    paymentMethod: PaymentMethod
  ): BillSplit {
    const updatedSplits = billSplit.splits.map(split => 
      split.id === splitId 
        ? { ...split, paymentMethod, paymentStatus: 'pending' as const }
        : split
    );
    
    return {
      ...billSplit,
      splits: updatedSplits
    };
  }
  
  /**
   * Mark a split as paid
   */
  markSplitAsPaid(
    billSplit: BillSplit, 
    splitId: string, 
    transactionRef?: string
  ): BillSplit {
    const updatedSplits = billSplit.splits.map(split => 
      split.id === splitId 
        ? { 
            ...split, 
            paymentStatus: 'completed' as const,
            ...(transactionRef && { transactionRef })
          }
        : split
    );
    
    return {
      ...billSplit,
      splits: updatedSplits
    };
  }
  
  /**
   * Convert bill split to payment allocations for processing
   */
  convertToPaymentAllocations(billSplit: BillSplit): PaymentAllocation[] {
    // Group splits by payment method
    const methodGroups = billSplit.splits.reduce((groups, split) => {
      const method = split.paymentMethod;
      if (!groups[method]) {
        groups[method] = 0;
      }
      groups[method] += split.amount;
      return groups;
    }, {} as Record<PaymentMethod, number>);
    
    return Object.entries(methodGroups).map(([method, amount]) => ({
      method: method as PaymentMethod,
      amount
    }));
  }
  
  /**
   * Validate bill split is ready for processing
   */
  validateBillSplit(billSplit: BillSplit): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check all splits have valid amounts
    for (const split of billSplit.splits) {
      if (split.amount <= 0) {
        errors.push(`Split ${split.customerInfo} has invalid amount: ฿${split.amount}`);
      }
    }
    
    // Check total matches
    const splitTotal = billSplit.splits.reduce((sum, split) => sum + split.amount, 0);
    const difference = Math.abs(splitTotal - billSplit.totalAmount);
    if (difference > 0.01) {
      errors.push(`Split total (฿${splitTotal.toFixed(2)}) does not match bill total (฿${billSplit.totalAmount.toFixed(2)})`);
    }
    
    // Check for payment methods
    const unprocessedSplits = billSplit.splits.filter(split => split.paymentStatus === 'pending');
    if (unprocessedSplits.length === 0 && billSplit.splits.length > 0) {
      // All splits processed - this is valid
    } else if (unprocessedSplits.length === billSplit.splits.length) {
      // No splits processed yet - this is also valid for starting payment
    } else {
      errors.push('Some splits are processed while others are pending. Complete all splits before finalizing.');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Get bill split summary for display
   */
  getBillSplitSummary(billSplit: BillSplit): {
    totalAmount: number;
    numberOfSplits: number;
    completedSplits: number;
    pendingSplits: number;
    paymentMethods: { method: PaymentMethod; amount: number; count: number }[];
  } {
    const completedSplits = billSplit.splits.filter(s => s.paymentStatus === 'completed').length;
    const pendingSplits = billSplit.splits.filter(s => s.paymentStatus === 'pending').length;
    
    // Group by payment method
    const methodGroups = billSplit.splits.reduce((groups, split) => {
      const method = split.paymentMethod;
      if (!groups[method]) {
        groups[method] = { amount: 0, count: 0 };
      }
      groups[method].amount += split.amount;
      groups[method].count += 1;
      return groups;
    }, {} as Record<PaymentMethod, { amount: number; count: number }>);
    
    const paymentMethods = Object.entries(methodGroups).map(([method, data]) => ({
      method: method as PaymentMethod,
      amount: data.amount,
      count: data.count
    }));
    
    return {
      totalAmount: billSplit.totalAmount,
      numberOfSplits: billSplit.splits.length,
      completedSplits,
      pendingSplits,
      paymentMethods
    };
  }
}

// Export singleton instance
export const billSplittingService = new BillSplittingService();