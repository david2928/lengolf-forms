# PP30 Monthly VAT Return Preparation

Prepares and validates the monthly PP30 (Thai domestic VAT return), PP36, and PND3 filing data for Lengolf.

## What is PP30?

The PP30 is Thailand's monthly VAT return form filed with the Revenue Department. It reports:
- **Output VAT (ภาษีขาย)**: VAT collected from customers on sales
- **Input VAT (ภาษีซื้อ)**: VAT paid to suppliers on purchases
- **Net VAT Payable**: Output VAT minus Input VAT

If output > input, Lengolf pays the difference. If input > output, the excess carries forward as credit.

**How PP36 feeds into PP30:**
PP36 covers VAT on imported/foreign services (Google Ads, Meta Ads, etc.). The timeline works like this:
1. **December**: Receive Google/Meta invoices for December services
2. **January**: File PP36 for those December invoices and **pay** the PP36 VAT to Revenue Department
3. **February**: File PP30 for January. The PP36 VAT **paid in January** is now deductible as additional input VAT on the PP30

So when preparing the PP30 for month X: the PP36 input VAT deduction = PP36 tax that was **paid** during month X (which covers month X-1 foreign invoices).

**Formula: Net Tax Payable = Output VAT - PP30 Input VAT - PP36 Input VAT**

**Other related filings (also covered by this skill):**
- **PND3 (PP3)**: Withholding tax on payments to Thai individuals (coaches, freelancers, DJs, etc.)
- **PND53 (PP53)**: Withholding tax on payments to Thai companies

## Usage

Invoke with: `/pp30-vat-return` or `/pp30-vat-return 2026-01`

If no month is specified, ask the user which month to prepare.

## Step-by-Step Workflow

### Step 1: Determine Reporting Month

Ask for or parse the target month (format: YYYY-MM). All queries below use this month.

### Step 2: Output VAT (ภาษีขาย)

Output VAT comes from TWO sources:

#### 2a. POS Sales VAT

```sql
-- Primary output VAT: POS sales for the month
SELECT
  COUNT(DISTINCT receipt_number) as receipt_count,
  SUM(sales_net) as total_tax_base,
  SUM(sales_vat) as total_output_vat,
  SUM(sales_total) as total_incl_vat
FROM pos.lengolf_sales
WHERE date >= '{month_start}' AND date <= '{month_end}'
AND (is_voided IS NULL OR is_voided = false);
```

#### 2b. Manual Revenue Entries (Other Sales)

These are non-POS revenue streams (Events, ClassPass, GoWabi customer payments, etc.) tracked in the P&L system. Amounts are **VAT-inclusive**, so VAT must be extracted.

```sql
-- Additional revenue with VAT (amounts are VAT-inclusive)
SELECT
  category,
  description,
  amount as amount_incl_vat,
  ROUND(amount * 100.0 / 107.0, 2) as tax_base,
  ROUND(amount * 7.0 / 107.0, 2) as vat_amount
FROM finance.manual_revenue_entries
WHERE month = '{month_start}';
```

#### 2c. Total Output VAT

Sum the VAT from 2a + 2b. Present as:

| Source | Tax Base | Output VAT |
|--------|----------|------------|
| POS Sales | {net_sales} | {pos_vat} |
| {category_1} | {base} | {vat} |
| {category_2} | {base} | {vat} |
| **Total Output VAT** | **{total_base}** | **{total_output_vat}** |

**Note:** Small rounding differences (1-2 THB) between the DB total and the filing are expected due to per-receipt VAT rounding across hundreds of POS transactions.

### Step 3: Input VAT (ภาษีซื้อ)

Input VAT comes from THREE sources. All three must be summed for the PP30 total.

#### 3a. Vendor Purchase Invoices (from Transaction Tracker)

These are bank transactions annotated with `vat_type = 'pp30'` in the transaction tracker.

```sql
-- Input VAT from vendor invoices (assigned to this reporting month)
SELECT
  bt.transaction_date,
  COALESCE(ta.vendor_name_override, bt.description) as vendor,
  ta.invoice_ref,
  ta.tax_base,
  ta.vat_amount
FROM finance.transaction_annotations ta
JOIN finance.bank_statement_transactions bt ON bt.id = ta.bank_transaction_id
WHERE ta.vat_type = 'pp30'
AND ta.vat_reporting_month = '{yyyy-mm}'
ORDER BY bt.transaction_date;
```

