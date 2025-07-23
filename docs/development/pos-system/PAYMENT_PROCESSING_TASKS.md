# Payment Tracking System - Implementation Tasks

## Project Overview
Implementation of the Payment Tracking System for Lengolf POS, focusing on payment method selection, PromptPay QR code generation, and transaction recording. This builds upon the existing order management and table session systems to complete the end-to-end transaction workflow **without complex payment processing integration**.

**Timeline Estimate**: 2 weeks  
**Priority**: Critical (Missing Core Component)  
**Dependencies**: Order Management System (✅ completed), Table Management System (✅ completed), Product Catalog (✅ completed)  
**Business Context**: 
- EDC machine already exists for card payments (manual processing)
- Cash handling is straightforward 
- PromptPay requires QR code generation with bank account + amount
- Focus on **tracking payments**, not **processing payments**

**Total Implementation Scope**: 78+ hours across 2 phases
**Key Deliverables**: Payment method selection interface, PromptPay QR generation, transaction tracking, receipt generation, and seamless integration with existing `pos.lengolf_sales` analytics

---

## Current Implementation Status

### ✅ Solid Foundation (Already Implemented)
- [x] **Order Management System**: Complete normalized database with `pos.orders` and `pos.order_items`
- [x] **Table Session Management**: Full table lifecycle with session tracking
- [x] **Staff Authentication**: PIN-based authentication system working
- [x] **Product Catalog**: Complete product browsing and selection
- [x] **Order Creation APIs**: Order confirmation and item management endpoints
- [x] **Analytics Pipeline**: Existing `pos.lengolf_sales` with payment tracking ready
- [x] **Real-time Updates**: WebSocket infrastructure established

### ✅ Existing Payment Methods (Already in Use via Qashier)
Current payment methods being tracked in `pos.lengolf_sales`:
- [x] **Cash**: 3,942 transactions - Simple cash handling
- [x] **Visa Manual**: 3,849 transactions - Via existing EDC machine
- [x] **Mastercard Manual**: 2,479 transactions - Via existing EDC machine  
- [x] **PromptPay Manual**: 4,807 transactions - Manual QR code scanning
- [x] **Alipay**: 93 transactions - Digital wallet payments
- [x] **Split Payments**: Already tracked with complex payment method strings

### ❌ Critical Missing Components (Payment Tracking UI)

#### 1. Payment Method Selection Interface
**Status**: ❌ Not Implemented
- No payment method selection UI in POS interface
- No integration between order completion and payment tracking
- No PromptPay QR code generation

#### 2. PromptPay QR Code Generation
**Status**: ❌ Not Implemented  
- No automatic QR code generation with bank account + amount
- No PromptPay integration using libraries like `promptpay-qr`
- Manual QR code handling currently used

#### 3. Payment Confirmation & Receipt
**Status**: ❌ Not Implemented
- No payment confirmation interface
- No receipt generation for POS transactions
- No integration with table session closure

#### 4. Item-Level Transaction Database
**Status**: ❌ Not Implemented
- No item-level transaction tracking table
- No transaction_id for receipt-level grouping
- No database structure for building `lengolf_sales` records

### 🎯 Strategic Business Advantage
The existing analytics system already tracks all payment methods correctly:
- Payment method data structure already established
- Split payment tracking already working
- Staff attribution and audit trails ready
- **Goal**: Replace manual Qashier entry with automated POS payment tracking

---

## Phase 1: Payment Tracking Foundation (Week 1)

