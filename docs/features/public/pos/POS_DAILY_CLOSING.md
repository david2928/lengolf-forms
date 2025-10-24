# POS Daily Closing & Reconciliation System

## Overview

The Daily Closing System provides **end-of-day cash reconciliation** for POS operations. Features date selection, variance tracking, staff PIN authentication, and comprehensive reporting. Built for tablet-based operations with full-screen mobile interface and thermal receipt printing support.

## Architecture

### Core Components

**Modal & UI:**
- `DailyClosingModal.tsx` - 5-step wizard interface with view-only mode for closed days
- `POSHeader.tsx` - Menu integration with "Close Day" button
- Full-screen mobile interface, centered card on desktop
- Responsive design optimized for tablets

**Backend Services:**
- Database function `get_daily_closing_summary()` - Aggregates expected amounts
- 4 API endpoints for closing operations
- Staff PIN verification using `clear_pin` column
- Duplicate closing prevention with view-only mode

### Database Schema

**Daily Reconciliations Table:**
```sql
CREATE TABLE pos.daily_reconciliations (
  id SERIAL PRIMARY KEY,
  closing_date DATE NOT NULL,
  shift_identifier VARCHAR(20), -- Optional shift tracking

  -- Expected amounts (from transactions)
  expected_cash DECIMAL(10,2) NOT NULL,
  expected_credit_card DECIMAL(10,2) NOT NULL,
  qr_payments_total DECIMAL(10,2) DEFAULT 0,
  other_payments_total DECIMAL(10,2) DEFAULT 0,

  -- Actual counted amounts
  actual_cash DECIMAL(10,2) NOT NULL,
  actual_credit_card DECIMAL(10,2) NOT NULL,
  credit_card_batch_reference VARCHAR(50),

  -- Variance tracking
  cash_variance DECIMAL(10,2) NOT NULL, -- actual - expected
  credit_card_variance DECIMAL(10,2) NOT NULL,

  -- Transaction summary
  transaction_count INTEGER NOT NULL,
  voided_count INTEGER DEFAULT 0,
  voided_amount DECIMAL(10,2) DEFAULT 0,
  total_sales DECIMAL(10,2) NOT NULL,

  -- Staff tracking
  closed_by_staff_id INTEGER REFERENCES backoffice.staff(id),
  closed_by_staff_name VARCHAR(100) NOT NULL,

  -- Notes
  variance_notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  -- Prevent duplicate closings
  UNIQUE(closing_date, shift_identifier)
);

-- Index for quick lookups
CREATE INDEX idx_daily_reconciliations_date ON pos.daily_reconciliations(closing_date DESC);
CREATE INDEX idx_daily_reconciliations_staff ON pos.daily_reconciliations(closed_by_staff_id);
```

**Summary Function:**
```sql
CREATE OR REPLACE FUNCTION pos.get_daily_closing_summary(
  p_date DATE,
  p_shift_identifier VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  closing_date DATE,
  shift_identifier VARCHAR,
  expected_cash DECIMAL(10,2),
  expected_credit_card DECIMAL(10,2),
  qr_payments_total DECIMAL(10,2),
  other_payments_total DECIMAL(10,2),
  transaction_count BIGINT,
  voided_count BIGINT,
  voided_amount DECIMAL(10,2),
  total_sales DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_date AS closing_date,
    p_shift_identifier AS shift_identifier,
    COALESCE(SUM(CASE WHEN pm.payment_method = 'cash' THEN pm.amount ELSE 0 END), 0) AS expected_cash,
    COALESCE(SUM(CASE WHEN pm.payment_method = 'credit_card' THEN pm.amount ELSE 0 END), 0) AS expected_credit_card,
    COALESCE(SUM(CASE WHEN pm.payment_method IN ('qr', 'promptpay', 'true_wallet') THEN pm.amount ELSE 0 END), 0) AS qr_payments_total,
    COALESCE(SUM(CASE WHEN pm.payment_method NOT IN ('cash', 'credit_card', 'qr', 'promptpay', 'true_wallet') THEN pm.amount ELSE 0 END), 0) AS other_payments_total,
    COUNT(DISTINCT t.id) AS transaction_count,
    COUNT(DISTINCT CASE WHEN t.status = 'voided' THEN t.id END) AS voided_count,
    COALESCE(SUM(CASE WHEN t.status = 'voided' THEN t.total_amount ELSE 0 END), 0) AS voided_amount,
    COALESCE(SUM(CASE WHEN t.status = 'completed' THEN t.total_amount ELSE 0 END), 0) AS total_sales
  FROM pos.transactions t
  LEFT JOIN pos.transaction_payments pm ON pm.transaction_id = t.id
  WHERE DATE(t.created_at) = p_date
    AND (p_shift_identifier IS NULL OR t.shift_identifier = p_shift_identifier)
  GROUP BY p_date, p_shift_identifier;
END;
$$ LANGUAGE plpgsql;
```