**IMPORTANT:** Also check for items with NULL reporting month that fall within the transaction date range:

```sql
-- PP30 items with NULL vat_reporting_month (may need assignment)
SELECT
  bt.transaction_date, bt.description, bt.withdrawal,
  ta.tax_base, ta.vat_amount, ta.invoice_ref
FROM finance.transaction_annotations ta
JOIN finance.bank_statement_transactions bt ON bt.id = ta.bank_transaction_id
WHERE ta.vat_type = 'pp30'
AND ta.vat_reporting_month IS NULL
AND bt.transaction_date >= '{month_start}' AND bt.transaction_date <= '{month_end}';
```

If any items have NULL reporting month, flag them to the user and ask which month they belong to.

#### 3b. KBank EDC Processing Fees

KBank charges fees on card and eWallet transactions. These fees include VAT which is claimable as input VAT. This is a **separate data source** (not in `transaction_annotations`).

```sql
-- KBank EDC fees with VAT breakdown
SELECT
  CASE merchant_id
    WHEN '401016061365001' THEN 'Card (EDC)'
    WHEN '401016061373001' THEN 'eWallet'
  END as payment_type,
  SUM(total_fee_commission_amount) as fee_tax_base,
  SUM(vat_on_fee_amount) as fee_vat
FROM finance.merchant_transaction_summaries
WHERE report_date BETWEEN '{month_start}' AND '{month_end}'
GROUP BY merchant_id;
```

**Cross-reference:** The total KBank fees should match the Kasikorn Bank invoice in the vendor invoice list. Verify:
- Invoice tax base = SUM(total_fee_commission_amount)
- Invoice VAT = SUM(vat_on_fee_amount)

#### 3c. GoWabi Commission (if applicable)

GoWabi collects from customers, deducts their commission, and remits the net to Lengolf. The GoWabi invoice represents the commission fee charged to Lengolf, which is claimable as input VAT. Check the vendor invoice list for GoWabi entries. GoWabi may not appear in `transaction_annotations` — verify against the physical invoice list.

#### 3d. Total Input VAT

**PP30 Input VAT = 3a + 3b + 3c**

| Source | Tax Base | Input VAT |
|--------|----------|-----------|
| Vendor invoices (tracker PP30) | {base} | {vat} |
| KBank EDC fees | {base} | {vat} |
| GoWabi commission | {base} | {vat} |
| **Total Input VAT** | **{total_base}** | **{total_input_vat}** |

### Step 4: PP30 Summary

Present the complete PP30 calculation:

```
============================================
PP30 VAT RETURN - {Month Year}
============================================

OUTPUT VAT (ภาษีขาย)
  POS Sales:           {tax_base}    VAT: {vat}
  Other Revenue:       {tax_base}    VAT: {vat}
  ----------------------------------------
  Total Output VAT:    {tax_base}    VAT: {total_output}

INPUT VAT (ภาษีซื้อ)
  Vendor Invoices:     {tax_base}    VAT: {vat}
  KBank EDC Fees:      {tax_base}    VAT: {vat}
  GoWabi Commission:   {tax_base}    VAT: {vat}
  ----------------------------------------
  Total Input VAT:     {tax_base}    VAT: {total_input}

============================================
NET VAT PAYABLE:                     {output - input}
============================================
```

### Step 5: PP36 (Foreign Service VAT)

PP36 covers VAT on imported/foreign services (reverse charge mechanism). It is filed and paid separately, but the tax paid then becomes deductible on the PP30.

**CRITICAL - PP36 offset month and PP30 deduction:**
- PP36 filed in **January** covers **December** foreign invoices (Google, Meta, etc.)
- The PP36 VAT is **paid** in January
- When preparing the **January PP30** (filed in February), that PP36 VAT paid in January is deducted as additional input VAT
- In the tracker, `vat_reporting_month` for PP36 items reflects when the PP36 was **filed and paid** (= the PP30 month it will be deducted from), NOT the invoice month

```sql
-- PP36 items for this filing month
SELECT
  bt.transaction_date,
  COALESCE(ta.vendor_name_override, bt.description) as vendor,
  ta.tax_base,
  ta.vat_amount
FROM finance.transaction_annotations ta
JOIN finance.bank_statement_transactions bt ON bt.id = ta.bank_transaction_id
WHERE ta.vat_type = 'pp36'
AND ta.vat_reporting_month = '{yyyy-mm}'
ORDER BY bt.transaction_date;
```

