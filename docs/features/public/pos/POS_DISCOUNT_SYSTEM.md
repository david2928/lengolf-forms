# POS Discount System

## Overview

The POS discount system provides comprehensive discount management capabilities with support for both item-level and receipt-level discounts. The system has been recently overhauled with unified printing and discount management, ensuring proper calculation, persistence, and display of discounts across all POS interfaces.

**Last Updated:** December 2024 - Major system overhaul with enhanced table session receipt discounts
**Status:** Production-ready with comprehensive API and UI components

## Architecture

### Database Schema

#### Discounts Table (`pos.discounts`)
```sql
- id: uuid (primary key)
- title: varchar(255, NOT NULL) (display name)
- description: text (optional description)
- discount_type: varchar(20, NOT NULL) ('percentage' | 'fixed')
- discount_value: numeric (NOT NULL) (percentage or absolute amount)
- application_scope: varchar(20, NOT NULL) ('item' | 'receipt')
- is_active: boolean (default: true)
- availability_type: varchar(20, NOT NULL) ('always' | 'date_range')
- valid_from: timestamptz (optional)
- valid_until: timestamptz (optional)
- created_at: timestamptz (default: now())
- updated_at: timestamptz (default: now())
```

#### Product Eligibility (`pos.discount_product_eligibility`)
```sql
- id: uuid (primary key)
- discount_id: uuid (foreign key to discounts)
- product_id: uuid (foreign key to products)
```

#### Applied Discounts Storage
- **Item-level**: `pos.order_items.applied_discount_id` + `discount_amount`
- **Receipt-level**: `pos.table_sessions.applied_receipt_discount_id` + `receipt_discount_amount`
- **Legacy**: `pos.orders.applied_discount_id` (deprecated in favor of table session discounts)
- **Transaction-level**: `pos.transactions.applied_discount_id` + discount fields

## Discount Types

### 1. Item-Level Discounts
Applied to individual order items with product-specific eligibility rules.

**Features:**
- Product-specific eligibility
- Individual item calculation
- Visible on each order item
- Stored in `order_items` table

**Usage:**
```typescript
// Check eligibility
GET /api/pos/discounts/available?scope=item&product_id={productId}

// Apply discount
POST /api/pos/discounts/apply
{
  "discount_id": "uuid",
  "application_scope": "item",
  "order_item_id": "uuid" // for saved items
  // OR
  "target_item": { // for in-memory items
    "id": "string",
    "product_id": "uuid",
    "quantity": number,
    "unit_price": number
  }
}
```

### 2. Receipt-Level Discounts
Applied to entire orders, affecting the total order amount.

**Features:**
- Order-wide application
- Affects entire order subtotal
- Applied after item-level discounts
- Stored in `orders` table

**Usage:**
```typescript
// Check eligibility
GET /api/pos/discounts/available?scope=receipt

// Apply discount
POST /api/pos/discounts/apply
{
  "discount_id": "uuid",
  "application_scope": "receipt",
  "order_id": "uuid"
}
```

## API Endpoints

### `/api/pos/discounts/available`
Retrieves available discounts based on scope and eligibility using optimized RPC functions.

**Query Parameters:**
- `scope`: 'item' | 'receipt'
- `product_id`: uuid (required for item-level discounts)

**Implementation Details:**
- Uses `get_available_discounts_for_product()` RPC for item-level discounts
- Uses `get_available_receipt_discounts()` RPC for receipt-level discounts
- Validates date ranges and active status automatically
- Returns empty array if no discounts available

**Response:**
```typescript
{
  discounts: Array<{
    id: string;
    title: string;
    description?: string;
    discount_type: 'percentage' | 'fixed_amount';
    discount_value: number;
    application_scope: 'item' | 'receipt';
  }>
}
```

### `/api/pos/discounts/preview`
Calculates discount amounts without applying them using the `calculate_discount_preview()` RPC function.

**Key Features:**
- Comprehensive validation and calculation in single RPC call
- Supports both in-memory and database order items
- Returns detailed calculation breakdown
- Validates product eligibility automatically

**Request:**
```typescript
{
  discount_id: string;
  application_scope: 'item' | 'receipt';
  order_items?: Array<{
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
  target_item?: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
  };
}
```

**Response:**
```typescript
{
  success: boolean;
  discount_amount: number;
  final_amount: number;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
}
```