## API Reference

### 1. Get Daily Summary

**Fetch expected amounts for closing:**
```http
GET /api/pos/closing/summary?date=2025-01-15&shift=morning
```

**Query Parameters:**
- `date` (optional): Date to close (defaults to today, format: YYYY-MM-DD)
- `shift` (optional): Shift identifier for shift-based closing

**Response:**
```json
{
  "date": "2025-01-15",
  "shift_identifier": "morning",
  "expected_cash": 12500.00,
  "expected_credit_card": 19977.50,
  "qr_payments_total": 5600.00,
  "other_payments_total": 250.00,
  "transaction_count": 45,
  "voided_count": 2,
  "voided_amount": 850.00,
  "total_sales": 38327.50
}
```

### 2. Submit Reconciliation

**Submit counted amounts and close the day:**
```http
POST /api/pos/closing/submit
Content-Type: application/json

{
  "date": "2025-01-15",
  "shift_identifier": "morning",
  "actual_cash": 12480.00,
  "actual_credit_card": 19977.50,
  "credit_card_batch_reference": "BATCH-20250115-001",
  "variance_notes": "Short ฿20 in cash - customer returned ฿20 overpayment",
  "staff_pin": "1234"
}
```

**Request Body:**
- `date` (required): Date being closed
- `shift_identifier` (optional): Shift identifier
- `actual_cash` (required): Counted cash amount
- `actual_credit_card` (required): Credit card batch total
- `credit_card_batch_reference` (optional): Batch reference from terminal
- `variance_notes` (optional): Explanation for variances
- `staff_pin` (required): Staff PIN for authorization

**Response:**
```json
{
  "success": true,
  "reconciliation": {
    "id": 123,
    "closing_date": "2025-01-15",
    "shift_identifier": "morning",
    "expected_cash": 12500.00,
    "expected_credit_card": 19977.50,
    "actual_cash": 12480.00,
    "actual_credit_card": 19977.50,
    "cash_variance": -20.00,
    "credit_card_variance": 0.00,
    "closed_by_staff_name": "John Doe",
    "created_at": "2025-01-15T18:30:00Z"
  },
  "cash_variance": -20.00,
  "credit_card_variance": 0.00
}
```

**Error Responses:**
```json
// Invalid staff PIN
{
  "error": "Invalid staff PIN"
}

// Day already closed
{
  "error": "Reconciliation already exists for this date and shift"
}

// Missing required fields
{
  "error": "Date, actual cash, actual credit card, and staff PIN are required"
}
```

### 3. Get History

**Retrieve past reconciliations:**
```http
GET /api/pos/closing/history?start_date=2025-01-01&end_date=2025-01-31&limit=30&offset=0
```

**Query Parameters:**
- `start_date` (optional): Filter from date (YYYY-MM-DD)
- `end_date` (optional): Filter to date (YYYY-MM-DD)
- `limit` (optional): Results per page (default: 30)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "reconciliations": [
    {
      "id": 123,
      "closing_date": "2025-01-15",
      "shift_identifier": "morning",
      "expected_cash": 12500.00,
      "expected_credit_card": 19977.50,
      "qr_payments_total": 5600.00,
      "actual_cash": 12480.00,
      "actual_credit_card": 19977.50,
      "cash_variance": -20.00,
      "credit_card_variance": 0.00,
      "transaction_count": 45,
      "voided_count": 2,
      "total_sales": 38327.50,
      "closed_by_staff_name": "John Doe",
      "variance_notes": "Short ฿20 in cash",
      "created_at": "2025-01-15T18:30:00Z"
    }
  ],
  "total_count": 100,
  "limit": 30,
  "offset": 0,
  "has_more": true
}
```

### 4. Print Report

**Get reconciliation data for printing:**
```http
GET /api/pos/closing/print/123
```

**URL Parameters:**
- `id` (required): Reconciliation ID

**Response:**
```json
{
  "success": true,
  "reconciliation": {
    "id": 123,
    "closing_date": "2025-01-15",
    "expected_cash": 12500.00,
    "actual_cash": 12480.00,
    "cash_variance": -20.00,
    // ... full reconciliation data
  },
  "message": "Reconciliation data ready for printing"
}
```

## Component Implementation

### Daily Closing Modal (5-Step Wizard)

**File:** `src/components/pos/closing/DailyClosingModal.tsx`

**Step Flow:**
1. **Summary** - View expected amounts, select date
2. **Cash** - Enter counted cash amount, see variance
3. **Credit Card** - Enter batch total and reference
4. **Review** - Confirm all amounts and add notes
5. **Complete** - Show success with print option

**Key Features:**

```typescript
interface DailyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DailyClosingModal: React.FC<DailyClosingModalProps> = ({ isOpen, onClose }) => {
  // State management
  const [step, setStep] = useState<'summary' | 'cash' | 'credit' | 'review' | 'complete'>('summary');
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [existingReconciliation, setExistingReconciliation] = useState<ExistingReconciliation | null>(null);

