// ── Vendor ──────────────────────────────────────────────────────────────────

export interface Vendor {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  notes: string | null;
  is_active: boolean;
  address: string | null;
  tax_id: string | null;
  is_company: boolean;
  is_domestic: boolean;
  created_at: string;
  updated_at: string;
}

export type VendorCreate = Pick<Vendor, 'name'> &
  Partial<Pick<Vendor, 'address' | 'tax_id' | 'is_company' | 'is_domestic'>>;

// ── Bank Transaction (read-only from finance.bank_statement_transactions) ───

export interface BankTransaction {
  id: number;
  transaction_date: string;
  transaction_time: string;
  description: string;
  withdrawal: number;
  deposit: number;
  balance: number;
  channel: string;
  details: string;
  category: string;
  account_number: string;
  account_name: string;
}

// ── Annotation ──────────────────────────────────────────────────────────────

export type VatType = 'none' | 'pp30' | 'pp36';
export type WhtType = 'none' | 'pnd3' | 'pnd53';
export type TransactionType = 'salary' | 'sso' | 'internal_transfer' | 'tax_payment' | 'cash_deposit' | 'sale' | 'credit_card' | 'ewallet' | 'qr_payment';

export interface TransactionAnnotation {
  id: number;
  bank_transaction_id: number;
  vendor_id: string | null;
  vendor_name_override: string | null;
  vat_type: VatType;
  vat_amount: number | null;
  vat_reporting_month: string | null;
  wht_type: WhtType;
  wht_rate: number;
  wht_amount: number | null;
  wht_reporting_month: string | null;
  tax_base: number | null;
  vat_amount_override: boolean;
  wht_amount_override: boolean;
  tax_base_override: boolean;
  invoice_ref: string | null;
  document_url: string | null;
  vendor_receipt_id: string | null;
  transaction_type: TransactionType | null;
  notes: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnnotationUpsert {
  bank_transaction_id: number;
  vendor_id?: string | null;
  vendor_name_override?: string | null;
  vat_type?: VatType;
  vat_amount?: number | null;
  vat_reporting_month?: string | null;
  wht_type?: WhtType;
  wht_rate?: number;
  wht_amount?: number | null;
  wht_reporting_month?: string | null;
  tax_base?: number | null;
  vat_amount_override?: boolean;
  wht_amount_override?: boolean;
  tax_base_override?: boolean;
  invoice_ref?: string | null;
  document_url?: string | null;
  vendor_receipt_id?: string | null;
  transaction_type?: TransactionType | null;
  notes?: string | null;
  updated_by?: string;
}

// ── Combined row for the UI table ───────────────────────────────────────────

export interface AnnotatedTransaction {
  transaction: BankTransaction;
  annotation: TransactionAnnotation | null;
  vendor: Vendor | null;
}

// ── API response types ──────────────────────────────────────────────────────

export interface TransactionsResponse {
  transactions: AnnotatedTransaction[];
  summary: TransactionsSummary;
}

export interface TransactionsSummary {
  total_transactions: number;
  annotated_count: number;
  total_withdrawals: number;
  total_deposits: number;
  // Expense tax breakdown
  vat_pp30: number;
  vat_pp36: number;
  wht_pnd3: number;
  wht_pnd53: number;
  // Revenue breakdown
  revenue_cash: number;
  revenue_qr: number;
  revenue_card_ewallet: number;
}

// ── Invoice extraction ──────────────────────────────────────────────────────

export interface InvoiceExtraction {
  vendor_name: string | null;
  vendor_company_name_en: string | null;
  vendor_address: string | null;
  vendor_tax_id: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  total_amount: number | null;
  tax_base: number | null;
  vat_amount: number | null;
  vat_type: VatType;
  wht_applicable: boolean;
  notes: string | null;
  confidence: 'high' | 'medium' | 'low';
  confidence_explanation: string;
}

// ── Filter state ────────────────────────────────────────────────────────────

export interface ExpenseTrackerFilters {
  month: string; // YYYY-MM
  account: string; // account_number or 'all'
  transactionType: TransactionType | 'all' | 'unset';
  vatType: VatType | 'all';
  whtType: WhtType | 'all';
  showOnlyUnannotated: boolean;
}