### `/api/pos/discounts/apply`
Applies discounts to database records with support for both in-memory and persisted items.

**Enhanced Features:**
- **In-memory item support**: Apply discounts to items not yet saved to database
- **Database item support**: Apply discounts to existing order items
- **Automatic validation**: Uses `validate_discount_application()` RPC
- **Total recalculation**: Automatically updates order totals
- **VAT handling**: Proper VAT-inclusive pricing calculations

**Request Types:**
```typescript
{
  discount_id: string;
  application_scope: 'item' | 'receipt';
  // For in-memory items
  target_item?: {
    id: string;
    product_id: string;
    quantity: number;
    unit_price: number;
  };
  // For database items
  order_item_id?: string;
  order_id?: string;
}
```

### `/api/pos/discounts/remove`
Removes applied discounts from database records.

**Features:**
- Removes item-level discounts from `order_items`
- Removes receipt-level discounts from `orders`
- Automatically recalculates totals
- Proper VAT handling

### `/api/pos/table-sessions/[sessionId]/receipt-discount/apply`
Applies receipt-level discounts directly to table sessions.

**Features:**
- Session-level discount application
- Calculates discount on total of all orders in session
- Updates `table_sessions.applied_receipt_discount_id`
- Automatic trigger-based total recalculation

### `/api/pos/table-sessions/[sessionId]/receipt-discount/remove`
Removes receipt-level discounts from table sessions.

## UI Components

### ItemDiscountButton
Handles item-level discount application with enhanced UX.

**Enhanced Features:**
- **Conditional rendering**: Hidden if no discounts available
- **Loading states**: Proper loading indicators during API calls
- **Eligibility checking**: Checks product eligibility on mount
- **Visual feedback**: Different states for applied/unapplied discounts

**Key Features:**
- Eligibility checking on mount
- Conditional rendering (hidden if no discounts available)
- Real-time discount application
- Visual feedback for applied discounts

**Props:**
```typescript
interface ItemDiscountButtonProps {
  orderItem: OrderItem;
  onDiscountApplied: (itemId: string, discountId: string) => void;
  onDiscountRemoved: (itemId: string) => void;
  className?: string;
}
```

### ReceiptDiscountButton
Handles receipt-level discount application with comprehensive state management.

**Enhanced Features:**
- **Flexible discount details**: Supports both prop-based and API-fetched discount details
- **Real-time calculation**: Shows discount amounts and totals
- **Visual states**: Green applied state with removal options
- **Dialog interface**: Clean modal for discount selection
- **Conditional display**: Hidden when no order items present

**Key Features:**
- Order-wide discount application
- Discount details display (percentage vs absolute)
- Green status box with discount information
- Database persistence

**Props:**
```typescript
interface ReceiptDiscountButtonProps {
  orderItems: OrderItem[];
  appliedDiscountId?: string | null;
  discountAmount?: number;
  onDiscountApplied: (discountId: string) => void;
  onDiscountRemoved: () => void;
}
```

## Discount Calculation Logic

### Item-Level Calculation
```typescript
// Enhanced calculation with proper validation
const originalAmount = unitPrice * quantity;
let discountAmount = 0;

if (discount.discount_type === 'percentage') {
  discountAmount = originalAmount * (discount.discount_value / 100);
} else if (discount.discount_type === 'fixed') {
  // Fixed discounts cannot exceed item total
  discountAmount = Math.min(discount.discount_value, originalAmount);
}

const finalAmount = originalAmount - discountAmount;

// Update database with recalculation
const { error } = await supabase
  .schema('pos')
  .from('order_items')
  .update({
    applied_discount_id: discount_id,
    discount_amount: discountAmount,
    total_price: finalAmount,
    updated_at: new Date().toISOString()
  })
  .eq('id', order_item_id);
```

