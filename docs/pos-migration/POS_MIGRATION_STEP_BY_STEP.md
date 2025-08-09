-- STEP 1: Create Separate POS Tables
-- Creates lengolf_sales_old_pos and lengolf_sales_new_pos tables

-- =============================================================================
-- STEP 1.1: CREATE lengolf_sales_old_pos (Legacy POS Data)
-- =============================================================================

DROP TABLE IF EXISTS pos.lengolf_sales_old_pos CASCADE;

-- Create table with same structure as original lengolf_sales
CREATE TABLE pos.lengolf_sales_old_pos (
    LIKE pos.lengolf_sales INCLUDING ALL
);

-- Add source tracking
ALTER TABLE pos.lengolf_sales_old_pos 
ADD COLUMN etl_source TEXT DEFAULT 'legacy_pos',
ADD COLUMN etl_batch_id TEXT,
ADD COLUMN etl_processed_at TIMESTAMPTZ DEFAULT now();

-- Copy existing historical data to old POS table
INSERT INTO pos.lengolf_sales_old_pos 
SELECT *, 'legacy_pos', NULL, now()
FROM pos.lengolf_sales;

-- Create indexes (copy from original table)
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_date ON pos.lengolf_sales_old_pos(date);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_customer_id ON pos.lengolf_sales_old_pos(customer_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_product_id ON pos.lengolf_sales_old_pos(product_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_receipt ON pos.lengolf_sales_old_pos(receipt_number);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_timestamp ON pos.lengolf_sales_old_pos(sales_timestamp);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_etl_batch ON pos.lengolf_sales_old_pos(etl_batch_id);

-- =============================================================================
-- STEP 1.2: CREATE lengolf_sales_new_pos (New POS Data)
-- =============================================================================

DROP TABLE IF EXISTS pos.lengolf_sales_new_pos CASCADE;

-- Create table with same structure as original lengolf_sales
CREATE TABLE pos.lengolf_sales_new_pos (
    LIKE pos.lengolf_sales INCLUDING ALL
);

-- Add source tracking and additional new POS fields
ALTER TABLE pos.lengolf_sales_new_pos 
ADD COLUMN etl_source TEXT DEFAULT 'new_pos',
ADD COLUMN etl_batch_id TEXT,
ADD COLUMN etl_processed_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN transaction_id uuid,  -- Reference to pos.transactions
ADD COLUMN transaction_item_id uuid,  -- Reference to pos.transaction_items
ADD COLUMN payment_method_details JSONB;  -- Full payment breakdown

-- Create indexes (same as old POS plus new fields)
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_date ON pos.lengolf_sales_new_pos(date);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_customer_id ON pos.lengolf_sales_new_pos(customer_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_product_id ON pos.lengolf_sales_new_pos(product_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_receipt ON pos.lengolf_sales_new_pos(receipt_number);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_timestamp ON pos.lengolf_sales_new_pos(sales_timestamp);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_etl_batch ON pos.lengolf_sales_new_pos(etl_batch_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_transaction_id ON pos.lengolf_sales_new_pos(transaction_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_transaction_item_id ON pos.lengolf_sales_new_pos(transaction_item_id);

-- =============================================================================
-- STEP 1.3: CREATE CONFIGURATION TABLE
-- =============================================================================

-- Table to manage cutoff date and migration settings
DROP TABLE IF EXISTS pos.migration_cutoff_config CASCADE;

CREATE TABLE pos.migration_cutoff_config (
    id SERIAL PRIMARY KEY,
    cutoff_date DATE NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_by TEXT DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure only one active configuration
    CONSTRAINT only_one_active_config EXCLUDE (active WITH =) WHERE (active = true)
);

-- Insert initial configuration (set to yesterday as requested)
INSERT INTO pos.migration_cutoff_config (cutoff_date, description, active, created_by)
VALUES (
    CURRENT_DATE - INTERVAL '1 day', 
    'Initial cutoff set to yesterday - switch to new POS from today',
    true,
    'initial_setup'
);

-- Function to get current active cutoff date
CREATE OR REPLACE FUNCTION pos.get_active_cutoff_date()
RETURNS DATE
LANGUAGE SQL STABLE
AS $$
    SELECT cutoff_date 
    FROM pos.migration_cutoff_config 
    WHERE active = true 
    LIMIT 1;
$$;

-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================

-- Check table creation
SELECT 
    'lengolf_sales_old_pos' as table_name,
    COUNT(*) as record_count,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM pos.lengolf_sales_old_pos

UNION ALL

SELECT 
    'lengolf_sales_new_pos' as table_name,
    COUNT(*) as record_count,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM pos.lengolf_sales_new_pos

UNION ALL

SELECT 
    'migration_cutoff_config' as table_name,
    COUNT(*) as record_count,
    MIN(cutoff_date::date) as earliest_date,
    MAX(cutoff_date::date) as latest_date
FROM pos.migration_cutoff_config;

-- Check current cutoff configuration
SELECT 
    'Current Migration Settings' as info,
    cutoff_date,
    description,
    created_at
FROM pos.migration_cutoff_config 
WHERE active = true;

-- Verify cutoff function
SELECT 'Active Cutoff Date' as info, pos.get_active_cutoff_date() as cutoff_date;