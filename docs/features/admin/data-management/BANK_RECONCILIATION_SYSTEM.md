# Bank Reconciliation System

**Status**: Implemented ✅
**Type**: Administrative Tool
**Access Level**: Admin Only
**Last Updated**: February 2026

## Overview

The Bank Reconciliation System reconciles Lengolf's KBank bank statement (CSV export) against four internal data sources to verify that all daily revenue is fully accounted for. It provides a date-based aggregate comparison covering card payments, eWallet payments (Alipay/WeChat), cash, and QR/PromptPay transfers, highlighting any variances or suspicious records that require investigation.

This system is distinct from the [Reconciliation System](./RECONCILIATION_SYSTEM.md), which performs invoice-to-POS line-item matching. Bank reconciliation operates at the daily aggregate level, comparing totals across sources rather than individual transaction matching.

### Key Features

- **Multi-Source Reconciliation**: Compares bank deposits against POS sales, K-Merchant settlements, daily closings, and cash checks
- **Client-Side CSV Parsing**: KBank CSV files are parsed entirely in the browser (no server upload required)
- **Four Payment Flow Tracking**: Card, eWallet, Cash, and QR/Transfer flows with independent comparison chains
- **eWallet T+1 Settlement Handling**: Automatically attributes eWallet merchant settlements to the correct POS date (settles next business day)
- **POS Total Gap Detection**: Identifies days where POS total sales do not fully reconcile to bank deposits + cash + fees
- **Suspicious Record Highlighting**: Prominently surfaces unreconciled bank transactions and gap days
- **CSV Export**: Export reconciliation results for offline review
- **Tolerance-Based Matching**: 0.01 THB tolerance to handle floating-point rounding

## Business Context

### Revenue Flow

Lengolf's daily revenue flows through multiple channels, each with a different settlement path:

```
POS Sales
├── Card (Credit/Debit) ─── K-Merchant Settlement ─── Bank Deposit (same day)
├── eWallet (Alipay/WeChat) ─── K-Merchant Settlement ─── Bank Deposit (T+1)
├── QR / PromptPay ─── Direct Bank Transfer ─── Bank Deposit (same day)
└── Cash ─── Staff Daily Closing ─── Cash Count
```

### Why Reconciliation Matters

- **Card payments**: POS records the sale, K-Merchant processes it (deducting fees), bank receives the net amount. All three must agree.
- **eWallet payments**: Same as card but settlement is T+1 (next business day). The system handles this automatically.
- **QR/PromptPay**: Customer scans and pays directly. Individual transfers appear in the bank statement but cannot be matched 1:1 with POS (multiple small transfers vs. aggregated POS QR total).
- **Cash**: Staff counts cash at end of day. POS cash total should match the physical count.

### Merchant IDs

| Merchant ID | Type | Description |
|---|---|---|
| `401016061365001` | Card | Credit/debit card settlements via KBank |
| `401016061373001` | eWallet | Alipay/WeChat settlements via KBank |

## System Architecture

### Component Architecture

```
app/admin/bank-reconciliation/
├── page.tsx                              # Main page - orchestrates workflow
├── types/
│   └── bank-reconciliation.ts            # All TypeScript type definitions
├── lib/
│   ├── parse-bank-csv.ts                 # Client-side KBank CSV parser
│   └── reconciliation-engine.ts          # Core reconciliation logic
├── components/
│   ├── BankStatementUpload.tsx           # Drag-drop CSV upload with preview
│   ├── ReconciliationSummaryCards.tsx     # KPI summary cards
│   ├── DailyReconciliationTable.tsx      # Main reconciliation table with expandable rows
│   ├── BankTransactionsTable.tsx         # Raw bank transaction viewer
│   └── ExportButton.tsx                  # CSV export
```

### Data Flow

```
1. User uploads KBank CSV
   └── parse-bank-csv.ts parses client-side
       └── BankStatementParsed (Map<date, BankDayData>)

2. Date range auto-detected from CSV
   └── API call to /api/admin/bank-reconciliation/data
       └── 4 parallel Supabase queries
           ├── finance.merchant_transaction_summaries
           ├── pos.daily_reconciliations
           ├── public.get_daily_sales_report() RPC
           └── public.cash_checks

3. reconciliation-engine.ts runs comparison
   └── DailyReconciliation[] + ReconciliationSummary

4. UI renders results
   ├── Summary stats (variance days, total gap, suspicious items)
   ├── Suspicious records panel
   ├── Daily table with expandable detail rows
   └── Bank transactions tab
```

