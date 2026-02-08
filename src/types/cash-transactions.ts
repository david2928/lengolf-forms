export interface CashTransaction {
  id: string
  transaction_date: string
  staff_name: string
  spending_type: string
  amount: number
  file_url: string
  file_id: string | null
  file_name: string | null
  notes: string | null
  submitted_by: string | null
  source: 'form' | 'csv_import'
  original_drive_url: string | null
  created_at: string
  updated_at: string
}

export const SPENDING_TYPES = [
  'Ice delivery',
  'Poster / Printing',
  'Drinks',
  'Cleaning supplies',
  'Voucher printing',
  'Government fees',
  'Equipment / Tools',
  'Transportation',
  'Golf supplies',
  'Office supplies',
  'Postal / Delivery',
  'Refund',
  'Menu',
  'Other',
] as const

export type SpendingType = typeof SPENDING_TYPES[number]

// Re-export shared constants from vendor-receipts
export { ALLOWED_RECEIPT_TYPES, MAX_RECEIPT_FILE_SIZE } from './vendor-receipts'

// Staff options extended with Mind
export const CASH_STAFF_OPTIONS = ['Net', 'Dolly', 'May', 'Mind'] as const
export type CashStaffName = typeof CASH_STAFF_OPTIONS[number]
