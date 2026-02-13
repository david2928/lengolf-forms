export interface Vendor {
  id: string
  name: string
  category: string | null
  notes: string | null
  is_active: boolean
  address: string | null
  tax_id: string | null
  is_company: boolean
  is_domestic: boolean
  created_at: string
  updated_at: string
}

export interface VendorReceipt {
  id: string
  vendor_id: string
  receipt_date: string | null
  file_url: string
  file_id: string | null
  file_name: string | null
  submitted_by: string | null
  notes: string | null
  // Extraction fields
  invoice_number: string | null
  invoice_date: string | null
  total_amount: number | null
  tax_base: number | null
  vat_amount: number | null
  vat_type: string | null
  wht_applicable: boolean
  extraction_confidence: 'high' | 'medium' | 'low' | null
  extracted_vendor_name: string | null
  extracted_company_name_en: string | null
  extracted_address: string | null
  extracted_tax_id: string | null
  extraction_model: string | null
  extracted_at: string | null
  extraction_notes: string | null
  confidence_explanation: string | null
  created_at: string
  updated_at: string
}

export interface VendorReceiptWithVendor extends VendorReceipt {
  vendor_name: string
  vendor_category: string | null
}

export const VENDOR_CATEGORIES = [
  'Grocery',
  'F&B Supply',
  'Office',
  'Delivery',
  'Rent',
  'Utilities',
  'Other',
] as const

export type VendorCategory = typeof VENDOR_CATEGORIES[number]

export const ALLOWED_RECEIPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const

export const MAX_RECEIPT_FILE_SIZE = 10 * 1024 * 1024 // 10MB
