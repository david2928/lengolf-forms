# POS Discount System

## Overview

The POS discount system provides comprehensive discount management capabilities with support for both item-level and receipt-level discounts. The system ensures proper calculation, persistence, and display of discounts across all POS interfaces.

## Architecture

### Database Schema

#### Discounts Table (`pos.discounts`)
```sql
- id: uuid (primary key)
- title: string (display name)
- description: string (optional description)
- discount_type: 'percentage' | 'fixed_amount'
- discount_value: numeric (percentage or absolute amount)
- application_scope: 'item' | 'receipt'
- is_active: boolean
- availability_type: 'always' | 'date_range'
- valid_from: timestamp (optional)
- valid_until: timestamp (optional)
```

#### Product Eligibility (`pos.discount_product_eligibility`)
```sql
- id: uuid (primary key)
- discount_id: uuid (foreign key to discounts)
- product_id: uuid (foreign key to products)
```

#### Applied Discounts Storage
- **Item-level**: `pos.order_items.applied_discount_id` + `discount_amount`
- **Receipt-level**: `pos.orders.applied_discount_id` with updated totals

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
Retrieves available discounts based on scope and eligibility.

**Query Parameters:**
- `scope`: 'item' | 'receipt'
- `product_id`: uuid (required for item-level discounts)

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
Calculates discount amounts without applying them.

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
Applies discounts to database records.

**Request:** Same as preview endpoint plus:
```typescript
{
  order_id?: string; // for receipt-level discounts
  order_item_id?: string; // for item-level discounts
}
```

## UI Components

### ItemDiscountButton
Handles item-level discount application.

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
Handles receipt-level discount application.

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
const originalAmount = unitPrice * quantity;
let discountAmount = 0;

if (discount.discount_type === 'percentage') {
  discountAmount = originalAmount * (discount.discount_value / 100);
} else {
  discountAmount = Math.min(discount.discount_value, originalAmount);
}

const finalAmount = originalAmount - discountAmount;
```

### Receipt-Level Calculation
```typescript
const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
let discountAmount = 0;

if (discount.discount_type === 'percentage') {
  discountAmount = subtotal * (discount.discount_value / 100);
} else {
  discountAmount = Math.min(discount.discount_value, subtotal);
}

const newSubtotal = subtotal - discountAmount;
const taxAmount = newSubtotal * 0.07; // 7% VAT
const newTotal = newSubtotal + taxAmount;
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
Stored directly in the `order_items` table:

```sql
UPDATE pos.order_items 
SET 
  applied_discount_id = $1,
  discount_amount = $2,
  total_price = original_price - discount_amount,
  updated_at = NOW()
WHERE id = $3;
```

### Receipt-Level Discounts
Stored in the `orders` table with recalculated totals:

```sql
UPDATE pos.orders 
SET 
  applied_discount_id = $1,
  subtotal_amount = original_subtotal - discount_amount,
  tax_amount = (original_subtotal - discount_amount) * 0.07,
  total_amount = (original_subtotal - discount_amount) * 1.07,
  updated_at = NOW()
WHERE id = $2;
```

## Integration Points

### Table Management
- `OccupiedTableDetailsPanel`: Receipt discount application
- Real-time order refresh after discount application
- Persistent discount display across sessions

### Order Panel
- `SimplifiedOrderPanel`: Item and total discount display
- Running tab and current order discount summaries
- Conditional discount button visibility

### Product Catalog
- `ItemDiscountButton`: Eligibility-based rendering
- Product-specific discount availability
- Real-time discount application

## Validation Rules

### Discount Eligibility
```sql
-- RPC function: validate_discount_application
CREATE OR REPLACE FUNCTION validate_discount_application(
  p_discount_id UUID,
  p_product_id UUID DEFAULT NULL
)
RETURNS TABLE(valid BOOLEAN, reason TEXT);
```

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
1. **RPC Functions**: Use database RPC functions for complex calculations
2. **Eligibility Caching**: Cache product eligibility on component mount
3. **Conditional Rendering**: Hide discount buttons for ineligible products
4. **Batch Operations**: Group discount calculations where possible

### Database Indexes
```sql
-- Improve discount lookup performance
CREATE INDEX idx_discounts_active_scope ON pos.discounts(is_active, application_scope);
CREATE INDEX idx_discount_eligibility_product ON pos.discount_product_eligibility(product_id);
CREATE INDEX idx_order_items_discount ON pos.order_items(applied_discount_id);
CREATE INDEX idx_orders_discount ON pos.orders(applied_discount_id);
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

## Future Enhancements

### Planned Features
1. **Bulk Discount Management**: Admin interface for discount CRUD operations
2. **Combo Discounts**: Support for multiple discounts on single items/orders
3. **Customer-Specific Discounts**: Integration with customer loyalty system
4. **Discount Analytics**: Reporting on discount usage and effectiveness
5. **Conditional Discounts**: Time-based and quantity-based discount rules

### Technical Improvements
1. **Real-time Validation**: WebSocket-based discount availability updates
2. **Audit Trail**: Complete discount application history
3. **Advanced Calculations**: Support for tiered and progressive discounts
4. **API Versioning**: Backward compatibility for discount API changes

---

*This documentation covers the complete POS discount system implementation as of the current version. For specific implementation details, refer to the source code in the `/src/components/pos/discount/` directory.*