### 1.1 Item-Level Transaction Database Schema
- [ ] **Task**: Create comprehensive item-level transaction tracking database
  - **Files**: 
    - `supabase/migrations/20250119000000_create_transaction_tracking.sql` **← NEW (critical)**
    - `src/types/transaction.ts` **← NEW (transaction type definitions)**
    - `src/types/pos.ts` (extend existing with transaction types)
  - **Estimate**: 8 hours
  - **Details**: 
    - Item-level transaction table with unique identifiers per item
    - Transaction ID for receipt-level grouping
    - All fields necessary to build `lengolf_sales` records
    - Support for split payments and bill splitting
    - Integration with existing order system
  - **Database Schema**:
    ```sql
    -- Item-level transaction tracking table
    CREATE TABLE pos.transaction_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID NOT NULL, -- Receipt level identifier
        item_sequence INTEGER NOT NULL, -- Item order within transaction
        
        -- Order and product linking
        order_id UUID REFERENCES pos.orders(id),
        table_session_id UUID REFERENCES pos.table_sessions(id),
        product_id UUID,
        
        -- Item details (for lengolf_sales compatibility)
        product_name VARCHAR(255) NOT NULL,
        product_category VARCHAR(100),
        product_parent_category VARCHAR(100),
        sku_number VARCHAR(50),
        
        -- Pricing and quantities
        item_cnt INTEGER NOT NULL DEFAULT 1,
        item_price_incl_vat DECIMAL(10,2) NOT NULL,
        item_price_excl_vat DECIMAL(10,2) NOT NULL,
        item_discount DECIMAL(10,2) DEFAULT 0,
        sales_total DECIMAL(10,2) NOT NULL, -- item_price_incl_vat * item_cnt
        sales_net DECIMAL(10,2) NOT NULL,   -- sales_total - item_discount
        
        -- Payment information (can be split)
        payment_method VARCHAR(100), -- Full payment method string
        payment_amount_allocated DECIMAL(10,2), -- For split payments
        
        -- Staff and customer
        staff_pin VARCHAR(10),
        customer_id UUID,
        customer_name VARCHAR(255),
        
        -- Additional tracking
        table_number VARCHAR(10),
        is_sim_usage BOOLEAN DEFAULT FALSE,
        item_notes TEXT,
        is_voided BOOLEAN DEFAULT FALSE,
        voided_at TIMESTAMPTZ,
        voided_by VARCHAR(255),
        
        -- Timestamps
        sales_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        -- Constraints
        UNIQUE(transaction_id, item_sequence)
    );

    -- Transaction summary table (receipt level)
    CREATE TABLE pos.transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID UNIQUE NOT NULL, -- Same as in transaction_items
        receipt_number VARCHAR(50) UNIQUE NOT NULL,
        
        -- Totals
        subtotal DECIMAL(10,2) NOT NULL,
        vat_amount DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        
        -- Payment details
        payment_methods JSONB, -- Array of payment methods for splits
        payment_status VARCHAR(20) DEFAULT 'completed',
        
        -- Context
        table_session_id UUID REFERENCES pos.table_sessions(id),
        order_id UUID REFERENCES pos.orders(id),
        staff_pin VARCHAR(10),
        customer_id UUID,
        table_number VARCHAR(10),
        
        -- Timestamps
        transaction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Indexes for performance
    CREATE INDEX idx_transaction_items_transaction_id ON pos.transaction_items(transaction_id);
    CREATE INDEX idx_transaction_items_order_id ON pos.transaction_items(order_id);
    CREATE INDEX idx_transaction_items_date ON pos.transaction_items(sales_timestamp);
    CREATE INDEX idx_transactions_date ON pos.transactions(transaction_date);
    CREATE INDEX idx_transactions_receipt ON pos.transactions(receipt_number);
    ```
  - **Acceptance Criteria**: 
    - Database supports item-level transaction tracking with unique IDs
    - Transaction ID groups items into receipts
    - All fields required for `lengolf_sales` are captured
    - Split payment support at both item and transaction level
    - Performance indexes ensure fast queries
    - Foreign key relationships maintain data integrity

### 1.2 Payment Method Types & Configuration
- [ ] **Task**: Define payment method types and configuration based on existing usage
  - **Files**: 
    - `src/types/payment.ts` **← NEW (payment type definitions)**
    - `src/types/transaction.ts` (extend with payment types)
    - `src/config/payment-methods.ts` **← NEW (payment method config)**
  - **Estimate**: 4 hours
  - **Dependencies**: Transaction database schema
  - **Details**: 
    - Define payment method enum matching existing `lengolf_sales` data
    - Support for existing methods: Cash, Visa Manual, Mastercard Manual, PromptPay Manual, Alipay
    - Split payment tracking structure
    - Integration with new transaction tracking system
  - **Payment Method Configuration**:
    ```typescript
    enum PaymentMethod {
      CASH = 'Cash',
      VISA_MANUAL = 'Visa Manual', 
      MASTERCARD_MANUAL = 'Mastercard Manual',
      PROMPTPAY_MANUAL = 'PromptPay Manual',
      ALIPAY = 'Alipay1'
    }

    interface TransactionItem {
      id: string;
      transactionId: string;
      itemSequence: number;
      productName: string;
      productCategory?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      paymentMethodAllocated?: PaymentMethod;
      paymentAmountAllocated?: number;
    }

    interface Transaction {
      id: string;
      transactionId: string;
      receiptNumber: string;
      items: TransactionItem[];
      subtotal: number;
      vatAmount: number;
      totalAmount: number;
      paymentMethods: {
        method: PaymentMethod;
        amount: number;
      }[];
      staffPin: string;
      customerId?: string;
      tableNumber?: string;
    }
    ```
  - **Acceptance Criteria**: 
    - Payment types match existing `lengolf_sales` payment_method values exactly
    - Transaction structure supports item-level payment allocation
    - Split payment structure maintains analytics compatibility
    - Configuration integrates with new transaction database

