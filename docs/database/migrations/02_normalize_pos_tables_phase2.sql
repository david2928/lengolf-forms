-- Migration Phase 2: Data migration to populate proper foreign keys
-- This migration populates the missing foreign key relationships

-- Step 1: Populate staff_id from staff_pin in all tables
-- First, let's check and populate staff_id in table_sessions
UPDATE pos.table_sessions ts
SET staff_id = s.id
FROM backoffice.staff s
WHERE ts.staff_pin = s.pin
  AND ts.staff_id IS NULL
  AND s.is_active = true;

-- Populate staff_id in transactions
UPDATE pos.transactions t
SET staff_id = s.id
FROM backoffice.staff s
WHERE t.staff_pin = s.pin
  AND t.staff_id IS NULL
  AND s.is_active = true;

-- Populate staff_id in transaction_items
UPDATE pos.transaction_items ti
SET staff_id = s.id
FROM backoffice.staff s
WHERE ti.staff_pin = s.pin
  AND ti.staff_id IS NULL
  AND s.is_active = true;

-- Step 2: Migrate customer_id from UUID to BIGINT
-- First, attempt to match existing UUIDs to backoffice.customers
-- This requires mapping from public.customers (UUID) to backoffice.customers (BIGINT)

-- For transactions
UPDATE pos.transactions t
SET customer_id_new = bc.id
FROM public.customers c
JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
WHERE t.customer_id = c.id::UUID
  AND t.customer_id_new IS NULL;

-- Alternative: Use booking relationship to get customer_id
UPDATE pos.transactions t
SET customer_id_new = bc.id
FROM pos.table_sessions ts
JOIN bookings b ON ts.booking_id = b.id
JOIN public.customers c ON b.customer_id = c.id
JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
WHERE t.table_session_id = ts.id
  AND t.customer_id_new IS NULL;

-- For transaction_items
UPDATE pos.transaction_items ti
SET customer_id_new = bc.id
FROM public.customers c
JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
WHERE ti.customer_id = c.id::UUID
  AND ti.customer_id_new IS NULL;

-- Alternative: Use transaction relationship
UPDATE pos.transaction_items ti
SET customer_id_new = t.customer_id_new
FROM pos.transactions t
WHERE ti.transaction_id = t.transaction_id
  AND ti.customer_id_new IS NULL
  AND t.customer_id_new IS NOT NULL;

-- Step 3: Add missing columns to table_sessions for better tracking
ALTER TABLE pos.table_sessions 
    ADD COLUMN IF NOT EXISTS staff_id INTEGER,
    ADD COLUMN IF NOT EXISTS customer_id BIGINT;

-- Add foreign key constraints
ALTER TABLE pos.table_sessions
    ADD CONSTRAINT fk_table_sessions_staff 
    FOREIGN KEY (staff_id) 
    REFERENCES backoffice.staff(id) 
    ON DELETE SET NULL;

ALTER TABLE pos.table_sessions
    ADD CONSTRAINT fk_table_sessions_customer 
    FOREIGN KEY (customer_id) 
    REFERENCES backoffice.customers(id) 
    ON DELETE SET NULL;

-- Populate staff_id in table_sessions
UPDATE pos.table_sessions ts
SET staff_id = s.id
FROM backoffice.staff s
WHERE ts.staff_pin = s.pin
  AND ts.staff_id IS NULL;

-- Populate customer_id from bookings
UPDATE pos.table_sessions ts
SET customer_id = bc.id
FROM bookings b
JOIN public.customers c ON b.customer_id = c.id
JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
WHERE ts.booking_id = b.id
  AND ts.customer_id IS NULL;

-- Step 4: Add is_sim_usage to transaction_items based on product
UPDATE pos.transaction_items ti
SET is_sim_usage = p.is_sim_usage
FROM products.products p
WHERE ti.product_id = p.id
  AND p.is_sim_usage = true;

-- Step 5: Create indexes for new foreign keys
CREATE INDEX IF NOT EXISTS idx_table_sessions_staff_id ON pos.table_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_customer_id ON pos.table_sessions(customer_id);

-- Step 6: Add sku_number from products
UPDATE pos.transaction_items ti
SET sku_number = p.sku
FROM products.products p
WHERE ti.product_id = p.id
  AND ti.sku_number IS NULL;

-- Step 7: Create helper function to get customer_id from various sources
CREATE OR REPLACE FUNCTION pos.get_customer_id_for_transaction(
    p_booking_id UUID,
    p_customer_uuid UUID
) RETURNS BIGINT AS $$
DECLARE
    v_customer_id BIGINT;
BEGIN
    -- Try booking first
    IF p_booking_id IS NOT NULL THEN
        SELECT bc.id INTO v_customer_id
        FROM bookings b
        JOIN public.customers c ON b.customer_id = c.id
        JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
        WHERE b.id = p_booking_id
        LIMIT 1;
        
        IF v_customer_id IS NOT NULL THEN
            RETURN v_customer_id;
        END IF;
    END IF;
    
    -- Try direct UUID mapping
    IF p_customer_uuid IS NOT NULL THEN
        SELECT bc.id INTO v_customer_id
        FROM public.customers c
        JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
        WHERE c.id = p_customer_uuid
        LIMIT 1;
        
        IF v_customer_id IS NOT NULL THEN
            RETURN v_customer_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create statistics update for analytical views
-- Add unique constraint for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_summary_unique 
ON pos.daily_sales_summary(sale_date, staff_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_sales_analytics_unique 
ON pos.product_sales_analytics(product_id, sales_month);

-- Step 9: Verify data migration
DO $$
DECLARE
    v_missing_staff_transactions INTEGER;
    v_missing_customer_transactions INTEGER;
    v_unmapped_customers INTEGER;
BEGIN
    -- Check transactions without staff_id
    SELECT COUNT(*) INTO v_missing_staff_transactions
    FROM pos.transactions
    WHERE staff_pin IS NOT NULL 
      AND staff_id IS NULL;
    
    -- Check transactions without proper customer_id
    SELECT COUNT(*) INTO v_missing_customer_transactions
    FROM pos.transactions
    WHERE customer_id IS NOT NULL 
      AND customer_id_new IS NULL;
    
    -- Check unmapped customer UUIDs
    SELECT COUNT(DISTINCT t.customer_id) INTO v_unmapped_customers
    FROM pos.transactions t
    WHERE t.customer_id IS NOT NULL 
      AND t.customer_id_new IS NULL;
    
    RAISE NOTICE 'Migration Status:';
    RAISE NOTICE '- Transactions missing staff_id: %', v_missing_staff_transactions;
    RAISE NOTICE '- Transactions missing customer_id mapping: %', v_missing_customer_transactions;
    RAISE NOTICE '- Unique unmapped customer UUIDs: %', v_unmapped_customers;
    
    IF v_missing_staff_transactions > 0 THEN
        RAISE WARNING 'Some transactions have staff_pin but no matching staff_id. Check inactive staff or invalid PINs.';
    END IF;
    
    IF v_unmapped_customers > 0 THEN
        RAISE WARNING 'Some customer UUIDs could not be mapped to backoffice.customers. Manual review required.';
    END IF;
END $$;

-- Comments
COMMENT ON COLUMN pos.table_sessions.staff_id IS 'Foreign key to backoffice.staff - who opened the session';
COMMENT ON COLUMN pos.table_sessions.customer_id IS 'Foreign key to backoffice.customers - primary customer for the session';
COMMENT ON FUNCTION pos.get_customer_id_for_transaction IS 'Helper function to resolve customer_id from various sources';