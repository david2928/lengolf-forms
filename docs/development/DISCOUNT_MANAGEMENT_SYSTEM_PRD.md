# Discount Management System - Product Requirements Document

## Project Overview

### Executive Summary
Implementation of a minimal discount management system for Lengolf Forms that enables admin staff to create and manage discounts while providing POS staff with seamless discount application capabilities at both item and receipt levels.

### Project Goals
- **Primary**: Enable basic discount creation and management
- **Secondary**: Allow POS discount application with proper visibility
- **Tertiary**: Ensure discount visibility in orders, transactions, and receipts

### Success Metrics
- Admin can create, edit, and manage discounts
- POS staff can apply discounts to items and receipts
- Discounts display correctly in order views and printed receipts

---

## Database Architecture

### Current State Analysis
**Existing Discount Fields:**
- `pos.transactions.discount_amount` (numeric) - Receipt-level discount total
- `pos.transaction_items.item_discount` (numeric) - Item-level discount amount  
- `pos.transaction_items.line_discount` (numeric) - Line-level discount amount

**Key Findings:**
- Basic discount fields exist but lack structure and audit trail
- No discount management tables or rules engine
- No staff authorization tracking for discount applications
- No discount type categorization or validity periods

### Required Database Schema

#### Core Discount Tables

```sql
-- Master discount definitions
CREATE TABLE pos.discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(10,2) NOT NULL,
    application_scope VARCHAR(20) NOT NULL CHECK (application_scope IN ('item', 'receipt')),
    
    -- Availability settings
    is_active BOOLEAN DEFAULT true,
    availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN ('always', 'date_range')),
    valid_from TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields (populated from authentication)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (
        (availability_type = 'always') OR 
        (availability_type = 'date_range' AND valid_from IS NOT NULL AND valid_until IS NOT NULL)
    )
);

-- Product-specific discount eligibility (for item-level discounts)
CREATE TABLE pos.discount_product_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discount_id UUID NOT NULL REFERENCES pos.discounts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES pos.dim_product(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Enhanced Transaction Schema

```sql
-- Add discount references to existing tables
ALTER TABLE pos.orders ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES pos.discounts(id);
ALTER TABLE pos.order_items ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES pos.discounts(id);

ALTER TABLE pos.transactions ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES pos.discounts(id);
ALTER TABLE pos.transaction_items ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES pos.discounts(id);

-- Indexes for performance
CREATE INDEX idx_discounts_active_scope ON pos.discounts(is_active, application_scope);
CREATE INDEX idx_discounts_validity ON pos.discounts(availability_type, valid_from, valid_until);
```

---

## Feature Requirements

### Admin Discount Management

#### Discount Creation Interface (`/admin/discounts/create`)

**Required Fields:**
- **Title**: String (255 chars) - Display name for discount
- **Description**: Text - Optional description
- **Discount Type**: Select (Percentage/Fixed Amount)
- **Discount Value**: Numeric input with validation
- **Application Scope**: Select (Item Level/Receipt Level)

**Availability Configuration:**
- **Always Available**: Boolean toggle
- **Date Range**: Start/end date pickers (when not always available)

**Product Eligibility** (for item scope only):
- **Eligible Products**: Multi-select product picker

#### Discount Management Dashboard (`/admin/discounts`)

**List View Features:**
- Simple table with all discounts
- Status indicators (Active/Inactive/Expired)
- Basic action buttons (Edit/Delete/Toggle Active)

### POS Discount Application

#### Item-Level Discount Application

**Product View Integration:**
- **Discount Button**: Visible on each line item in current order
- **Quick Discount Modal**: Shows applicable discounts for selected item
- **Applied Discount Indicator**: Clear visual feedback on discounted items

**Workflow:**
1. Staff clicks discount button on line item
2. System shows eligible discounts for that product
3. Staff selects discount
4. Discount applied with visual confirmation
5. Line total recalculated immediately

#### Receipt-Level Discount Application

**Order Summary Integration:**
- **Total Discount Button**: Prominent button in order totals section
- **Receipt Discount Modal**: Shows all active receipt-level discounts
- **Discount Summary**: Clear breakdown of applied discount

**Workflow:**
1. Staff clicks total discount button
2. Modal displays eligible receipt-level discounts
3. Staff selects discount
4. System calculates new total across all items
5. Receipt summary updated with discount breakdown

### Order Detail View Integration

#### Current Order Display (POS Interface)
- **Item Discount Display**: Show discount name and amount on each discounted line item
- **Receipt Discount Display**: Show receipt-level discount in order summary
- **Total Calculation**: Include discount calculations in running totals
- **Visual Indicators**: Clear styling to distinguish discounted items

#### Order Management View (`/manage-bookings`)
- **Discount Column**: Add discount information to order item display
- **Order Summary**: Include discount details in order totals section
- **Historical View**: Show applied discounts for completed orders

### Transaction View Integration

#### Transaction History/Records
- **Transaction Items**: Display applied discount name and amount
- **Transaction Totals**: Show receipt-level discounts in summary
- **Receipt Recreation**: Include discount information when viewing past transactions
- **Search/Filter**: Add discount-related filtering options

### Receipt Printing Integration

#### Receipt Content Updates
- **Line Item Discounts**: Print discount name and amount next to discounted items
  ```
  Thai Green Curry x1         280.00
    Staff Discount 10%        -28.00
                              ------
    Item Total                252.00
  ```

- **Receipt Total Discounts**: Print receipt-level discounts in totals section
  ```
  Subtotal:                   520.00
  Birthday Discount 20%      -104.00
                             ------
  Net Total:                  416.00
  VAT (7%):                    29.12
  Total:                      445.12
  ```

#### Bluetooth Thermal Printer Service Updates
- **Receipt Template**: Update receipt formatting to include discount lines
- **Tax Invoice Integration**: Include discount information in tax invoices
- **Print Queue**: Ensure discount information is preserved in print jobs

---

## Technical Implementation

### API Endpoints

#### Admin Discount Management

```typescript
// Discount CRUD operations
POST   /api/admin/discounts                    // Create discount
GET    /api/admin/discounts                    // List all discounts
GET    /api/admin/discounts/[id]               // Get specific discount
PUT    /api/admin/discounts/[id]               // Update discount
DELETE /api/admin/discounts/[id]               // Delete discount

