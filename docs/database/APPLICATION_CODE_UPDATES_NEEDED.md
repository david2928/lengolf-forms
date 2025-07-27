# Application Code Updates for Normalized POS Schema

## Database Migration Completed ✅

The POS database has been successfully normalized with:
- Clean schema without denormalized fields
- Proper foreign key relationships (staff_id, customer_id, booking_id)
- Enriched views for application use
- Helper functions for data resolution

## Required Application Changes

### 1. Table Session Creation
**File:** `app/api/pos/tables/[tableId]/open/route.ts`

**Changes needed:**
```typescript
// BEFORE (lines 92-102)
const sessionData = {
  table_id: tableId,
  status: 'occupied',
  pax_count: finalPaxCount,
  booking_id: bookingId || null,
  staff_pin: staffPin,  // ❌ REMOVE - column dropped
  session_start: new Date().toISOString(),
  session_end: null,
  total_amount: 0,
  notes: notes || null
};

// AFTER
const sessionData = {
  table_id: tableId,
  status: 'occupied',
  pax_count: finalPaxCount,
  booking_id: bookingId || null,
  staff_id: await getStaffIdFromPin(staffPin), // ✅ ADD - resolve staff_id
  customer_id: bookingId ? await pos.get_customer_id_from_booking(bookingId) : null, // ✅ ADD
  session_start: new Date().toISOString(),
  session_end: null,
  total_amount: 0,
  notes: notes || null
};
```

**Add helper function:**
```typescript
async function getStaffIdFromPin(staffPin: string): Promise<number | null> {
  const { data, error } = await supabase
    .schema('backoffice')
    .from('staff')
    .select('id')
    .eq('staff_id', staffPin) // or match against pin_hash if needed
    .eq('is_active', true)
    .single();
  
  return data?.id || null;
}
```

### 2. Order Creation
**File:** `app/api/pos/table-sessions/[sessionId]/confirm-order/route.ts`

**Changes needed:**
```typescript
// Get table session context first
const { data: sessionContext } = await supabase
  .rpc('pos.resolve_session_context', { p_table_session_id: sessionId });

// BEFORE (lines 47-58)
const { data: newOrder, error: orderError } = await supabase
  .schema('pos')
  .from('orders')
  .insert({
    table_session_id: sessionId,
    status: 'confirmed',
    total_amount: calculatedTotal,
    tax_amount: taxAmount,
    subtotal_amount: subtotalAmount,
    confirmed_by: session.user.email,
    notes: notes || null
  })

// AFTER
const { data: newOrder, error: orderError } = await supabase
  .schema('pos')
  .from('orders')
  .insert({
    table_session_id: sessionId,
    status: 'confirmed',
    total_amount: calculatedTotal,
    tax_amount: taxAmount,
    subtotal_amount: subtotalAmount,
    staff_id: sessionContext[0]?.staff_id, // ✅ ADD
    customer_id: sessionContext[0]?.customer_id, // ✅ ADD
    booking_id: sessionContext[0]?.booking_id, // ✅ ADD
    confirmed_by: session.user.email,
    notes: notes || null
  })

// BEFORE (lines 71-82) - Remove denormalized fields
const orderItemsData = orderItems.map((item: any) => ({
  order_id: newOrder.id,
  product_id: item.productId || null,
  product_name: item.productName,        // ❌ REMOVE
  category_id: item.categoryId || null,  // ❌ REMOVE
  category_name: item.categoryName || null, // ❌ REMOVE
  quantity: item.quantity,
  unit_price: item.unitPrice,
  total_price: item.totalPrice,
  modifiers: item.modifiers || [],
  notes: item.notes || null
}));

// AFTER - Clean normalized insert
const orderItemsData = orderItems.map((item: any) => ({
  order_id: newOrder.id,
  product_id: item.productId || null,
  quantity: item.quantity,
  unit_price: item.unitPrice,
  total_price: item.totalPrice,
  modifiers: item.modifiers || [],
  notes: item.notes || null
}));
```

### 3. Transaction Service
**File:** `src/services/TransactionService.ts`