**PP36 tax base note:** In the tracker, `tax_base` for PP36 items is the grossed-up amount (payment * 107/100). The actual payment amount = tax_base * 100/107. VAT is calculated on the payment amount (not the grossed-up base).

Common PP36 vendors:
- Google Asia Pacific Pte. Ltd.
- Meta Platforms Ireland Limited
- Supabase Pte. Ltd.

### Step 6: Validation Checks

Run these checks and flag any issues:

1. **Unassigned VAT items**: Any `vat_reporting_month IS NULL` items in the tracker for the month's transactions?
2. **KBank fee cross-check**: Does the DB total match the Kasikorn Bank invoice?
3. **VAT rate check**: Verify all VAT amounts are ~7% of tax base (tolerance 0.02 THB)
4. **Missing invoices**: Are all PP30 vendor annotations matched to invoice documents (`invoice_ref` populated)?
5. **Duplicate invoice refs**: Check no `invoice_ref` appears on multiple annotations
6. **One bank txn, multiple invoices**: Some bank payments cover multiple vendor invoices (e.g., Pizza Mania). Verify the annotation correctly represents all invoices or is split into separate annotations.
7. **GoWabi and KBank in tracker**: These may NOT be in `transaction_annotations` but should still be included in the PP30 total from their respective sources.

```sql
-- Check for duplicate invoice references
SELECT invoice_ref, COUNT(*) as cnt
FROM finance.transaction_annotations
WHERE invoice_ref IS NOT NULL
AND vat_reporting_month = '{yyyy-mm}'
GROUP BY invoice_ref
HAVING COUNT(*) > 1;
```

### Step 7: PND3 Withholding Tax (PP3 for Individuals)

PND3 covers withholding tax on payments to Thai individuals (coaches, freelancers, contractors).

#### 7a. WHT from Transaction Tracker

```sql
-- WHT from bank transaction annotations
SELECT
  bt.transaction_date,
  COALESCE(ta.vendor_name_override, bt.description) as payee,
  ta.wht_type,
  ta.wht_rate,
  ta.tax_base,
  ta.wht_amount,
  bt.withdrawal as net_paid
FROM finance.transaction_annotations ta
JOIN finance.bank_statement_transactions bt ON bt.id = ta.bank_transaction_id
WHERE ta.wht_amount IS NOT NULL AND ta.wht_amount > 0
AND ta.wht_reporting_month = '{yyyy-mm}'
AND ta.wht_type = 'pnd3'
ORDER BY bt.transaction_date;
```

#### 7b. WHT from Coaching Invoices

```sql
-- Coaching WHT (backoffice invoices)
SELECT
  i.invoice_date, i.invoice_number,
  s.name as payee,
  i.subtotal as tax_base,
  i.tax_rate as wht_rate,
  i.tax_amount as wht_amount,
  i.total_amount as net_paid
FROM backoffice.invoices i
JOIN backoffice.invoice_suppliers s ON s.id = i.supplier_id
WHERE i.invoice_date >= '{month_start}' AND i.invoice_date <= '{month_end}'
ORDER BY i.invoice_date;
```

#### 7c. PND3 Validation

Present the PND3 summary and run these checks:

```
============================================
PND3 (WHT - Individuals) - {Month Year}
============================================
{payee}    Tax Base: {base}    Rate: {rate}%    WHT: {amount}
...
============================================
TOTAL WHT:                           {total}
============================================
```

**Validation checks:**

1. **WHT rate consistency**: Standard rates are 3% (services) or 5% (rent, entertainment). Flag any non-standard rates.
2. **Math check**: Verify `wht_amount = tax_base * wht_rate / 100` for each entry (tolerance 0.01 THB)
3. **Net paid check**: Verify `net_paid = tax_base - wht_amount` matches the bank withdrawal

**IMPORTANT - "Bear WHT" scenario:**
Some payees negotiate that Lengolf pays the full agreed amount WITHOUT deducting WHT. In this case:
- The **bank payment = the tax base** (full amount, no WHT deducted)
- Lengolf pays the WHT **on top** to the Revenue Department
- The net paid in the bank will NOT equal `tax_base - wht_amount`
- Example: DJ paid 7,500 (full amount), WHT = 7,500 * 5% = 375 paid separately by Lengolf
- In the tracker, `tax_base` should equal the bank withdrawal amount, and `wht_amount` is the additional WHT cost