### Receipt-Level Calculation (Table Sessions)
```typescript
// Enhanced calculation for table sessions
const { data: orders } = await supabase
  .schema('pos')
  .from('orders')
  .select('total_amount')
  .eq('table_session_id', sessionId);

const currentOrdersTotal = orders?.reduce(
  (sum, order) => sum + parseFloat(order.total_amount.toString()), 0
) || 0;

let discountAmount = 0;
if (discount.discount_type === 'percentage') {
  discountAmount = currentOrdersTotal * (discount.discount_value / 100);
} else if (discount.discount_type === 'fixed') {
  discountAmount = Math.min(discount.discount_value, currentOrdersTotal);
}

// Apply to table session (triggers handle total recalculation)
const { error } = await supabase
  .schema('pos')
  .from('table_sessions')
  .update({
    applied_receipt_discount_id: discount_id,
    receipt_discount_amount: discountAmount,
    updated_at: new Date().toISOString()
  })
  .eq('id', sessionId);
```

## Display Logic

### Running Tab Display
Shows comprehensive discount information:

```typescript
// Item-level discounts
{item.applied_discount_id && item.discount_amount ? (
  <div>
    <p className="text-xs text-gray-500 line-through">
      {formatCurrency(item.unitPrice * item.quantity)}
    </p>
    <p className="font-semibold text-green-700">
      {formatCurrency(item.totalPrice)}
    </p>
    <p className="text-xs text-green-600">
      -{formatCurrency(item.discount_amount)}
    </p>
  </div>
) : (
  <p className="font-semibold text-gray-900">
    {formatCurrency(item.totalPrice)}
  </p>
)}

// Total discounts summary
{totalDiscounts > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-green-700">Total Discounts:</span>
    <span className="font-medium text-green-700">-{formatCurrency(totalDiscounts)}</span>
  </div>
)}
```

### Table Modal Display
Shows receipt-level discount details:

```typescript
// Green status box
{appliedDiscount && (
  <div className="text-sm text-green-600 mt-1">
    {appliedDiscount.discount_type === 'percentage' ? (
      <span>{appliedDiscount.discount_value}% off total</span>
    ) : (
      <span>฿{appliedDiscount.discount_value} off</span>
    )}
    {discountAmount > 0 && (
      <span className="ml-2">(-฿{discountAmount.toFixed(0)})</span>
    )}
  </div>
)}

// Order summary
{totalDiscountAmount > 0 && (
  <div className="flex justify-between text-sm text-green-700 font-medium">
    <span>Total Discount:</span>
    <span>-฿{totalDiscountAmount.toFixed(0)}</span>
  </div>
)}
```

## Database Persistence

### Item-Level Discounts
Stored directly in the `order_items` table with automatic recalculation:

```sql
UPDATE pos.order_items 
SET 
  applied_discount_id = $1,
  discount_amount = $2,
  total_price = (unit_price * quantity) - discount_amount,
  updated_at = NOW()
WHERE id = $3;

-- Triggers automatically:
-- 1. Recalculate parent order total
-- 2. Update table session totals
-- 3. Maintain referential integrity
```

### Receipt-Level Discounts
**Current Implementation:** Stored in `table_sessions` table (preferred):

```sql
UPDATE pos.table_sessions 
SET 
  applied_receipt_discount_id = $1,
  receipt_discount_amount = $2,
  updated_at = NOW()
WHERE id = $3;

-- Database triggers automatically:
-- 1. Recalculate session total_amount
-- 2. Apply discount to final session total
-- 3. Update related payment records
```

**Legacy Implementation:** Order-level discounts (deprecated):

```sql
-- Note: Order-level discounts removed from current implementation
-- Orders now only store sum of item totals
-- Total amount is automatically calculated by database triggers
```

## Integration Points

### Table Management
- `OccupiedTableDetailsPanel`: Enhanced receipt discount integration
  - Shows applied discount details with green status indicators
  - Real-time discount amount display
  - Integration with `ReceiptDiscountButton` component
- `TableManagementDashboard`: Discount status indicators on table cards
- Real-time order refresh after discount application
- Persistent discount display across sessions

### Order Panel
- `SimplifiedOrderPanel`: Enhanced discount display
  - Item-level discount indicators
  - Total discount summaries
  - `ItemDiscountButton` integration for individual items
- `OrderTotals`: Comprehensive discount breakdown
  - Total discount amounts
  - Item-level vs receipt-level separation
- `OrderPanel`: Legacy order panel with discount support
- Running tab and current order discount summaries
- Conditional discount button visibility based on eligibility

### Product Catalog & POS Interface
- `POSInterface`: Main POS interface with integrated discount management
- `ProductCard`: Enhanced with discount eligibility indicators
- `ItemDiscountButton`: 
  - Eligibility-based rendering (hidden if no discounts available)
  - Product-specific discount availability checking
  - Real-time discount application with visual feedback