### 1.3 PromptPay QR Code Generation Service
- [ ] **Task**: Implement PromptPay QR code generation using Thai banking standards
  - **Files**: 
    - `src/services/PromptPayQRGenerator.ts` **← NEW (QR generation)**
    - `src/lib/promptpay-config.ts` **← NEW (bank account config)**
    - `src/hooks/usePromptPayQR.ts` **← NEW (QR generation hooks)**
    - `package.json` (add promptpay-qr dependency)
  - **Estimate**: 8 hours
  - **Dependencies**: External library research and configuration
  - **Details**:
    - Install and configure `promptpay-qr` library by dtinth
    - Configure bank account information for QR generation
    - Generate QR codes with dynamic amounts
    - QR code image generation for display
    - Error handling for invalid amounts or configuration
    - Integration with existing order totals
  - **PromptPay Implementation**:
    ```typescript
    // Install: npm install promptpay-qr qrcode
    import promptpayQr from 'promptpay-qr'
    import QRCode from 'qrcode'

    interface PromptPayConfig {
      phoneNumber: string; // Business phone number
      nationalId?: string; // Alternative identifier
      eWalletId?: string; // Alternative identifier
    }

    class PromptPayQRGenerator {
      async generateQR(amount: number): Promise<string> {
        const payload = promptpayQr(this.config.phoneNumber, { amount });
        const qrCodeDataURL = await QRCode.toDataURL(payload);
        return qrCodeDataURL; // Base64 image for display
      }
    }
    ```
  - **Acceptance Criteria**:
    - QR codes generate correctly with business account information
    - Amount is properly embedded in QR code payload
    - QR code images display clearly on tablet interface
    - Generated QR codes work with Thai banking apps
    - Error handling provides clear feedback for configuration issues
    - QR generation performance is under 1 second

### 1.4 Payment Method Selection Interface
- [ ] **Task**: Create payment method selection and tracking interface
  - **Files**: 
    - `src/components/pos/payment/PaymentModal.tsx` **← NEW (main payment interface)**
    - `src/components/pos/payment/PaymentMethodSelector.tsx` **← NEW (method selection)**
    - `src/components/pos/payment/CashPaymentForm.tsx` **← NEW (cash tracking)**
    - `src/components/pos/payment/CardPaymentForm.tsx` **← NEW (card tracking)**
    - `src/components/pos/payment/PromptPayForm.tsx` **← NEW (PromptPay with QR)**
    - `src/components/pos/payment/PaymentSummary.tsx` **← NEW (payment summary)**
  - **Estimate**: 16 hours
  - **Dependencies**: PromptPay QR generator, payment types
  - **Details**:
    - Modal interface for payment method selection
    - Cash payment form with change calculation
    - Card payment form (EDC machine instruction)
    - PromptPay form with QR code display
    - Payment amount validation
    - Staff PIN integration for authorization
    - Touch-optimized interface for tablets
  - **Interface Design**:
    ```typescript
    // Payment Modal shows:
    // 1. Order summary with total amount
    // 2. Payment method grid (Cash, Cards, PromptPay, Alipay)
    // 3. Selected method form
    // 4. Confirmation buttons

    // Cash Form: Amount input, change calculation
    // Card Form: "Process via EDC machine" instruction + confirmation
    // PromptPay Form: Generated QR code + confirmation
    // Alipay Form: "Scan customer QR" instruction + confirmation
    ```
  - **Acceptance Criteria**:
    - Payment modal opens from order completion
    - All existing payment methods selectable
    - Cash form calculates change correctly
    - PromptPay displays generated QR code clearly
    - Card/Alipay forms provide clear instructions
    - Touch targets meet 44px+ requirements
    - Staff PIN required for payment confirmation