**Major changes needed:**

```typescript
// Line 514: Add staff_id resolution
const staffId = await this.getStaffIdFromPin(staffPin);
if (!staffId) {
  throw new PaymentError('Invalid staff PIN or inactive staff');
}

// Lines 517-524: Fix customer_id resolution
let customerIdBigint: BIGINT | null = null;
if (order.booking?.id) {
  customerIdBigint = await this.getCustomerIdFromBooking(order.booking.id);
} else if (options.customerId && typeof options.customerId === 'number') {
  customerIdBigint = options.customerId;
}

// Lines 526-544: Clean transaction insert
const { data, error } = await supabase
  .schema('pos')
  .from('transactions')
  .insert({
    transaction_id: transactionId,
    receipt_number: receiptNumber,
    subtotal: order.subtotal_amount || 0,
    vat_amount: order.tax_amount || 0,
    total_amount: order.total_amount,
    discount_amount: 0,
    payment_methods: JSON.stringify(paymentAllocations),
    payment_status: 'completed',
    table_session_id: tableSessionId,
    order_id: finalOrderId,
    staff_id: staffId, // ✅ Required field
    customer_id: customerIdBigint, // ✅ BIGINT type
    booking_id: order.booking?.id || null, // ✅ TEXT type
  })

// Lines 615-641: Clean transaction items insert
return {
  transaction_id: transactionId,
  item_sequence: index + 1,
  order_id: orderIdForItems,
  table_session_id: tableSessionId,
  product_id: item.product_id,
  // Remove all denormalized fields:
  // product_name, product_category, sku_number, customer_name, table_number, staff_pin
  item_cnt: item.quantity,
  item_price_incl_vat: item.unit_price,
  item_price_excl_vat: item.unit_price / 1.07,
  item_discount: 0,
  sales_total: item.total_price,
  sales_net: item.total_price,
  payment_method: paymentMethodString,
  payment_amount_allocated: item.total_price,
  staff_id: staffId, // ✅ Required field
  customer_id: customerIdBigint, // ✅ BIGINT type
  booking_id: order.booking?.id || null, // ✅ TEXT type
  item_notes: item.notes,
  is_voided: false
};
```

### 4. Update All Read Queries

Replace all direct table queries with enriched views:

```typescript
// BEFORE
await supabase.from('order_items').select('*')
await supabase.from('transactions').select('*')
await supabase.from('transaction_items').select('*')

// AFTER
await supabase.from('order_items_enriched').select('*')
await supabase.from('transactions_enriched').select('*')
await supabase.from('transaction_items_enriched').select('*')
```

### 5. Staff PIN Handling

The application needs to handle the change from plain `staff_pin` to `pin_hash`:

```typescript
// Update staff verification to use proper PIN hashing
async function verifyStaffPin(pin: string): Promise<number | null> {
  // Hash the PIN using the same method as registration
  const hashedPin = await bcrypt.hash(pin, 10);
  
  const { data, error } = await supabase
    .schema('backoffice')
    .from('staff')
    .select('id')
    .eq('pin_hash', hashedPin)
    .eq('is_active', true)
    .single();
  
  return data?.id || null;
}
```

### 6. Type Updates

Update TypeScript interfaces to match new schema:

```typescript
// Remove denormalized fields from interfaces
interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  // Remove: product_name, category_id, category_name
  quantity: number;
  unit_price: number;
  total_price: number;
  modifiers: any[];
  notes?: string;
}

// Add required foreign keys
interface Transaction {
  // ... existing fields
  staff_id: number; // Required
  customer_id?: number; // BIGINT
  booking_id?: string; // TEXT
  // Remove: staff_pin, table_number
}
```

## Summary

1. **✅ Database migration completed** - All tables normalized
2. **📝 Code changes needed** - 6 main files to update
3. **🔧 Views available** - Use `*_enriched` views for all reads
4. **⚡ Performance improved** - Proper indexes and constraints
5. **🔐 Data integrity** - Proper foreign key relationships

The application will need these updates to work with the new normalized schema, but all the foundational database work is complete!