- `PaymentInterface`: Discount integration in payment flow
  - Discount amounts shown in payment summaries
  - Final total calculations with discount considerations

## Validation Rules

### Discount Eligibility (Integrated in RPC Functions)
Validation is integrated within the `calculate_discount_preview()` RPC function:

```sql
-- Validation checks performed:
-- 1. Discount exists and is active
-- 2. Date range validation (if applicable)
-- 3. Product eligibility (for item-level discounts)
-- 4. Application scope validation
-- 5. Amount limits (fixed discounts cannot exceed totals)
```

**Note:** The standalone `validate_discount_application()` function mentioned in previous documentation has been integrated into the comprehensive `calculate_discount_preview()` function for better performance.

### Business Rules
1. **Date Validation**: Discounts must be within valid date ranges
2. **Product Eligibility**: Item discounts require product eligibility
3. **Active Status**: Only active discounts can be applied
4. **Scope Validation**: Receipt discounts don't require product eligibility
5. **Amount Limits**: Fixed discounts cannot exceed item/order totals

## Error Handling

### Common Error Cases
```typescript
// Product not eligible
{ error: "Product not eligible for this discount" }

// Discount expired
{ error: "Discount is not currently valid" }

// Order not found
{ error: "Order not found", status: 404 }

// Invalid discount type
{ error: "Invalid discount configuration" }
```

### Client-Side Handling
```typescript
try {
  const response = await fetch('/api/pos/discounts/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(discountData)
  });
  
  if (!response.ok) {
    const error = await response.json();
    alert(`Error applying discount: ${error.error}`);
    return;
  }
  
  const result = await response.json();
  // Handle successful application
} catch (error) {
  console.error('Network error:', error);
  alert('Network error occurred');
}
```

## Performance Considerations

### Optimization Strategies
1. **Optimized RPC Functions**: 
   - `get_available_discounts_for_product()` - Product-specific discount lookup
   - `get_available_receipt_discounts()` - Receipt-level discount lookup
   - `calculate_discount_preview()` - Comprehensive validation and calculation
2. **Eligibility Caching**: Cache product eligibility on component mount
3. **Conditional Rendering**: Hide discount buttons for ineligible products
4. **Database Triggers**: Automatic total recalculation without API calls
5. **Strategic Indexing**: Optimized indexes for common query patterns
6. **Component State Management**: Efficient React state updates

### Database Indexes (Current Implementation)
```sql
-- Optimized discount lookup performance
CREATE INDEX idx_discounts_active_scope ON pos.discounts(is_active, application_scope);
CREATE INDEX idx_discounts_date_range ON pos.discounts(availability_type, valid_from, valid_until);
CREATE INDEX idx_discounts_validity ON pos.discounts(is_active, availability_type);

-- Product eligibility optimization
CREATE INDEX idx_discount_product_eligibility ON pos.discount_product_eligibility(discount_id, product_id);
CREATE INDEX idx_discount_product_eligibility_lookup ON pos.discount_product_eligibility(product_id);

-- Applied discount tracking
CREATE INDEX idx_order_items_discount ON pos.order_items(applied_discount_id);
CREATE INDEX idx_table_sessions_receipt_discount ON pos.table_sessions(applied_receipt_discount_id);
CREATE INDEX idx_transactions_discount ON pos.transactions(applied_discount_id);
```

## Testing Strategy

### Unit Tests
- Discount calculation logic
- Eligibility validation
- API endpoint responses
- Component rendering logic

### Integration Tests
- End-to-end discount application
- Database persistence verification
- UI component interactions
- Cross-component communication

### Test Cases
```typescript
describe('Discount System', () => {
  test('applies percentage discount correctly', () => {
    const discount = { type: 'percentage', value: 20 };
    const amount = 100;
    expect(calculateDiscount(discount, amount)).toBe(20);
  });
  
  test('applies fixed discount with limit', () => {
    const discount = { type: 'fixed_amount', value: 150 };
    const amount = 100;
    expect(calculateDiscount(discount, amount)).toBe(100); // Limited to item total
  });
  
  test('hides discount button for ineligible products', () => {
    const product = { id: 'test-id', eligibleDiscounts: [] };
    expect(shouldShowDiscountButton(product)).toBe(false);
  });
});
```

