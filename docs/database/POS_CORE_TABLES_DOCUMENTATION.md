# POS Core Tables Documentation (AS-IS)

## Overview

This document provides comprehensive AS-IS documentation for the POS (Point of Sale) system in the Lengolf database. The system is currently in **transition** from an old POS system to a new normalized POS system.

**Current Architecture:**
1. **Old POS Flow**: `lengolf_sales_staging` (raw) → `lengolf_sales` (analytics layer)
2. **New POS Tables**: `pos.transactions` + `pos.transaction_items` (normalized, in development)  
3. **Future Goal**: `pos.transactions/transaction_items` → `lengolf_sales` (same analytics destination)

**Key Insight**: `lengolf_sales` is the **analytics source of truth** with business logic applied. It currently receives data from the old POS staging table, but will eventually receive data from the new normalized POS tables.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Analytics Layer (Source of Truth)](#analytics-layer-source-of-truth)
3. [New Normalized POS Tables](#new-normalized-pos-tables)
4. [Legacy Data Flow](#legacy-data-flow)
5. [Migration Strategy](#migration-strategy)

---

## System Architecture

### Current Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    CURRENT STATE                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 OLD POS SYSTEM                                          │
│  lengolf_sales_staging (raw data from old POS)             │
│                    ↓                                        │
│              business logic                                 │
│                    ↓                                        │
│  📈 ANALYTICS LAYER (Source of Truth)                      │
│  lengolf_sales (15,475+ processed records)                 │
│  ├─ Business logic applied                                  │
│  ├─ Data transformations                                    │
│  ├─ Analytics ready                                         │
│  └─ All reports/BI tools use this                          │
│                                                             │
│  🏗️ NEW POS SYSTEM (In Development)                        │
│  pos.transactions + pos.transaction_items                   │
│  ├─ Normalized design                                       │
│  ├─ Proper foreign keys                                     │
│  └─ Not yet feeding analytics layer                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    FUTURE STATE                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🏗️ NEW POS SYSTEM (Primary)                               │
│  pos.transactions + pos.transaction_items                   │
│                    ↓                                        │
│              business logic                                 │
│                    ↓                                        │
│  📈 ANALYTICS LAYER (Same Source of Truth)                 │
│  lengolf_sales                                              │
│  ├─ Same business logic applied                             │
│  ├─ Same data transformations                               │
│  ├─ Same analytics structure                                │
│  └─ All reports/BI continue working unchanged              │
│                                                             │
│  📊 OLD POS SYSTEM (Retired)                               │
│  lengolf_sales_staging → DEPRECATED                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Analytics Layer (Source of Truth)

### `lengolf_sales` - Analytics & Business Intelligence Table

**Status**: 🎯 **Current Source of Truth** for all analytics, reports, and business intelligence

**Purpose**: Processed transaction data with business logic applied. This table contains cleaned, transformed, and analytics-ready data.

#### Actual Schema (Key Columns)
```sql
CREATE TABLE pos.lengolf_sales (
    -- Identity & Control
    id                      INTEGER PRIMARY KEY,
    date                    DATE NOT NULL,
    receipt_number          TEXT NOT NULL,
    invoice_number          TEXT,
    
    -- Business Logic Applied Data
    staff_name              TEXT,                    -- Business name, not raw data
    customer_name           TEXT,                    -- Processed customer name
    customer_phone_number   TEXT,
    
    -- Product Information (Processed)
    product_name            TEXT,                    -- Clean product name
    product_category        TEXT,                    -- Standardized category
    product_parent_category TEXT,                    -- Hierarchy applied
    sku_number              TEXT,                    -- SKU lookup applied
    
    -- Financial Data (Business Rules Applied)
    item_cnt                INTEGER,
    item_price_incl_vat     NUMERIC,
    item_price_excl_vat     NUMERIC,
    item_discount           NUMERIC,
    sales_total             NUMERIC,                 -- Calculated totals
    sales_net               NUMERIC,                 -- Net after business rules
    gross_profit            NUMERIC,                 -- Profit calculations
    
    -- Foreign Keys (When Available)
    customer_id             UUID,                    -- Link to customer master
    product_id              UUID,                    -- Link to product catalog
    
    -- Timestamps
    sales_timestamp         TIMESTAMPTZ NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);
```

#### Key Characteristics
- ✅ **Analytics optimized**: Data is pre-calculated and business rules applied
- ✅ **Report ready**: All BI tools and dashboards query this table
- ✅ **Business logic embedded**: Contains processed, not raw data
- ✅ **Performance optimized**: Designed for fast analytical queries
- ✅ **15,475+ records**: Contains substantial historical data

#### Current Data Source
```sql
-- Current ETL process
lengolf_sales_staging → business_logic() → lengolf_sales
```

#### Future Data Source  
```sql
-- Target ETL process
pos.transactions + pos.transaction_items → business_logic() → lengolf_sales
```

---

## New Normalized POS Tables

### Purpose
These tables represent the **new POS system** currently being built. They use proper database normalization principles and will eventually replace the old POS system as the source for the analytics layer.

### 1. `pos.transactions` (Normalized - Ready)

**Purpose**: Core transaction records with proper foreign key relationships.

#### Actual Schema
```sql
CREATE TABLE pos.transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    receipt_number      VARCHAR(50) NOT NULL,
    subtotal            NUMERIC NOT NULL,
    vat_amount          NUMERIC NOT NULL,
    total_amount        NUMERIC NOT NULL,
    discount_amount     NUMERIC DEFAULT 0,
    payment_methods     JSONB,
    payment_status      VARCHAR(20) DEFAULT 'completed',
    table_session_id    UUID NOT NULL,
    order_id            UUID,
    staff_id            INTEGER NOT NULL,                    -- FK to backoffice.staff
    customer_id         BIGINT,                              -- FK to public.customers  
    booking_id          TEXT,                                -- FK to bookings
    transaction_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);
```

#### Design Principles
- ✅ **Fully normalized**: Only foreign key IDs stored
- ✅ **Data integrity**: Proper constraints and relationships
- ✅ **Audit trail**: Complete transaction lifecycle tracking
- ✅ **Integration ready**: Links to all relevant business entities

### 2. `pos.transaction_items` (Normalized - Ready)

**Purpose**: Individual line items within transactions with full normalization.

#### Actual Schema
```sql
CREATE TABLE pos.transaction_items (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id          UUID NOT NULL,                  -- FK to pos.transactions
    item_sequence           INTEGER NOT NULL,
    order_id                UUID,                           -- FK to pos.orders
    table_session_id        UUID NOT NULL,                  -- FK to pos.table_sessions
    product_id              UUID,                           -- FK to products.products
    item_cnt                INTEGER NOT NULL DEFAULT 1,
    item_price_incl_vat     NUMERIC NOT NULL,
    item_price_excl_vat     NUMERIC NOT NULL,
    item_discount           NUMERIC DEFAULT 0,
    sales_total             NUMERIC NOT NULL,
    sales_net               NUMERIC NOT NULL,
    payment_method          VARCHAR(100),
    payment_amount_allocated NUMERIC,
    staff_id                INTEGER NOT NULL,               -- FK to backoffice.staff
    customer_id             BIGINT,                         -- FK to public.customers
    booking_id              TEXT,                           -- FK to bookings
    is_voided               BOOLEAN DEFAULT false,
    voided_at               TIMESTAMPTZ,
    voided_by               VARCHAR(255),
    item_notes              TEXT,
    sales_timestamp         TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at              TIMESTAMPTZ DEFAULT now(),
    updated_at              TIMESTAMPTZ DEFAULT now()
);
```

#### Key Features
- ✅ **Complete normalization**: Only FKs, no denormalized names
- ✅ **Rich relationships**: Links to all relevant entities
- ✅ **Audit capabilities**: Void tracking and notes
- ✅ **Analytics ready**: All fields needed for business logic application

### 3. `pos.orders` (Normalized - Supporting)

#### Actual Schema
```sql
CREATE TABLE pos.orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_session_id    UUID NOT NULL,
    order_number        INTEGER NOT NULL DEFAULT nextval('pos.orders_order_number_seq'),
    status              TEXT NOT NULL DEFAULT 'confirmed',
    total_amount        NUMERIC NOT NULL DEFAULT 0,
    tax_amount          NUMERIC DEFAULT 0,
    subtotal_amount     NUMERIC NOT NULL DEFAULT 0,
    staff_id            INTEGER,                            -- FK to backoffice.staff
    customer_id         BIGINT,                             -- FK to public.customers
    booking_id          TEXT,                               -- FK to bookings
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- ... other audit fields
);
```

### 4. `pos.order_items` (Normalized - Supporting)

#### Actual Schema
```sql
CREATE TABLE pos.order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL,
    product_id  UUID,
    quantity    INTEGER NOT NULL,
    unit_price  NUMERIC NOT NULL,
    total_price NUMERIC NOT NULL,
    modifiers   JSONB DEFAULT '[]'::jsonb,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);
```

---

## Legacy Data Flow

### Current Process (Old POS → Analytics)

```sql
-- Step 1: Raw data from old POS system
lengolf_sales_staging
├─ Raw transaction data
├─ Minimal processing
└─ Direct from old POS hardware/software

-- Step 2: Business logic processing
ETL_Process() {
    -- Data cleaning
    -- Business rule application  
    -- Category standardization
    -- Profit calculations
    -- Customer name normalization
}

-- Step 3: Analytics-ready data
lengolf_sales
├─ Business logic applied
├─ Ready for reporting
├─ BI tools consume this
└─ Source of truth for analysis
```

### Data Dependencies

**Reports & Analytics Depend On**: `lengolf_sales` structure
- Sales dashboards
- Staff performance reports  
- Product analytics
- Customer behavior analysis
- Financial reporting

**Critical**: The `lengolf_sales` table structure and business logic **must remain consistent** during the transition to ensure reports continue working.

---

## Migration Strategy

### Phase 1: Parallel Development ✅ (Current)
- ✅ Build new normalized POS tables
- ✅ Develop new POS application using normalized tables
- ✅ Keep old POS system running
- ✅ Analytics continue using `lengolf_sales` from old system

### Phase 2: ETL Development 🔄 (Next)
```sql
-- Develop business logic to transform normalized data
CREATE FUNCTION sync_pos_to_analytics() 
RETURNS void AS $$
BEGIN
    -- Extract from pos.transactions + pos.transaction_items
    -- Transform using same business logic currently applied
    -- Load into lengolf_sales (same structure, same rules)
END;
$$ LANGUAGE plpgsql;
```

### Phase 3: Cutover 🎯 (Future)
1. **Switch POS systems**: Start using new normalized POS
2. **Run parallel ETL**: Both old and new systems feed `lengolf_sales`
3. **Validate data consistency**: Ensure analytics remain accurate
4. **Retire old system**: Stop old POS, keep only normalized → analytics flow

### Phase 4: Cleanup 🧹 (Final)
- Remove `lengolf_sales_staging` table
- Archive old POS data
- Optimize ETL process for new normalized source

---

## Key Success Factors

### 1. Business Logic Preservation
The ETL process from new normalized tables to `lengolf_sales` must apply **exactly the same business logic** currently used from staging table.

### 2. Analytics Continuity
All existing reports, dashboards, and BI tools must continue working without modification.

### 3. Data Quality
The new normalized POS must capture all data points needed to generate the same analytics output.

### 4. Performance Maintenance
The `lengolf_sales` table must maintain its performance characteristics for analytical queries.

---

## Implementation Notes

### Foreign Key Resolution Required
```sql
-- New normalized POS stores FKs:
staff_id → backoffice.staff.name
customer_id → public.customers.name  
product_id → products.products.name

-- Analytics layer needs resolved names:
staff_name, customer_name, product_name
```

### Business Logic Examples
```sql
-- Category hierarchy resolution
product_id → products.categories.name → product_category
product_id → products.categories.parent_id → product_parent_category

-- Profit calculations
(sales_total - item_cost) → gross_profit

-- Customer name standardization
customer_id → clean_customer_name()
```

---

## Current Status Summary

| Component | Status | Description |
|-----------|--------|-------------|
| **lengolf_sales** | ✅ Production | Analytics source of truth (15,475+ records) |
| **lengolf_sales_staging** | ✅ Active | Raw data from old POS system |
| **pos.transactions** | 🏗️ Ready | New normalized transaction table |
| **pos.transaction_items** | 🏗️ Ready | New normalized line items table |
| **pos.orders/order_items** | 🏗️ Ready | Supporting order management tables |
| **Business Logic ETL** | ⏳ Pending | Transform normalized → analytics |
| **POS Application** | 🔄 Development | New POS using normalized tables |

---

*Last Updated: July 2025*  
*Version: AS-IS Documentation*  
*Status: Accurate as of current database state*  
*Author: Lengolf Development Team*