  // Form state
  const [actualCash, setActualCash] = useState('');
  const [actualCreditCard, setActualCreditCard] = useState('');
  const [batchReference, setBatchReference] = useState('');
  const [varianceNotes, setVarianceNotes] = useState('');
  const [staffPin, setStaffPin] = useState('');

  // Summary data
  const [summary, setSummary] = useState<ClosingSummary | null>(null);
  const [reconciliationId, setReconciliationId] = useState<string | null>(null);

  // Number formatting
  const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Check for existing reconciliation
  const fetchSummary = useCallback(async () => {
    // First check if date already closed
    const historyResponse = await fetch(
      `/api/pos/closing/history?start_date=${selectedDate}&end_date=${selectedDate}&limit=1`
    );

    if (historyResponse.ok) {
      const historyData = await historyResponse.json();
      if (historyData.reconciliations && historyData.reconciliations.length > 0) {
        // Day already closed - show view-only mode
        setExistingReconciliation(historyData.reconciliations[0]);
        setReconciliationId(historyData.reconciliations[0].id);
        return;
      }
    }

    // Day not closed yet - fetch summary for new closing
    const response = await fetch(`/api/pos/closing/summary?date=${selectedDate}`);
    const data = await response.json();
    setSummary(data);
  }, [selectedDate]);

