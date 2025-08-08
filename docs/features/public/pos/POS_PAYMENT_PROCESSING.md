# POS Payment Processing System

## Overview

The Payment Processing System provides basic transaction storage using the `pos.transactions` table structure with VAT calculation capabilities. Payment method endpoints exist for basic payment processing functionality.

## Architecture

### Core Components

**Payment Interface:**
- `PaymentInterface.tsx` - Multi-payment method interface with real-time calculations
- `SimplifiedPaymentModal.tsx` - Streamlined payment flow for quick transactions
- `StaffPinModal.tsx` - PIN verification for payment authorization

**Payment Services:**
- `PromptPayQRGenerator.ts` - Thai PromptPay QR code generation
- `BillSplittingService.ts` - Split payment calculations and processing
- `PaymentProcessor.ts` - Unified payment processing logic

**State Management:**
- `usePromptPayQR.ts` - PromptPay QR code management
- `useBillSplitting.ts` - Split payment functionality

### Database Schema

**Transaction Management:**
```sql
-- Main transactions
pos.transactions (
  id SERIAL PRIMARY KEY,
  table_session_id INTEGER REFERENCES pos.table_sessions(id),
  order_id INTEGER REFERENCES pos.orders(id),
  receipt_number VARCHAR(20) UNIQUE NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  tax_amount DECIMAL(10,2) NOT NULL,
  service_charge DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'pending',
  processed_by_staff_id INTEGER REFERENCES staff(id),
  customer_id INTEGER REFERENCES customers(id),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  voided_at TIMESTAMP,
  void_reason TEXT
);

-- Payment methods and splits
pos.transaction_payments (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES pos.transactions(id),
  payment_method VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  reference_number VARCHAR(100),
  promptpay_reference VARCHAR(50),
  card_last_four VARCHAR(4),
  approval_code VARCHAR(20),
  processed_at TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'completed'
);

-- Payment audit trail
pos.payment_audit_log (
  id SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES pos.transactions(id),
  action VARCHAR(50) NOT NULL,
  staff_id INTEGER REFERENCES staff(id),
  previous_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Reference

### Payment Processing

**Process Payment**
```http
POST /api/pos/payments/process
Content-Type: application/json

{
  "transaction_id": 123,
  "payments": [
    {
      "method": "cash",
      "amount": 300.00
    },
    {
      "method": "promptpay",
      "amount": 250.00,
      "reference_number": "PP20240115001"
    }
  ],
  "staff_pin": "1234",
  "customer_id": 456
}
```

**Response:**
```json
{
  "transaction": {
    "id": 123,
    "receipt_number": "RCP-20240115-001",
    "total_amount": 550.00,
    "payment_status": "completed",
    "payments": [
      {
        "id": 789,
        "method": "cash",
        "amount": 300.00,
        "processed_at": "2024-01-15T10:30:00Z"
      },
      {
        "id": 790,
        "method": "promptpay",
        "amount": 250.00,
        "reference_number": "PP20240115001",
        "processed_at": "2024-01-15T10:30:15Z"
      }
    ]
  },
  "receipt_url": "/api/pos/receipts/RCP-20240115-001",
  "change_due": 0.00
}
```

**Get Available Payment Methods**
```http
GET /api/pos/payment-methods
```

**Response:**
```json
{
  "methods": [
    {
      "id": "cash",
      "name": "Cash",
      "icon": "💵",
      "requires_reference": false,
      "max_amount": null,
      "is_active": true
    },
    {
      "id": "promptpay",
      "name": "PromptPay",
      "icon": "📱",
      "requires_reference": true,
      "max_amount": 50000.00,
      "is_active": true,
      "supports_qr": true
    },
    {
      "id": "credit_card",
      "name": "Credit Card",
      "icon": "💳",
      "requires_reference": true,
      "max_amount": null,
      "is_active": true
    }
  ]
}
```

### PromptPay QR Generation

**Generate PromptPay QR Code**
```http
POST /api/pos/payments/promptpay-qr
Content-Type: application/json