### 1.5 Transaction Creation API Integration
- [ ] **Task**: Create APIs for item-level transaction creation and bill splitting
  - **Files**: 
    - `app/api/pos/transactions/route.ts` **← NEW (transaction creation)**
    - `app/api/pos/transactions/[transactionId]/route.ts` **← NEW (transaction management)**
    - `app/api/pos/transactions/[transactionId]/split/route.ts` **← NEW (bill splitting)**
    - `src/services/TransactionService.ts` **← NEW (transaction logic)**
    - `src/services/BillSplittingService.ts` **← NEW (bill splitting logic)**
    - `src/services/LengolfSalesBuilder.ts` **← NEW (analytics integration)**
  - **Estimate**: 12 hours
  - **Dependencies**: Transaction database schema, payment method configuration
  - **Details**:
    - API endpoints for creating item-level transactions
    - Bill splitting functionality for groups
    - Automatic transaction ID generation
    - Receipt number generation
    - Integration with existing `pos.lengolf_sales` table
    - Support for payment method allocation per item/split
    - Staff audit trail integration
    - Error handling and validation
  - **API Design**:
    ```typescript
    // POST /api/pos/transactions
    interface TransactionCreationRequest {
      orderId: string;
      items: {
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        category?: string;
        skuNumber?: string;
      }[];
      paymentMethods: {
        method: PaymentMethod;
        amount: number;
      }[];
      staffPin: string;
      customerId?: string;
      tableNumber?: string;
      splitBill?: boolean;
      splitDetails?: BillSplitDetails;
    }

    // POST /api/pos/transactions/[transactionId]/split
    interface BillSplitRequest {
      splitType: 'even' | 'by_item' | 'by_amount';
      splits: {
        items?: string[]; // Item IDs for this split
        amount?: number; // Fixed amount for this split
        paymentMethod: PaymentMethod;
        customerInfo?: string;
      }[];
    }

    // Builds records for pos.lengolf_sales compatibility
    // Each item becomes a row in lengolf_sales with proper payment_method
    ```
  - **Acceptance Criteria**:
    - Transaction creation stores items in `pos.transaction_items`
    - Bill splitting allocates payment methods correctly
    - Receipt numbers generated uniquely
    - Integration builds compatible `pos.lengolf_sales` records
    - Split bills maintain analytics compatibility
    - Staff attribution works correctly for all operations
    - API response times under 500ms

---

## Phase 2: Bill Splitting & Receipt Generation (Week 2)

### 2.1 Bill Splitting Interface System
- [ ] **Task**: Enable bill splitting for groups and item-level payment allocation
  - **Files**: 
    - `src/components/pos/billing/BillSplitModal.tsx` **← NEW (bill splitting interface)**
    - `src/components/pos/billing/SplitTypeSelector.tsx` **← NEW (split type selection)**
    - `src/components/pos/billing/ItemAllocationGrid.tsx` **← NEW (item allocation)**
    - `src/components/pos/billing/SplitSummary.tsx` **← NEW (split summary)**
    - `src/services/BillSplitCalculator.ts` **← NEW (split calculations)**
    - `src/hooks/useBillSplitting.ts` **← NEW (bill splitting state)**
  - **Estimate**: 16 hours
  - **Dependencies**: Transaction creation API, payment method selection
  - **Details**:
    - Bill splitting interface for groups (even split, by item, by amount)
    - Item-level payment method allocation
    - Real-time split calculation and validation
    - Individual payment processing per split
    - Support for different customers per split
    - Visual split builder with drag-and-drop
    - PromptPay QR generation per split
    - Staff authorization for bill splitting
  - **Bill Splitting Types**:
    ```typescript
    enum BillSplitType {
      EVEN = 'even',           // Split total amount evenly
      BY_ITEM = 'by_item',     // Allocate specific items to each person
      BY_AMOUNT = 'by_amount'  // Custom amount allocation
    }

    interface BillSplit {
      id: string;
      type: BillSplitType;
      totalAmount: number;
      splits: {
        id: string;
        customerInfo?: string;
        items: string[]; // Transaction item IDs
        amount: number;
        paymentMethod: PaymentMethod;
        paymentStatus: 'pending' | 'completed';
        promptPayQR?: string;
      }[];
    }

    // Each split creates separate transaction_items with payment allocation
    // Maintains compatibility with pos.lengolf_sales format
    ```
  - **Acceptance Criteria**:
    - Bill splits total exactly to order amount
    - Item allocation prevents double-assignment
    - Even split calculates amounts correctly with proper rounding
    - Each split can have different payment methods
    - PromptPay QR codes generated per split amount
    - Split details stored in transaction database
    - Interface prevents invalid split scenarios
    - Analytics compatibility maintained for all split types

