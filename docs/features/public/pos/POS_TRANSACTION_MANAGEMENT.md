# POS Transaction Management System

## Overview

The Transaction Management System handles the complete transaction lifecycle from order creation to payment completion, including voiding, refunding, and tax invoice generation. Built around the `pos.transactions` and `pos.transaction_items` tables with comprehensive audit trails.

## Architecture

### Core Components

**Transaction Interface:**
- `POSTransactionList.tsx` - Main transaction listing with filtering and search
- `POSTransactionDetail.tsx` - Individual transaction details and line items
- `TransactionDetailModal.tsx` - Modal view for transaction examination
- `VoidPinModal.tsx` - Staff PIN verification for voiding transactions
- `TaxInvoiceModal.tsx` - Thai tax invoice generation and display

**Transaction Services:**
- `POSTransactionService.ts` - Core transaction operations and state management
- `TransactionQueryService.ts` - Advanced transaction querying and reporting

**State Management:**
- Transaction listing with real-time updates
- Void/refund processing with staff authorization

### Database Schema

**Core Transaction Tables:**
```sql
-- Main transactions table
pos.transactions (
  id UUID PRIMARY KEY,
  transaction_id UUID,
  receipt_number VARCHAR,
  vat_amount NUMERIC,
  total_amount NUMERIC,
  discount_amount NUMERIC,
  subtotal_amount NUMERIC,
  net_amount NUMERIC,
  table_session_id UUID,
  staff_id INTEGER,
  customer_id UUID,
  booking_id TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR,
  tax_invoice_number VARCHAR,
  tax_invoice_issued BOOLEAN,
  tax_invoice_date TIMESTAMP WITH TIME ZONE,
  customer_tax_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Transaction line items with comprehensive pricing
pos.transaction_items (
  id UUID PRIMARY KEY,
  transaction_id UUID NOT NULL,
  table_session_id UUID NOT NULL,
  product_id UUID,
  item_cnt INTEGER NOT NULL,
  line_number INTEGER NOT NULL,
  unit_price_incl_vat NUMERIC NOT NULL,
  unit_price_excl_vat NUMERIC NOT NULL,
  line_total_incl_vat NUMERIC NOT NULL,
  line_total_excl_vat NUMERIC NOT NULL,
  line_vat_amount NUMERIC NOT NULL,
  line_discount NUMERIC,
  item_discount NUMERIC,
  item_notes TEXT,
  staff_id INTEGER NOT NULL,
  customer_id UUID,
  booking_id TEXT,
  is_voided BOOLEAN,
  voided_at TIMESTAMP WITH TIME ZONE,
  voided_by VARCHAR,
  sales_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Transaction payment methods
pos.transaction_payments (
  -- Payment method tracking for split payments
);

-- Transaction details for additional metadata
pos.transaction_details (
  -- Additional transaction metadata and notes
);
```

## API Reference

### Transaction Operations

**Get Transactions with Advanced Filtering**
```http
POST /api/pos/transactions
Content-Type: application/json

{
  "filters": {
    "dateRange": {
      "start": "2024-01-15",
      "end": "2024-01-16"
    },
    "status": "paid",
    "paymentMethod": "cash",
    "staffName": "John Doe",
    "minAmount": 100,
    "maxAmount": 1000
  },
  "pagination": {
    "page": 1,
    "limit": 50
  },
  "sort": {
    "sortBy": "sales_timestamp",
    "sortOrder": "desc"
  }
}
```

**Response:**
```json
{
  "transactions": [
    {
      "receipt_number": "RCP-20240115-001",
      "sales_timestamp": "2024-01-15T10:30:00Z",
      "customer_name": "Walk-in",
      "staff_name": "John Doe",
      "payment_method": "Cash",
      "total_amount": 450.00,
      "item_count": 3,
      "status": "paid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "hasMore": true
  }
}
```

### Transaction Lifecycle

**Transaction States:**
1. **draft** - Transaction created from order
2. **pending** - Awaiting payment
3. **paid** - Payment completed successfully
4. **voided** - Transaction cancelled/voided
5. **refunded** - Payment refunded

**State Transitions:**
- draft → pending (order confirmed)
- pending → paid (payment processed)
- paid → voided (with staff authorization)
- paid → refunded (partial or full refund)

## Component Implementation

### POSTransactionList Component

**Features:**
- Advanced filtering by date range, staff, payment method, amount
- Real-time transaction status updates
- Bulk operations for reporting
- Export functionality for accounting

```typescript
const POSTransactionList = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filters, setFilters] = useState<TransactionFilters>({});
  const [loading, setLoading] = useState(false);

  // Fetch transactions with filters
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pos/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters, pagination, sort })
      });
      
      const data = await response.json();
      setTransactions(data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="transaction-management">
      <TransactionFilters 
        filters={filters}
        onFiltersChange={setFilters}
      />
      
      <TransactionTable 
        transactions={transactions}
        loading={loading}
        onTransactionSelect={handleTransactionSelect}
      />
    </div>
  );
};
```

### Void Transaction System