### Database Sources

#### 1. Merchant Transaction Summaries

```sql
-- Schema: finance
-- Table: merchant_transaction_summaries
-- Source: K-Merchant ZIP files and eWallet CSVs (uploaded separately)
SELECT *
FROM finance.merchant_transaction_summaries
WHERE report_date BETWEEN $1 AND $2
ORDER BY report_date ASC;
```

Key fields: `merchant_id`, `report_date`, `total_amount` (gross), `total_fee_commission_amount`, `vat_on_fee_amount`, `net_credit_amount`

#### 2. POS Daily Closings

```sql
-- Schema: pos
-- Table: daily_reconciliations
-- Source: Staff end-of-day closing procedure
SELECT *
FROM pos.daily_reconciliations
WHERE closing_date BETWEEN $1 AND $2
ORDER BY closing_date ASC;
```

Key fields: `expected_cash`, `actual_cash`, `cash_variance`, `expected_credit_card`, `qr_payments_total`, `total_sales`

#### 3. POS Daily Sales

```sql
-- Schema: public
-- Function: get_daily_sales_report(p_start_date, p_end_date)
-- Source: Aggregated POS transaction data
SELECT * FROM get_daily_sales_report($1, $2);
```

Returns: `totalSales`, `cashPayment`, `qrPayment`, `edcPayment` (card-only via group_code=CREDIT_CARD), `ewalletPayment` (Alipay/WeChat)

#### 4. Cash Checks

```sql
-- Schema: public
-- Table: cash_checks
-- Source: Staff cash declarations throughout the day
SELECT *
FROM cash_checks
WHERE timestamp BETWEEN $1 AND $2
ORDER BY timestamp ASC;
```

Key fields: `timestamp`, `staff`, `amount` (cumulative register total, not daily sales amount)

### API Endpoint

```typescript
// POST /api/admin/bank-reconciliation/data
interface ReconciliationDataRequest {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
}

interface ReconciliationDataResponse {
  merchantSettlements: MerchantSettlement[];
  dailyClosings: DailyClosing[];
  dailySales: DailySalesData[];
  cashChecks: CashCheck[];
}
```

All four queries run in parallel via `Promise.all()` for optimal performance. Authentication uses the standard `getDevSession` pattern with development bypass support.

## Core Data Types

### Bank Statement Types (Parsed from CSV)

```typescript
type BankTransactionCategory =
  | 'card_settlement'     // "Payment Received: FullPay/Install/Redemp"
  | 'ewallet_settlement'  // "Payment Received: Alipay/WeChat"
  | 'transfer_deposit'    // "Transfer Deposit"
  | 'withdrawal'          // "Transfer Withdrawal"
  | 'other';

interface BankTransaction {
  date: string;           // YYYY-MM-DD
  time: string;           // HH:mm
  description: string;
  withdrawal: number;
  deposit: number;
  balance: number;
  channel: string;
  details: string;
  category: BankTransactionCategory;
  reconciliationStatus: 'reconciled' | 'partial' | 'unreconciled' | 'pending';
  reconciliationNote: string;
  matchedSource?: 'merchant_card' | 'merchant_ewallet' | 'pos_qr' | null;
}

interface BankDayData {
  date: string;
  transactions: BankTransaction[];
  cardSettlements: number;      // sum of card_settlement deposits
  ewalletSettlements: number;   // sum of ewallet_settlement deposits
  transferDeposits: number;     // sum of transfer_deposit deposits
  withdrawals: number;
  totalDeposits: number;
  totalWithdrawals: number;
}
```

### Reconciliation Output Types