### 2.2 Receipt Generation System
- [ ] **Task**: Generate receipts for completed payments
  - **Files**: 
    - `src/services/ReceiptGenerator.ts` **← NEW (receipt generation)**
    - `src/services/ThaiTaxReceiptFormatter.ts` **← NEW (tax compliance)**
    - `src/components/pos/receipt/ReceiptPreview.tsx` **← NEW (receipt preview)**
    - `src/components/pos/receipt/PrintableReceipt.tsx` **← NEW (print format)**
    - `src/hooks/useReceiptGeneration.ts` **← NEW (receipt hooks)**
    - `app/api/pos/receipts/route.ts` **← NEW (receipt API)**
  - **Estimate**: 16 hours
  - **Dependencies**: Payment tracking completion
  - **Details**:
    - Thai tax-compliant receipt formatting
    - Receipt preview before printing
    - Integration with existing order and payment data
    - Multi-language support (Thai/English)
    - Receipt template management
    - Print-friendly CSS formatting
    - Digital receipt option (save as PDF)
  - **Thai Tax Receipt Format**:
    ```typescript
    interface ThaiTaxReceipt {
      header: {
        businessName: string;
        businessAddress: string;
        taxId: string;
        receiptNumber: string;
        dateTime: string;
      };
      transaction: {
        tableNumber?: string;
        staffName: string;
        customerName?: string;
        items: ReceiptItem[];
        subtotal: number;
        vatAmount: number; // 7%
        totalAmount: number;
        paymentMethod: string; // From payment tracking
      };
      footer: {
        thankYouMessage: string;
        returnPolicy?: string;
      };
    }
    ```
  - **Acceptance Criteria**:
    - Receipts comply with Thai tax authority requirements (7% VAT)
    - Receipt shows correct payment method information
    - Split payments display properly on receipt
    - Receipt preview matches final printed format
    - Multi-language receipts switch based on preference
    - Digital receipt saves correctly as PDF
    - Receipt generation completes under 2 seconds

### 2.3 Payment Completion & Table Session Integration
- [ ] **Task**: Complete payment workflow and table session closure
  - **Files**: 
    - `src/services/PaymentCompleter.ts` **← NEW (completion logic)**
    - `src/services/TableSessionCloser.ts` **← NEW (session closure)**
    - `src/components/pos/payment/PaymentSuccess.tsx` **← NEW (success feedback)**
    - `src/hooks/usePaymentCompletion.ts` **← NEW (completion hooks)**
    - `src/hooks/useTableSessionClosure.ts` **← NEW (session closure)**
  - **Estimate**: 12 hours
  - **Dependencies**: Payment tracking, receipt generation
  - **Details**:
    - Complete payment workflow from selection to completion
    - Automatic table session closure after payment
    - Update order status to completed
    - Integration with existing `pos.lengolf_sales` analytics
    - Payment success feedback with order details
    - Navigation back to table management view
    - Error handling for incomplete payments
  - **Payment Completion Flow**:
    ```typescript
    // 1. Payment method selected & processed
    // 2. Payment data recorded in pos.lengolf_sales
    // 3. Receipt generated and displayed
    // 4. Table session status updated
    // 5. Order status marked as completed
    // 6. Success feedback shown
    // 7. Return to table management view
    
    interface PaymentCompletionResult {
      success: boolean;
      receiptGenerated: boolean;
      tableSessionClosed: boolean;
      analyticsUpdated: boolean;
      redirectToTables: boolean;
    }
    ```
  - **Acceptance Criteria**:
    - Payment completion updates all relevant database records
    - Table sessions close automatically after successful payment
    - Order status updates correctly to completed
    - Analytics data flows to `pos.lengolf_sales` correctly
    - Payment success provides clear feedback and next actions
    - Failed payments maintain existing state without corruption
    - Navigation returns to appropriate view after completion

