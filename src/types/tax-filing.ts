// ── WHT Filing Entry ────────────────────────────────────────────────────────

export interface WhtEntry {
  id: number;                     // annotation id
  bank_transaction_id: number;
  transaction_date: string;       // YYYY-MM-DD
  vendor_id: string | null;
  vendor_name: string;            // display name from DB
  tax_id: string;                 // payee's 13-digit tax ID
  prefix: string;                 // คุณ, นาย, นาง, etc.
  first_name: string;             // legal first name
  last_name: string;              // legal last name
  address: string;                // full address
  is_company: boolean;
  description: string;            // income type description
  wht_rate: number;               // e.g. 3.00, 5.00
  tax_base: number;               // gross amount
  wht_amount: number;             // WHT deducted
  condition: 1 | 2 | 3;          // 1=standard, 2=bear WHT permanently, 3=bear WHT one-time
  is_complete: boolean;           // all required fields populated
  missing_fields: string[];       // which fields are missing
}

// ── WHT Filing Data (full response) ────────────────────────────────────────

export interface WhtFilingData {
  period: string;                 // YYYY-MM
  form_type: 'pnd3' | 'pnd53';
  company_tax_id: string;        // 0105566207013
  entries: WhtEntry[];
  summary: WhtFilingSummary;
}

export interface WhtFilingSummary {
  total_entries: number;
  total_tax_base: number;
  total_wht: number;
  complete_entries: number;
  incomplete_entries: number;
}

// ── Expense Checklist ─────────────────────────────────────────────────────

export interface ExpenseChecklistItem {
  id: number;                        // annotation id
  bank_transaction_id: number;
  transaction_date: string;          // YYYY-MM-DD
  vendor_name: string;               // resolved display name
  account_number: string;            // '170-3-26995-4' or '170-3-27029-4'
  vat_type: 'none' | 'pp30' | 'pp36';
  vat_amount: number | null;
  wht_type: 'none' | 'pnd3' | 'pnd53';
  wht_amount: number | null;
  tax_base: number | null;
  withdrawal: number;                // bank withdrawal amount
  transaction_type: string | null;
  notes: string | null;
  invoice_ref: string | null;
  document_url: string | null;
  flow_completed: boolean;
}

export interface KbankEdcItem {
  item_key: string;                  // 'kbank_card' | 'kbank_ewallet'
  label: string;                     // 'KBank Card (EDC)' | 'KBank eWallet'
  total_commission: number;          // sum of total_fee_commission_amount
  total_vat: number;                 // sum of vat_on_fee_amount
  total_amount: number;              // commission + vat
  settlement_count: number;
  flow_completed: boolean;
}

export interface ExpenseChecklistSummary {
  total_items: number;               // annotations + kbank + platform fees
  completed_items: number;
  total_expenses: number;            // sum of all withdrawals + kbank + platform fees
  vat_pp30: number;
  vat_pp36: number;
  wht_pnd3: number;
  wht_pnd53: number;
  kbank_commission: number;
  kbank_vat: number;
  platform_fee_vat: number;          // VAT from platform fee receipts
  total_salary: number;
  total_sso: number;
}

// ── Monthly Sales ────────────────────────────────────────────────────────

export interface MonthlySalesLineItem {
  category: string;
  description: string;
  amount: number;
  vat: number;
}

export interface MonthlySalesData {
  pos_credit: number;              // EDC card payments (gross)
  pos_ewallet: number;             // eWallet payments (gross)
  pos_qr: number;                  // QR / bank transfer payments (gross)
  pos_cash: number;                // Cash payments (gross)
  pos_sales_net: number;
  pos_sales_vat: number;
  pos_sales_total: number;
  pos_receipt_count: number;
  other_sales: MonthlySalesLineItem[];
  other_sales_net: number;
  other_sales_vat: number;
  other_sales_total: number;
  total_output_vat: number;
}

// ── Monthly Payroll ──────────────────────────────────────────────────────

export interface MonthlyPayrollData {
  total_salary: number;
  salary_count: number;
  total_sso: number;
  sso_count: number;
}

// ── VAT Summary ──────────────────────────────────────────────────────────

export interface VatSummaryData {
  total_sales_net: number;           // net sales (POS + other)
  output_vat: number;                // sales VAT
  total_purchase_base: number;       // total tax base of VAT-claimed purchases
  input_vat_pp30: number;            // purchase VAT PP30
  input_vat_pp36: number;            // purchase VAT PP36
  excess_carried_forward: number;    // from previous period (0 for now)
  tax_to_be_paid: number;            // positive = pay, 0 if credit
  excess_to_be_claimed: number;      // positive = claim, 0 if payable
}

// ── Platform Fees (GoWabi, etc.) ──────────────────────────────────────────

export interface PlatformFeeItem {
  item_key: string;                    // vendor-based key, e.g. 'pf_gowabi'
  vendor_id: string;                   // vendor UUID
  label: string;                       // vendor name / display label
  total_amount: number;                // from vendor receipt (0 if no receipt)
  vat_amount: number;                  // from vendor receipt (0 if no receipt)
  tax_base: number;                    // from vendor receipt (0 if no receipt)
  vat_type: 'pp30' | 'pp36' | 'none';
  vendor_receipt_id: string | null;    // null = no receipt uploaded yet
  receipt_date: string | null;         // from vendor receipt
  invoice_ref: string | null;          // from vendor receipt invoice_number
  flow_completed: boolean;
  has_receipt: boolean;                // whether a receipt is linked
}

// ── Bank Account Balance (for Trial Balance) ─────────────────────────────

export interface BankAccountBalance {
  account_number: string;
  account_name: string;
  beginning_balance: number;
  ending_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  transaction_count: number;
}

export interface ExpenseChecklistData {
  period: string;
  items: ExpenseChecklistItem[];
  kbank_edc: KbankEdcItem[];
  platform_fees: PlatformFeeItem[];
  sales: MonthlySalesData;
  payroll: MonthlyPayrollData;
  vat_summary: VatSummaryData;
  summary: ExpenseChecklistSummary;
  bank_balances: BankAccountBalance[];
}

// ── Vendor Tax Info Update ─────────────────────────────────────────────────

export interface VendorTaxUpdate {
  vendor_id: string;
  tax_id?: string;
  address?: string;
  tax_first_name?: string;
  tax_last_name?: string;
  prefix?: string;
  is_company?: boolean;
}
