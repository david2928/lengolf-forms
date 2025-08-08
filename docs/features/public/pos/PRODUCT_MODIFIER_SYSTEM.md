# Product Modifier System - Implementation Design Document

## Overview

Implement a product modifier system supporting **time-based** (hours) and **quantity-based** (units) pricing options. The system will be tablet-optimized for the existing POS interface while maintaining mobile compatibility.

---

## Database Design


### New Table: `products.product_modifiers`
```sql
CREATE TABLE products.product_modifiers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products.products(id) ON DELETE CASCADE,
    modifier_type VARCHAR(20) NOT NULL CHECK (modifier_type IN ('time', 'quantity')),
    name VARCHAR(100) NOT NULL, -- "1 Hour", "2 Hours", "3 Units", etc.
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    cost_multiplier DECIMAL(10,3) NOT NULL DEFAULT 1.0 CHECK (cost_multiplier >= 0),
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(100),
    
    -- Ensure only one default per product
    CONSTRAINT unique_default_per_product 
        EXCLUDE (product_id WITH =) WHERE (is_default = true)
);

CREATE INDEX idx_product_modifiers_product_id ON products.product_modifiers(product_id);
CREATE INDEX idx_product_modifiers_active ON products.product_modifiers(is_active, display_order);
```

### Products Table Enhancement
```sql
-- Add column to products.products
ALTER TABLE products.products 
ADD COLUMN has_modifiers BOOLEAN DEFAULT false;

CREATE INDEX idx_products_has_modifiers ON products.products(has_modifiers) WHERE has_modifiers = true;
```

---

## Cost Calculation Logic

**Final Price = modifier.price**
**Actual Cost = products.cost × modifier.cost_multiplier**  
**Profit Margin = (modifier.price - actual_cost) / modifier.price × 100**

### Examples:

**Time-based (Bay Rental):**
- Base Product Cost: ฿50/hour
- 1 Hour: price=฿150, cost_multiplier=1.0 → actual_cost=฿50, margin=66.7%
- 2 Hours: price=฿280, cost_multiplier=2.0 → actual_cost=฿100, margin=64.3%
- 4 Hours: price=฿500, cost_multiplier=4.0 → actual_cost=฿200, margin=60%

**Quantity-based (Beer Bundle):**
- Base Product Cost: ฿40/bottle
- 1 Beer: price=฿80, cost_multiplier=1.0 → actual_cost=฿40, margin=50%
- 2 Beers: price=฿150, cost_multiplier=2.0 → actual_cost=฿80, margin=46.7%
- 3 Beers: price=฿200, cost_multiplier=3.0 → actual_cost=฿120, margin=40%

---

## API Design

### Product Modifiers Endpoints
```typescript
// Get modifiers for a product
GET /api/admin/products/{id}/modifiers
Response: { modifiers: ProductModifier[], modifier_type: 'time' | 'quantity' | null }

// Create modifier
POST /api/admin/products/{id}/modifiers
Body: { name, price, cost_multiplier, modifier_type, is_default?, display_order? }

// Update modifier
PUT /api/admin/products/modifiers/{id}
Body: { name?, price?, cost_multiplier?, is_default?, display_order? }

// Delete modifier
DELETE /api/admin/products/modifiers/{id}

// Enable/disable modifiers for product
PATCH /api/admin/products/{id}/modifiers/toggle
Body: { has_modifiers: boolean, modifier_type?: 'time' | 'quantity' }
```

### POS Integration
```typescript
// Enhanced product endpoint for POS
GET /api/pos/products
Response: {
  products: Array<{
    id, name, price, cost, has_modifiers,
    modifiers?: Array<{ id, name, price, is_default, display_order }>
  }>
}
```

---

## Admin User Experience

### Enabling Modifiers on Products
1. **Navigate**: Admin → Products → Edit Product → "Bay Rental"
2. **Modifiers Section**: 
   - Toggle: "Enable Modifiers" ☐ → ☑
   - Radio buttons: ○ Time-based ● Quantity-based
3. **Add Modifiers**:
   ```
   Time-based Modifiers for Bay Rental
   [+ Add Time Modifier]
   
   1. Name: "1 Hour" | Price: ฿150 | Multiplier: 1.0 | Default: ☑ | [Edit] [Delete]
   2. Name: "2 Hours" | Price: ฿280 | Multiplier: 2.0 | Default: ☐ | [Edit] [Delete]  
   3. Name: "4 Hours" | Price: ฿500 | Multiplier: 4.0 | Default: ☐ | [Edit] [Delete]
   
   Profit Margins: 66.7% / 64.3% / 60%
   ```

### Modifier Management
- **Quick Templates**: 
  - Time: Buttons for "1hr/2hr/3hr/4hr" 
  - Quantity: Buttons for "1x/2x/3x/5x"
- **Bulk Edit**: Select multiple modifiers → Update prices/multipliers
- **Reordering**: Drag & drop modifier display order

---

## Tablet-Optimized POS Experience

### Product Catalog Enhancement
```
[Product Grid - Existing Layout]

┌─────────────────────┐  ┌─────────────────────┐
│ Bay Rental         │  │ Coffee             │
│ ฿150+ ⏱️           │  │ ฿60                │  
│ [Quick: 1hr - ฿150]│  │                    │
│ [More Options...]   │  │                    │
└─────────────────────┘  └─────────────────────┘
```

