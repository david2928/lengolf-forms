# Investigation Report: Missing Products in Inventory Dashboard

## Problem Summary
Two specific products are not appearing in the Inventory Dashboard:
1. `ec41303c-2082-4b8b-bba5-d18539c00926`
2. `a37683c7-4eb7-4f86-9cd4-31d77265d8d7`

## Root Cause Analysis

Based on the analysis of the `get_inventory_overview_with_reorder_status()` database function in `/scripts/create-admin-inventory-functions-simple.sql`, the most likely causes are:

### Critical Filter Conditions (Line 67):
```sql
WHERE p.is_active = true
```

### Critical JOIN Conditions (Line 48):
```sql
FROM inventory_products p
JOIN inventory_categories c ON p.category_id = c.id
LEFT JOIN latest_inventory li ON p.id = li.product_id
```

## Potential Issues (In Order of Likelihood)

### 1. **Products are Inactive** (Most Common)
- Products exist but have `is_active = false`
- Function explicitly filters: `WHERE p.is_active = true`

### 2. **Category Issues**
- Invalid `category_id` pointing to non-existent category
- Category exists but is inactive (`category.is_active = false`)
- NULL `category_id` causing JOIN to fail

### 3. **Products Don't Exist**
- Products missing from `inventory_products` table entirely

### 4. **Database Function Issues**
- Function not deployed or has errors
- Permissions issues preventing function execution

## Investigation Steps

Run these SQL queries in your Supabase SQL Editor to identify the exact issue:

### Query 1: Check Product Existence and Status
```sql
SELECT 
  'Products in inventory_products table:' as check_type,
  id,
  name,
  is_active,
  category_id,
  reorder_threshold,
  unit_cost,
  supplier,
  created_at
FROM inventory_products 
WHERE id IN ('ec41303c-2082-4b8b-bba5-d18539c00926', 'a37683c7-4eb7-4f86-9cd4-31d77265d8d7')
ORDER BY name;
```

### Query 2: Check Category Relationships
```sql
SELECT 
  'Categories for products:' as check_type,
  p.id as product_id,
  p.name as product_name,
  p.category_id,
  c.id as category_exists,
  c.name as category_name,
  c.is_active as category_active
FROM inventory_products p
LEFT JOIN inventory_categories c ON p.category_id = c.id
WHERE p.id IN ('ec41303c-2082-4b8b-bba5-d18539c00926', 'a37683c7-4eb7-4f86-9cd4-31d77265d8d7')
ORDER BY p.name;
```

### Query 3: Test Database Function
```sql
SELECT 
  'Function result test:' as check_type,
  product_id,
  product_name,
  current_stock,
  reorder_threshold,
  reorder_status,
  last_submission_date
FROM get_inventory_overview_with_reorder_status()
WHERE product_id IN ('ec41303c-2082-4b8b-bba5-d18539c00926', 'a37683c7-4eb7-4f86-9cd4-31d77265d8d7');
```

## Fix Plan

### Phase 1: Immediate Fixes (Based on Investigation Results)

#### Fix 1A: If Products are Inactive
```sql
-- Activate the products
UPDATE inventory_products 
SET is_active = true 
WHERE id IN ('ec41303c-2082-4b8b-bba5-d18539c00926', 'a37683c7-4eb7-4f86-9cd4-31d77265d8d7')
AND is_active = false;
```

#### Fix 1B: If Categories are Inactive
```sql
-- Activate the categories
UPDATE inventory_categories 
SET is_active = true 
WHERE id IN (
  SELECT DISTINCT category_id 
  FROM inventory_products 
  WHERE id IN ('ec41303c-2082-4b8b-bba5-d18539c00926', 'a37683c7-4eb7-4f86-9cd4-31d77265d8d7')
  AND category_id IS NOT NULL
);
```