## Troubleshooting

### Common Issues
1. **Discounts not persisting**: Check database permissions and API endpoints
2. **Wrong discount amounts**: Verify calculation logic and database precision
3. **Missing discount buttons**: Check product eligibility and component props
4. **UI not updating**: Ensure proper state management and refresh logic

### Debug Tools
```typescript
// Enable discount debugging
if (process.env.NODE_ENV === 'development') {
  console.log('Discount calculation:', {
    originalAmount,
    discountType,
    discountValue,
    calculatedDiscount,
    finalAmount
  });
}
```

## Recent Updates (December 2024)

### Major System Overhaul
**Commit:** `1335cfd Major POS system overhaul with unified printing and discount management`

**Key Changes:**
1. **Table Session Receipt Discounts**: New `/api/pos/table-sessions/[sessionId]/receipt-discount/` endpoints
2. **Unified Printing**: New `/api/pos/print` endpoint with discount integration
3. **Enhanced API Endpoints**: Improved `/api/pos/discounts/apply` and `/api/pos/discounts/remove`
4. **Payment Integration**: Streamlined discount handling in payment interfaces
5. **Order Totals Display**: Enhanced discount breakdown in UI components
6. **Bill Data Service**: Receipt discount support in billing system

### Current Implementation Status
- ✅ **Item-level discounts**: Full implementation with UI components
- ✅ **Receipt-level discounts**: Table session-based implementation
- ✅ **Database optimization**: RPC functions and triggers
- ✅ **UI/UX**: Comprehensive React components
- ✅ **API endpoints**: Complete REST API coverage
- ✅ **Integration**: Full POS system integration

### Technical Debt & Improvements
1. **Legacy order-level discounts**: Deprecated in favor of table session discounts
2. **Validation consolidation**: `validate_discount_application` integrated into preview function
3. **VAT handling**: Proper VAT-inclusive pricing calculations
4. **Trigger optimization**: Automatic total recalculation system

## Future Enhancements

### Planned Features
1. **Admin Interface**: Discount CRUD operations management panel
2. **Combo Discounts**: Support for multiple discounts on single items/orders
3. **Customer-Specific Discounts**: Integration with customer loyalty system
4. **Discount Analytics**: Reporting on discount usage and effectiveness
5. **Advanced Rules**: Time-based, quantity-based, and conditional discount rules

### Technical Improvements
1. **Real-time Validation**: WebSocket-based discount availability updates
2. **Audit Trail**: Complete discount application history
3. **Advanced Calculations**: Support for tiered and progressive discounts
4. **API Versioning**: Backward compatibility for discount API changes

## Troubleshooting

### Common Issues & Solutions
1. **Discounts not persisting**: 
   - Check database permissions and API endpoint responses
   - Verify table session state and refresh mechanisms
2. **Wrong discount amounts**: 
   - Verify calculation logic in RPC functions
   - Check VAT-inclusive pricing handling
3. **Missing discount buttons**: 
   - Check product eligibility in `discount_product_eligibility` table
   - Verify component props and eligibility checking logic
4. **UI not updating**: 
   - Ensure proper state management and refresh callbacks
   - Check for component re-rendering after discount application

### Development & Testing
```bash
# Test discount API endpoints
curl -X GET "http://localhost:3000/api/pos/discounts/available?scope=item&product_id=UUID"
curl -X POST "http://localhost:3000/api/pos/discounts/preview" \
  -H "Content-Type: application/json" \
  -d '{"discount_id":"UUID","application_scope":"item","target_item":{...}}'

# Check database state
SELECT * FROM pos.discounts WHERE is_active = true;
SELECT * FROM pos.order_items WHERE applied_discount_id IS NOT NULL;
SELECT * FROM pos.table_sessions WHERE applied_receipt_discount_id IS NOT NULL;
```

---

**Documentation Status:** ✅ Updated with current implementation (December 2024)
**Implementation Location:** `/src/components/pos/discount/` directory
**API Endpoints:** `/app/api/pos/discounts/` and `/app/api/pos/table-sessions/*/receipt-discount/`
**Database Schema:** `pos.discounts`, `pos.discount_product_eligibility`, related tables

*This documentation reflects the current production implementation after the major POS system overhaul. All features are tested and deployed.*