```typescript
type ComparisonStatus = 'matched' | 'variance' | 'missing' | 'not_applicable' | 'partial';

interface ComparisonResult {
  status: ComparisonStatus;
  expected: number | null;
  actual: number | null;
  variance: number;       // actual - expected (signed)
  label: string;
}

interface DailyReconciliation {
  date: string;

  // Source data references
  bankDay: BankDayData | null;
  merchantCard: MerchantSettlement[];
  merchantEwallet: MerchantSettlement[];
  dailyClosing: DailyClosing | null;
  dailySales: DailySalesData | null;
  cashChecks: CashCheck[];

  // Card comparison chain
  cardFlow: {
    posCard: number;                    // POS card sales (group_code=CREDIT_CARD)
    merchantGross: number;              // K-Merchant total_amount
    merchantFees: number;               // commission + VAT
    merchantCommission: number;         // total_fee_commission_amount
    merchantVat: number;                // vat_on_fee_amount
    merchantNet: number;                // net_credit_amount
    bankCardDeposit: number;            // bank "Payment Received" deposit
    posVsMerchantGross: ComparisonResult;
    merchantNetVsBank: ComparisonResult;
  };

  // eWallet comparison chain (T+1 aware)
  ewalletFlow: {
    posEwallet: number;                 // POS eWallet sales
    merchantGross: number;              // K-Merchant gross (may be from T+1)
    merchantNet: number;                // net_credit_amount
    merchantFees: number;               // commission + VAT
    merchantCommission: number;         // total_fee_commission_amount
    merchantVat: number;                // vat_on_fee_amount
    bankEwalletDeposit: number;         // bank deposit (may be from T+1)
    posVsMerchantGross: ComparisonResult;
    merchantNetVsBank: ComparisonResult;
  };

  // Cash comparison
  cashFlow: {
    posCash: number;                    // POS cash sales
    closingExpected: number;            // daily closing expected_cash
    closingActual: number | null;       // staff end-of-day cash count
    cashVariance: number;               // closing cash_variance
    posVsActual: ComparisonResult;      // POS Cash vs staff count
    status: ComparisonStatus;
  };

  // QR/Transfer comparison
  qrFlow: {
    posQr: number;                      // POS QR/PromptPay sales
    closingQr: number;                  // daily closing qr_payments_total
    bankTransfers: number;              // bank transfer deposits
    posVsClosingQr: ComparisonResult;
    posVsBankTransfers: ComparisonResult;
    status: ComparisonStatus;
  };

  // Overall reconciliation
  posTotal: number;           // POS total sales for the day
  accountedTotal: number;     // bank deposits + cash + merchant fees
  totalGap: number;           // posTotal - accountedTotal
  overallStatus: ComparisonStatus;
  unreconciledCount: number;  // bank transactions with no match
}
```

## Reconciliation Engine

### Comparison Chains

The engine runs four independent comparison chains per day:

#### 1. Card Flow

```
POS Card Sales ──vs──> K-Merchant Gross (total_amount)
                         │
                         ├── Fees deducted (fee + VAT)
                         │
                         └── K-Merchant Net ──vs──> Bank Card Deposit
```

- **POS Card vs Merchant Gross**: Verifies POS recorded the same card total as K-Merchant processed
- **Merchant Net vs Bank**: Verifies the bank received the expected net amount after fees

#### 2. eWallet Flow (T+1 Settlement)

```
POS eWallet Sales (Day T) ──vs──> K-Merchant Gross (Day T or T+1)
                                     │
                                     ├── Fees deducted
                                     │
                                     └── K-Merchant Net ──vs──> Bank eWallet Deposit (Day T or T+1)
```

eWallet settlements (Alipay/WeChat) arrive T+1. The engine:
1. Scans all dates in order
2. For each date with POS eWallet sales, checks if same-day merchant data exists
3. If not, looks for next-day (T+1) merchant/bank data
4. Marks consumed settlement dates to prevent double-attribution
5. Chains correctly for consecutive eWallet days (Jan 6 claims Jan 7, Jan 7 claims Jan 8, etc.)

#### 3. Cash Flow

```
POS Cash Sales ──vs──> Daily Closing Actual Cash (staff count)
                         │
                         └── Closing Expected vs Actual = Cash Variance
```

- Compares POS cash sales against the physical cash count from the staff daily closing
- `cash_checks` table contains cumulative register totals (not suitable for direct daily comparison)

#### 4. QR/Transfer Flow

```
POS QR + eWallet ──vs──> Closing QR Total (qr_payments_total)

POS QR ──vs──> Bank Transfer Deposits (approximate)
```

- Closing QR total includes both PromptPay and Alipay/WeChat, so comparison uses `posQr + posEwallet`
- Bank transfers are inherently approximate (many small individual transfers vs. one aggregated POS QR total)
- Status is `partial` by default since exact 1:1 matching is not possible

### POS Total Gap Calculation

```
posTotal = dailySales.totalSales ?? dailyClosing.total_sales

accountedTotal = bankDeposits (card + eWallet + transfers)
               + cash (closingActual ?? posCash)
               + merchantFees (card fees + eWallet fees)

totalGap = posTotal - accountedTotal
```

