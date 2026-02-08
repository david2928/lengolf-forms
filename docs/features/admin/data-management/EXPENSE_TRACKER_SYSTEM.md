# Transaction Tracker System

**Status**: Implemented
**Type**: Administrative Tool
**Access Level**: Admin Only
**Last Updated**: February 2026

## Overview

The Transaction Tracker is a bank transaction annotation system that replaces the manual Excel-based workflow (`2026_Transaction Tracker.xlsb`). It enables staff to annotate imported KBank bank statement transactions with vendor details, Thai VAT (PP30/PP36), withholding tax (PND3/PND53), and transaction type classifications directly in the web UI.

Bank transactions are auto-imported into `finance.bank_statement_transactions` by the KBank scraper pipeline. This feature adds an inline-editable table UI to annotate those transactions, with AI-powered invoice extraction to auto-fill fields from uploaded PDF/image invoices.

### Key Features

- **Inline Transaction Annotation**: Click-to-edit cells for vendor, VAT, WHT, invoice ref, notes, and transaction type
- **Thai Tax Calculations**: Automatic VAT (PP30/PP36) and WHT (PND3/PND53) calculation with manual override support
- **Vendor Management**: Autocomplete search, inline creation, and detail popover with address/tax ID for Flow Account copy
- **AI Invoice Extraction**: Upload PDF/image invoices for GPT-powered field extraction (vendor, amounts, VAT, dates)
- **Google Drive Integration**: Extracted invoices auto-upload to organized Drive folders (VAT/WHT by date and vendor)
- **Multi-Filter System**: Filter by month, bank account, transaction type, VAT type, WHT type, and annotation status
- **KPI Dashboard**: Bank withdrawals/deposits overview with expense tax breakdown (PP30/PP36/PND3/PND53) and deposit breakdown (QR/Card+eWallet/Other)
- **Debounced Auto-Save**: Changes auto-save after 500ms with optimistic UI updates

## Business Context

### Why This Feature Exists

Lengolf tracks all business expenses and revenue through two KBank accounts. Previously, the accountant manually annotated each bank transaction in an Excel workbook to:
1. Assign vendors and invoice references
2. Calculate VAT amounts for PP30 (domestic purchases) and PP36 (foreign/reverse charge services)
3. Calculate withholding tax for PND3 (individual vendors) and PND53 (company vendors)
4. Categorize transaction types (salary, SSO, tax payments, revenue deposits, etc.)
5. Prepare data for monthly tax filings via Flow Account

This web UI automates the calculations, provides vendor autocomplete, and uses AI to extract invoice data - reducing annotation time per transaction from minutes to seconds.

### Bank Accounts

| Account Number | Name | Primary Use |
|---|---|---|
| `170-3-27029-4` | Savings (29-4) | Revenue deposits, cash deposits, capital transfers |
| `170-3-26995-4` | Current (95-4) | Vendor payments, salary, SSO, tax payments |

### Thai Tax System Reference

#### VAT (Value Added Tax)

| Type | Code | Rate | Calculation | Use Case |
|---|---|---|---|---|
| PP30 | `pp30` | 7% included | `VAT = amount - (amount / 1.07)` | Domestic purchases (most common) |
| PP36 | `pp36` | 7% extra | `VAT = amount * 0.07` | Foreign/reverse charge services |
| None | `none` | - | - | No VAT applicable |

- PP30: The 7% VAT is already included in the payment amount (Thai domestic standard)
- PP36: The 7% VAT is calculated on top of the payment amount (reverse charge for foreign services)
- **PP36 offset month and PP30 deduction**: PP36 filed in January covers December foreign invoices. The PP36 VAT is **paid** in January. When preparing the January PP30 (filed in February), that PP36 tax paid in January is deducted as additional input VAT. The `vat_reporting_month` in the annotation = the month the PP36 was filed/paid = the PP30 month it will be deducted from (NOT the invoice month).

#### WHT (Withholding Tax)

| Type | Code | Default Rate | Calculation | Use Case |
|---|---|---|---|---|
| PND3 | `pnd3` | 3% | `WHT = amount * rate / (100 - rate)` | Individual/sole proprietor vendors |
| PND53 | `pnd53` | 3% | `WHT = amount * rate / (100 - rate)` | Company/corporate vendors |
| None | `none` | - | - | No WHT applicable |

