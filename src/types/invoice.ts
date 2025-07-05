export interface InvoiceData {
  invoice_number: string
  invoice_date: string
  supplier: {
    name: string
    address_line1: string
    address_line2?: string
    tax_id?: string
  }
  items: Array<{
    description: string
    quantity: number
    unit_price: number
    line_total: number
  }>
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  company_info: {
    name: string
    address_line1: string
    address_line2: string
    tax_id: string
  }
}

export interface InvoiceItem {
  description: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface InvoiceSupplier {
  id: string
  name: string
  address_line1: string
  address_line2?: string
  tax_id?: string
}

export interface Invoice {
  id: string
  invoice_number: string
  supplier_id: string
  invoice_date: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  pdf_file_path?: string
  created_at: string
  updated_at: string
} 