A non-zero gap (beyond 0.01 THB tolerance) overrides a "matched" overall status to "variance".

### Overall Status Determination

Per-day status is determined by aggregating all comparison statuses:

| Priority | Condition | Result |
|---|---|---|
| 1 | Any comparison is `missing` | `missing` |
| 2 | Any comparison is `variance` | `variance` |
| 3 | Any unreconciled bank transactions | `variance` |
| 4 | POS total gap > tolerance | `variance` |
| 5 | All comparisons match | `matched` |
| 6 | No data for this day | `not_applicable` |

### Bank Transaction Reconciliation

Each individual bank transaction receives a reconciliation status:

| Category | Condition | Status | Note |
|---|---|---|---|
| Card settlement | Merchant net matches deposit amount | `reconciled` | Matched to K-Merchant card settlement |
| Card settlement | Merchant exists but amount differs | `partial` | Amount variance shown |
| Card settlement | No merchant record for date | `unreconciled` | No matching merchant settlement record |
| eWallet settlement | Merchant net matches deposit | `reconciled` | Matched to eWallet merchant settlement |
| eWallet settlement | Amount differs | `partial` | Amount variance shown |
| eWallet settlement | No merchant record | `unreconciled` | No matching eWallet merchant record |
| Transfer deposit | POS has QR sales for date | `partial` | Cannot match individually |
| Transfer deposit | No POS data for date | `unreconciled` | No POS data for this date |
| Withdrawal | Always | `reconciled` | Informational only |
| Other/unknown | Always | `unreconciled` | Unknown transaction type |

## CSV Parser

### KBank CSV Format

The parser handles KBank's specific CSV export format:

- **Header area**: First ~14 rows contain account metadata (account number, period, account name)
- **Data start**: Identified by "Beginning Balance" row (skipped)
- **Column layout**: 13 columns with empty separator columns between data fields
- **Date format**: `DD-MM-YY` (converted to `YYYY-MM-DD`)
- **Amount format**: Quoted strings with commas (e.g., `"1,769.18"`)

### Transaction Categorization

```typescript
// Based on description field matching:
"Payment Received: FullPay/Install/Redemp" → card_settlement
"Payment Received: Alipay/WeChat"          → ewallet_settlement
"Transfer Deposit"                          → transfer_deposit
"Transfer Withdrawal" / "Withdrawal"        → withdrawal
(everything else)                           → other
```

### Parse Statistics

After parsing, the system displays:
- Total days and transactions found
- Breakdown by category (card, eWallet, transfer, withdrawal)
- Detected date range

## User Interface

### Workflow

1. **Upload**: Drag-and-drop KBank CSV file onto the upload zone
2. **Auto-Parse**: CSV is parsed client-side with immediate preview of statistics
3. **Auto-Fetch**: Date range from CSV triggers API call for all four DB sources
4. **Auto-Reconcile**: Engine runs comparison and produces results
5. **Review**: Two tabs for reviewing results:
   - **Daily Overview**: Main reconciliation table with expandable detail rows
   - **Bank Transactions**: Raw parsed bank transactions with filtering

### EDC Settlement Summary

A horizontal summary bar displayed above the KPI cards, showing the complete electronic payment settlement picture:

| Field | Description | Comparison |
|---|---|---|
| Card Net | Total card merchant net credit | - |
| eWallet Net | Total eWallet merchant net credit | - |
| Total Net | Card Net + eWallet Net | Should match total bank card + eWallet deposits |
| Commission | Total merchant fee commission (card + eWallet) | - |
| VAT | Total VAT on merchant fees (card + eWallet) | - |
| Total Fees | Commission + VAT | - |
| Total Gross | Total Net + Total Fees | Should match POS card + eWallet sales |

This provides a quick sanity check: Total Net should reconcile with bank statement deposits, and Total Gross should reconcile with POS electronic payment totals.

### KPI Summary Cards

Six KPI cards below the EDC summary:

| Card | Value | Sub-text | Color |
|---|---|---|---|
| Days Matched | Matched / Total days | Variance count if > 0 | Green (all matched) / Yellow |
| Card Settlement | Total bank card deposits | Fees amount | Blue |
| eWallet Settlement | Total bank eWallet deposits | Fees amount | Purple |
| Cash Accuracy | Accurate days / Total days | POS cash total | Green |
| QR / Transfers | Total bank transfers | POS QR total | Indigo |
| Unreconciled Records | Count of unreconciled txns | Status text | Green (0) / Red (>0) |