- Rate is configurable (default 3%, but can be 1%, 2%, 5%, etc. depending on service type)
- Common rates: 3% for professional services/contractors, 5% for rent/entertainment/performances
- WHT formula: For 3%, `WHT = amount * 3 / 97`

**"Bear WHT" Arrangements:**
Some payees negotiate to receive the full agreed amount without WHT deduction. In this case, Lengolf pays the WHT on top:
- Bank withdrawal = tax_base (full payment, no deduction)
- WHT = tax_base * rate% (additional cost to Lengolf)
- Example: DJ paid 7,500 at 5% = WHT 375 paid separately by Lengolf, total cost 7,875
- In the annotation, set `tax_base` = bank withdrawal amount, `wht_amount` = the WHT borne by Lengolf, and use `tax_base_override = true` / `wht_amount_override = true` since the standard formula assumes WHT was deducted from the payment

#### Tax Base Derivation

The tax base depends on which taxes apply:

| Scenario | Formula |
|---|---|
| No VAT, no WHT | `amount` |
| PP30 only | `amount - VAT` |
| PP36 only | `amount + VAT` |
| WHT only | `amount + WHT` |
| PP30 + WHT | `amount - VAT + WHT` |
| PP36 + WHT | `amount + VAT + WHT` |

### Transaction Types

Transactions are classified into income and expense categories:

**Income Types** (deposits):
| Type | Code | Description |
|---|---|---|
| Card | `credit_card` | EDC credit/debit card settlements from K-Merchant |
| eWallet | `ewallet` | Alipay/WeChat settlements from K-Merchant |
| QR/Transfer | `qr_payment` | PromptPay QR and direct bank transfers |
| Cash Deposit | `cash_deposit` | Physical cash deposited from register |
| Sale | `sale` | Other sales revenue |

**Expense Types** (withdrawals):
| Type | Code | Description |
|---|---|---|
| Salary | `salary` | Employee salary payments |
| SSO | `sso` | Social Security Office contributions |
| Tax Payment | `tax_payment` | Government tax payments |
| Internal Transfer | `internal_transfer` | Money moving between own accounts |

### KPI Calculations

- **Bank Withdrawals**: Sum of ALL withdrawal amounts (no exclusions)
- **Bank Deposits**: Sum of deposits EXCLUDING `internal_transfer` and `cash_deposit` (these are not new revenue - cash deposits are register cash moving to bank, internal transfers are between own accounts)
- **Expense Tax Breakdown**: Sum of VAT/WHT amounts by type from annotated transactions
- **Deposit Breakdown**: QR/Transfer + Card/eWallet + Other (unclassified deposits)

## System Architecture

### Component Architecture

```
app/admin/expense-tracker/
  page.tsx                              # Server component wrapper

src/components/admin/expense-tracker/
  ExpenseTrackerPage.tsx                # Main orchestrator (state, fetch, layout)
  ExpenseTrackerFilters.tsx             # Month, account, type, VAT, WHT filters
  ExpenseTrackerKPIs.tsx                # Summary cards with tax/deposit breakdowns
  ExpenseTrackerTable.tsx               # Table shell with sticky headers
  ExpenseTrackerRow.tsx                 # Inline-editable row (most complex, ~690 lines)
  VendorCombobox.tsx                    # Popover+Command autocomplete with creation
  VendorDetailPopover.tsx               # Edit vendor address/tax ID, copy buttons
  InvoiceUploadButton.tsx               # PDF/image upload with AI model selector
  TaxCalculator.ts                      # Pure functions for VAT/WHT/Tax Base calc
```

### API Routes

```
app/api/admin/expense-tracker/
  transactions/route.ts     # GET - Fetch transactions + annotations for month
  annotations/route.ts      # PUT - Upsert annotation for a transaction
  vendors/route.ts          # GET/POST/PUT - Search, create, update vendors
  extract-invoice/route.ts  # POST - AI invoice extraction via OpenAI Vision
```

### Database Tables

```
finance.bank_statement_transactions     # Bank statement import (read-only)
finance.transaction_annotations         # User annotations (1:1 with bank transactions)
finance.merchant_transaction_summaries  # KBank EDC fees (separate input VAT source for PP30)
backoffice.vendors                      # Vendor master data
```

### Data Flow

