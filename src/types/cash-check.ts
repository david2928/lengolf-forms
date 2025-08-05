// Cash Check Type Definitions

export interface CashCheck {
  id: string;
  timestamp: string;
  staff: string;
  amount: number;
  created_at: string;
}

// Staff options matching the Google Form
export const CASH_CHECK_STAFF_OPTIONS = ['Dolly', 'Net', 'May'] as const;
export type CashCheckStaff = typeof CASH_CHECK_STAFF_OPTIONS[number];

// Form data for submission
export interface CashCheckFormData {
  staff: string;
  amount: number;
}

// API request/response types
export interface CreateCashCheckRequest {
  staff: string;
  amount: number;
}

export interface CreateCashCheckResponse {
  success: boolean;
  cash_check?: CashCheck;
  error?: string;
}