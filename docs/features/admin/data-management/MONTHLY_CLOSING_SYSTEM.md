# Monthly Closing System

**Status**: Implemented
**Type**: Administrative Tool
**Access Level**: Admin Only
**Last Updated**: February 2026

## Table of Contents

1. [Overview](#overview)
2. [Business Context](#business-context)
3. [WHT Filing (PND3/PND53)](#wht-filing-pnd3pnd53)
4. [Architecture](#architecture)
5. [Data Sources](#data-sources)
6. [API Endpoints](#api-endpoints)
7. [Component Structure](#component-structure)
8. [File Format Specification](#file-format-specification)
9. [Database Schema](#database-schema)
10. [Usage Guide](#usage-guide)
11. [Future Enhancements](#future-enhancements)

## Overview

The Monthly Closing system is a centralized admin area at `/admin/monthly-closing` for managing recurring end-of-month tax filing and reporting tasks. It uses a tabbed layout where each tab handles a different filing type.

### Key Features

- **WHT Filing Generator**: Produce pipe-delimited `.txt` files for PND3/PND53 import into RDPrep
- **Inline Vendor Editing**: Fill in legal names, tax IDs, and addresses directly in the review table
- **Persistent Vendor Data**: Tax filing fields are saved to vendor records and reused across months
- **Completeness Validation**: Visual indicators for missing required fields; blocks file generation until all entries are complete
- **Period Selector**: 12-month history, defaults to previous month

### Current Tabs

| Tab | Status | Description |
|-----|--------|-------------|
| WHT Filing (PND3/PND53) | Implemented | Generate withholding tax filing files |
| PP30 (VAT Return) | Planned | Monthly VAT return preparation |
| PP36 (Reverse Charge VAT) | Planned | Foreign service VAT filing |

## Business Context

### Previous Workflow

1. Transaction Tracker annotates bank transactions with WHT type, rate, and amounts
2. Export data to FlowAccount
3. Manually create WHT filing entries in FlowAccount
4. Export `.txt` file from FlowAccount
5. Import `.txt` into RDPrep (Thai Revenue Department prep software)
6. Generate `.rdx` file from RDPrep
7. Submit `.rdx` to e-Filing

### New Workflow

1. Transaction Tracker annotates bank transactions (unchanged)
2. Monthly Closing tool loads WHT data directly from database
3. Review and fill in any missing vendor tax info (persisted for future months)
4. Generate `.txt` file directly
5. Import `.txt` into RDPrep
6. Generate `.rdx` and submit to e-Filing

**FlowAccount is eliminated from the WHT filing workflow entirely.**

### Thai WHT Filing Types

| Form | Thai Name | Use Case | Payee Type |
|------|-----------|----------|------------|
| PND3 (ภ.ง.ด.3) | แบบยื่นรายการภาษีเงินได้หัก ณ ที่จ่าย | Services from individuals | Individual / Sole proprietor |
| PND53 (ภ.ง.ด.53) | แบบยื่นรายการภาษีเงินได้หัก ณ ที่จ่าย | Services from companies | Juristic person / Company |

### WHT Condition Codes

| Code | Thai | Meaning |
|------|------|---------|
| 1 | หักภาษี ณ ที่จ่าย | Standard deduction (WHT deducted from payment) |
| 2 | ออกภาษีให้ตลอดไป | Bear WHT permanently (payer absorbs WHT, payee gets full amount) |
| 3 | ออกภาษีให้ครั้งเดียว | Bear WHT one-time |

## WHT Filing (PND3/PND53)

### Data Flow

```
finance.transaction_annotations (wht_type, wht_reporting_month)
        ↓
finance.bank_statement_transactions (transaction_date, withdrawal)
        ↓
backoffice.vendors (tax_id, address, tax_first_name, tax_last_name, prefix)
        ↓
    API: /api/admin/tax-filing/wht-data
        ↓
    Review Table (inline editing)
        ↓
    generateWhtFile() → pipe-delimited .txt
        ↓
    RDPrep → .rdx → e-Filing
```

### Single Source of Truth

All WHT data comes from the **Transaction Tracker** (`finance.transaction_annotations`). There is no separate WHT entry system. The flow is:

1. Bank transactions are imported (KBank scraper)
2. Staff annotates transactions with WHT type/rate/amount in the Transaction Tracker
3. Monthly Closing reads those annotations to generate the filing

### Vendor Name Resolution

Vendors often have display nicknames (e.g., "Pro Min", "DJ Soundsystem") that differ from their legal names needed for tax filing. The system resolves names in this priority order:

1. `tax_first_name` / `tax_last_name` from vendor record (if previously filled)
2. Auto-split of vendor `name` field (first word = first name, rest = last name)
3. Manual entry via inline editing (saved to vendor record for future months)

## Architecture

### Technology Stack

- **Frontend**: Next.js 15.5, React 19.1, TypeScript
- **UI Components**: shadcn/ui (Tabs, Select, Input, Card, Button, Alert)
- **State Management**: React useState/useCallback with debounced saves
- **File Generation**: Client-side pure function (no server round-trip)
- **Database**: Supabase (PostgreSQL) across `finance`, `backoffice` schemas

### Component Hierarchy

```
MonthlyClosingPage (app/admin/monthly-closing/page.tsx)
├── Period Selector (Select component, 12-month history)
└── Tabs
    └── WhtFilingTab (src/components/admin/monthly-closing/WhtFilingTab.tsx)
        ├── Form Type Toggle (PND3/PND53)
        ├── Summary KPI Cards (4 cards)
        │   ├── Total Entries
        │   ├── Total Tax Base
        │   ├── Total WHT
        │   └── Completeness (X/Y ready)
        ├── Editable Review Table
        │   └── WhtEntryRow (per entry, inline editing)
        └── Generate Bar (filename preview + download button)
```

## Data Sources

### Primary Tables

| Table | Schema | Purpose |
|-------|--------|---------|
| `transaction_annotations` | `finance` | WHT type, rate, amount, reporting month |
| `bank_statement_transactions` | `finance` | Transaction date, withdrawal amount |
| `vendors` | `backoffice` | Legal name, tax ID, address for filing |

### Key Query

```sql
SELECT
  a.id, a.bank_transaction_id, a.vendor_id,
  a.wht_type, a.wht_rate, a.wht_amount, a.tax_base,
  a.wht_amount_override, a.wht_reporting_month,
  b.transaction_date, b.withdrawal,
  v.name, v.tax_id, v.address, v.is_company,
  v.tax_first_name, v.tax_last_name, v.prefix
FROM finance.transaction_annotations a
JOIN finance.bank_statement_transactions b ON b.id = a.bank_transaction_id
LEFT JOIN backoffice.vendors v ON v.id = a.vendor_id
WHERE a.wht_type = 'pnd3'          -- or 'pnd53'
  AND a.wht_reporting_month = '2026-01'
ORDER BY b.transaction_date
```

## API Endpoints

### GET `/api/admin/tax-filing/wht-data`

Fetches WHT filing data for a given period and form type.

**Query Parameters:**

| Parameter | Type | Required | Example |
|-----------|------|----------|---------|
| `period` | string | Yes | `2026-01` |
| `form_type` | string | Yes | `pnd3` or `pnd53` |

**Response:**

```typescript
interface WhtFilingData {
  period: string;                 // "2026-01"
  form_type: 'pnd3' | 'pnd53';
  company_tax_id: string;        // "0105566207013"
  entries: WhtEntry[];
  summary: {
    total_entries: number;
    total_tax_base: number;
    total_wht: number;
    complete_entries: number;
    incomplete_entries: number;
  };
}

interface WhtEntry {
  id: number;
  bank_transaction_id: number;
  transaction_date: string;
  vendor_id: string | null;
  vendor_name: string;
  tax_id: string;
  prefix: string;
  first_name: string;
  last_name: string;
  address: string;
  is_company: boolean;
  description: string;           // "ค่าใช้จ่าย"
  wht_rate: number;
  tax_base: number;
  wht_amount: number;
  condition: 1 | 2 | 3;
  is_complete: boolean;
  missing_fields: string[];
}
```

**Validation:** An entry is `is_complete` when all of the following are populated:
- `tax_id`
- `first_name`
- `address`
- `last_name` (unless `is_company = true`)

### PUT `/api/admin/tax-filing/update-vendor`

Updates vendor tax filing fields. Saved data persists for future months.

**Request Body:**

```json
{
  "vendor_id": "uuid",
  "tax_id": "1509966587954",
  "address": "99/2 ม.8 ต.ห้วยทราย ...",
  "tax_first_name": "Ashley",
  "tax_last_name": "Van Gool",
  "prefix": "คุณ",
  "is_company": false
}
```

**Allowed Fields:** `tax_id`, `address`, `tax_first_name`, `tax_last_name`, `prefix`, `is_company`

## Component Structure

### WhtFilingTab

**File:** `src/components/admin/monthly-closing/WhtFilingTab.tsx`

Main component managing the full WHT filing workflow:

- **Auto-loads** data when period or form type changes
- **Debounced save** (500ms) for vendor field edits via lodash debounce
- **Optimistic UI**: Local state updated immediately, API save in background
- **Completeness tracking**: Recalculates summary on every field change
- **File generation**: Client-side via `generateWhtFile()`, triggers browser download

### WhtEntryRow

Inline sub-component for each table row:

- Local state for editable fields (tax_id, prefix, first_name, last_name, address)
- Syncs from parent on data reload via `useEffect`
- Passes `vendor_id` directly to parent on blur to avoid stale closures
- Visual indicators: red border on missing fields, red/green status icon

### File Generator

**File:** `src/lib/wht-file-generator.ts`

Pure function with no side effects. Takes `WhtFilingData`, returns `{ content, filename }`.

- Sanitizes all string fields (removes pipes and newlines)
- Converts dates to Buddhist Era
- Formats rates as `XX.XX` (zero-padded)
- Generates filename: `PND3_{company_tax_id}_{year_be}{month}.txt`

## File Format Specification

### PND3/PND53 Pipe-Delimited Format

Each line represents one WHT entry with 14 pipe-delimited fields:

```
{seq}|{tax_id}|{prefix}|{first_name}|{last_name}|{address}|{empty}|{empty}|{date_BE}|{description}|{rate}|{tax_base}|{wht_amount}|{condition}
```

| Field | Position | Format | Example |
|-------|----------|--------|---------|
| Sequence | 1 | 5-digit zero-padded | `00001` |
| Tax ID | 2 | 13-digit number | `1509966587954` |
| Prefix | 3 | Thai honorific | `คุณ` |
| First Name | 4 | Text | `Ashley` |
| Last Name | 5 | Text (empty for companies) | `Van Gool` |
| Address | 6 | Full address | `99/2 ม.8 ต.ห้วยทราย ...` |
| Reserved | 7 | Empty | |
| Reserved | 8 | Empty | |
| Date | 9 | DD/MM/YYYY Buddhist Era | `01/01/2569` |
| Description | 10 | Income type | `ค่าใช้จ่าย` |
| Rate | 11 | XX.XX (zero-padded) | `03.00` |
| Tax Base | 12 | 2 decimal places | `5103.09` |
| WHT Amount | 13 | 2 decimal places | `153.09` |
| Condition | 14 | 1, 2, or 3 | `1` |

### Date Conversion

Buddhist Era year = Christian Era year + 543

Example: `2026-01-15` becomes `15/01/2569`

### Filename Convention

```
{form}_{company_tax_id}_{year_be}{month}.txt
```

Example: `PND3_0105566207013_256901.txt` (PND3, January 2569 BE / 2026 CE)

### Sample Output

```
00001|1509966587954|คุณ|Ashley|Van Gool|99/2 ม.8 ต.ห้วยทราย อ.สันกำแพง เชียงใหม่ 50130|||01/01/2569|ค่าใช้จ่าย|03.00|5103.09|153.09|1
00002|3100601482127|คุณ|Poraputr|Srethabutr|ที่อยู่ 664/10 ซ.วัดจันทร์ใน แขวงบางคอแหลม เขตบางคอแหลม กรุงเทพมหานค 10120|||01/01/2569|ค่าใช้จ่าย|03.00|1000.00|30.00|1
00003|1102003017671|คุณ|Varuth|Kjonkittiskul|555/15 ถ.เพชรบุรี แขวงถนนพญาไท เขตราชเทวี กรุงเทพมหานคร 10400|||05/01/2569|ค่าใช้จ่าย|03.00|8573.92|257.22|1
```

## Database Schema

### Vendor Tax Filing Columns

Added to `backoffice.vendors` table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `tax_first_name` | text | null | Legal first name for tax filing |
| `tax_last_name` | text | null | Legal last name for tax filing |
| `prefix` | text | `คุณ` | Thai honorific prefix |

These columns store the legal name separately from the display `name` field. Once filled in during the first filing, they persist for all future months.

**Migration:** `supabase/migrations/20260209120000_add_vendor_tax_name_fields.sql`

### Related Existing Columns

| Column | Table | Usage |
|--------|-------|-------|
| `wht_type` | `finance.transaction_annotations` | `pnd3` or `pnd53` |
| `wht_rate` | `finance.transaction_annotations` | Percentage (e.g., 3.00, 5.00) |
| `wht_amount` | `finance.transaction_annotations` | Calculated WHT amount |
| `wht_reporting_month` | `finance.transaction_annotations` | Filing period (YYYY-MM) |
| `tax_base` | `finance.transaction_annotations` | Gross amount before WHT |
| `tax_id` | `backoffice.vendors` | 13-digit Thai tax ID |
| `address` | `backoffice.vendors` | Registered address |
| `is_company` | `backoffice.vendors` | Juristic person flag |

## Usage Guide

### Generating a PND3 Filing

1. Navigate to **Monthly Closing** (`/admin/monthly-closing`)
2. Select the filing period from the dropdown (defaults to previous month)
3. Ensure **PND3** is selected in the form type toggle
4. Data auto-loads showing all WHT transactions for the period
5. Review the KPI cards: Total Entries, Tax Base, WHT, Completeness
6. For any rows with red indicators, fill in the missing fields:
   - **Tax ID**: 13-digit Thai tax identification number
   - **First/Last Name**: Legal name (may differ from vendor display name)
   - **Address**: Registered address for tax purposes
7. Edits auto-save to the vendor record (reused in future months)
8. Once all entries show green checkmarks, click **Generate .txt**
9. Import the downloaded `.txt` file into RDPrep

### Tips

- **Vendor info persists**: Once you fill in a vendor's tax ID, name, and address, it will auto-populate for future months
- **Condition codes**: Default is 1 (standard deduction). Change to 2 for "bear WHT" arrangements where the payee receives the full amount
- **PND53**: Same format as PND3. For companies, the company name goes in the First Name field and Last Name is left empty
- **Thai addresses**: RDPrep expects Thai addresses. English addresses work but Thai is preferred for official filing

### Verification Checklist

- [ ] Total entries matches expected count
- [ ] Total tax base and WHT amounts match Transaction Tracker totals
- [ ] All vendor legal names are correct (not nicknames)
- [ ] All tax IDs are 13 digits
- [ ] All addresses are populated
- [ ] Condition codes are correct (1 for standard, 2 for bear WHT)
- [ ] Generated `.txt` imports into RDPrep with 0 errors

## Future Enhancements

### Planned Tabs

- **PP30 (VAT Return)**: Aggregate output VAT from POS sales and input VAT from transaction annotations
- **PP36 (Reverse Charge VAT)**: Generate PP36 filing data for foreign service invoices
- **Filing History**: Track which periods have been filed and when

### Feature Improvements

- PND53 company name auto-fill from `company_name` vendor field
- Thai address validation and formatting
- Filing history log with download links to previously generated files
- Direct integration with e-Filing API (bypassing RDPrep)

---

Last Updated: February 2026
Version: 1.0
Maintainer: Lengolf Development Team