```
KBank CSV ──[scraper]──> finance.bank_statement_transactions
                              │
                              ├──[GET /transactions]──> UI Table
                              │
                              ├──[PUT /annotations]──> finance.transaction_annotations
                              │
                              └──[POST /extract-invoice]──> OpenAI Vision ──> Auto-fill fields
                                                                │
                                                                └──> Google Drive (organized folders)
```

## API Reference

### GET `/api/admin/expense-tracker/transactions`

Fetches bank transactions with their annotations and vendor details for a given month.

**Query Parameters:**
| Param | Required | Format | Description |
|---|---|---|---|
| `month` | Yes | `YYYY-MM` | Month to fetch transactions for |
| `account` | No | Account number or `all` | Filter by bank account (default: `all`) |

**Response:**
```json
{
  "transactions": [
    {
      "transaction": {
        "id": 875,
        "transaction_date": "2026-01-01",
        "transaction_time": "08:30:00",
        "description": "Transfer Deposit",
        "withdrawal": 0,
        "deposit": 15000.00,
        "balance": 250000.00,
        "channel": "K PLUS",
        "details": "...",
        "category": "Transfer",
        "account_number": "170-3-27029-4",
        "account_name": "Savings"
      },
      "annotation": {
        "id": 1,
        "bank_transaction_id": 875,
        "vendor_id": null,
        "vat_type": "none",
        "wht_type": "none",
        "transaction_type": "qr_payment",
        "...": "..."
      },
      "vendor": null
    }
  ],
  "summary": {
    "total_transactions": 150,
    "annotated_count": 150,
    "total_withdrawals": 85000.00,
    "total_deposits": 434793.28,
    "vat_pp30": 12500.00,
    "vat_pp36": 800.00,
    "wht_pnd3": 1200.00,
    "wht_pnd53": 3500.00,
    "revenue_cash": 0,
    "revenue_qr": 110989.30,
    "revenue_card_ewallet": 315198.33
  }
}
```

### PUT `/api/admin/expense-tracker/annotations`

Upserts an annotation for a bank transaction. Uses `bank_transaction_id` as the conflict key.

**Request Body:**
```json
{
  "bank_transaction_id": 875,
  "vendor_id": "abc-123",
  "vendor_name_override": null,
  "vat_type": "pp30",
  "vat_amount": 654.21,
  "vat_reporting_month": "2026-01",
  "wht_type": "pnd53",
  "wht_rate": 3,
  "wht_amount": 289.07,
  "wht_reporting_month": "2026-01",
  "tax_base": 9634.86,
  "vat_amount_override": false,
  "wht_amount_override": false,
  "tax_base_override": false,
  "invoice_ref": "INV-2026-001",
  "document_url": "https://drive.google.com/...",
  "transaction_type": "sale",
  "notes": "Office supplies"
}
```

**Whitelisted Fields:** `vendor_id`, `vendor_name_override`, `vat_type`, `vat_amount`, `vat_reporting_month`, `wht_type`, `wht_rate`, `wht_amount`, `wht_reporting_month`, `tax_base`, `vat_amount_override`, `wht_amount_override`, `tax_base_override`, `invoice_ref`, `document_url`, `transaction_type`, `notes`

**Audit Fields:** `created_by` set on first insert, `updated_by` set on every upsert (from session email).

### GET `/api/admin/expense-tracker/vendors`

Search vendors by name with autocomplete.

**Query Parameters:**
| Param | Required | Description |
|---|---|---|
| `q` | No | Search term (case-insensitive, partial match). Empty returns recent vendors. |

**Response:**
```json
{
  "vendors": [
    { "id": "abc-123", "name": "Pizza Company", "address": "123 Bangkok", "tax_id": "0105560000001", "is_company": true }
  ]
}
```

### POST `/api/admin/expense-tracker/vendors`

Create a new vendor or fill blank fields on an existing vendor (smart upsert - never overwrites existing data).

**Request Body:**
```json
{
  "name": "New Vendor Co.",
  "address": "456 Bangkok",
  "tax_id": "0105560000002",
  "is_company": true
}
```

### PUT `/api/admin/expense-tracker/vendors`

Update vendor details.

**Request Body:**
```json
{
  "id": "abc-123",
  "address": "Updated address",
  "tax_id": "0105560000003",
  "is_company": true
}
```

