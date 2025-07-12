-- Script to merge duplicate customers by contact_number
-- Generated: 2025-07-12
-- 
-- This script will:
-- 1. Create a backup of affected data
-- 2. Update all references to use the primary customer (oldest created)
-- 3. Delete duplicate customer records
-- 4. Add unique constraint on contact_number

BEGIN;

-- Step 1: Create backup tables
CREATE TABLE IF NOT EXISTS public.customers_backup_20250712 AS 
SELECT * FROM public.customers;

CREATE TABLE IF NOT EXISTS pos.lengolf_sales_backup_20250712 AS 
SELECT * FROM pos.lengolf_sales WHERE customer_id IS NOT NULL;

-- Step 2: Create temporary table with merge mapping
CREATE TEMP TABLE customer_merge_map AS
WITH ranked_customers AS (
    SELECT 
        id,
        contact_number,
        customer_name,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY contact_number ORDER BY created_at, id) as rn
    FROM public.customers
    WHERE contact_number IS NOT NULL 
      AND contact_number != ''
)
SELECT 
    d.id as duplicate_id,
    p.id as primary_id,
    d.contact_number,
    d.customer_name as duplicate_name,
    p.customer_name as primary_name
FROM ranked_customers d
JOIN ranked_customers p ON d.contact_number = p.contact_number AND p.rn = 1
WHERE d.rn > 1;

-- Show what will be merged
SELECT 
    contact_number,
    COUNT(*) as duplicates_to_merge,
    STRING_AGG(duplicate_name || ' -> ' || primary_name, ', ') as merge_actions
FROM customer_merge_map
GROUP BY contact_number
ORDER BY COUNT(*) DESC;

-- Step 3: Update all references in pos.lengolf_sales
UPDATE pos.lengolf_sales s
SET customer_id = m.primary_id
FROM customer_merge_map m
WHERE s.customer_id = m.duplicate_id;

-- Step 4: Update all references in public.bookings (if exists)
UPDATE public.bookings b
SET customer_id = m.primary_id
FROM customer_merge_map m
WHERE b.customer_id = m.duplicate_id;

-- Step 5: Update all references in public.packages (if exists)
UPDATE public.packages p
SET customer_id = m.primary_id
FROM customer_merge_map m
WHERE p.customer_id = m.duplicate_id;

-- Step 6: Merge customer data (combine lifetime values, visits, etc.)
WITH customer_aggregates AS (
    SELECT 
        m.primary_id,
        SUM(c.total_lifetime_value) as combined_lifetime_value,
        SUM(c.total_visits) as combined_visits,
        MAX(c.last_visit_date) as latest_visit
    FROM customer_merge_map m
    JOIN public.customers c ON c.id IN (m.duplicate_id, m.primary_id)
    GROUP BY m.primary_id
)
UPDATE public.customers c
SET 
    total_lifetime_value = COALESCE(ca.combined_lifetime_value, c.total_lifetime_value),
    total_visits = COALESCE(ca.combined_visits, c.total_visits),
    last_visit_date = COALESCE(ca.latest_visit, c.last_visit_date)
FROM customer_aggregates ca
WHERE c.id = ca.primary_id;

-- Step 7: Delete duplicate customers
DELETE FROM public.customers
WHERE id IN (SELECT duplicate_id FROM customer_merge_map);

-- Step 8: Verify no duplicates remain
SELECT 
    contact_number,
    COUNT(*) as count
FROM public.customers
WHERE contact_number IS NOT NULL AND contact_number != ''
GROUP BY contact_number
HAVING COUNT(*) > 1;

-- Step 9: Add unique constraint on contact_number
-- First, handle any remaining NULL or empty contact numbers
UPDATE public.customers 
SET contact_number = NULL 
WHERE contact_number = '';

-- Add the unique constraint (allows NULL values)
ALTER TABLE public.customers 
ADD CONSTRAINT customers_contact_number_unique 
UNIQUE (contact_number);

-- Step 10: Final verification
SELECT 
    'Merge completed' as status,
    (SELECT COUNT(*) FROM customer_merge_map) as customers_merged,
    (SELECT COUNT(*) FROM public.customers) as total_customers_remaining,
    (SELECT COUNT(DISTINCT contact_number) FROM public.customers WHERE contact_number IS NOT NULL) as unique_contact_numbers;

-- COMMIT or ROLLBACK based on results
-- COMMIT;  -- Uncomment to apply changes
-- ROLLBACK;  -- Uncomment to cancel all changes