#### Fix 1C: If category_id is NULL
```sql
-- Assign a valid category (choose appropriate category)
UPDATE inventory_products 
SET category_id = (
  SELECT id FROM inventory_categories 
  WHERE is_active = true 
  ORDER BY name 
  LIMIT 1
)
WHERE id IN ('ec41303c-2082-4b8b-bba5-d18539c00926', 'a37683c7-4eb7-4f86-9cd4-31d77265d8d7')
AND category_id IS NULL;
```

#### Fix 1D: If Products Don't Exist
```sql
-- You'll need to create the products with appropriate details
-- Example template (adjust values as needed):
INSERT INTO inventory_products (
  id, 
  name, 
  category_id, 
  is_active, 
  reorder_threshold, 
  unit_cost,
  supplier,
  unit,
  input_type
) VALUES 
(
  'ec41303c-2082-4b8b-bba5-d18539c00926',
  'Product Name 1',
  (SELECT id FROM inventory_categories WHERE is_active = true LIMIT 1),
  true,
  10,
  0.00,
  '',
  'pieces',
  'number'
),
(
  'a37683c7-4eb7-4f86-9cd4-31d77265d8d7',
  'Product Name 2', 
  (SELECT id FROM inventory_categories WHERE is_active = true LIMIT 1),
  true,
  10,
  0.00,
  '',
  'pieces',
  'number'
);
```

### Phase 2: Verification

After applying fixes, verify with:

```sql
-- Check if products now appear in function results
SELECT 
  product_id,
  product_name,
  current_stock,
  reorder_threshold,
  reorder_status,
  last_submission_date
FROM get_inventory_overview_with_reorder_status()
WHERE product_id IN ('ec41303c-2082-4b8b-bba5-d18539c00926', 'a37683c7-4eb7-4f86-9cd4-31d77265d8d7');
```

### Phase 3: Test Dashboard

1. Navigate to `/admin/inventory` in the application
2. Verify the products now appear in the dashboard
3. Check they appear in the correct status category (Needs Reorder, Low Stock, or Sufficient Stock)

## Prevention Strategy

### 1. Add Data Validation
Create a database constraint or trigger to prevent `is_active` from being accidentally set to false for products that should remain active.

### 2. Monitoring Script
Create a monitoring script that regularly checks for:
- Products with `is_active = false` that have recent submissions
- Products with NULL or invalid `category_id`
- Orphaned products not appearing in dashboard

### 3. Admin Interface Enhancement
Add a "Show Inactive Products" toggle to the dashboard for debugging purposes.

## Testing the Fix

### Automated Test Script
```sql
-- Test script to verify fix
DO $$
DECLARE
  missing_count INTEGER;
BEGIN
  -- Check if our missing products now appear in function results
  SELECT COUNT(*) INTO missing_count
  FROM get_inventory_overview_with_reorder_status()
  WHERE product_id IN ('ec41303c-2082-4b8b-bba5-d18539c00926', 'a37683c7-4eb7-4f86-9cd4-31d77265d8d7');
  
  IF missing_count = 2 THEN
    RAISE NOTICE '✅ SUCCESS: Both products now appear in dashboard function';
  ELSIF missing_count = 1 THEN
    RAISE NOTICE '⚠️  PARTIAL: Only 1 product appears in dashboard function';
  ELSE
    RAISE NOTICE '❌ FAILURE: Products still missing from dashboard function';
  END IF;
END $$;
```

## Expected Outcome

After implementing the appropriate fix based on investigation results:
1. Products will appear in the Inventory Dashboard
2. Products will be categorized correctly (Needs Reorder, Low Stock, or Sufficient Stock)
3. Products will be searchable and filterable in the dashboard
4. No negative impact on other dashboard functionality

## Notes

- Always backup your database before running UPDATE statements
- Test fixes in a development environment first if possible
- The specific fix needed depends on the investigation results
- If products don't exist, you'll need product details (name, category, etc.) to create them

---

**Investigation Date:** January 2025  
**Status:** Investigation Complete - Awaiting Investigation Results to Apply Appropriate Fix 