### POST `/api/admin/expense-tracker/extract-invoice`

AI-powered invoice data extraction using OpenAI Vision API.

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|---|---|---|---|
| `file` | File | Yes | PDF or image file (max 10MB) |
| `model` | String | No | AI model: `gpt-5.2` (default), `gpt-4o`, `gpt-5-mini`, `gpt-4o-mini` |
| `payment_date` | String | No | Transaction date hint for Drive upload naming (YYYY-MM-DD) |
| `vendor_name` | String | No | Vendor name hint for Drive upload naming |

**Response:**
```json
{
  "extraction": {
    "vendor_name": "True Corporation",
    "vendor_address": "18 ถ.รัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310",
    "vendor_tax_id": "0107536000269",
    "invoice_number": "INV-2026-00123",
    "invoice_date": "2026-01-15",
    "total_amount": 1070.00,
    "tax_base": 1000.00,
    "vat_amount": 70.00,
    "vat_type": "pp30",
    "wht_applicable": true,
    "notes": "Internet",
    "confidence": "high"
  },
  "model_used": "gpt-5.2",
  "document_url": "https://drive.google.com/file/d/..."
}
```

**AI Extraction Features:**
- Thai and English invoice support
- Buddhist Era (พ.ศ.) to Common Era (ค.ศ.) date conversion (subtract 543)
- VAT type detection (PP30 for domestic, PP36 for foreign/reverse charge)
- WHT applicability detection (services, consulting, rent, professional fees)
- Confidence scoring (high/medium/low based on document clarity)
- Strict JSON schema output (guaranteed compliance via OpenAI structured outputs)

**Google Drive Integration:**
- Invoices auto-upload to organized folders: `/Expense Documents/{VAT|WHT}/{YYYY-MM-DD}_{vendor_name}.pdf`
- Upload is non-fatal - extraction succeeds even if Drive upload fails
- Document URL stored in annotation for later reference

## Component Details

### ExpenseTrackerPage (Main Orchestrator)

Manages all state and coordinates sub-components:

- **State**: filters, transactions array, summary, loading, error
- **Fetch**: Calls GET `/transactions` on mount and when month/account filters change
- **Optimistic Updates**: When an annotation is saved, updates local state immediately and recalculates summary client-side (avoids full refetch)
- **Client-Side Filtering**: Transaction type, VAT type, WHT type, and unannotated filters applied after fetch

### ExpenseTrackerRow (Inline Editing)

The most complex component (~690 lines). Each row manages:

- **20+ state variables** for all editable fields
- **Debounced saves** (500ms) via `lodash/debounce` with cleanup on unmount
- **Tax recalculation** when VAT/WHT type or rate changes (respects override flags)
- **Type popover** with Income (Card, eWallet, QR, Sale, Cash) and Expense (Salary, SSO, Tax Pmt, Transfer) sections
- **Invoice upload** integration with auto-fill from extraction results
- **Vendor creation** from extraction data (fills blank fields, never overwrites)
- **Color-coded badges** for transaction types and tax types using static Tailwind class lookup map

**Important Implementation Detail:** Tailwind JIT purges dynamic class interpolation like `` `bg-${color}-100` ``. All color classes use a static `COLOR_CLASSES` lookup map with full class strings.

### TaxCalculator (Pure Functions)

Four exported functions with no side effects:

1. `calcVat(amount, vatType)` - Returns VAT amount
2. `calcWht(amount, whtType, ratePercent)` - Returns WHT amount
3. `calcTaxBase(amount, vatType, vatAmount, whtType, whtAmount)` - Returns tax base
4. `recalcAll(params)` - Recalculates all derived fields, respecting user override flags

All use `r2()` rounding helper: `Math.round(n * 100) / 100` for THB precision.

### VendorCombobox

Follows the Popover + Command pattern from `customer-search-select.tsx`:
- Debounced search (250ms) against `/vendors?q=...`
- Shows recent vendors when search is empty
- "Create vendor: {name}" option when no match found
- On select: auto-hints WHT type from vendor `is_company` flag

### VendorDetailPopover

Small popover accessible via icon next to vendor name:
- Editable address (textarea) and tax ID (input)
- Company checkbox (toggles PND3 vs PND53 default)
- Copy-to-clipboard buttons for address and tax ID (for pasting into Flow Account)