{
  "amount": 550.00,
  "reference": "TBL001-20240115"
}
```

**Response:**
```json
{
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAO...",
  "qr_string": "00020101021229370016A000000677010111011300668123456780208TBLOO1205303764540555055802TH5925LenGolf Restaurant Bangkok6304ABCD",
  "amount": 550.00,
  "reference": "TBL001-20240115",
  "expires_at": "2024-01-15T10:45:00Z"
}
```

## Component Implementation

### PaymentInterface Component

**Main Payment Interface:**
```typescript
const PaymentInterface = ({ transaction, onPaymentComplete }: PaymentInterfaceProps) => {
  // State management
  const [selectedMethods, setSelectedMethods] = useState<PaymentMethod[]>([]);
  const [paymentAmounts, setPaymentAmounts] = useState<Map<string, number>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromptPayQR, setShowPromptPayQR] = useState(false);

  // Data fetching
  const { data: paymentMethods } = useSWR('/api/pos/payment-methods', fetcher);
  const { generateQR, qrCode, isGenerating } = usePromptPayQR();

  // Calculate totals
  const paidAmount = Array.from(paymentAmounts.values()).reduce((sum, amount) => sum + amount, 0);
  const remainingAmount = transaction.total_amount - paidAmount;
  const changeAmount = Math.max(0, paidAmount - transaction.total_amount);

  // Handle payment method selection
  const handleMethodSelect = (method: PaymentMethod) => {
    if (selectedMethods.some(m => m.id === method.id)) return;

    setSelectedMethods(prev => [...prev, method]);
    
    // Auto-fill remaining amount for first method
    if (selectedMethods.length === 0) {
      setPaymentAmounts(prev => new Map(prev.set(method.id, remainingAmount)));
    }
  };

  // Handle amount input
  const handleAmountChange = (methodId: string, amount: number) => {
    setPaymentAmounts(prev => new Map(prev.set(methodId, amount)));
  };

  // Process payment
  const handleProcessPayment = async () => {
    const staffPin = await showStaffPinModal('Payment authorization required');
    if (!staffPin) return;

    setIsProcessing(true);
    try {
      const payments = selectedMethods.map(method => ({
        method: method.id,
        amount: paymentAmounts.get(method.id) || 0,
        reference_number: method.requires_reference ? generateReference(method.id) : undefined
      }));

      const response = await fetch('/api/pos/payments/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transaction.id,
          payments,
          staff_pin: staffPin
        })
      });

      if (!response.ok) throw new Error('Payment processing failed');

      const result = await response.json();
      onPaymentComplete(result);
      
      toast.success('Payment processed successfully');
    } catch (error) {
      toast.error('Payment processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate PromptPay QR
  const handlePromptPaySelect = async () => {
    await generateQR(remainingAmount, `TBL${transaction.table_number}-${Date.now()}`);
    setShowPromptPayQR(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {/* Transaction Summary */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Payment Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>฿{transaction.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (7%):</span>
            <span>฿{transaction.tax_amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>Total:</span>
            <span>฿{transaction.total_amount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Select Payment Methods</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {paymentMethods?.methods.map(method => (
            <button
              key={method.id}
              onClick={() => method.id === 'promptpay' ? handlePromptPaySelect() : handleMethodSelect(method)}
              disabled={selectedMethods.some(m => m.id === method.id)}
              className={cn(
                "p-4 border rounded-lg text-center transition-colors",
                selectedMethods.some(m => m.id === method.id)
                  ? "bg-blue-100 border-blue-300"
                  : "hover:bg-gray-50"
              )}
            >
              <div className="text-2xl mb-2">{method.icon}</div>
              <div className="font-medium">{method.name}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Payment Methods */}
      {selectedMethods.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-3">Payment Breakdown</h4>
          <div className="space-y-3">
            {selectedMethods.map(method => (
              <div key={method.id} className="flex items-center space-x-3 p-3 border rounded">
                <span className="text-xl">{method.icon}</span>
                <span className="flex-1">{method.name}</span>
                <div className="flex items-center space-x-2">
                  <span>฿</span>
                  <input
                    type="number"
                    value={paymentAmounts.get(method.id) || ''}
                    onChange={(e) => handleAmountChange(method.id, parseFloat(e.target.value) || 0)}
                    className="w-24 p-2 border rounded text-right"
                    step="0.01"
                    min="0"
                  />
                </div>
                <button
                  onClick={() => {
                    setSelectedMethods(prev => prev.filter(m => m.id !== method.id));
                    setPaymentAmounts(prev => {
                      const newMap = new Map(prev);
                      newMap.delete(method.id);
                      return newMap;
                    });
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Summary */}
      {selectedMethods.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex justify-between mb-2">
            <span>Amount Paid:</span>
            <span>฿{paidAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>Remaining:</span>
            <span className={remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}>
              ฿{remainingAmount.toFixed(2)}
            </span>
          </div>
          {changeAmount > 0 && (
            <div className="flex justify-between font-semibold text-green-600">
              <span>Change Due:</span>
              <span>฿{changeAmount.toFixed(2)}</span>
            </div>
          )}
        </div>
      )}

      {/* Process Payment Button */}
      <button
        onClick={handleProcessPayment}
        disabled={remainingAmount > 0 || selectedMethods.length === 0 || isProcessing}
        className={cn(
          "w-full py-3 px-4 rounded-lg font-semibold text-white",
          remainingAmount === 0 && selectedMethods.length > 0
            ? "bg-green-500 hover:bg-green-600"
            : "bg-gray-300 cursor-not-allowed"
        )}
      >
        {isProcessing ? 'Processing...' : 'Process Payment'}
      </button>

      {/* PromptPay QR Modal */}
      {showPromptPayQR && qrCode && (
        <PromptPayQRModal
          qrCode={qrCode}
          amount={remainingAmount}
          onConfirm={() => {
            setSelectedMethods(prev => [...prev, { id: 'promptpay', name: 'PromptPay', icon: '📱' }]);
            setPaymentAmounts(prev => new Map(prev.set('promptpay', remainingAmount)));
            setShowPromptPayQR(false);
          }}
          onCancel={() => setShowPromptPayQR(false)}
        />
      )}
    </div>
  );
};
```

### PromptPay QR Generator Service

**Thai PromptPay QR Code Generation:**
```typescript
class PromptPayQRGenerator {
  private readonly PROMPTPAY_ID = '0016A000000677010111'; // Standard PromptPay identifier
  private readonly MERCHANT_ID = '13006681234567'; // Your PromptPay merchant ID

  generateQRString(amount: number, reference: string): string {
    // Format amount to 2 decimal places
    const formattedAmount = amount.toFixed(2);
    
    // Build QR data according to EMV QR Code specification
    const qrData = [
      '00', '02', // Payload Format Indicator
      '01', '12', // Point of Initiation Method (12 = QR Code)
      '29', this.formatLength(this.PROMPTPAY_ID + this.MERCHANT_ID),
      this.PROMPTPAY_ID,
      this.MERCHANT_ID,
      '53', '03', '764', // Transaction Currency (764 = THB)
      '54', this.formatLength(formattedAmount), formattedAmount,
      '58', '02', 'TH', // Country Code
      '59', this.formatLength('LenGolf Restaurant'), 'LenGolf Restaurant',
      '60', this.formatLength('Bangkok'), 'Bangkok'
    ].join('');

    // Add reference if provided
    let qrWithReference = qrData;
    if (reference) {
      const referenceField = '62' + this.formatLength('05' + this.formatLength(reference) + reference) + 
                            '05' + this.formatLength(reference) + reference;
      qrWithReference += referenceField;
    }

    // Calculate and append CRC checksum
    const crc = this.calculateCRC16(qrWithReference + '6304');
    const finalQR = qrWithReference + '63' + '04' + crc;

    return finalQR;
  }

  async generateQRCode(amount: number, reference: string): Promise<string> {
    const qrString = this.generateQRString(amount, reference);
    
    // Generate QR code image using qrcode library
    const qrCodeDataURL = await QRCode.toDataURL(qrString, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  }

  private formatLength(data: string): string {
    return data.length.toString().padStart(2, '0');
  }

  private calculateCRC16(data: string): string {
    let crc = 0xFFFF;
    
    for (let i = 0; i < data.length; i++) {
      crc ^= data.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if (crc & 0x8000) {
          crc = (crc << 1) ^ 0x1021;
        } else {
          crc = crc << 1;
        }
      }
    }
    
    return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  }
}
```

### Bill Splitting Service

**Split Payment Calculations:**
```typescript
class BillSplittingService {
  // Equal split between multiple people
  splitEqual(totalAmount: number, numberOfPeople: number): SplitResult {
    const amountPerPerson = totalAmount / numberOfPeople;
    const roundedAmount = Math.ceil(amountPerPerson * 100) / 100; // Round up to nearest cent
    
    const splits = Array(numberOfPeople).fill(0).map((_, index) => ({
      person: index + 1,
      amount: roundedAmount,
      percentage: (roundedAmount / totalAmount) * 100
    }));

    // Adjust last person's amount to account for rounding
    const totalSplit = roundedAmount * numberOfPeople;
    if (totalSplit > totalAmount) {
      splits[splits.length - 1].amount -= (totalSplit - totalAmount);
    }

    return {
      splits,
      total: totalAmount,
      verification: splits.reduce((sum, split) => sum + split.amount, 0)
    };
  }

  // Split by specific amounts
  splitByAmount(totalAmount: number, amounts: number[]): SplitResult {
    const specifiedTotal = amounts.reduce((sum, amount) => sum + amount, 0);
    
    if (Math.abs(specifiedTotal - totalAmount) > 0.01) {
      throw new Error(`Split amounts (${specifiedTotal}) don't match total (${totalAmount})`);
    }

    const splits = amounts.map((amount, index) => ({
      person: index + 1,
      amount,
      percentage: (amount / totalAmount) * 100
    }));

    return {
      splits,
      total: totalAmount,
      verification: specifiedTotal
    };
  }

  // Split by percentage
  splitByPercentage(totalAmount: number, percentages: number[]): SplitResult {
    const totalPercentage = percentages.reduce((sum, pct) => sum + pct, 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(`Percentages must total 100%, got ${totalPercentage}%`);
    }

    const splits = percentages.map((percentage, index) => {
      const amount = Math.round((totalAmount * percentage / 100) * 100) / 100;
      return {
        person: index + 1,
        amount,
        percentage
      };
    });

    // Adjust for rounding differences
    const calculatedTotal = splits.reduce((sum, split) => sum + split.amount, 0);
    if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
      const difference = totalAmount - calculatedTotal;
      splits[0].amount += difference;
    }

    return {
      splits,
      total: totalAmount,
      verification: splits.reduce((sum, split) => sum + split.amount, 0)
    };
  }
}
```

## Thai VAT Compliance

### VAT Calculation

**7% VAT Implementation:**
```typescript
const calculateVAT = (subtotal: number): VATCalculation => {
  const VAT_RATE = 0.07; // 7% Thai VAT
  
  // Calculate VAT amount
  const vatAmount = subtotal * VAT_RATE;
  
  // Round to 2 decimal places
  const roundedVAT = Math.round(vatAmount * 100) / 100;
  const total = subtotal + roundedVAT;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vat_amount: roundedVAT,
    vat_rate: VAT_RATE,
    total: Math.round(total * 100) / 100,
    includes_vat: false // VAT added on top
  };
};

// For price-inclusive VAT calculation
const calculateInclusiveVAT = (priceIncludingVAT: number): VATCalculation => {
  const VAT_RATE = 0.07;
  const divisor = 1 + VAT_RATE;
  
  const subtotal = priceIncludingVAT / divisor;
  const vatAmount = priceIncludingVAT - subtotal;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    vat_amount: Math.round(vatAmount * 100) / 100,
    vat_rate: VAT_RATE,
    total: priceIncludingVAT,
    includes_vat: true
  };
};
```

### Receipt VAT Information

**Thai Tax Receipt Format:**
```typescript
const generateVATReceipt = (transaction: Transaction): VATReceiptData => {
  return {
    tax_invoice_number: `TI-${transaction.receipt_number}`,
    tax_id: '1234567890123', // Your company tax ID
    branch: '00000', // Head office
    issue_date: new Date().toISOString(),
    items: transaction.items.map(item => ({
      description: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.total_price
    })),
    subtotal: transaction.subtotal,
    vat_amount: transaction.tax_amount,
    total: transaction.total_amount,
    vat_registration: 'กทม-1234567890123-000', // VAT registration format
    footer_text: [
      'ใบกำกับภาษีอย่างย่อ / Tax Invoice',
      'Thank you for your business'
    ]
  };
};
```

## Security & Compliance

### Payment Security

**PCI DSS Compliance Measures:**
```typescript
// Secure payment data handling
const sanitizePaymentData = (paymentData: RawPaymentData): SanitizedPaymentData => {
  return {
    ...paymentData,
    // Never log or store full card numbers
    card_number: paymentData.card_number ? 
      '**** **** **** ' + paymentData.card_number.slice(-4) : undefined,
    // Hash sensitive reference numbers
    reference_hash: paymentData.reference_number ? 
      crypto.createHash('sha256').update(paymentData.reference_number).digest('hex') : undefined
  };
};

// Audit trail for payment operations
const logPaymentAudit = async (transactionId: number, action: string, staffId: number, details: any) => {
  await supabase.from('pos.payment_audit_log').insert({
    transaction_id: transactionId,
    action,
    staff_id: staffId,
    new_values: sanitizePaymentData(details),
    created_at: new Date().toISOString()
  });
};
```

### Authorization Controls

**Multi-Level Authorization:**
```typescript
const requiresManagerApproval = (amount: number, paymentMethod: string): boolean => {
  const MANAGER_APPROVAL_THRESHOLD = 5000; // THB
  const RESTRICTED_METHODS = ['credit_adjustment', 'comp'];
  
  return amount > MANAGER_APPROVAL_THRESHOLD || RESTRICTED_METHODS.includes(paymentMethod);
};

const authorizePayment = async (paymentData: PaymentRequest): Promise<AuthorizationResult> => {
  // Basic staff authentication
  const staffAuth = await verifyStaffPin(paymentData.staff_pin);
  if (!staffAuth.success) {
    return { authorized: false, reason: 'Invalid staff PIN' };
  }

  // Check if manager approval required
  if (requiresManagerApproval(paymentData.total_amount, paymentData.primary_method)) {
    const managerAuth = await requestManagerApproval(paymentData);
    if (!managerAuth.approved) {
      return { authorized: false, reason: 'Manager approval required' };
    }
  }

  return { authorized: true, staff_id: staffAuth.staff.id };
};
```

## Performance Optimization

### Payment Processing Performance

**Optimized Transaction Handling:**
```typescript
const processPaymentOptimized = async (paymentData: PaymentRequest): Promise<PaymentResult> => {
  // Start database transaction
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Insert transaction record
    const transactionResult = await client.query(
      `INSERT INTO pos.transactions (table_session_id, subtotal, tax_amount, total_amount, processed_by_staff_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, receipt_number`,
      [paymentData.table_session_id, paymentData.subtotal, paymentData.tax_amount, 
       paymentData.total_amount, paymentData.staff_id]
    );

    const transactionId = transactionResult.rows[0].id;

    // Batch insert payment records
    const paymentValues = paymentData.payments.map((payment, index) => 
      `(${transactionId}, '${payment.method}', ${payment.amount}, '${payment.reference || ''}', NOW())`
    ).join(',');

    await client.query(
      `INSERT INTO pos.transaction_payments (transaction_id, payment_method, amount, reference_number, processed_at)
       VALUES ${paymentValues}`
    );

    // Update table session status
    await client.query(
      'UPDATE pos.table_sessions SET status = $1 WHERE id = $2',
      ['paid', paymentData.table_session_id]
    );

    await client.query('COMMIT');

    return {
      success: true,
      transaction_id: transactionId,
      receipt_number: transactionResult.rows[0].receipt_number
    };

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
```

### Caching Strategy

**Payment Method Caching:**
```typescript
const paymentMethodCache = new Map<string, PaymentMethod[]>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedPaymentMethods = async (): Promise<PaymentMethod[]> => {
  const cacheKey = 'payment_methods';
  const cached = paymentMethodCache.get(cacheKey);
  
  if (cached && cached.timestamp + CACHE_DURATION > Date.now()) {
    return cached.data;
  }

  const methods = await fetchPaymentMethodsFromDB();
  paymentMethodCache.set(cacheKey, {
    data: methods,
    timestamp: Date.now()
  });

  return methods;
};
```

## Troubleshooting

### Common Issues

**Payment Processing Failures:**
1. Verify staff PIN authentication
2. Check payment method availability
3. Validate transaction amounts
4. Review database constraints
5. Check network connectivity for external payment providers

**PromptPay QR Code Issues:**
1. Verify merchant ID configuration
2. Check amount formatting (2 decimal places)
3. Validate reference string length
4. Test QR code generation library
5. Confirm Thai Baht currency code (764)

**Split Payment Calculation Errors:**
1. Verify total amounts match
2. Check rounding logic
3. Validate percentage calculations
4. Review minimum payment amounts
5. Test edge cases (very small amounts)

### Debug Tools

**Payment Debug Console:**
```typescript
// Debug payment processing
const debugPayment = (paymentData: PaymentRequest) => {
  console.log('Payment Debug:', {
    total_amount: paymentData.total_amount,
    payment_methods: paymentData.payments.map(p => ({
      method: p.method,
      amount: p.amount
    })),
    calculated_total: paymentData.payments.reduce((sum, p) => sum + p.amount, 0),
    staff_id: paymentData.staff_id
  });
};

// Monitor PromptPay QR generation
const debugPromptPay = (amount: number, reference: string) => {
  const generator = new PromptPayQRGenerator();
  const qrString = generator.generateQRString(amount, reference);
  
  console.log('PromptPay Debug:', {
    amount,
    reference,
    qr_length: qrString.length,
    merchant_id: qrString.includes('13006681234567'),
    currency_code: qrString.includes('764'),
    checksum: qrString.slice(-4)
  });
};
```

## Integration Points

### Order Management System
- Automatic transaction creation from completed orders
- Order status updates upon payment completion
- Integration with order modification and cancellation

### Receipt Generation System
- Payment data integration for receipt creation
- VAT information inclusion for tax compliance
- Multiple receipt format support

### Customer Management
- Payment history tracking
- Loyalty program integration
- Customer preference storage for payment methods

## Future Enhancements

### Planned Features
- **Contactless Payments** - NFC and mobile wallet integration
- **Cryptocurrency Support** - Bitcoin and other crypto payments
- **Advanced Analytics** - Payment method performance analysis
- **Loyalty Integration** - Points redemption and earning

### Technical Improvements
- **Real-Time Payment Status** - WebSocket-based payment notifications
- **Enhanced Security** - Tokenization and encryption improvements
- **Performance Optimization** - Faster payment processing
- **Multi-Currency Support** - International payment handling

## Related Documentation

- [POS Order Management](./POS_ORDER_MANAGEMENT.md) - Order processing integration
- [POS Receipt System](./POS_RECEIPT_SYSTEM.md) - Receipt generation
- [POS Staff Authentication](./POS_STAFF_AUTHENTICATION.md) - Authorization system
- [POS API Reference](./POS_API_REFERENCE.md) - Complete API documentation

---

*Last Updated: January 2025 | Version: 2.1.0*