### 2.4 Integration Testing & Analytics Validation
- [ ] **Task**: End-to-end testing and analytics integration validation
  - **Files**: 
    - `tests/integration/payment-tracking.spec.ts` **← NEW (integration tests)**
    - `tests/integration/analytics-integration.spec.ts` **← NEW (analytics tests)**
    - `src/utils/payment-testing.ts` **← NEW (test utilities)**
    - `scripts/validate-payment-analytics.sql` **← NEW (validation script)**
  - **Estimate**: 8 hours
  - **Dependencies**: All payment tracking components
  - **Details**:
    - End-to-end payment workflow testing
    - Analytics integration validation
    - Split payment testing
    - PromptPay QR generation testing
    - Receipt generation testing
    - Performance testing under normal load
    - Data consistency validation
    - Backward compatibility with existing analytics
  - **Test Coverage**:
    ```typescript
    interface PaymentTestSuite {
      singlePayments: [
        'cash_payment_with_change',
        'card_payment_via_edc',
        'promptpay_with_qr_generation',
        'alipay_payment_confirmation'
      ];
      splitPayments: [
        'two_method_split_payment',
        'three_method_split_payment',
        'promptpay_partial_payment'
      ];
      integration: [
        'payment_to_lengolf_sales_flow',
        'table_session_closure',
        'receipt_generation',
        'analytics_dashboard_update'
      ];
    }
    ```
  - **Acceptance Criteria**:
    - All payment workflows pass integration testing
    - Analytics integration maintains existing dashboard compatibility
    - Split payment format matches existing `lengolf_sales` data patterns
    - PromptPay QR codes work with Thai banking apps
    - Receipt generation completes successfully for all payment types
    - Performance testing confirms system handles normal business volume
    - Data validation confirms no analytics regression

---

## Quality Assurance Checklist

### Payment Tracking Accuracy
- [ ] Payment method selection matches existing `lengolf_sales` format exactly
- [ ] Split payment strings generated correctly (e.g., "Cash: ฿180.00; Visa Manual: ฿500.00")
- [ ] PromptPay QR codes work with Thai banking apps
- [ ] Analytics integration maintains existing dashboard compatibility
- [ ] All payment types tracked properly in database

### User Experience Standards
- [ ] Touch targets meet 44px+ minimum size requirement
- [ ] Payment interfaces optimized for tablet use
- [ ] PromptPay QR codes display clearly and scan properly
- [ ] Payment method selection is intuitive and clear
- [ ] Staff PIN integration works seamlessly
- [ ] Error messages provide clear, actionable guidance

### Integration Validation
- [ ] Seamless integration with existing order system
- [ ] Table session closure works after payment completion
- [ ] Analytics pipeline receives payment data correctly
- [ ] Staff authentication works across all payment functions
- [ ] Receipt generation includes correct payment method information

### Performance Requirements
- [ ] Payment method selection < 2 seconds
- [ ] PromptPay QR generation < 1 second
- [ ] Receipt generation < 2 seconds
- [ ] Analytics data flow < 5 seconds
- [ ] System remains responsive during normal business volume

---

## Risk Management

### Medium Risk Items
1. **PromptPay QR Code Reliability**: QR codes must work with all Thai banking apps
   - **Mitigation**: Test with multiple banking apps, use established `promptpay-qr` library
2. **Analytics Data Compatibility**: Must maintain existing dashboard functionality
   - **Mitigation**: Thorough testing with existing analytics, gradual rollout
3. **Staff Training Requirements**: New payment tracking interface requires training
   - **Mitigation**: Intuitive interface design, comprehensive training materials

### Low Risk Items
1. **Receipt Printer Integration**: Basic printing functionality needed
   - **Mitigation**: Use standard web printing APIs, digital receipt fallback
2. **Split Payment Complexity**: Multiple payment methods per order
   - **Mitigation**: Clear interface design, real-time amount validation