### InvoiceUploadButton

Per-row upload button with AI model selector:
- Accepts PDF and image files (max 10MB)
- Model dropdown: GPT-5.2 (default), GPT-4o, GPT-5-mini, GPT-4o-mini
- On extraction: auto-fills vendor, VAT, WHT, invoice ref, notes, and document URL
- Creates vendor if not found (smart upsert)

### ExpenseTrackerFilters

Six filter controls:
1. **Month**: Prev/next buttons + native month input
2. **Account**: Dropdown (All / Savings 29-4 / Current 95-4)
3. **Transaction Type**: Dropdown (All / No type set / Card / eWallet / QR / Cash Deposit / Salary / SSO / Tax Payment / Internal Transfer / Sale)
4. **VAT Type**: Dropdown (All / No VAT / PP30 / PP36)
5. **WHT Type**: Dropdown (All / No WHT / PND3 / PND53)
6. **Unannotated Only**: Toggle switch

Month and account trigger server-side refetch. All other filters are client-side for instant response.

### ExpenseTrackerKPIs

Two-row dashboard:

**Top Row (4 cards):**
- Transactions (total count)
- Annotated (percentage with count)
- Bank Withdrawals (red, sum of all withdrawals)
- Bank Deposits (green, sum excluding internal transfers and cash deposits)

**Bottom Row (2 cards):**
- Expense Tax Breakdown: PP30 VAT (blue) + PP36 VAT (violet) + PND3 WHT (orange) + PND53 WHT (amber)
- Deposit Breakdown: QR/Transfer (lime) + Card+eWallet (indigo) + Other (gray)

## Database Schema

### `finance.transaction_annotations`

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `bank_transaction_id` | BIGINT UNIQUE FK | References `bank_statement_transactions(id)` |
| `vendor_id` | UUID FK | References `backoffice.vendors(id)`, SET NULL |
| `vendor_name_override` | TEXT | Free-text when no vendor record |
| `vat_type` | TEXT | `none`, `pp30`, `pp36` |
| `vat_amount` | NUMERIC(12,2) | Auto-calculated, overridable |
| `vat_reporting_month` | TEXT | Format: `YYYY-MM` |
| `wht_type` | TEXT | `none`, `pnd3`, `pnd53` |
| `wht_rate` | NUMERIC(5,2) | Default 3.00 (percentage) |
| `wht_amount` | NUMERIC(12,2) | Auto-calculated, overridable |
| `wht_reporting_month` | TEXT | Format: `YYYY-MM` |
| `tax_base` | NUMERIC(12,2) | Auto-calculated, overridable |
| `vat_amount_override` | BOOLEAN | User manually changed? |
| `wht_amount_override` | BOOLEAN | User manually changed? |
| `tax_base_override` | BOOLEAN | User manually changed? |
| `invoice_ref` | TEXT | Invoice/receipt number |
| `document_url` | TEXT | Google Drive link |
| `transaction_type` | TEXT | See Transaction Types section |
| `notes` | TEXT | Free-text notes |
| `created_by` | TEXT | User email (first annotation) |
| `updated_by` | TEXT | User email (last update) |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-set |

### `backoffice.vendors`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Auto-generated |
| `name` | TEXT UNIQUE | Vendor display name |
| `address` | TEXT | Full address (often Thai script) |
| `tax_id` | TEXT | Thai tax ID number |
| `is_company` | BOOLEAN | Hints PND53 vs PND3 |
| `is_domestic` | BOOLEAN | Domestic vs foreign |
| `category` | TEXT | Vendor category |
| `notes` | TEXT | Internal notes |
| `is_active` | BOOLEAN | Active flag |
| `created_at` | TIMESTAMPTZ | Auto-set |
| `updated_at` | TIMESTAMPTZ | Auto-set |

### `finance.bank_statement_transactions` (Read-Only)

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `transaction_date` | DATE | Transaction date |
| `transaction_time` | TIME | Transaction time |
| `description` | TEXT | Bank statement description |
| `withdrawal` | NUMERIC | Amount withdrawn |
| `deposit` | NUMERIC | Amount deposited |
| `balance` | NUMERIC | Running balance |
| `channel` | TEXT | Transaction channel (K PLUS, ATM, etc.) |
| `details` | TEXT | Additional details |
| `category` | TEXT | Bank category |
| `account_number` | TEXT | Bank account number |
| `account_name` | TEXT | Bank account name |