  return (
    // Full-screen mobile, centered card on desktop
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center md:p-4">
      <div className="bg-white md:rounded-lg shadow-2xl md:max-w-2xl w-full h-full md:h-auto md:max-h-[90vh] overflow-y-auto">
        {/* Header with date picker */}
        <div className="bg-gradient-to-r from-[#265020] to-green-700 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-white" />
            <div>
              <h2 className="text-2xl font-bold text-white">Daily Closing</h2>
              <p className="text-sm text-green-100">Reconcile cash and payments</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-white" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              disabled={step !== 'summary'}
              className="bg-white bg-opacity-20 text-white px-3 py-1.5 rounded-lg"
            />
          </div>
        </div>

        {/* View mode for existing reconciliation */}
        {existingReconciliation && (
          <div className="p-6 space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-blue-900">Day Already Closed</h3>
              </div>
              <p className="text-sm text-blue-700 mt-2">
                This day was closed by {existingReconciliation.closed_by_staff_name} on{' '}
                {new Date(existingReconciliation.created_at).toLocaleString()}
              </p>
            </div>

            {/* Display reconciliation summary */}
            {/* ... existing reconciliation display ... */}

            <div className="flex gap-3">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="h-5 w-5 mr-2" />
                Print Report
              </Button>
              <Button onClick={resetAndClose} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Summary */}
        {!existingReconciliation && step === 'summary' && (
          <div className="p-6 space-y-6">
            {/* Expected amounts display */}
          </div>
        )}

        {/* Step 2: Cash Count */}
        {step === 'cash' && (
          <div className="p-6 space-y-6">
            {/* Cash input with variance calculation */}
          </div>
        )}

        {/* Step 3: Credit Card */}
        {step === 'credit' && (
          <div className="p-6 space-y-6">
            {/* Credit card input with batch reference */}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 'review' && (
          <div className="p-6 space-y-6">
            {/* Summary review with PIN input */}
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && (
          <div className="p-6 space-y-6">
            <div className="text-center py-4">
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Closing Saved!</h3>
              <p className="text-gray-600">Daily reconciliation has been recorded successfully.</p>
              <p className="text-sm text-gray-500 mt-2">
                You can print the report now or close the window.
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="h-5 w-5 mr-2" />
                Print Report
              </Button>
              <Button onClick={resetAndClose} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

## User Workflow

### Standard Daily Closing

**Step-by-Step Process:**

1. **Open Closing Modal**
   - Staff clicks "Close Day" in POS menu
   - Modal opens showing current date
   - Can select different date if needed (max: today)

2. **Review Summary**
   - View expected cash and credit card amounts
   - See QR payments (informational only)
   - Review transaction count and voided transactions
   - Click "Start Closing" to begin

3. **Count Cash**
   - Enter actual cash counted from register
   - See real-time variance (actual - expected)
   - Color coding: Green (under), Red (over), Black (exact)
   - Click "Continue" to proceed

4. **Verify Credit Cards**
   - Enter credit card batch total from terminal
   - Optionally enter batch reference number
   - See credit card variance
   - Click "Continue" to review

5. **Review & Submit**
   - Review all amounts and variances
   - Add variance notes if needed (especially for large discrepancies)
   - Enter staff PIN for authorization
   - Click "Submit Closing"

6. **Complete**
   - Success confirmation displayed
   - Option to print reconciliation report
   - Close button to exit modal

### Viewing Closed Days

**Read-Only Mode:**

1. Staff selects a previously closed date
2. System detects existing reconciliation
3. Displays read-only summary:
   - Who closed the day and when
   - All expected vs actual amounts
   - Variances with color coding
   - QR payments total
   - Variance notes
4. Options: Print Report or Close

### Variance Handling

**Variance Calculation:**
```
Variance = Actual - Expected

Positive variance = Over (more money than expected)
Negative variance = Under (less money than expected)
Zero variance = Exact match
```

**Color Coding:**
- **Green (Under)**: Negative variance, less than expected
- **Red (Over)**: Positive variance, more than expected
- **Black (Exact)**: Zero variance, perfect match

**Best Practices:**
- Always add notes for variances over ฿50
- Common explanations:
  - "Customer returned overpayment"
  - "Rounding discrepancy from change"
  - "Voided transaction adjustment"
  - "Cash paid out for petty cash"

## Security Features

### Staff Authentication

**PIN Verification:**
- Uses `clear_pin` column (same as POS login)
- Verifies staff is active (`is_active = true`)
- Records staff name and ID with reconciliation
- No manager approval required (staff-level operation)

**Code Implementation:**
```typescript
// API endpoint verification
const { data: staffData, error: staffError } = await supabase
  .schema('backoffice')
  .from('staff')
  .select('id, staff_name')
  .eq('clear_pin', staff_pin)
  .eq('is_active', true)
  .maybeSingle();

if (staffError || !staffData) {
  return NextResponse.json({
    error: 'Invalid staff PIN'
  }, { status: 401 });
}
```

### Duplicate Prevention

**Database Constraint:**
```sql
UNIQUE(closing_date, shift_identifier)
```

**Behavior:**
- Attempting to close same day twice returns error 409 (Conflict)
- Frontend checks for existing reconciliation before showing form
- View-only mode prevents accidental re-submission

## Responsive Design

### Mobile/Tablet (Full Screen)
```css
/* Full screen on mobile */
.fixed.inset-0 {
  height: 100vh;
  width: 100vw;
}
```

### Desktop (Centered Card)
```css
/* Centered card on desktop */
@media (min-width: 768px) {
  .md\:rounded-lg {
    border-radius: 0.5rem;
  }
  .md\:max-w-2xl {
    max-width: 42rem;
  }
  .md\:h-auto {
    height: auto;
  }
  .md\:max-h-\[90vh\] {
    max-height: 90vh;
  }
}
```

## Number Formatting

**Consistent Currency Display:**
```typescript
const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

// Usage
<span>฿{formatCurrency(12477.50)}</span>
// Displays: ฿12,477.50
```

**Applied To:**
- Expected cash/credit amounts
- Actual cash/credit amounts
- QR payments total
- Variance amounts (with +/- sign)
- Transaction totals

## Printing Integration

### Thermal Receipt Format

**Reconciliation Report Structure:**

Uses 48-character width thermal format matching receipts/bills. Plain numbers (no currency symbols) for better thermal printer compatibility.

```
                LENGOLF CO. LTD.

         DAILY CLOSING REPORT
========================================
Date: 23/10/2025
Closed By: David
Time: 22:28

========================================
          EXPECTED AMOUNTS
========================================
Cash:                            15,395.00
Credit Card:                     15,710.00
QR Payments:                     16,507.00
                          ------------
Total Sales:                     17,612.00

========================================
           ACTUAL AMOUNTS
========================================
Cash Counted:                    15,395.00
Credit Card Batch:               15,710.00
Batch Ref: 000403

========================================
             VARIANCES
========================================
Cash Variance:                       +0.00
Credit Card Variance:                +0.00

* Negative = Under, Positive = Over

========================================
        TRANSACTION SUMMARY
========================================
Total Transactions:                     14
Voided Transactions:                     0
Voided Amount:                        0.00

         ________________________
              Staff Signature

========================================
```

**Key Format Features:**
- **Width**: 48 characters (standard thermal printer)
- **Currency**: Plain numbers (12,500.00) - no Thai Baht symbols
- **Variance**: +/- prefix (+0.00 or -20.00) with * for non-zero
- **Signature**: Staff signature line at end (like tax invoices)
- **Alignment**: Consistent right-alignment for all amounts

**Print Implementation:**
```typescript
const handlePrint = async () => {
  if (!reconciliationId || isPrinting) return;

  setIsPrinting(true);
  try {
    // Fetch structured closing data from API
    const response = await fetch('/api/pos/closing/print-thermal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reconciliationId })
    });

    const result = await response.json();

    // Generate ESC/POS thermal data client-side
    const thermalData = ReceiptFormatter.generateDailyClosingReport(result.closingData);

    // Connect to printer if needed
    if (!bluetoothThermalPrinter.getConnectionStatus()) {
      await bluetoothThermalPrinter.connect();
    }

    // Write chunks to printer
    const chunks = ReceiptFormatter.splitIntoChunks(thermalData, 100);
    for (const chunk of chunks) {
      await characteristic.writeValue(chunk);
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    alert('✅ Daily closing report printed successfully!');
  } catch (error) {
    console.error('Print failed:', error);
    alert(`❌ Print failed: ${error.message}`);
  } finally {
    setIsPrinting(false);
  }
};
```

## Troubleshooting

### Common Issues

**"Invalid staff PIN" Error:**
- Verify staff is using same PIN as POS login
- Check staff account is active in system
- Ensure correct PIN entered (case-sensitive in some systems)

**"Day already closed" Error:**
- Date has existing reconciliation
- Use view-only mode to review/reprint
- Contact manager to void if closing was incorrect

**Variance Calculation Issues:**
- Verify all transactions for the day are completed
- Check for pending/held transactions
- Review voided transactions count
- Confirm credit card batch matches terminal report

**Date Selection Problems:**
- Cannot select future dates (max: today)
- Date locked after leaving summary step
- Reset form to change date

### Debug Tools

**Console Logging:**
```typescript
// Enable debug mode
const DEBUG_CLOSING = true;

if (DEBUG_CLOSING) {
  console.log('Closing Summary:', {
    date: selectedDate,
    summary,
    actualCash,
    actualCreditCard,
    variances: {
      cash: parseFloat(actualCash) - parseFloat(summary.expected_cash),
      credit: parseFloat(actualCreditCard) - parseFloat(summary.expected_credit_card)
    }
  });
}
```

## Integration Points

### POS Transaction System
- Reconciliation uses completed transactions only
- Voided transactions tracked separately
- Payment methods aggregated by type

### Staff Management
- PIN verification using staff system
- Staff name and ID recorded with closing
- Active staff check prevents unauthorized closings

### Reporting System
- Daily reconciliation data available for reports
- Variance tracking for audit purposes
- Historical data accessible via history API

## Future Enhancements

### Planned Features
- **Shift-based Closing** - Multiple closings per day by shift
- **Automatic Variance Alerts** - Notify manager for large variances
- **Historical Variance Trends** - Track staff performance over time
- **Email Reports** - Send closing reports to management
- **Cash Deposit Tracking** - Record bank deposits

### Technical Improvements
- **Offline Support** - Cache data for offline closing
- **Mobile App** - Dedicated mobile app for cash counting
- **Photo Attachments** - Attach photos of cash/batch slips
- **Digital Signatures** - Electronic signature for closing

## Related Documentation

- [POS Transaction Management](./POS_TRANSACTION_MANAGEMENT.md) - Transaction data source
- [POS Staff Authentication](./POS_STAFF_AUTHENTICATION.md) - PIN verification system
- [POS Receipt System](./POS_RECEIPT_SYSTEM.md) - Thermal printing integration
- [POS Payment Processing](./POS_PAYMENT_PROCESSING.md) - Payment method tracking
- [POS API Reference](./POS_API_REFERENCE.md) - Complete API documentation

---

*Last Updated: January 2025 | Version: 1.0.0 - Initial Release*