When you detect `bank withdrawal = tax_base` (instead of `tax_base - wht_amount`), flag it as a "bear WHT" arrangement and verify the WHT rate is correct for the service type.

### Step 8: PND53 Withholding Tax (PP53 for Companies)

```sql
-- WHT on payments to companies
SELECT
  bt.transaction_date,
  COALESCE(ta.vendor_name_override, bt.description) as payee,
  ta.wht_type,
  ta.wht_rate,
  ta.tax_base,
  ta.wht_amount
FROM finance.transaction_annotations ta
JOIN finance.bank_statement_transactions bt ON bt.id = ta.bank_transaction_id
WHERE ta.wht_amount IS NOT NULL AND ta.wht_amount > 0
AND ta.wht_reporting_month = '{yyyy-mm}'
AND ta.wht_type = 'pnd53'
ORDER BY bt.transaction_date;
```

## Data Source Reference

| Data | Table | Schema | Key Fields |
|------|-------|--------|------------|
| POS Sales (Output VAT) | `lengolf_sales` | `pos` | `sales_vat`, `sales_net`, `date` |
| Manual Revenue (Output VAT) | `manual_revenue_entries` | `finance` | `amount` (VAT-inclusive), `month` |
| Vendor Invoices (Input VAT) | `transaction_annotations` + `bank_statement_transactions` | `finance` | `vat_type='pp30'`, `tax_base`, `vat_amount`, `vat_reporting_month` |
| KBank EDC Fees (Input VAT) | `merchant_transaction_summaries` | `finance` | `total_fee_commission_amount`, `vat_on_fee_amount` |
| Foreign Services (PP36) | `transaction_annotations` | `finance` | `vat_type='pp36'`, offset month |
| WHT - Individuals (PND3) | `transaction_annotations` | `finance` | `wht_type='pnd3'`, `wht_rate`, `wht_amount` |
| WHT - Individuals (PND3) | `invoices` + `invoice_suppliers` | `backoffice` | `tax_amount`, `tax_rate` |
| WHT - Companies (PND53) | `transaction_annotations` | `finance` | `wht_type='pnd53'`, `wht_rate`, `wht_amount` |

## Key Business Rules

### VAT (PP30/PP36)
- **VAT Rate**: 7% standard rate in Thailand
- **Reporting month**: Based on `vat_reporting_month` in tracker, NOT transaction date (invoices can be claimed in a different month than payment, within 6 months)
- **Manual revenue amounts are VAT-inclusive**: Extract VAT as `amount * 7 / 107`
- **KBank merchant IDs**: `401016061365001` = Card (EDC), `401016061373001` = eWallet
- **PP36 offset and PP30 deduction**: PP36 filed in month X covers month X-1 foreign invoices. The PP36 tax is paid in month X. That paid PP36 tax then becomes an input VAT deduction on the month X PP30 (filed in month X+1). The `vat_reporting_month` in the tracker = the PP30 month it will be deducted from.
- **PP30 net tax formula**: `Output VAT - PP30 Input VAT - PP36 Input VAT (paid that month) = Net Tax Payable`
- **NULL reporting months**: Flag these - they need to be assigned before filing
- **GoWabi model**: GoWabi collects from customer, deducts commission, remits net to Lengolf. The GoWabi invoice is for their commission = Lengolf's input VAT.
- **KBank EDC fees**: Stored in `merchant_transaction_summaries`, NOT in `transaction_annotations`. Must be added separately to the PP30 input VAT total.
- **Tolerance**: Allow 0.02 THB rounding tolerance when validating individual VAT calculations. Allow up to 2 THB tolerance on aggregate totals (due to per-receipt rounding).

### WHT (PND3/PND53)
- **Standard WHT rates**: 3% for professional services/contractors, 5% for rent/entertainment/performances
- **"Bear WHT" arrangements**: Some payees receive full payment without WHT deduction. Lengolf pays WHT on top. In these cases, `bank withdrawal = tax_base` and WHT is an additional cost.
- **PND3**: Withholding tax on payments to Thai individuals
- **PND53**: Withholding tax on payments to Thai companies
- **Coaching invoices**: Stored in `backoffice.invoices` with `tax_rate` (typically 3%) and `tax_amount` (WHT). The `total_amount` is the net paid after WHT deduction.