## File Inventory

| # | File | Lines | Purpose |
|---|---|---|---|
| 1 | `app/admin/expense-tracker/page.tsx` | 12 | Page entry point |
| 2 | `src/types/expense-tracker.ts` | 149 | All TypeScript types |
| 3 | `src/components/admin/expense-tracker/TaxCalculator.ts` | 106 | Tax calculation functions |
| 4 | `src/components/admin/expense-tracker/VendorCombobox.tsx` | 183 | Vendor search/create |
| 5 | `src/components/admin/expense-tracker/VendorDetailPopover.tsx` | 154 | Vendor detail editor |
| 6 | `src/components/admin/expense-tracker/InvoiceUploadButton.tsx` | 165 | AI invoice extraction |
| 7 | `src/components/admin/expense-tracker/ExpenseTrackerRow.tsx` | 687 | Inline-editable row |
| 8 | `src/components/admin/expense-tracker/ExpenseTrackerTable.tsx` | 73 | Table layout |
| 9 | `src/components/admin/expense-tracker/ExpenseTrackerKPIs.tsx` | 120 | KPI dashboard |
| 10 | `src/components/admin/expense-tracker/ExpenseTrackerFilters.tsx` | 155 | Filter controls |
| 11 | `src/components/admin/expense-tracker/ExpenseTrackerPage.tsx` | 239 | Main orchestrator |
| 12 | `app/api/admin/expense-tracker/transactions/route.ts` | 162 | Transactions API |
| 13 | `app/api/admin/expense-tracker/annotations/route.ts` | 67 | Annotations API |
| 14 | `app/api/admin/expense-tracker/vendors/route.ts` | 158 | Vendors API |
| 15 | `app/api/admin/expense-tracker/extract-invoice/route.ts` | 228 | Invoice extraction API |
| | **Total** | **~2,660** | |

## Dependencies

### Internal
- `@/lib/dev-session` + `@/lib/auth-config` - Authentication
- `@/lib/refac-supabase` - Supabase admin client (`refacSupabaseAdmin`)
- `@/lib/ai/openai-client` - OpenAI API client
- `@/lib/google-drive-service` - Google Drive upload service
- `@/components/ui/*` - shadcn/ui components (Card, Select, Switch, Popover, Command, Button, Label, Input)

### External
- `lodash/debounce` - Debounced save
- `lucide-react` - Icons (Receipt, CheckCircle2, TrendingDown, TrendingUp, ChevronLeft, ChevronRight, Filter, etc.)
- `openai` - OpenAI SDK for Vision API

### Annotation Limitations

**1:1 constraint**: Each bank transaction can have only ONE annotation (`bank_transaction_id` is UNIQUE). When a single bank payment covers multiple vendor invoices (e.g., one transfer to Pizza Mania covering two invoices PZM and RZM), you must either:
- Combine the invoice amounts into one annotation with the primary `invoice_ref`
- Use `tax_base_override` and `vat_amount_override` to set the combined totals manually
- Note the second invoice ref in the `notes` field

**Separate input VAT sources**: KBank EDC processing fees (`finance.merchant_transaction_summaries`) and GoWabi commission invoices may not have corresponding bank transaction annotations. These are additional PP30 input VAT sources that must be accounted for during tax filing. See the PP30 skill (`.claude/skills/pp30-vat-return/SKILL.md`) for the complete filing workflow.

## Related Systems

- **[Bank Reconciliation System](./BANK_RECONCILIATION_SYSTEM.md)** - Daily aggregate reconciliation of bank deposits vs POS sales (complementary - bank recon checks totals, expense tracker annotates individual transactions)
- **[Vendor Receipts](../../public/VENDOR_RECEIPTS.md)** - Staff-facing vendor receipt upload (simpler interface, different use case)
- **Flow Account** - External accounting software where annotated data is ultimately entered (vendor addresses and tax IDs can be copied from the expense tracker)
- **PP30 VAT Return Skill** (`.claude/skills/pp30-vat-return/SKILL.md`) - Claude Code skill for preparing monthly PP30, PP36, PND3, and PND53 tax filings using data from this tracker plus additional sources (KBank EDC fees, POS output VAT, manual revenue entries)