// Product eligibility management
GET    /api/admin/discounts/[id]/products      // Get eligible products
PUT    /api/admin/discounts/[id]/products      // Update eligible products
```

#### POS Discount Application

```typescript
// Discount lookup and application
GET    /api/pos/discounts/available            // Get active discounts by scope
POST   /api/pos/discounts/apply                // Apply discount to order/item
```

### Frontend Components

#### Admin Components

```typescript
// Admin discount management components
AdminDiscountList              // Main discount listing
AdminDiscountForm              // Create/edit discount form
ProductEligibilitySelector     // Product selection for item discounts
```

#### POS Components

```typescript
// POS discount application components
ItemDiscountButton            // Discount button for line items
ReceiptDiscountButton         // Total discount button
DiscountSelectionModal        // Discount picker modal
DiscountDisplay               // Applied discount visualization in order
```

#### Order/Transaction Display Components

```typescript
// Enhanced display components
OrderItemWithDiscount         // Line item with discount display
OrderSummaryWithDiscounts     // Order totals including discounts
TransactionHistoryWithDiscounts // Transaction view with discount info
```

#### Receipt/Printing Components

```typescript
// Receipt formatting components
ReceiptLineItemFormatter      // Format line items with discounts
ReceiptTotalFormatter         // Format receipt totals with discounts
BluetoothReceiptTemplate      // Updated receipt template
```

### Database Functions

```sql
-- Simple discount validation function
CREATE OR REPLACE FUNCTION validate_discount_application(
    p_discount_id UUID,
    p_product_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_discount RECORD;
    v_result JSONB;
BEGIN
    SELECT * INTO v_discount FROM pos.discounts WHERE id = p_discount_id;
    
    -- Check if discount exists and is active
    IF NOT FOUND OR NOT v_discount.is_active THEN
        RETURN '{"valid": false, "reason": "Discount not found or inactive"}'::JSONB;
    END IF;
    
    -- Check date validity
    IF v_discount.availability_type = 'date_range' THEN
        IF NOW() < v_discount.valid_from OR NOW() > v_discount.valid_until THEN
            RETURN '{"valid": false, "reason": "Discount not valid for current date"}'::JSONB;
        END IF;
    END IF;
    
    -- Check product eligibility for item-level discounts
    IF v_discount.application_scope = 'item' AND p_product_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM pos.discount_product_eligibility 
            WHERE discount_id = p_discount_id AND product_id = p_product_id
        ) THEN
            RETURN '{"valid": false, "reason": "Product not eligible for this discount"}'::JSONB;
        END IF;
    END IF;
    
    RETURN '{"valid": true}'::JSONB;
END;
$$ LANGUAGE plpgsql;
```

---

## Development Phases

### Phase 1: Database and Core API (Week 1)
- [ ] Create discount management database schema
- [ ] Implement discount CRUD API endpoints
- [ ] Create discount validation function
- [ ] Basic unit tests

### Phase 2: Admin Interface (Week 2)
- [ ] Admin discount list page
- [ ] Discount creation/editing forms
- [ ] Product eligibility management interface

### Phase 3: POS Integration (Week 3)
- [ ] Item-level discount buttons and modals
- [ ] Receipt-level discount application
- [ ] Discount calculation integration
- [ ] Order total recalculation logic

### Phase 4: Display Integration (Week 4)
- [ ] Update order detail views to show discounts
- [ ] Update transaction views to show discounts
- [ ] Update receipt printing to include discounts
- [ ] Update Bluetooth thermal printer service

### Phase 5: Testing and Deployment (Week 5)
- [ ] Integration testing
- [ ] Production deployment
- [ ] Bug fixes

---

## Security Considerations

### Data Validation
- Discount percentages limited to 0-100%
- Fixed amounts cannot exceed transaction total
- Date ranges validated for logical consistency
- Admin-only access to discount management

### Performance Requirements
- Discount lookup: < 200ms
- Discount application: < 500ms
- Database indexing for fast lookups

---

## Success Criteria

### Technical Acceptance
- [ ] Database schema implemented correctly
- [ ] API endpoints function properly
- [ ] POS discount application works end-to-end
- [ ] Admin interface supports discount CRUD operations
- [ ] Discounts display correctly in orders, transactions, and receipts

### Business Acceptance
- [ ] Admin can create and manage discounts
- [ ] POS staff can apply discounts easily
- [ ] Discount calculations are accurate
- [ ] Discounts print correctly on receipts
- [ ] System integrates with existing workflow

---

**Document Version**: 2.0 (Simplified)  
**Last Updated**: January 2025  
**Next Review**: Implementation Kickoff  
**Stakeholders**: Development Team, POS Operations