**Visual Indicators:**
- Products with modifiers: Small icon (⏱️ for time, 🔢 for quantity)
- Price shows base/starting price with "+" indicator
- Quick add button for default modifier
- "More Options..." for full modifier selection

### Modifier Selection Modal (Tablet-Optimized)
```
┌─────────────────────────────────────────────────────────────┐
│                    Select Duration                           │
│                    Bay Rental                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   1 Hour    │  │   2 Hours   │  │   4 Hours   │         │
│  │   ฿150      │  │   ฿280      │  │   ฿500      │         │  
│  │ ● Default   │  │ ○ Popular   │  │ ○ Best Deal │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│           [Quick Add - ฿150]    [Cancel]                   │
└─────────────────────────────────────────────────────────────┘
```

**Features:**
- Large touch targets (120px+ height)
- Clear pricing and labels
- Visual feedback (● selected, ○ unselected)
- Quick add uses default modifier
- Follows existing modal styling from current POS

### Mobile Fallback
```
Select Duration - Bay Rental
┌─────────────────────────────┐
│ ● 1 Hour - ฿150 (Default)   │
├─────────────────────────────┤
│ ○ 2 Hours - ฿280           │  
├─────────────────────────────┤
│ ○ 4 Hours - ฿500           │
├─────────────────────────────┤
│ [Add to Order - ฿150]       │
│ [Cancel]                    │
└─────────────────────────────┘
```

---

## Staff POS Workflow

### Scenario 1: Quick Add (Default Modifier)
1. Staff taps "Bay Rental" product
2. Product has modifiers → Shows quick add: "1hr - ฿150"  
3. Staff taps "Quick Add" → Item added to order immediately
4. Order shows: "Bay Rental (1 Hour) - ฿150"

### Scenario 2: Custom Selection
1. Staff taps "Bay Rental" product
2. Staff taps "More Options..."
3. Modal opens with 3 time options
4. Staff selects "2 Hours - ฿280"
5. Staff taps "Add to Order"
6. Order shows: "Bay Rental (2 Hours) - ฿280"

### Order Display
```
Current Order - Table 5
──────────────────────────
Bay Rental (2 Hours)     ฿280
Coffee (Large)            ฿100  
Beer (3 Pack Special)     ฿200
──────────────────────────
Subtotal:                 ฿580
```

---

## Technical Implementation

### Component Architecture
```typescript
// New Components
ModifierSelectionModal.tsx     // Tablet-optimized modifier selection
ProductModifierManager.tsx     // Admin modifier management  
QuickAddButton.tsx            // Quick add with default modifier

// Enhanced Components  
ProductCatalog.tsx            // Add modifier indicators & quick add
ProductForm.tsx              // Add modifier management section
POSInterface.tsx             // Handle modifier selection flow
```

### Data Flow
```
POS Product Tap → Check has_modifiers → 
  if true: Show Quick Add + More Options
  if Quick Add: Add with default modifier
  if More Options: Show ModifierSelectionModal → 
    User selects → Add to order with selected modifier
```

### Order Processing
```typescript
// Enhanced order item with modifier
interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number; // = selected modifier price
  total_price: number;
  modifiers?: {
    modifier_id: string;
    modifier_name: string;  // "2 Hours"
    modifier_type: 'time' | 'quantity';
    actual_cost: number;    // product.cost × cost_multiplier
  };
}
```

---

## Implementation Phases

### Phase 1: Database & API (Days 1-2)
- [ ] Create `product_modifiers` table and migrations
- [ ] Build modifier CRUD API endpoints  
- [ ] Add `has_modifiers` column to products
- [ ] Update POS products API to include modifiers
- [ ] Implement cost calculation logic

### Phase 2: Admin Interface (Days 3-4)
- [ ] Add modifier toggle to product forms
- [ ] Create `ProductModifierManager` component
- [ ] Implement time/quantity modifier creation
- [ ] Add profit margin calculations and display
- [ ] Test modifier management workflows

### Phase 3: POS Integration (Days 5-7)
- [ ] Update `ProductCatalog` with modifier indicators
- [ ] Create `ModifierSelectionModal` (tablet-optimized)
- [ ] Implement quick add functionality
- [ ] Update order processing with modifier data
- [ ] Test tablet and mobile experiences
- [ ] Integrate with existing POS transaction flow

### Phase 4: Testing & Documentation (Day 8)
- [ ] Comprehensive testing of all modifier scenarios
- [ ] Update PRODUCT_MANAGEMENT_SYSTEM.md
- [ ] Update POS_PRODUCT_MANAGEMENT.md
- [ ] Staff training materials
- [ ] Performance testing on tablets

---

## Success Criteria

**Functional Requirements:**
- ✅ Products can be enabled for time or quantity modifiers
- ✅ Staff can quickly add items with default modifiers
- ✅ Staff can select from modifier options via tablet-optimized interface
- ✅ Accurate cost calculations and profit margins
- ✅ Integration with existing POS transaction flow

**UX Requirements:**
- ✅ Tablet-optimized interface with large touch targets
- ✅ Follows existing POS styling and patterns
- ✅ Mobile compatibility maintained
- ✅ Quick workflows for common operations
- ✅ Clear visual indicators for modified pricing

**Business Requirements:**
- ✅ Accurate cost tracking for time and quantity variations
- ✅ Flexible pricing for service durations and product bundles
- ✅ Reduced manual pricing errors
- ✅ Improved customer experience with clear options

---

**Document Version:** 1.0  
**Created:** January 2025  
**Last Updated:** January 2025  
**Status:** Implementation Ready