### Summary Stats Bar (Daily Overview)

Four KPI cards at the top of the daily overview tab:

| Card | Description | Color |
|---|---|---|
| Days with Variance | Count of non-matched days vs total | Green (0) / Yellow (>0) |
| Total Gap | Sum of all daily POS total gaps | Green (0) / Red (non-zero) |
| Unreconciled Txns | Bank transactions with no match | Green (0) / Red (>0) |
| Suspicious Items | Gap days + unreconciled transactions | Green (0) / Red (>0) |

### Suspicious Records Panel

Red-highlighted panel listing:
- **Days with POS Total gap**: Date, POS total, gap amount
- **Unreconciled bank transactions**: Date, time, description, amount, reason

### Daily Reconciliation Table

14-column table organized into three column groups:

| Group | Columns | Color |
|---|---|---|
| POS | Cash, Card, eWallet, QR | Blue |
| K-Merchant | Gross, Net, Fees | Purple |
| Bank Statement | Card, eWallet, Transfers | Green |
| (ungrouped) | Gap, Status | - |

Features:
- Click any row to expand inline detail view
- Mismatch cells highlighted in yellow
- Gap column shows signed amount in red when non-zero
- Footer row with column totals
- Variance reason summary shown below non-matched rows

### Expanded Detail View

When a row is expanded, shows:
- **POS Total Summary**: `POS Total = Bank + Cash + Fees` breakdown with gap indicator
- **Variance Details**: Itemized list of all variance reasons
- **Comparison Flow Cards**: Four cards (Card, eWallet, Cash, Transfers) showing A vs B comparisons with match/variance indicators
- **Bank Transactions**: All bank transactions for the day with reconciliation status

### Bank Transactions Tab

Separate view showing all parsed bank transactions:
- Grouped by date with date separator headers
- Color-coded reconciliation status (green/yellow/red left border)
- Toggle: "Unreconciled only" filter with count badge
- Columns: Time, Description, Type (badge), Amount, Channel, Reconciliation note

### CSV Export

Exports the reconciliation table with columns:
Date, POS Cash, POS Card, POS eWallet, POS QR, Merchant Gross, Merchant Net, Merchant Commission, Merchant VAT, Merchant Fees, Bank Card Deposit, Bank eWallet Deposit, Bank Transfers, POS Total, Accounted Total, Gap, Cash Variance, Overall Status, Unreconciled Count

## Technical Details

### Financial Precision

All monetary calculations use `Math.round(n * 100) / 100` (the `r2()` helper) to prevent floating-point accumulation errors when summing THB amounts across many transactions. A tolerance of 0.01 THB is used for all comparisons.

### Performance

- **CSV parsing**: Client-side, uses `csv-parse/sync` library, handles files with 1000+ transactions instantly
- **API queries**: Four parallel Supabase queries via `Promise.all()`, typically completing in 200-500ms
- **Reconciliation engine**: Pure TypeScript computation, processes 30+ days of data in <100ms
- **No server-side file storage**: CSV never leaves the browser

### Navigation

The Bank Reconciliation page is accessible from:
- Admin page: Financial & Operations section
- Header navigation dropdown: Financial & Operations section
- Direct URL: `/admin/bank-reconciliation`

## Security & Access Control

### Authentication

- **Admin Only Access**: Page requires admin authentication
- **NextAuth Integration**: Uses existing authentication system via `getDevSession`
- **Development Bypass**: Supports `SKIP_AUTH=true` for local development

### Data Handling

- **No PII exposure**: Bank statement data stays client-side (never uploaded to server)
- **Read-only DB access**: API endpoint only performs SELECT queries
- **No persistent storage**: Reconciliation results are computed in-memory, not saved to database

## Error Handling

### CSV Parsing Errors

| Error | Cause | User Message |
|---|---|---|
| Missing "Beginning Balance" | Wrong file format or corrupted CSV | Could not find "Beginning Balance" row |
| Invalid date format | Non-KBank CSV or modified file | Row is skipped silently |
| Malformed amounts | Unexpected number format | Parsed as 0 |

### API Errors

| Error | Status | Cause |
|---|---|---|
| Unauthorized | 401 | No valid session |
| Missing dates | 400 | Start/end date not provided |
| Invalid date format | 400 | Dates not in YYYY-MM-DD format |
| Query failure | 500 | Supabase connection or query error (logged server-side) |