---

## Success Metrics

### Financial Targets
- [ ] Support all current payment methods (Cash, Visa Manual, Mastercard Manual, PromptPay Manual, Alipay)
- [ ] ฿24,000+ annual savings from eliminated Qashier subscription fees
- [ ] Zero revenue loss during transition period
- [ ] 100% of current transaction volume supported
- [ ] <0.1% payment tracking error rate

### Performance Targets
- [ ] Payment method selection < 2 seconds
- [ ] PromptPay QR generation < 1 second
- [ ] Receipt generation < 2 seconds
- [ ] Analytics data flow < 5 seconds
- [ ] System remains responsive during normal business volume

### User Experience Targets
- [ ] Staff satisfaction rating > 90%
- [ ] Order-to-payment tracking completion < 30 seconds
- [ ] Intuitive payment method selection (minimal training required)
- [ ] Touch interface optimized for tablet use
- [ ] PromptPay QR codes work with all major Thai banking apps

### Integration Targets
- [ ] 100% compatibility with existing order system
- [ ] Seamless integration with existing `pos.lengolf_sales` analytics
- [ ] Perfect split payment format compatibility
- [ ] Staff authentication system fully integrated
- [ ] Table session closure works correctly after payment
- [ ] Receipt generation includes accurate payment method information

---

## Dependencies & Prerequisites

### System Dependencies
- [x] Order Management System (normalized database) - **✅ COMPLETED**
- [x] Table Session Management - **✅ COMPLETED**
- [x] Staff PIN Authentication - **✅ COMPLETED**
- [x] Product Catalog System - **✅ COMPLETED**
- [x] Real-time WebSocket Infrastructure - **✅ COMPLETED**

### Infrastructure Requirements
- [ ] Thermal receipt printers (58mm/80mm)
- [ ] EMV-compliant card readers
- [ ] Stable internet connection for card processing
- [ ] Backup power systems for payment continuity
- [ ] Secure network environment for PCI compliance

### Regulatory Requirements
- [ ] PCI DSS Level 4 merchant compliance registration
- [ ] Thai tax authority receipt format compliance
- [ ] Payment processor merchant accounts (Visa, Mastercard)
- [ ] Digital wallet provider integrations (PromptPay, TrueMoney)
- [ ] Data protection compliance (Thai PDPA)

### Development Environment
- [ ] Security testing tools and environments
- [ ] PCI compliance validation tools
- [ ] Load testing infrastructure
- [ ] Payment processor sandbox accounts
- [ ] Receipt printer testing setup

---

## Implementation Notes

### Technical Architecture Decisions
- **Payment Processing**: Event-driven architecture with comprehensive audit trails
- **Security**: Defense-in-depth with tokenization, encryption, and access controls
- **Integration**: RESTful APIs with existing order and analytics systems
- **Performance**: Asynchronous processing with real-time status updates
- **Compliance**: Built-in PCI DSS and Thai tax compliance from ground up

### Database Design Principles
- **Normalization**: Fully normalized payment tables with proper foreign key relationships
- **Audit Trail**: Every payment operation logged with immutable records
- **Performance**: Strategic indexes on high-query columns (order_id, status, date)
- **Security**: Sensitive data encrypted at column level
- **Integration**: Seamless linking with existing order and analytics tables

### API Design Standards
- **RESTful**: Standard HTTP methods and status codes
- **Authentication**: Integration with existing staff PIN system
- **Validation**: Comprehensive input validation and sanitization
- **Error Handling**: Consistent error response format with actionable messages
- **Documentation**: OpenAPI/Swagger documentation for all endpoints

### User Interface Principles
- **Touch-First**: Optimized for tablet interactions with 44px+ touch targets
- **Progressive Enhancement**: Graceful degradation for network issues
- **Accessibility**: WCAG 2.1 AA compliance for inclusive design
- **Consistency**: Follows existing POS interface patterns and styling
- **Performance**: Optimistic updates with rollback on failures

---

## Integration Strategy

### Existing System Integration Points

#### Order Management Integration
```typescript
// Payment processing integrates with existing normalized order system
interface PaymentOrderIntegration {
  source: 'pos.orders';
  trigger: 'order_confirmation';
  paymentInitiation: 'automatic';
  orderStatusUpdate: 'payment_completed';
  tableSessionClosure: 'conditional';
}
```

