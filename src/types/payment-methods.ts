// Payment Methods Types - Database-driven enum system

export interface PaymentMethodConfig {
  code: string;
  display_name: string;
  group_code: string;
  group_name: string;
  database_value: string;
  requires_amount_input: boolean;
  supports_split_payment: boolean;
  icon_name: string;
  color_class: string;
  instructions: string;
}

export interface PaymentMethodGroup {
  group_code: string;
  group_name: string;
  methods: PaymentMethodConfig[];
}

export interface PaymentMethodsResponse {
  success: boolean;
  payment_methods: PaymentMethodConfig[];
  grouped_methods: PaymentMethodGroup[];
}

// Standard payment method codes
export enum PaymentMethodCode {
  CASH = 'CASH',
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  PROMPTPAY = 'PROMPTPAY',
  ALIPAY = 'ALIPAY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER'
}

// Payment method groups
export enum PaymentMethodGroupCode {
  CASH = 'CASH',
  CREDIT_CARD = 'CREDIT_CARD',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
  BANK_TRANSFER = 'BANK_TRANSFER',
  OTHER = 'OTHER'
}

// Database values (what gets stored in transaction_payments.payment_method)
export enum DatabasePaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  QR_CODE = 'qr_code',
  BANK_TRANSFER = 'bank_transfer',
  OTHER = 'other'
}

// Legacy payment method mapping for backward compatibility
export const LEGACY_PAYMENT_METHODS = {
  'Cash': PaymentMethodCode.CASH,
  'Visa Manual': PaymentMethodCode.VISA,
  'Mastercard Manual': PaymentMethodCode.MASTERCARD,
  'PromptPay Manual': PaymentMethodCode.PROMPTPAY,
  'Alipay1': PaymentMethodCode.ALIPAY,
  'QR Payment': PaymentMethodCode.PROMPTPAY,
} as const;

export type LegacyPaymentMethodName = keyof typeof LEGACY_PAYMENT_METHODS;