### Reconciliation Edge Cases

- **No bank data for a date**: Day still appears if DB has data; bank columns show dashes
- **No DB data for a date**: Day appears from bank data; POS/merchant columns show dashes; status is `missing`
- **Multiple closings per date**: First closing record is used
- **Zero POS total**: Gap calculation is skipped (gap = 0)

## Known Limitations

1. **QR matching is approximate**: Individual bank transfers cannot be matched 1:1 with POS QR totals due to aggregation differences
2. **Cash checks are informational**: The `cash_checks` table stores cumulative register totals, not daily sales amounts, so it cannot be used for direct daily comparison
3. **eWallet T+1 assumes next calendar day**: Does not account for weekends or holidays in settlement timing
4. **Single daily closing**: If multiple closings exist for a date, only the first is used
5. **No historical storage**: Results are computed on-the-fly and not persisted to the database

## Future Enhancements

### Phase 2

- **Result persistence**: Save reconciliation sessions to database for historical tracking and audit trails
- **Manual matching**: Interface for manually resolving unreconciled bank transactions with notes
- **Auto-scheduling**: Automated daily reconciliation when new bank statements are available
- **Multi-account support**: Handle multiple KBank accounts if business expands

### Phase 3

- **Trend analysis**: Track reconciliation accuracy over time, identify recurring variance patterns
- **Alert system**: Notify administrators when daily gap exceeds threshold
- **Integration with Finance Dashboard**: Link reconciliation results to P&L reporting
- **Receipt-level matching**: Drill down from daily aggregates to individual receipt-level comparisons

## Troubleshooting

### Common Issues

1. **CSV not parsing correctly**
   - Ensure the file is exported directly from KBank online banking
   - File must contain "Beginning Balance" row to detect data start
   - File format should be CSV (not Excel or PDF export)

2. **No merchant settlement data**
   - Verify K-Merchant ZIP/eWallet CSV files have been uploaded for the date range
   - Check `finance.merchant_transaction_summaries` table has records for the period

3. **All days show "Missing" status**
   - Verify `get_daily_sales_report()` RPC returns data for the date range
   - Check `pos.daily_reconciliations` has closing records
   - Ensure date formats are consistent (YYYY-MM-DD)

4. **eWallet shows variance but amounts look correct**
   - eWallet settles T+1; check if the merchant settlement appears on the next day
   - The engine handles this automatically, but verify the T+1 date has merchant data

5. **Gap exists but all individual flows match**
   - Gap = POS Total - (Bank Deposits + Cash + Fees)
   - Check if "other" payment methods (e.g., vouchers, packages) are included in POS total but have no bank deposit path
   - Review `other_payments_total` in daily closing

### Data Verification

To manually verify reconciliation results:

```sql
-- Check card merchant settlements for a specific date
SELECT report_date, total_amount, net_credit_amount,
       total_fee_commission_amount + vat_on_fee_amount as fees
FROM finance.merchant_transaction_summaries
WHERE report_date = '2026-01-15'
  AND merchant_id = '401016061365001';

-- Check POS daily sales
SELECT * FROM get_daily_sales_report('2026-01-15', '2026-01-15');

-- Check daily closing
SELECT closing_date, expected_cash, actual_cash, expected_credit_card,
       qr_payments_total, total_sales
FROM pos.daily_reconciliations
WHERE closing_date = '2026-01-15';
```

---

## Documentation References

- **[Reconciliation System](./RECONCILIATION_SYSTEM.md)** - Invoice-to-POS line-item reconciliation (different workflow)
- **[Finance Dashboard](../analytics/FINANCE_DASHBOARD.md)** - P&L reporting and financial overview
- **[POS Daily Closing](../../public/pos/POS_DAILY_CLOSING.md)** - Staff end-of-day closing procedure
- **[Cash Check System](../../public/staff-operations/CASH_CHECK_SYSTEM.md)** - Staff cash declaration system
- **[POS Data Pipeline](./POS_DATA_PIPELINE.md)** - ETL processes and data flow
- **[API Reference](../../api/API_REFERENCE.md)** - Complete API documentation
- **[Authentication System](../../technical/AUTHENTICATION_SYSTEM.md)** - Access control implementation

**Last Updated**: February 2026
**Version**: 1.0
**Status**: Production Ready
