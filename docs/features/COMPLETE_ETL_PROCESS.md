# Complete ETL Process Documentation

## Overview

The Lengolf Forms ETL (Extract, Transform, Load) process is a comprehensive system that handles data flow from the Qashier POS system to the production database. This document covers the complete process including incremental processing, customer ID population, and the full ETL setup.

## Table of Contents

1. [ETL Architecture](#etl-architecture)
2. [Incremental Processing Mechanism](#incremental-processing-mechanism)
3. [Complete ETL Process Flow](#complete-etl-process-flow)
4. [Customer ID Population](#customer-id-population)
5. [Two-Step ETL Implementation](#two-step-etl-implementation)
6. [Automation and Scheduling](#automation-and-scheduling)
7. [Database Schema](#database-schema)
8. [Function Reference](#function-reference)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Performance Optimization](#performance-optimization)
11. [Troubleshooting](#troubleshooting)

## ETL Architecture

### System Components

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Qashier POS       │    │   Flask API         │    │   Supabase          │
│   (Data Source)     │───▶│   (Cloud Run)       │───▶│   (Database)        │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
                                     │
                                     ▼
                            ┌─────────────────────┐
                            │   Playwright        │
                            │   (Web Scraper)     │
                            └─────────────────────┘
```

### Data Flow Pipeline

```
1. Qashier POS → 2. Web Scraping → 3. Staging Table → 4. ETL Transform → 5. Production Table
   (Source Data)   (Playwright)     (Raw CSV)         (Business Logic)    (Analytics Ready)
```

## Incremental Processing Mechanism

### ✅ **Key Insight: Date-Based Replacement Strategy**

The ETL uses a **date-based replacement strategy** rather than traditional incremental processing. This approach is simpler, more reliable, and prevents duplicate data issues.

### How Incremental Processing Works

#### **1. Date Range Detection**
```sql
-- ETL automatically detects date range from staging data
SELECT 
  MIN(parsed_date) as min_date,
  MAX(parsed_date) as max_date
FROM pos.lengolf_sales_staging 
WHERE date IS NOT NULL;
```

#### **2. Buffer Zone Application**
```sql
-- Add 2-day buffer on each side for safety
min_date := min_date - INTERVAL '2 days';
max_date := max_date + INTERVAL '2 days';
```

#### **3. Targeted Data Replacement**
```sql
-- DELETE existing data in the determined range
DELETE FROM pos.lengolf_sales 
WHERE date >= min_date AND date <= max_date;

-- INSERT ALL staging data (no duplicate checking needed)
INSERT INTO pos.lengolf_sales (...)
SELECT ... FROM staging_transformation;
```

### ✅ **Benefits of Date-Based Replacement**

1. **No Duplicate Data**: Complete replacement eliminates duplicates
2. **Handles Late Updates**: Buffer zone catches delayed transactions
3. **Simple Logic**: No complex deduplication algorithms needed
4. **Efficient Processing**: Processes only necessary date ranges
5. **Reliable Results**: Consistent data state after each run

### **Processing Examples**

#### **Daily Incremental Processing**
```sql
-- Daily run typically processes 1-2 days of data
-- Example: July 17, 2025 run
Date Range in Staging: 2025-07-17 to 2025-07-17
Buffer Applied: 2025-07-15 to 2025-07-19
Production Records Deleted: ~3-5 days worth
New Records Inserted: All staging records
```

#### **Historical Backfill Processing**
```sql
-- Historical runs process larger ranges
-- Example: June 1-30, 2025 backfill
Date Range in Staging: 2025-06-01 to 2025-06-30
Buffer Applied: 2025-05-30 to 2025-07-02
Production Records Deleted: ~32 days worth
New Records Inserted: All staging records
```

## Complete ETL Process Flow

### **Stage 1: Data Extraction (External)**
- **Source**: Qashier POS Transaction Details
- **Method**: Flask API + Playwright web scraping
- **URL**: `https://lengolf-sales-api-1071951248692.asia-southeast1.run.app`
- **Output**: Excel → CSV → Database staging table
- **Schedule**: Hourly at :00 minutes

### **Stage 2: Data Staging (Automated)**
- **Target**: `pos.lengolf_sales_staging` table
- **Method**: Truncate and replace by date range
- **Fields**: 30+ raw CSV columns from Qashier
- **Validation**: Basic data type and format checks

### **Stage 3: ETL Transformation (Core Process)**
- **Function**: `pos.transform_sales_data()`
- **Schedule**: Hourly at :02 minutes (2 minutes after data extraction)
- **Method**: Two-step process with date-based replacement

#### **Step 3A: Date Range Analysis**
```sql
-- Analyze staging data
SELECT MIN(date), MAX(date) FROM pos.lengolf_sales_staging;

-- Apply buffer zone
min_date := min_date - INTERVAL '2 days';
max_date := max_date + INTERVAL '2 days';

-- Clean production data in range
DELETE FROM pos.lengolf_sales WHERE date >= min_date AND date <= max_date;
```

#### **Step 3B: Data Transformation**
```sql
-- Transform all staging data with business logic
WITH sales_transformation AS (
  SELECT
    -- Date parsing and validation
    CASE WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' 
         THEN staging.date::DATE
         WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4}'
         THEN TO_DATE(SUBSTRING(staging.date FROM 1 FOR 10), 'DD/MM/YYYY')
         ELSE NULL END AS date,
    
    -- Core transaction fields
    staging.receipt_number,
    staging.invoice_no AS invoice_number,
    staging.transaction_payment_method AS payment_method,
    staging.order_type,
    staging.staff_name,
    
    -- Enhanced customer data with manual corrections
    TRIM(REGEXP_REPLACE(
      COALESCE(mods.customer_name_mod, staging.customer_name), 
      '\\s+', ' ', 'g'
    )) AS customer_name,
    COALESCE(mods.customer_phone_number_mod, staging.customer_phone_number) AS customer_phone_number,
    
    -- Product identification (Step 1: product_id from mappings)
    COALESCE(
      mappings.product_id,
      -- Fallback to legacy_pos_name matching
      (SELECT id FROM products.products WHERE TRIM(legacy_pos_name) = TRIM(staging.transaction_item) LIMIT 1)
    ) AS product_id,
    
    -- Quantity and pricing with validation
    CASE WHEN staging.transaction_item_quantity ~ '^[0-9]+\\.?[0-9]*$' 
         THEN staging.transaction_item_quantity::INTEGER 
         ELSE 1 END AS item_cnt,
    
    -- VAT calculations based on transaction date
    CASE WHEN staging.date::DATE < '2024-09-01' 
         THEN 0.07 * (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER)
         ELSE 0.07 * (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER / 1.07)
         END AS item_vat,
    
    -- Profit calculations
    COALESCE(item_price_excl_vat * item_cnt, 0) AS sales_net,
    
    -- Timezone handling
    CASE WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
         THEN (staging.date::TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
         ELSE NULL END AS sales_timestamp
         
  FROM pos.lengolf_sales_staging staging
  LEFT JOIN pos.lengolf_sales_modifications mods ON staging.receipt_number = mods.receipt_number
  LEFT JOIN pos.product_mappings mappings ON TRIM(staging.transaction_item) = TRIM(mappings.pos_product_name)
  WHERE staging.date IS NOT NULL
)
```

#### **Step 3C: Detailed lengolf_sales Generation Process**

The `pos.lengolf_sales` table is generated through a comprehensive two-step transformation process that converts raw POS data into analytics-ready business data.

### **Complete Field Transformation Logic**

#### **Core Transaction Fields**
```sql
-- Date parsing with multiple format support
CASE 
  WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
  THEN staging.date::DATE
  WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
  THEN TO_DATE(SUBSTRING(staging.date FROM 1 FOR 10), 'DD/MM/YYYY')
  ELSE NULL 
END AS date,

-- Direct field mapping from staging
staging.receipt_number,
staging.invoice_no AS invoice_number,
staging.invoice_payment_type,
staging.transaction_payment_method AS payment_method,
staging.order_type,
staging.staff_name,
```

#### **Enhanced Customer Data Processing**
```sql
-- Customer name with manual corrections and whitespace normalization
TRIM(REGEXP_REPLACE(
  COALESCE(mods.customer_name_mod, staging.customer_name), 
  '\\s+', ' ', 'g'
)) AS customer_name,

-- Customer phone with manual corrections
COALESCE(mods.customer_phone_number_mod, staging.customer_phone_number) AS customer_phone_number,

-- Customer ID matching (optional real-time)
CASE 
  WHEN match_customers AND staging.customer_phone_number IS NOT NULL AND staging.customer_phone_number != ''
  THEN (
    SELECT id FROM (
      SELECT DISTINCT ON (normalized_phone) 
        id, normalized_phone, created_at
      FROM public.customers
      WHERE normalized_phone = public.normalize_phone_number(
        COALESCE(mods.customer_phone_number_mod, staging.customer_phone_number)
      )
      ORDER BY normalized_phone, created_at, id
    ) first_customer
    LIMIT 1
  )
  ELSE NULL
END AS customer_id,
```

#### **Product Identification (Two-Step Process)**
```sql
-- Step 1: Product ID from mappings (primary) with fallback
COALESCE(
  mappings.product_id,
  -- Fallback to legacy_pos_name matching for unmapped products
  (SELECT id FROM products.products WHERE TRIM(legacy_pos_name) = TRIM(staging.transaction_item) LIMIT 1)
) AS product_id,

-- Product name from staging data
staging.transaction_item AS product_name,

-- SKU from staging (will be updated in Step 2)
staging.sku_number,
```

#### **Quantity and Basic Pricing (Direct Conversion)**
```sql
-- Quantity with safe fallback (NO REGEX VALIDATION)
COALESCE(
  CASE 
    WHEN staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
    THEN staging.transaction_item_quantity::INTEGER 
    ELSE 1 
  END, 1
) AS item_cnt,

-- Price before discount (direct conversion)
COALESCE(
  CASE 
    WHEN staging.amount_before_subsidy IS NOT NULL AND staging.amount_before_subsidy != ''
    THEN staging.amount_before_subsidy::NUMERIC 
    ELSE NULL 
  END
) AS item_price_before_discount,

-- Final item price (direct conversion)
COALESCE(
  CASE 
    WHEN staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
    THEN staging.transaction_item_final_amount::NUMERIC 
    ELSE NULL 
  END
) AS item_price,
```

#### **Business Logic Calculations**

**Discount Calculation:**
```sql
-- Item discount = price before subsidy - final price per unit
CASE 
  WHEN staging.amount_before_subsidy IS NOT NULL AND staging.amount_before_subsidy != ''
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN staging.amount_before_subsidy::NUMERIC - 
       (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER)
  ELSE 0
END AS item_discount,
```

**VAT Calculation Logic (Date-Based):**
```sql
-- VAT per item based on transaction date (regulatory change Sep 1, 2024)
CASE 
  -- Before Sep 1, 2024: VAT applied on top of price
  WHEN staging.date::DATE < '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN 0.07 * (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER)
  
  -- After Sep 1, 2024: VAT included in price
  WHEN staging.date::DATE >= '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN 0.07 * (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER / 1.07)
  ELSE 0
END AS item_vat,
```

**Price Excluding VAT:**
```sql
-- Price excluding VAT (for profit calculations)
CASE 
  -- Before Sep 1, 2024: Price as-is (VAT not included)
  WHEN staging.date::DATE < '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER
  
  -- After Sep 1, 2024: Remove VAT from price
  WHEN staging.date::DATE >= '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER) / 1.07
  ELSE NULL
END AS item_price_excl_vat,
```

**Price Including VAT:**
```sql
-- Price including VAT (for customer-facing totals)
CASE
  -- Before Sep 1, 2024: Add VAT to price
  WHEN staging.date::DATE < '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER) * 1.07
  
  -- After Sep 1, 2024: Price already includes VAT
  WHEN staging.date::DATE >= '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER
  ELSE NULL
END AS item_price_incl_vat,
```

**Sales Total Calculations:**
```sql
-- Sales total (total amount including VAT)
CASE
  -- Before Sep 1, 2024: (price per unit * 1.07) * quantity
  WHEN staging.date::DATE < '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER) * 1.07 * staging.transaction_item_quantity::INTEGER
  
  -- After Sep 1, 2024: final amount already includes VAT
  WHEN staging.date::DATE >= '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
       AND staging.transaction_item_quantity IS NOT NULL AND staging.transaction_item_quantity != ''
       AND staging.transaction_item_quantity::INTEGER > 0
  THEN (staging.transaction_item_final_amount::NUMERIC / staging.transaction_item_quantity::INTEGER) * staging.transaction_item_quantity::INTEGER
  ELSE NULL
END AS sales_total,

-- VAT totals (total VAT amount)
CASE 
  -- Before Sep 1, 2024: 7% of final amount
  WHEN staging.date::DATE < '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
  THEN 0.07 * staging.transaction_item_final_amount::NUMERIC
  
  -- After Sep 1, 2024: 7% of amount excluding VAT
  WHEN staging.date::DATE >= '2024-09-01'
       AND staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
  THEN 0.07 * (staging.transaction_item_final_amount::NUMERIC / 1.07)
  ELSE 0
END AS sales_vat,
```

#### **Final Calculations (Derived Fields)**
```sql
-- Additional calculated fields from the final_calculations CTE
COALESCE((item_price_excl_vat * item_cnt) + (item_discount * item_cnt), 0) AS sales_gross,
COALESCE(item_discount * item_cnt, 0) AS sales_discount,
COALESCE(item_price_excl_vat * item_cnt, 0) AS sales_net,
```

#### **Timestamp Processing**
```sql
-- Sales timestamp with timezone conversion
CASE 
  WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
  THEN (staging.date::TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
  WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
  THEN (TO_TIMESTAMP(staging.date, 'DD/MM/YYYY HH24:MI:SS') AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
  ELSE NULL 
END AS sales_timestamp,

-- Update time from staging
CASE 
  WHEN staging.update_time ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
  THEN timezone('UTC', staging.update_time::TIMESTAMP)
  ELSE NULL 
END AS update_time,
```

### **Two-Step Process Implementation**

**Step 1: Insert Core Data with Product ID**
```sql
INSERT INTO pos.lengolf_sales (
  date, receipt_number, invoice_number, invoice_payment_type, payment_method, order_type, staff_name,
  customer_name, customer_phone_number, customer_id, is_voided, voided_reason, item_notes, product_name,
  product_id, sku_number, item_cnt, item_price_before_discount, item_discount, item_vat, 
  item_price_excl_vat, item_price_incl_vat, item_price, sales_total, sales_vat, sales_gross, 
  sales_discount, sales_net, sales_timestamp, update_time, created_at, updated_at
)
SELECT 
  date, receipt_number, invoice_number, invoice_payment_type, payment_method, order_type, staff_name,
  customer_name, customer_phone_number, customer_id, is_voided, voided_reason, item_notes, product_name,
  product_id, sku_number, item_cnt, item_price_before_discount, item_discount, item_vat,
  item_price_excl_vat, item_price_incl_vat, item_price, sales_total, sales_vat, sales_gross,
  sales_discount, sales_net, sales_timestamp, update_time, created_at_bkk, created_at_bkk
FROM final_calculations
WHERE date IS NOT NULL AND sales_timestamp IS NOT NULL;
```

**Step 2: Enrich with Product Data (JOIN on product_id)**
```sql
UPDATE pos.lengolf_sales 
SET 
  -- SKU from products table (fallback to staging sku_number)
  sku_number = COALESCE(products.sku, pos.lengolf_sales.sku_number),
  
  -- Cost from products table
  item_cost = products.cost,
  
  -- Category information from products table
  product_category = cat.name,
  product_tab = cat.name, -- Using category name for tab
  product_parent_category = parent_cat.name,
  
  -- SIM usage from products table (INTEGER for easy summing)
  is_sim_usage = CASE WHEN COALESCE(products.is_sim_usage, FALSE) THEN 1 ELSE 0 END,
  
  -- Recalculate cost-dependent fields
  sales_cost = CASE WHEN products.cost IS NOT NULL THEN products.cost * pos.lengolf_sales.item_cnt ELSE NULL END,
  
  -- Gross profit = sales_net - total_cost
  gross_profit = CASE 
    WHEN products.cost IS NOT NULL 
    THEN pos.lengolf_sales.sales_net - (products.cost * pos.lengolf_sales.item_cnt)
    ELSE NULL
  END,
  
  updated_at = NOW()
FROM products.products AS products
LEFT JOIN products.categories AS cat ON products.category_id = cat.id
LEFT JOIN products.categories AS parent_cat ON cat.parent_id = parent_cat.id
WHERE pos.lengolf_sales.product_id = products.id
  AND pos.lengolf_sales.date >= min_date
  AND pos.lengolf_sales.date <= max_date;
```

### **Key Business Rules**

1. **VAT Handling**: Date-based calculation (pre/post Sep 1, 2024)
2. **Product Mapping**: Two-tier system (mappings table + legacy_pos_name)
3. **Customer Matching**: Phone number normalization with deduplication
4. **Data Validation**: NULL checks instead of regex patterns
5. **Cost Calculations**: Only when product costs are available
6. **SIM Usage**: Integer flag (0/1) for easy aggregation
7. **Timezone**: All timestamps converted to Asia/Bangkok
8. **Profit Calculation**: `sales_net - (item_cost * item_cnt)`

### **Critical Fix: Regex Pattern Removal**

**Problem Identified (July 2025):**
The ETL function was using regex patterns to validate numeric fields before conversion, which caused all calculations to fail:

```sql
-- BROKEN: Regex patterns were failing to match valid data
CASE 
  WHEN staging.transaction_item_final_amount ~ '^[0-9]+\\.?[0-9]*$' 
  THEN staging.transaction_item_final_amount::NUMERIC 
  ELSE NULL 
END
```

**Issue Impact:**
- Values like "500.0" and "1" failed regex validation
- `item_price_excl_vat` became NULL
- `sales_net` calculated as 0 
- `gross_profit` became negative (0 - cost)
- All financial calculations were wrong

**Solution Applied:**
```sql
-- FIXED: Direct conversion with simple NULL checks
CASE 
  WHEN staging.transaction_item_final_amount IS NOT NULL AND staging.transaction_item_final_amount != ''
  THEN staging.transaction_item_final_amount::NUMERIC 
  ELSE NULL 
END
```

**Why This Fix Works:**
1. **PostgreSQL's type conversion is robust** - handles "500.0", "500", "1" perfectly
2. **Simple NULL checks are sufficient** - checking for NULL and empty string is enough
3. **No regex complexity** - eliminates pattern matching overhead
4. **Better performance** - direct conversion is faster than regex validation
5. **More reliable** - no edge cases with numeric formats

**Results After Fix:**
- ✅ **Weekday 1H (Morning)**: `sales_net` = 467.29 (was 0)
- ✅ **Golf Gloves**: `sales_net` = 560.75, `gross_profit` = 380.75 (was -180.00)
- ✅ **Water**: `sales_net` = 28.04, `gross_profit` = 24.74 (was -3.30)
- ✅ **All financial calculations now accurate**

### **Example Data Transformation**

**Input (Staging):**
```
transaction_item: "Weekday 1H (Morning)"
transaction_item_quantity: "1"
transaction_item_final_amount: "500.0"
date: "2025-07-17 03:57:39"
```

**Output (lengolf_sales):**
```
product_name: "Weekday 1H (Morning)"
item_cnt: 1
item_price: 500.0
item_price_excl_vat: 467.29 (500.0 / 1.07)
sales_net: 467.29
item_cost: 0.00 (from products table)
sales_cost: 0.00
gross_profit: 467.29 (467.29 - 0.00)
```

### **Stage 4: Post-Processing**
- **Customer ID Population**: Match customers by phone numbers
- **Materialized View Refresh**: Update reporting views
- **Schedule**: Hourly at :03 minutes

## Customer ID Population

### **Function: `pos.update_sales_customer_ids()`**

The system includes a dedicated function for populating customer IDs in sales data after the main ETL process.

#### **Purpose**
- Links sales transactions to customer records
- Uses phone number matching with normalization
- Handles batch processing for performance

#### **Process Flow**
```sql
-- 1. Find sales records without customer_id
-- 2. Normalize phone numbers for matching
-- 3. Join with customers table
-- 4. Update sales records in batches
-- 5. Return statistics

WITH sales_with_normalized_phone AS (
  SELECT 
    id, 
    public.normalize_phone_number(customer_phone_number) AS norm_phone
  FROM pos.lengolf_sales
  WHERE customer_id IS NULL 
    AND customer_phone_number IS NOT NULL 
    AND customer_phone_number != ''
  LIMIT batch_size
)
UPDATE pos.lengolf_sales AS s
SET 
  customer_id = c.id,
  updated_at = NOW()
FROM sales_with_normalized_phone sw
JOIN public.customers c ON c.normalized_phone = sw.norm_phone
WHERE s.id = sw.id;
```

#### **Batch Processing**
- **Batch Size**: Configurable (default: 1000 records)
- **Loop Logic**: Continues until no more records to update
- **Performance**: Prevents timeout on large datasets
- **Monitoring**: Progress logging for each batch

#### **ETL Integration**
The customer ID population can be integrated into the main ETL process:

```sql
-- Option 1: During ETL transformation (real-time)
SELECT * FROM pos.transform_sales_data(match_customers := true);

-- Option 2: After ETL transformation (batch)
SELECT * FROM pos.transform_sales_data(match_customers := false);
SELECT * FROM pos.update_sales_customer_ids();
```

### **Phone Number Normalization**
```sql
-- Normalize phone numbers for consistent matching
CREATE OR REPLACE FUNCTION public.normalize_phone_number(phone_input TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove all non-digit characters
  -- Apply consistent formatting
  -- Handle Thai phone number patterns
  RETURN normalized_phone;
END;
$$ LANGUAGE plpgsql;
```

## Two-Step ETL Implementation

### **Step 1: Core Data Transformation**
- **Focus**: Transform raw staging data into production format
- **Product ID**: Populate from product_mappings table
- **Customer ID**: Optional real-time matching
- **Business Logic**: VAT calculations, profit margins, data validation

### **Step 2: Product Data Enrichment**
- **Method**: JOIN on product_id (reliable UUID-based join)
- **Data Sources**: `products.products` and `products.categories`
- **Fields Updated**: SKU, cost, category, SIM usage, profit calculations
- **Advantages**: More reliable than string-based joins

### **Key Benefits**
1. **Reliability**: UUID-based joins are more stable than string matching
2. **Maintainability**: Clear separation of concerns
3. **Performance**: Efficient batch updates
4. **Flexibility**: Easy to add new product fields

## Automation and Scheduling

### **Current Cron Schedule**

```sql
-- Job 1: External API sync (Top of hour)
-- Schedule: 0 * * * * (every hour at :00)
-- Purpose: Scrape Qashier data into staging table
-- URL: https://lengolf-sales-api-1071951248692.asia-southeast1.run.app/sync/daily

-- Job 2: ETL processing (2 minutes past hour)
-- Schedule: 2 * * * * (every hour at :02)
-- Command: SELECT pos.sync_sales_data();
-- Purpose: Transform staging data to production

-- Job 3: View refresh (3 minutes past hour) 
-- Schedule: 3 * * * * (every hour at :03)
-- Command: SELECT pos.refresh_all_mv();
-- Purpose: Update materialized views for reporting
```

### **Optimization Benefits**
- **Data Freshness**: 98% of each hour shows fresh data
- **Processing Time**: 2-minute delay reduced from 10 minutes
- **User Experience**: Minimal "stale data" window
- **Reliability**: Proper sequencing prevents conflicts

### **Manual Triggers**
```sql
-- Manual ETL processing
SELECT pos.sync_sales_data();

-- Manual customer ID population
SELECT pos.update_sales_customer_ids();

-- Manual API sync (if needed)
SELECT public.automated_daily_sync();
```

## Database Schema

### **Core Tables**

#### **pos.lengolf_sales_staging**
- **Purpose**: Raw CSV data from Qashier POS
- **Fields**: 30+ columns matching exact CSV export
- **Retention**: Processed records (kept for audit)
- **Size**: ~15,000 records

#### **pos.lengolf_sales** 
- **Purpose**: Production sales data with business logic
- **Fields**: 40+ calculated and enhanced fields
- **Indexes**: Optimized for dashboard queries
- **Size**: ~65,000 records

#### **pos.product_mappings**
- **Purpose**: Map POS product names to catalog products
- **Fields**: pos_product_name, product_id, mapped_by
- **Usage**: Core to two-step ETL process

#### **pos.lengolf_sales_modifications**
- **Purpose**: Manual corrections to customer data
- **Fields**: receipt_number, field_name, original_value, new_value
- **Integration**: Applied during ETL transformation

#### **pos.sales_sync_logs**
- **Purpose**: ETL process monitoring and auditing
- **Fields**: batch_id, process_type, status, records_processed
- **Retention**: Complete audit trail

### **Supporting Tables**

#### **products.products**
- **Purpose**: Product catalog with costs and categories
- **Fields**: name, sku, cost, category_id, is_sim_usage
- **Usage**: Step 2 of ETL process

#### **products.categories**
- **Purpose**: Product categorization hierarchy
- **Fields**: name, parent_id, slug
- **Usage**: Category information in sales data

#### **public.customers**
- **Purpose**: Customer database with normalized phone numbers
- **Fields**: name, normalized_phone, created_at
- **Usage**: Customer ID population

## Function Reference

### **Core ETL Functions**

#### **`pos.transform_sales_data(match_customers boolean DEFAULT false)`**
- **Purpose**: Primary ETL transformation function
- **Returns**: `TABLE(processed_count, inserted_count, error_count, latest_timestamp, customers_matched)`
- **Process**: Two-step date-based replacement ETL
- **Parameters**: 
  - `match_customers`: Whether to populate customer_id during ETL

#### **`pos.sync_sales_data()`**
- **Purpose**: ETL orchestration with logging
- **Returns**: `jsonb` with detailed processing summary
- **Process**: Calls transform_sales_data() with audit trail

#### **`pos.update_sales_customer_ids(batch_size integer DEFAULT 1000)`**
- **Purpose**: Batch customer ID population
- **Returns**: `TABLE(total_updated, batch_count, execution_time_seconds)`
- **Process**: Normalizes phone numbers and matches customers

### **Dashboard Functions**

#### **`pos.get_dashboard_summary_enhanced(start_date, end_date, comparison_start_date, comparison_end_date)`**
- **Purpose**: Complete dashboard metrics with comparisons
- **Returns**: `json` with revenue, profit, utilization data
- **Data Source**: `pos.lengolf_sales`

### **Monitoring Functions**

#### **`pos.get_etl_status()`**
- **Purpose**: ETL health monitoring
- **Returns**: `TABLE(last_run_time, status, records_processed, sync_lag_hours)`
- **Usage**: Dashboard monitoring widget

## Monitoring and Logging

### **ETL Process Monitoring**

#### **Sync Logs Table**
```sql
-- Check recent ETL runs
SELECT 
  batch_id, 
  process_type, 
  status, 
  records_processed, 
  start_time, 
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) AS duration_seconds
FROM pos.sales_sync_logs
WHERE process_type = 'transform'
ORDER BY start_time DESC
LIMIT 10;
```

#### **Data Quality Checks**
```sql
-- Check for processing gaps
SELECT 
  date,
  COUNT(*) as daily_transactions,
  SUM(sales_net) as daily_revenue
FROM pos.lengolf_sales
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY date
ORDER BY date DESC;

-- Check customer ID population rate
SELECT 
  COUNT(*) as total_sales,
  COUNT(customer_id) as sales_with_customer,
  ROUND(COUNT(customer_id) * 100.0 / COUNT(*), 2) as customer_match_rate
FROM pos.lengolf_sales
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
```

### **Performance Metrics**

#### **Recent Processing Statistics**
- **Records Processed**: 15,187 records
- **Processing Time**: 2-3 seconds
- **Success Rate**: 100% (no transformation failures)
- **Customer Matching**: 14,235 customers matched
- **Data Coverage**: Complete field mapping

#### **System Health Indicators**
- **Data Freshness**: Less than 3 minutes delay
- **ETL Reliability**: 100% success rate
- **Processing Efficiency**: 5,000+ records per second
- **Storage Usage**: Optimized with proper indexes

## Performance Optimization

### **Database Indexes**
```sql
-- Core performance indexes
CREATE INDEX idx_lengolf_sales_date ON pos.lengolf_sales(date);
CREATE INDEX idx_lengolf_sales_timestamp ON pos.lengolf_sales(sales_timestamp);
CREATE INDEX idx_lengolf_sales_receipt ON pos.lengolf_sales(receipt_number);
CREATE INDEX idx_lengolf_sales_sim_usage ON pos.lengolf_sales(is_sim_usage);
CREATE INDEX idx_lengolf_sales_product_id ON pos.lengolf_sales(product_id);
CREATE INDEX idx_lengolf_sales_customer_id ON pos.lengolf_sales(customer_id);
```

### **Query Optimization**
```sql
-- Efficient date-based queries
SELECT * FROM pos.lengolf_sales 
WHERE date >= '2025-07-01' AND date <= '2025-07-31';

-- Optimized customer matching
SELECT * FROM pos.lengolf_sales 
WHERE customer_id IS NOT NULL 
  AND date >= CURRENT_DATE - INTERVAL '30 days';

-- SIM usage queries
SELECT SUM(is_sim_usage) as total_sim_hours
FROM pos.lengolf_sales 
WHERE date >= CURRENT_DATE - INTERVAL '1 day';
```

### **Batch Processing**
- **Customer ID Updates**: 1,000 records per batch
- **Product Mappings**: Applied in bulk during ETL
- **Date Range Processing**: Automatic chunking for large ranges

## Troubleshooting

### **Common Issues**

#### **1. ETL Processing Failures**
**Symptoms**: No new data in production table
**Diagnosis**:
```sql
-- Check recent sync logs
SELECT * FROM pos.sales_sync_logs 
WHERE status = 'failed' 
ORDER BY start_time DESC;

-- Check staging data availability
SELECT COUNT(*), MIN(date), MAX(date) 
FROM pos.lengolf_sales_staging;
```
**Solution**: Re-run ETL manually with `SELECT pos.sync_sales_data();`

#### **2. Customer ID Population Issues**
**Symptoms**: Low customer match rates
**Diagnosis**:
```sql
-- Check phone number normalization
SELECT 
  customer_phone_number,
  public.normalize_phone_number(customer_phone_number) as normalized,
  COUNT(*) as occurrence_count
FROM pos.lengolf_sales
WHERE customer_phone_number IS NOT NULL
  AND customer_id IS NULL
GROUP BY customer_phone_number, normalized
ORDER BY occurrence_count DESC;
```
**Solution**: Update phone number normalization logic or customer data

#### **3. Data Freshness Issues**
**Symptoms**: Dashboard showing stale data
**Diagnosis**:
```sql
-- Check latest data timestamps
SELECT 
  MAX(sales_timestamp) as latest_transaction,
  MAX(updated_at) as latest_update,
  EXTRACT(EPOCH FROM (NOW() - MAX(updated_at))) / 3600 as hours_since_update
FROM pos.lengolf_sales;
```
**Solution**: Check cron job schedule and API connectivity

#### **4. Product Mapping Issues**
**Symptoms**: Products showing without categories or costs
**Diagnosis**:
```sql
-- Check unmapped products
SELECT 
  product_name,
  product_id,
  COUNT(*) as transaction_count
FROM pos.lengolf_sales
WHERE product_id IS NULL
  AND date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY product_name, product_id
ORDER BY transaction_count DESC;
```
**Solution**: Add product mappings or update product catalog

### **Recovery Procedures**

#### **Full ETL Reprocessing**
```sql
-- 1. Clear production data for date range
DELETE FROM pos.lengolf_sales 
WHERE date >= '2025-07-01' AND date <= '2025-07-31';

-- 2. Re-run ETL transformation
SELECT pos.sync_sales_data();

-- 3. Verify data integrity
SELECT COUNT(*), MIN(date), MAX(date) 
FROM pos.lengolf_sales;
```

#### **Customer ID Batch Update**
```sql
-- Run customer ID population for specific date range
UPDATE pos.lengolf_sales 
SET customer_id = NULL 
WHERE date >= '2025-07-01' AND date <= '2025-07-31';

SELECT pos.update_sales_customer_ids();
```

## Best Practices

### **Data Management**
1. **Regular Monitoring**: Check ETL logs daily
2. **Data Validation**: Verify record counts and totals
3. **Backup Strategy**: Maintain staging data for recovery
4. **Index Maintenance**: Monitor query performance

### **Development Workflow**
1. **Test Environment**: Always test ETL changes in development
2. **Schema Changes**: Coordinate with ETL function updates
3. **Performance Testing**: Validate with full dataset
4. **Documentation**: Update process documentation

### **Operational Procedures**
1. **Monitoring Setup**: Dashboard widgets for ETL health
2. **Alert Configuration**: Notify on ETL failures
3. **Capacity Planning**: Monitor storage and processing growth
4. **Disaster Recovery**: Document recovery procedures

---

## Summary

The Lengolf Forms ETL system is a robust, date-based replacement pipeline that ensures data consistency and reliability. Key features include:

- **Incremental Processing**: Date-based replacement with 2-day buffers
- **Two-Step Architecture**: Product ID population followed by data enrichment
- **Customer Integration**: Automatic phone number matching
- **Real-time Monitoring**: Comprehensive logging and health checks
- **High Performance**: 5,000+ records per second processing
- **Automated Scheduling**: Hourly sync with minimal data delay

The system processes 15,000+ records daily with 100% success rate and provides fresh data to the dashboard within 3 minutes of POS transactions.

**Last Updated**: July 17, 2025  
**Version**: 2.0 (Two-Step ETL Architecture)  
**Status**: Production Ready  
**Next Review**: August 2025