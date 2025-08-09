-- =============================================================================
-- POS SYSTEM MIGRATION: Step-by-Step Implementation
-- Separates legacy and new POS data with unified interface
-- Created: August 9, 2025
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE SEPARATE POS TABLES
-- =============================================================================

-- STEP 1.1: Create lengolf_sales_old_pos (Legacy POS Data)
DROP TABLE IF EXISTS pos.lengolf_sales_old_pos CASCADE;

CREATE TABLE pos.lengolf_sales_old_pos (
    LIKE pos.lengolf_sales INCLUDING ALL
);

-- Add source tracking
ALTER TABLE pos.lengolf_sales_old_pos 
ADD COLUMN etl_source TEXT DEFAULT 'legacy_pos',
ADD COLUMN etl_batch_id TEXT,
ADD COLUMN etl_processed_at TIMESTAMPTZ DEFAULT now();

-- STEP 1.2: Create lengolf_sales_new_pos (New POS Data)  
DROP TABLE IF EXISTS pos.lengolf_sales_new_pos CASCADE;

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

-- =============================================================================
-- STEP 2: CREATE CONFIGURATION TABLE
-- =============================================================================

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

-- =============================================================================
-- STEP 3: CREATE HELPER FUNCTIONS
-- =============================================================================

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

-- Function to update cutoff date
CREATE OR REPLACE FUNCTION pos.update_cutoff_date(
    new_cutoff_date DATE,
    update_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    -- Deactivate current configuration
    UPDATE pos.migration_cutoff_config SET active = false;
    
    -- Insert new configuration
    INSERT INTO pos.migration_cutoff_config (cutoff_date, description, active, created_by)
    VALUES (
        new_cutoff_date, 
        COALESCE(update_description, 'Cutoff date updated to ' || new_cutoff_date::text),
        true,
        'manual_update'
    );
    
    RETURN true;
END;
$$;

-- =============================================================================
-- STEP 4: CREATE INDEXES
-- =============================================================================

-- Indexes for lengolf_sales_old_pos
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_date ON pos.lengolf_sales_old_pos(date);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_customer_id ON pos.lengolf_sales_old_pos(customer_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_product_id ON pos.lengolf_sales_old_pos(product_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_receipt ON pos.lengolf_sales_old_pos(receipt_number);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_timestamp ON pos.lengolf_sales_old_pos(sales_timestamp);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_etl_batch ON pos.lengolf_sales_old_pos(etl_batch_id);

-- Indexes for lengolf_sales_new_pos
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_date ON pos.lengolf_sales_new_pos(date);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_customer_id ON pos.lengolf_sales_new_pos(customer_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_product_id ON pos.lengolf_sales_new_pos(product_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_receipt ON pos.lengolf_sales_new_pos(receipt_number);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_timestamp ON pos.lengolf_sales_new_pos(sales_timestamp);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_etl_batch ON pos.lengolf_sales_new_pos(etl_batch_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_transaction_id ON pos.lengolf_sales_new_pos(transaction_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_transaction_item_id ON pos.lengolf_sales_new_pos(transaction_item_id);

-- =============================================================================
-- STEP 5: POPULATE OLD POS DATA
-- =============================================================================

-- Copy existing historical data to old POS table
INSERT INTO pos.lengolf_sales_old_pos 
SELECT 
    -- All original columns
    id, date, receipt_number, invoice_number, invoice_payment_type, payment_method,
    order_type, staff_name, customer_name, customer_phone_number, is_voided, voided_reason,
    item_notes, product_name, product_category, product_tab, product_parent_category,
    is_sim_usage, sku_number, item_cnt, item_price_before_discount, item_discount,
    item_vat, item_price_excl_vat, item_price_incl_vat, item_price, item_cost,
    sales_total, sales_vat, sales_gross, sales_discount, sales_net, sales_cost,
    gross_profit, sales_timestamp, update_time, created_at, updated_at, customer_id, product_id,
    -- New tracking columns
    'legacy_pos' as etl_source,
    'initial_migration' as etl_batch_id,
    now() as etl_processed_at
FROM pos.lengolf_sales;

-- =============================================================================
-- STEP 6: CREATE NEW POS POPULATION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION pos.populate_new_pos_sales()
RETURNS TABLE(
    processed_count INTEGER,
    inserted_count INTEGER,
    error_count INTEGER,
    latest_timestamp TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
DECLARE
    batch_id TEXT := gen_random_uuid()::text;
    cutoff_date DATE;
    result_processed INTEGER := 0;
    result_inserted INTEGER := 0;
    result_errors INTEGER := 0;
    result_latest TIMESTAMPTZ;
BEGIN
    -- Get current cutoff date
    SELECT pos.get_active_cutoff_date() INTO cutoff_date;
    
    -- Payment summary CTE to avoid Cartesian products
    WITH transaction_payment_summary AS (
        SELECT 
            tp.transaction_id,
            
            -- Clean payment method display
            CASE 
                WHEN COUNT(DISTINCT tp.payment_method_id) = 1 THEN 
                    MAX(pm.display_name)
                ELSE 
                    'Split Payment (' || 
                    STRING_AGG(DISTINCT pm.display_name, ', ' ORDER BY pm.display_name) || 
                    ')'
            END as payment_method_display,
            
            -- Detailed JSON breakdown
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'method', pm.display_name,
                    'amount', tp.payment_amount,
                    'percentage', ROUND(
                        100.0 * tp.payment_amount / SUM(tp.payment_amount) OVER (PARTITION BY tp.transaction_id), 
                        1
                    ),
                    'sequence', tp.payment_sequence,
                    'reference', tp.payment_reference,
                    'status', tp.payment_status,
                    'processed_at', tp.processed_at
                )
                ORDER BY tp.payment_sequence
            ) as payment_details_json,
            
            SUM(tp.payment_amount) as total_payment_amount
            
        FROM pos.transaction_payments tp
        JOIN pos.payment_methods_enum pm ON tp.payment_method_id = pm.id
        WHERE tp.payment_status = 'completed'
        GROUP BY tp.transaction_id
    )
    
    INSERT INTO pos.lengolf_sales_new_pos (
        -- Core fields
        date, receipt_number, invoice_number, invoice_payment_type, payment_method,
        order_type, staff_name, customer_name, customer_phone_number,
        is_voided, voided_reason, item_notes,
        product_name, product_category, product_tab, product_parent_category, 
        is_sim_usage, sku_number,
        item_cnt, item_price_before_discount, item_discount, item_vat,
        item_price_excl_vat, item_price_incl_vat, item_price, item_cost,
        sales_total, sales_vat, sales_gross, sales_discount, sales_net, 
        sales_cost, gross_profit, sales_timestamp, update_time,
        customer_id, product_id,
        -- New POS tracking columns
        etl_source, etl_batch_id, etl_processed_at,
        transaction_id, transaction_item_id, payment_method_details
    )
    SELECT 
        -- Core transaction data
        (t.transaction_date AT TIME ZONE 'Asia/Bangkok')::date as date,
        t.receipt_number,
        t.tax_invoice_number as invoice_number,
        CASE WHEN t.tax_invoice_issued THEN 'Tax Invoice' ELSE 'Receipt' END as invoice_payment_type,
        COALESCE(tps.payment_method_display, 'Unknown') as payment_method,
        
        -- Transaction info
        'POS' as order_type,
        s.staff_name,
        c.customer_name,
        c.contact_number as customer_phone_number,
        
        -- Void handling
        ti.is_voided,
        ti.voided_by as voided_reason,
        ti.item_notes,
        
        -- Product information
        p.name as product_name,
        pc.name as product_category,
        pc.name as product_tab,
        pc.name as product_parent_category,
        CASE WHEN p.name ILIKE '%package%' THEN 1 ELSE 0 END as is_sim_usage,
        p.sku as sku_number,
        
        -- Line item details
        ti.item_cnt,
        ti.unit_price_incl_vat as item_price_before_discount,
        ti.line_discount as item_discount,
        ti.line_vat_amount as item_vat,
        ti.line_total_excl_vat as item_price_excl_vat,
        ti.line_total_incl_vat as item_price_incl_vat,
        ti.unit_price_incl_vat as item_price,
        COALESCE(p.cost_price, 0) as item_cost,
        
        -- Sales totals
        ti.line_total_incl_vat as sales_total,
        ti.line_vat_amount as sales_vat,
        ti.line_total_incl_vat as sales_gross,
        ti.line_discount as sales_discount,
        ti.line_total_excl_vat as sales_net,
        (COALESCE(p.cost_price, 0) * ti.item_cnt) as sales_cost,
        (ti.line_total_excl_vat - (COALESCE(p.cost_price, 0) * ti.item_cnt)) as gross_profit,
        
        -- Timestamps  
        t.transaction_date AT TIME ZONE 'Asia/Bangkok' as sales_timestamp,
        now() as update_time,
        
        -- Foreign keys
        ti.customer_id,
        ti.product_id,
        
        -- New POS tracking columns
        'new_pos' as etl_source,
        batch_id as etl_batch_id,
        now() as etl_processed_at,
        t.id as transaction_id,
        ti.id as transaction_item_id,
        tps.payment_details_json as payment_method_details

    FROM pos.transactions t

    -- Join line items (ONE-TO-MANY: transaction -> items)
    JOIN pos.transaction_items ti ON t.id = ti.transaction_id

    -- Join payment summary (ONE-TO-ONE: transaction -> payment_summary)
    LEFT JOIN transaction_payment_summary tps ON t.id = tps.transaction_id

    -- Product lookups
    LEFT JOIN products.products p ON ti.product_id = p.id
    LEFT JOIN products.categories pc ON p.category_id = pc.id
    LEFT JOIN public.customers c ON ti.customer_id = c.id
    LEFT JOIN backoffice.staff s ON ti.staff_id = s.id

    WHERE t.status = 'paid'
      AND ti.line_total_incl_vat > 0
      AND (t.transaction_date AT TIME ZONE 'Asia/Bangkok')::date > cutoff_date
      -- Only insert records not already processed
      AND NOT EXISTS (
          SELECT 1 FROM pos.lengolf_sales_new_pos nps 
          WHERE nps.transaction_id = t.id 
            AND nps.transaction_item_id = ti.id
      )

    ORDER BY t.transaction_date, t.receipt_number, ti.line_number;

    GET DIAGNOSTICS result_inserted = ROW_COUNT;
    
    -- Get latest timestamp
    SELECT MAX(sales_timestamp) INTO result_latest 
    FROM pos.lengolf_sales_new_pos 
    WHERE etl_batch_id = batch_id;
    
    result_processed := result_inserted;
    result_errors := 0;
    
    RETURN QUERY SELECT result_processed, result_inserted, result_errors, result_latest;
END;
$$;

-- =============================================================================
-- STEP 7: CREATE UNIFIED VIEW/TABLE
-- =============================================================================

-- Create materialized view combining both sources
DROP MATERIALIZED VIEW IF EXISTS pos.lengolf_sales_unified CASCADE;

CREATE MATERIALIZED VIEW pos.lengolf_sales_unified AS
WITH cutoff_config AS (
    SELECT pos.get_active_cutoff_date() as cutoff_date
)
-- Legacy POS data (≤ cutoff date)
SELECT 
    -- All original columns
    id, date, receipt_number, invoice_number, invoice_payment_type, payment_method,
    order_type, staff_name, customer_name, customer_phone_number, is_voided, voided_reason,
    item_notes, product_name, product_category, product_tab, product_parent_category,
    is_sim_usage, sku_number, item_cnt, item_price_before_discount, item_discount,
    item_vat, item_price_excl_vat, item_price_incl_vat, item_price, item_cost,
    sales_total, sales_vat, sales_gross, sales_discount, sales_net, sales_cost,
    gross_profit, sales_timestamp, update_time, created_at, updated_at, customer_id, product_id,
    -- Source tracking
    etl_source,
    etl_batch_id,
    etl_processed_at,
    -- New POS specific fields (NULL for legacy)
    NULL::uuid as transaction_id,
    NULL::uuid as transaction_item_id,
    NULL::jsonb as payment_method_details
FROM pos.lengolf_sales_old_pos ops
CROSS JOIN cutoff_config cc
WHERE ops.date <= cc.cutoff_date

UNION ALL

-- New POS data (> cutoff date)
SELECT 
    -- All original columns
    id, date, receipt_number, invoice_number, invoice_payment_type, payment_method,
    order_type, staff_name, customer_name, customer_phone_number, is_voided, voided_reason,
    item_notes, product_name, product_category, product_tab, product_parent_category,
    is_sim_usage, sku_number, item_cnt, item_price_before_discount, item_discount,
    item_vat, item_price_excl_vat, item_price_incl_vat, item_price, item_cost,
    sales_total, sales_vat, sales_gross, sales_discount, sales_net, sales_cost,
    gross_profit, sales_timestamp, update_time, created_at, updated_at, customer_id, product_id,
    -- Source tracking
    etl_source,
    etl_batch_id,
    etl_processed_at,
    -- New POS specific fields
    transaction_id,
    transaction_item_id,
    payment_method_details
FROM pos.lengolf_sales_new_pos nps
CROSS JOIN cutoff_config cc
WHERE nps.date > cc.cutoff_date;

-- Create indexes on materialized view
CREATE UNIQUE INDEX idx_lengolf_sales_unified_id ON pos.lengolf_sales_unified(id);
CREATE INDEX idx_lengolf_sales_unified_date ON pos.lengolf_sales_unified(date);
CREATE INDEX idx_lengolf_sales_unified_customer_id ON pos.lengolf_sales_unified(customer_id);
CREATE INDEX idx_lengolf_sales_unified_product_id ON pos.lengolf_sales_unified(product_id);
CREATE INDEX idx_lengolf_sales_unified_receipt ON pos.lengolf_sales_unified(receipt_number);
CREATE INDEX idx_lengolf_sales_unified_timestamp ON pos.lengolf_sales_unified(sales_timestamp);
CREATE INDEX idx_lengolf_sales_unified_etl_source ON pos.lengolf_sales_unified(etl_source);

-- Create refresh function
CREATE OR REPLACE FUNCTION pos.refresh_unified_sales()
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.lengolf_sales_unified;
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    -- Fallback to non-concurrent refresh
    REFRESH MATERIALIZED VIEW pos.lengolf_sales_unified;
    RETURN true;
END;
$$;

-- =============================================================================
-- STEP 8: CREATE COMPREHENSIVE ETL MANAGEMENT FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION pos.sync_all_sales_data()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    old_pos_result RECORD;
    new_pos_result RECORD;
    refresh_result BOOLEAN;
    batch_id TEXT := gen_random_uuid()::text;
    sync_start_time TIMESTAMPTZ := now();
    result_json jsonb;
BEGIN
    -- Log sync start
    INSERT INTO pos.sales_sync_logs (batch_id, process_type, status, start_time)
    VALUES (batch_id, 'unified_sync', 'started', sync_start_time);
    
    BEGIN
        -- STEP 1: Process legacy POS data (if any new staging data)
        -- This calls existing transform_sales_data function which populates lengolf_sales
        -- We then need to copy new records to lengolf_sales_old_pos
        
        -- Get records in original lengolf_sales that aren't in old_pos yet
        INSERT INTO pos.lengolf_sales_old_pos 
        SELECT 
            -- All original columns
            ls.id, ls.date, ls.receipt_number, ls.invoice_number, ls.invoice_payment_type, ls.payment_method,
            ls.order_type, ls.staff_name, ls.customer_name, ls.customer_phone_number, ls.is_voided, ls.voided_reason,
            ls.item_notes, ls.product_name, ls.product_category, ls.product_tab, ls.product_parent_category,
            ls.is_sim_usage, ls.sku_number, ls.item_cnt, ls.item_price_before_discount, ls.item_discount,
            ls.item_vat, ls.item_price_excl_vat, ls.item_price_incl_vat, ls.item_price, ls.item_cost,
            ls.sales_total, ls.sales_vat, ls.sales_gross, ls.sales_discount, ls.sales_net, ls.sales_cost,
            ls.gross_profit, ls.sales_timestamp, ls.update_time, ls.created_at, ls.updated_at, ls.customer_id, ls.product_id,
            -- New tracking columns
            'legacy_pos' as etl_source,
            batch_id as etl_batch_id,
            now() as etl_processed_at
        FROM pos.lengolf_sales ls
        WHERE NOT EXISTS (
            SELECT 1 FROM pos.lengolf_sales_old_pos ops 
            WHERE ops.receipt_number = ls.receipt_number 
              AND ops.product_name = ls.product_name
              AND ops.date = ls.date
        );
        
        GET DIAGNOSTICS old_pos_result.inserted_count = ROW_COUNT;
        old_pos_result.processed_count := old_pos_result.inserted_count;
        
        -- STEP 2: Process new POS data
        SELECT * INTO new_pos_result FROM pos.populate_new_pos_sales();
        
        -- STEP 3: Refresh unified view
        SELECT pos.refresh_unified_sales() INTO refresh_result;
        
        -- Log success
        UPDATE pos.sales_sync_logs 
        SET status = 'completed', 
            end_time = now(),
            records_processed = old_pos_result.processed_count + new_pos_result.processed_count,
            metadata = jsonb_build_object(
                'legacy_pos_inserted', old_pos_result.inserted_count,
                'new_pos_inserted', new_pos_result.inserted_count,
                'unified_view_refreshed', refresh_result,
                'latest_new_pos_timestamp', new_pos_result.latest_timestamp
            )
        WHERE batch_id = batch_id;
        
        -- Build success response
        result_json := jsonb_build_object(
            'success', true,
            'batch_id', batch_id,
            'timestamp', now(),
            'legacy_pos_processed', old_pos_result.processed_count,
            'legacy_pos_inserted', old_pos_result.inserted_count,
            'new_pos_processed', new_pos_result.processed_count,
            'new_pos_inserted', new_pos_result.inserted_count,
            'total_processed', old_pos_result.processed_count + new_pos_result.processed_count,
            'unified_view_refreshed', refresh_result,
            'active_cutoff_date', pos.get_active_cutoff_date()
        );
        
    EXCEPTION WHEN OTHERS THEN
        -- Log error
        UPDATE pos.sales_sync_logs 
        SET status = 'failed', 
            end_time = now(),
            error_message = SQLERRM
        WHERE batch_id = batch_id;
        
        -- Build error response
        result_json := jsonb_build_object(
            'success', false,
            'batch_id', batch_id,
            'timestamp', now(),
            'error', SQLERRM
        );
    END;
    
    RETURN result_json;
END;
$$;

-- =============================================================================
-- STEP 9: UPDATE EXISTING CRON JOBS
-- =============================================================================

-- NOTE: The existing cron jobs will be updated separately
-- Job ID 18 (hourly-sales-etl) calls pos.sync_sales_data() 
-- This should be updated to call pos.sync_all_sales_data()

-- =============================================================================
-- VALIDATION AND SUMMARY QUERIES
-- =============================================================================

-- Check table structures
SELECT 
    'Tables Created Successfully' as status,
    (SELECT COUNT(*) FROM pos.lengolf_sales_old_pos) as old_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales_new_pos) as new_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales_unified) as unified_records,
    pos.get_active_cutoff_date() as active_cutoff_date,
    now() as created_at;

-- Check cutoff transition in unified view
SELECT 
    date,
    etl_source,
    COUNT(*) as records,
    COUNT(DISTINCT receipt_number) as receipts,
    ROUND(SUM(sales_total), 2) as daily_total
FROM pos.lengolf_sales_unified
WHERE date BETWEEN pos.get_active_cutoff_date() - INTERVAL '2 days' 
                AND pos.get_active_cutoff_date() + INTERVAL '2 days'
GROUP BY date, etl_source
ORDER BY date, etl_source;

-- Summary statistics
SELECT 
    etl_source,
    COUNT(*) as record_count,
    COUNT(DISTINCT date) as unique_dates,
    MIN(date) as earliest_date,
    MAX(date) as latest_date,
    ROUND(SUM(sales_total), 2) as total_revenue
FROM pos.lengolf_sales_unified
GROUP BY etl_source
ORDER BY etl_source;