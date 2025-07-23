import { PaymentMethod, PaymentMethodConfig } from '@/types/payment';

export const PAYMENT_METHOD_CONFIGS: Record<PaymentMethod, PaymentMethodConfig> = {
  [PaymentMethod.CASH]: {
    method: PaymentMethod.CASH,
    displayName: 'Cash',
    icon: 'Banknote',
    color: 'bg-green-500',
    requiresAmount: true,
    requiresConfirmation: true,
    supportsPartialPayment: true,
    instructions: 'Enter amount received from customer'
  },
  
  [PaymentMethod.VISA_MANUAL]: {
    method: PaymentMethod.VISA_MANUAL,
    displayName: 'Visa (EDC)',
    icon: 'CreditCard',
    color: 'bg-blue-600',
    requiresAmount: false,
    requiresConfirmation: true,
    supportsPartialPayment: true,
    instructions: 'Process payment via EDC machine, then confirm completion'
  },
  
  [PaymentMethod.MASTERCARD_MANUAL]: {
    method: PaymentMethod.MASTERCARD_MANUAL,
    displayName: 'Mastercard (EDC)',
    icon: 'CreditCard',
    color: 'bg-red-600',
    requiresAmount: false,
    requiresConfirmation: true,
    supportsPartialPayment: true,
    instructions: 'Process payment via EDC machine, then confirm completion'
  },
  
  [PaymentMethod.PROMPTPAY_MANUAL]: {
    method: PaymentMethod.PROMPTPAY_MANUAL,
    displayName: 'PromptPay',
    icon: 'QrCode',
    color: 'bg-purple-600',
    requiresAmount: false,
    requiresConfirmation: true,
    supportsPartialPayment: true,
    instructions: 'Show QR code to customer, confirm when payment received'
  },
  
  [PaymentMethod.ALIPAY]: {
    method: PaymentMethod.ALIPAY,
    displayName: 'Alipay',
    icon: 'Smartphone',
    color: 'bg-blue-500',
    requiresAmount: false,
    requiresConfirmation: true,
    supportsPartialPayment: true,
    instructions: 'Scan customer\'s Alipay QR code, then confirm completion'
  }
};

// Payment method order for UI display
export const PAYMENT_METHOD_ORDER: PaymentMethod[] = [
  PaymentMethod.CASH,
  PaymentMethod.PROMPTPAY_MANUAL,
  PaymentMethod.VISA_MANUAL,
  PaymentMethod.MASTERCARD_MANUAL,
  PaymentMethod.ALIPAY
];

// Validation rules
export const PAYMENT_VALIDATION_RULES = {
  minAmount: 0.01,
  maxAmount: 999999.99,
  maxSplitPayments: 5,
  
  // Cash specific
  cashRoundingUnit: 0.25, // Round to nearest 25 satang
  maxCashAmount: 50000,
  
  // Split payment rules
  splitPaymentMinAmount: 1.00,
  splitPaymentTolerance: 0.01 // Allow 1 satang difference due to rounding
};

// Receipt configuration
export const RECEIPT_CONFIG = {
  businessInfo: {
    name: 'Lengolf Club',
    address: '123 Golf Course Road, Bangkok 10110',
    taxId: '0-1234-56789-01-2',
    phone: '+66-2-123-4567'
  },
  
  // Thai VAT rate
  vatRate: 0.07,
  
  // Receipt number format: R20250119-0001
  receiptNumberFormat: 'R{YYYYMMDD}-{####}',
  
  footer: {
    thankYouMessage: 'Thank you for visiting Lengolf Club!',
    returnPolicy: 'No refunds without receipt. Valid for 7 days.'
  }
};

// Helper functions
export function getPaymentMethodConfig(method: PaymentMethod): PaymentMethodConfig {
  return PAYMENT_METHOD_CONFIGS[method];
}

export function isValidPaymentMethod(method: string): method is PaymentMethod {
  return Object.values(PaymentMethod).includes(method as PaymentMethod);
}

export function formatPaymentMethodString(allocations: { method: PaymentMethod; amount: number }[]): string {
  if (allocations.length === 1) {
    return allocations[0].method;
  }
  
  // Format for split payments: "Cash: ฿180.00; Visa Manual: ฿500.00"
  return allocations
    .map(allocation => `${allocation.method}: ฿${allocation.amount.toFixed(2)}`)
    .join('; ');
}

export function validatePaymentAmount(amount: number): { isValid: boolean; error?: string } {
  if (amount < PAYMENT_VALIDATION_RULES.minAmount) {
    return { isValid: false, error: `Amount must be at least ฿${PAYMENT_VALIDATION_RULES.minAmount}` };
  }
  
  if (amount > PAYMENT_VALIDATION_RULES.maxAmount) {
    return { isValid: false, error: `Amount cannot exceed ฿${PAYMENT_VALIDATION_RULES.maxAmount}` };
  }
  
  return { isValid: true };
}

export function validateSplitPayments(
  allocations: { method: PaymentMethod; amount: number }[], 
  totalAmount: number
): { isValid: boolean; error?: string } {
  if (allocations.length > PAYMENT_VALIDATION_RULES.maxSplitPayments) {
    return { 
      isValid: false, 
      error: `Cannot split payment into more than ${PAYMENT_VALIDATION_RULES.maxSplitPayments} methods` 
    };
  }
  
  const allocatedTotal = allocations.reduce((sum, allocation) => sum + allocation.amount, 0);
  const difference = Math.abs(allocatedTotal - totalAmount);
  
  if (difference > PAYMENT_VALIDATION_RULES.splitPaymentTolerance) {
    return { 
      isValid: false, 
      error: `Payment allocation (฿${allocatedTotal.toFixed(2)}) does not match total amount (฿${totalAmount.toFixed(2)})` 
    };
  }
  
  // Check individual allocation amounts
  for (const allocation of allocations) {
    if (allocation.amount < PAYMENT_VALIDATION_RULES.splitPaymentMinAmount) {
      return { 
        isValid: false, 
        error: `Each payment method must be at least ฿${PAYMENT_VALIDATION_RULES.splitPaymentMinAmount}` 
      };
    }
  }
  
  return { isValid: true };
}

export function roundCashAmount(amount: number): number {
  const roundingUnit = PAYMENT_VALIDATION_RULES.cashRoundingUnit;
  return Math.round(amount / roundingUnit) * roundingUnit;
}