**VoidPinModal Component:**
```typescript
const VoidPinModal = ({ transactionId, onVoidComplete }: VoidPinModalProps) => {
  const [pin, setPin] = useState('');
  const [reason, setReason] = useState('');

  const handleVoidTransaction = async () => {
    // Staff PIN verification required for voiding
    const staffAuth = await verifyStaffPin(pin);
    if (!staffAuth.success) {
      setError('Invalid staff PIN');
      return;
    }

    // Process void with audit trail
    await voidTransaction(transactionId, {
      voidedBy: staffAuth.staff.staff_name,
      reason,
      timestamp: new Date().toISOString()
    });

    onVoidComplete();
  };

  return (
    <div className="void-pin-modal">
      <h3>Void Transaction Authorization</h3>
      
      <input
        type="password"
        placeholder="Staff PIN"
        value={pin}
        onChange={(e) => setPin(e.target.value)}
      />
      
      <textarea
        placeholder="Void reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      
      <button onClick={handleVoidTransaction}>
        Confirm Void
      </button>
    </div>
  );
};
```

## Thai Tax Invoice System

### TaxInvoiceModal Component

**Thai Tax Compliance:**
```typescript
const TaxInvoiceModal = ({ transaction }: TaxInvoiceModalProps) => {
  const generateTaxInvoice = async () => {
    const taxInvoiceData = {
      tax_invoice_number: `TI-${transaction.receipt_number}`,
      business_name: 'LenGolf Restaurant Co., Ltd.',
      tax_id: '1234567890123',
      customer_tax_info: transaction.customer_tax_info,
      items: transaction.items.map(item => ({
        description: item.product_name,
        quantity: item.item_cnt,
        unit_price_excl_vat: item.unit_price_excl_vat,
        vat_amount: item.line_vat_amount,
        total_excl_vat: item.line_total_excl_vat
      })),
      subtotal_excl_vat: transaction.subtotal_amount,
      vat_amount: transaction.vat_amount,
      total_incl_vat: transaction.total_amount
    };

    // Generate and store tax invoice
    await createTaxInvoice(taxInvoiceData);
  };

  return (
    <div className="tax-invoice-modal">
      <div className="tax-invoice-header">
        <h2>Tax Invoice / ใบกำกับภาษี</h2>
        <div className="business-info">
          <p>LenGolf Restaurant Co., Ltd.</p>
          <p>Tax ID: 1234567890123</p>
        </div>
      </div>
      
      <div className="invoice-items">
        {transaction.items.map(item => (
          <div key={item.id} className="invoice-item">
            <span>{item.product_name}</span>
            <span>{item.item_cnt}</span>
            <span>฿{item.unit_price_excl_vat}</span>
            <span>฿{item.line_total_excl_vat}</span>
          </div>
        ))}
      </div>
      
      <div className="invoice-totals">
        <div>Subtotal (excl. VAT): ฿{transaction.subtotal_amount}</div>
        <div>VAT (7%): ฿{transaction.vat_amount}</div>
        <div>Total: ฿{transaction.total_amount}</div>
      </div>
    </div>
  );
};
```

## Analytics & Reporting

### Sales Analytics Integration

The transaction system integrates with comprehensive sales analytics:

```sql
-- Sales analytics view
pos.lengolf_sales (
  -- Denormalized sales data for reporting
  -- Includes product, staff, customer, and time dimensions
);

-- Real-time sales monitoring
pos.mv_status_monitor (
  -- Materialized view for dashboard metrics
);
```

## Integration Points

### Order Management
- Automatic transaction creation from confirmed orders
- Order item mapping to transaction items
- Status synchronization between orders and transactions

### Payment Processing
- Payment method recording in transaction_payments
- Split payment support across multiple methods
- Change calculation and cash drawer integration

### Inventory Management
- Stock reduction upon transaction completion
- Product mapping through pos.product_mappings
- Inventory alerts for low stock items

## Performance Optimization

### Indexing Strategy
```sql
-- Optimized indexes for transaction queries
CREATE INDEX idx_transactions_date_status ON pos.transactions(transaction_date, status);
CREATE INDEX idx_transaction_items_transaction_id ON pos.transaction_items(transaction_id);
CREATE INDEX idx_transactions_staff_date ON pos.transactions(staff_id, transaction_date);
```

### Caching
- Transaction summaries cached for dashboard performance
- Staff and product lookups cached for faster display
- Date range queries optimized with materialized views

## Security & Audit

### Void Transaction Security
- Staff PIN verification required for all voids
- Comprehensive audit trail with void reasons
- Immutable transaction history (soft deletes only)

### Data Integrity
- Cross-table validation for transaction totals
- VAT calculation verification
- Automated reconciliation checks

## Troubleshooting

### Common Issues

**Transaction Total Mismatches:**
1. Verify VAT calculations across items
2. Check discount applications
3. Validate line total calculations

**Void Authorization Failures:**
1. Confirm staff PIN is correct
2. Check staff permissions for voiding
3. Verify transaction is in voidable state

**Tax Invoice Generation Issues:**
1. Validate customer tax information
2. Check Thai tax ID format
3. Verify business registration details

## Future Enhancements

### Planned Features
- **Advanced Refund Processing** - Partial refunds and exchange handling
- **Multi-Currency Support** - Foreign currency transaction processing
- **Enhanced Analytics** - Real-time transaction monitoring dashboard
- **Integration APIs** - Third-party accounting system integration

---

*Last Updated: January 2025 | Version: 1.0.0*