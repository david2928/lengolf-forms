// PromptPay Configuration for Lengolf Club
// This file contains the business account information for PromptPay QR generation

import { PromptPayConfig } from '@/types/payment';

// Environment-based PromptPay configuration
export const PROMPTPAY_CONFIG: PromptPayConfig = {
  // Business phone number (backup option)
  phoneNumber: process.env.PROMPTPAY_PHONE_NUMBER || undefined,
  
  // Corporate tax ID for business (primary option)
  nationalId: process.env.PROMPTPAY_NATIONAL_ID || '105566207013',
  
  // Alternative: E-Wallet ID (if available)
  eWalletId: process.env.PROMPTPAY_EWALLET_ID || undefined
};

// QR Code generation settings
export const QR_CODE_CONFIG = {
  // QR code image settings
  errorCorrectionLevel: 'M' as const,
  width: 256,
  margin: 2,
  color: {
    dark: '#000000',
    light: '#FFFFFF'
  },
  
  // PromptPay specific settings
  defaultCurrency: 'THB',
  maxAmount: 999999.99,
  minAmount: 0.01,
  
  // QR code expiration (5 minutes)
  expirationMinutes: 5
};

// Validation functions
export function validatePromptPayConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!PROMPTPAY_CONFIG.phoneNumber && !PROMPTPAY_CONFIG.nationalId && !PROMPTPAY_CONFIG.eWalletId) {
    errors.push('At least one PromptPay identifier (phone, national ID, or e-wallet ID) must be configured');
  }
  
  if (PROMPTPAY_CONFIG.phoneNumber) {
    // Validate Thai phone number format (remove leading 0, should be 9 digits)
    const cleanPhone = PROMPTPAY_CONFIG.phoneNumber.replace(/^0+/, '');
    if (!/^\d{9}$/.test(cleanPhone)) {
      errors.push('Phone number must be in valid Thai format (9 digits after removing leading zeros)');
    }
  }
  
  if (PROMPTPAY_CONFIG.nationalId) {
    // Validate Thai national ID format (12-13 digits for corporate tax ID)
    const cleanId = PROMPTPAY_CONFIG.nationalId.replace(/[^0-9]/g, '');
    if (!/^\d{12,13}$/.test(cleanId)) {
      errors.push('National ID must be 12-13 digits (corporate tax ID format)');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

export function formatPhoneForPromptPay(phone: string): string {
  // Remove leading zeros and non-digit characters
  const cleanPhone = phone.replace(/^0+/, '').replace(/[^0-9]/g, '');
  
  // Ensure it's 9 digits
  if (cleanPhone.length !== 9) {
    throw new Error('Invalid phone number format for PromptPay');
  }
  
  return cleanPhone;
}

// Environment variables to add to .env.local:
export const REQUIRED_ENV_VARS = [
  'PROMPTPAY_NATIONAL_ID', // Corporate tax ID for business PromptPay (primary)
  // Optional alternatives:
  // 'PROMPTPAY_PHONE_NUMBER', // Business phone number
  // 'PROMPTPAY_EWALLET_ID'
];

// Development/testing configuration
export const DEV_PROMPTPAY_CONFIG: PromptPayConfig = {
  phoneNumber: undefined, 
  nationalId: '105566207013', // Lengolf corporate tax ID
  eWalletId: undefined
};

// Use development config in development mode
export const getPromptPayConfig = (): PromptPayConfig => {
  if (process.env.NODE_ENV === 'development') {
    return DEV_PROMPTPAY_CONFIG;
  }
  return PROMPTPAY_CONFIG;
};