#### Analytics Pipeline Integration
```typescript
// Payment data flows to existing analytics system
interface PaymentAnalyticsIntegration {
  destination: 'pos.lengolf_sales';
  dataTransformation: 'automatic';
  realTimeUpdates: true;
  reportingCompatibility: 'full';
  dashboardIntegration: 'enhanced';
}
```

#### Staff Authentication Integration
```typescript
// Payment system uses existing PIN authentication
interface PaymentStaffIntegration {
  authenticationSource: 'backoffice.staff';
  pinValidation: 'existing_system';
  auditTrail: 'staff_attributed';
  permissions: 'role_based';
  sessionManagement: 'shared';
}
```

---

## Deployment Strategy

### Phase 1: Development Environment (Week 1)
- [ ] Set up payment database schema
- [ ] Implement core payment APIs
- [ ] Basic payment UI components
- [ ] Cash payment processing only

### Phase 2: Staging Environment (Week 2-3)
- [ ] Full payment method implementation
- [ ] Security and compliance features
- [ ] Integration testing
- [ ] Performance validation

### Phase 3: Production Pilot (Week 4)
- [ ] Limited production deployment
- [ ] Single terminal testing
- [ ] Staff training and validation
- [ ] Performance monitoring

### Phase 4: Full Production (Post-implementation)
- [ ] All terminals enabled
- [ ] Qashier system parallel operation
- [ ] Full feature validation
- [ ] Qashier system retirement

---

**Document Version**: 1.0  
**Last Updated**: January 19, 2025  
**Next Review**: Weekly during implementation

## Related Documents

### Design Specifications
- [Payment Processing Design](./PAYMENT_PROCESSING_DESIGN.md) ⭐ **Core Implementation Reference**
  - Security and compliance requirements
  - Technical architecture specifications
  - Database schema definitions
  - API endpoint specifications

### System Architecture
- [System Architecture](./LENGOLF_POS_SYSTEM_ARCHITECTURE.md)
  - Overall system integration strategy
  - Implementation roadmap and phases
  - Performance and security requirements

### Completed Dependencies
- [Table Management Tasks](./TABLE_MANAGEMENT_TASKS.md) ✅ **Completed**
- [POS Interface Tasks](./POS_INTERFACE_TASKS.md) ✅ **Completed**

### Integration Dependencies
- [Transaction Processing Design](./TRANSACTION_PROCESSING_DESIGN.md)
- [Receipt Generation Design](./RECEIPT_GENERATION_DESIGN.md)
- [Void Transaction System](./VOID_TRANSACTION_SYSTEM.md)

**Implementation Status**: This document provides **complete implementation tasks** for the Payment Processing Design document, representing the critical missing component needed to complete the Lengolf POS system and replace the Qashier system.

---

## Quick Reference

### Critical API Endpoints to Implement
```typescript
// Phase 1 - Core Payment APIs
POST /api/pos/payments              // Initialize payment
POST /api/pos/payments/[id]/process // Process payment
GET  /api/pos/payments/methods      // Available methods

// Phase 2 - Enhanced Payment APIs
POST /api/pos/payments/card         // Card processing
POST /api/pos/payments/digital-wallet // Digital wallets
POST /api/pos/payments/split        // Split payments

// Phase 3 - Security APIs
POST /api/pos/payments/fraud-check  // Fraud detection
GET  /api/pos/payments/audit        // Audit trails

// Phase 4 - Operations APIs
POST /api/pos/receipts/print        // Receipt printing
GET  /api/pos/reconciliation/daily  // Daily reconciliation
```

### Key Database Tables to Create
```sql
-- Core payment processing
pos.payment_transactions
pos.payment_reconciliation
pos.receipt_data
pos.fraud_detection_logs

-- Security and audit
pos.payment_audit_trail
pos.security_events
pos.compliance_records
```

### Essential UI Components to Build
```typescript
// Payment processing
PaymentModal, CashPayment, CardPayment, DigitalWalletPayment

// Split payments
SplitPaymentModal, PaymentAllocation

// Operations
ReceiptPreview, DailyCloseModal, ReconciliationReport

// Security
FraudAlert, SecurityValidation
```