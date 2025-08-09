-- =============================================================================
-- POS DIRECT UNIFICATION STRATEGY
-- Make lengolf_sales the unified table containing both old and new POS data
-- No views, no downstream changes - lengolf_sales becomes the single source
-- Created: August 9, 2025
-- =============================================================================

-- =============================================================================
-- STEP 1: CREATE SEPARATE SOURCE TABLES (For ETL Management)
-- =============================================================================

-- Create old POS staging table (receives legacy ETL data)
DROP TABLE IF EXISTS pos.lengolf_sales_old_pos_staging CASCADE;

CREATE TABLE pos.lengolf_sales_old_pos_staging (
    LIKE pos.lengolf_sales INCLUDING ALL
);

-- Add ETL tracking
ALTER TABLE pos.lengolf_sales_old_pos_staging 
ADD COLUMN etl_source TEXT DEFAULT 'legacy_pos',
ADD COLUMN etl_batch_id TEXT,
ADD COLUMN etl_processed_at TIMESTAMPTZ DEFAULT now();

-- Create new POS staging table (receives new POS data)
DROP TABLE IF EXISTS pos.lengolf_sales_new_pos_staging CASCADE;

CREATE TABLE pos.lengolf_sales_new_pos_staging (
    LIKE pos.lengolf_sales INCLUDING ALL
);

-- Add ETL tracking and new POS references
ALTER TABLE pos.lengolf_sales_new_pos_staging 
ADD COLUMN etl_source TEXT DEFAULT 'new_pos',
ADD COLUMN etl_batch_id TEXT,
ADD COLUMN etl_processed_at TIMESTAMPTZ DEFAULT now(),
ADD COLUMN transaction_id uuid,
ADD COLUMN transaction_item_id uuid,
ADD COLUMN payment_method_details JSONB;

-- =============================================================================
-- STEP 2: ENHANCE MAIN lengolf_sales TABLE
-- =============================================================================

-- Add source tracking to main lengolf_sales table
ALTER TABLE pos.lengolf_sales 
ADD COLUMN IF NOT EXISTS etl_source TEXT,
ADD COLUMN IF NOT EXISTS etl_batch_id TEXT,
ADD COLUMN IF NOT EXISTS etl_processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transaction_id uuid,
ADD COLUMN IF NOT EXISTS transaction_item_id uuid,
ADD COLUMN IF NOT EXISTS payment_method_details JSONB;

-- Set default values for existing data
UPDATE pos.lengolf_sales 
SET etl_source = 'legacy_pos',
    etl_processed_at = COALESCE(updated_at, created_at, now())
WHERE etl_source IS NULL;

-- =============================================================================
-- STEP 3: CREATE CUTOFF CONFIGURATION
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

-- Insert initial configuration (yesterday as cutoff)
INSERT INTO pos.migration_cutoff_config (cutoff_date, description, active, created_by)
VALUES (
    CURRENT_DATE - INTERVAL '1 day', 
    'Initial cutoff - legacy POS until yesterday, new POS from today',
    true,
    'initial_setup'
);

-- Helper function to get active cutoff date
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
-- STEP 4: CREATE LEGACY POS ETL (Modified from existing)
-- =============================================================================

-- Modified version of existing transform_sales_data that populates staging first
CREATE OR REPLACE FUNCTION pos.populate_old_pos_staging()
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
    result_processed INTEGER := 0;
    result_inserted INTEGER := 0;
    result_errors INTEGER := 0;
    result_latest TIMESTAMPTZ;
    min_date DATE;
    max_date DATE;
BEGIN
    -- Get date range from staging data
    SELECT 
        MIN(CASE 
            WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
            THEN staging.date::DATE
            WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
            THEN TO_DATE(SUBSTRING(staging.date FROM 1 FOR 10), 'DD/MM/YYYY')
            ELSE NULL 
        END),
        MAX(CASE 
            WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
            THEN staging.date::DATE
            WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
            THEN TO_DATE(SUBSTRING(staging.date FROM 1 FOR 10), 'DD/MM/YYYY')
            ELSE NULL 
        END)
    INTO min_date, max_date
    FROM pos.lengolf_sales_staging staging
    WHERE staging.date IS NOT NULL
      AND staging.receipt_number IS NOT NULL
      AND staging.receipt_number != '';

    -- Clear existing staging data in date range
    IF min_date IS NOT NULL AND max_date IS NOT NULL THEN
        DELETE FROM pos.lengolf_sales_old_pos_staging 
        WHERE date >= min_date AND date <= max_date;
    END IF;

    -- Transform and insert into OLD POS STAGING (using existing logic)
    WITH sales_transformation AS (
        SELECT
            -- All the existing transformation logic from pos.transform_sales_data()
            -- [Abbreviated for readability - use exact logic from existing function]
            CASE 
                WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
                THEN staging.date::DATE
                WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
                THEN TO_DATE(SUBSTRING(staging.date FROM 1 FOR 10), 'DD/MM/YYYY')
                ELSE NULL 
            END AS date,
            staging.receipt_number,
            staging.invoice_no AS invoice_number,
            staging.invoice_payment_type,
            staging.transaction_payment_method AS payment_method,
            staging.order_type,
            staging.staff_name,
            TRIM(REGEXP_REPLACE(
                COALESCE(mods.customer_name_mod, staging.customer_name), 
                '\\s+', ' ', 'g'
            )) AS customer_name,
            COALESCE(mods.customer_phone_number_mod, staging.customer_phone_number) AS customer_phone_number,
            NULL::uuid AS customer_id, -- Will be populated later
            CASE WHEN LOWER(TRIM(staging.voided)) = 'true' THEN TRUE ELSE FALSE END AS is_voided,
            staging.void_reason AS voided_reason,
            staging.transaction_item_notes AS item_notes,
            staging.transaction_item AS product_name,
            COALESCE(
                mappings.product_id,
                (SELECT id FROM products.products WHERE TRIM(legacy_pos_name) = TRIM(staging.transaction_item) LIMIT 1)
            ) AS product_id,
            staging.sku_number,
            COALESCE(staging.transaction_item_quantity::INTEGER, 1) AS item_cnt,
            staging.amount_before_subsidy::NUMERIC AS item_price_before_discount,
            staging.transaction_item_final_amount::NUMERIC AS item_price,
            -- Additional calculations...
            CASE 
                WHEN staging.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
                THEN (staging.date::TIMESTAMP AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
                WHEN staging.date ~ '^[0-9]{2}/[0-9]{2}/[0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2}$' 
                THEN (TO_TIMESTAMP(staging.date, 'DD/MM/YYYY HH24:MI:SS') AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Bangkok'
                ELSE NULL 
            END AS sales_timestamp,
            NOW() AS created_at_bkk
        FROM pos.lengolf_sales_staging staging
        LEFT JOIN (
            SELECT
                receipt_number,
                MAX(CASE WHEN field_name = 'customer_name' THEN new_value ELSE NULL END) AS customer_name_mod,
                MAX(CASE WHEN field_name = 'customer_phone_number' THEN new_value ELSE NULL END) AS customer_phone_number_mod
            FROM pos.lengolf_sales_modifications
            GROUP BY receipt_number
        ) AS mods ON staging.receipt_number = mods.receipt_number
        LEFT JOIN pos.product_mappings mappings ON TRIM(staging.transaction_item) = TRIM(mappings.pos_product_name)
        WHERE staging.date IS NOT NULL
          AND staging.receipt_number IS NOT NULL
          AND staging.receipt_number != ''
    ),
    
    final_calculations AS (
        SELECT *,
            -- Sales calculations
            COALESCE(item_price * item_cnt, 0) AS sales_total,
            COALESCE(item_price * item_cnt * 0.07, 0) AS sales_vat,  -- Simplified VAT calc
            COALESCE(item_price * item_cnt, 0) AS sales_gross,
            0 AS sales_discount,  -- Simplified
            COALESCE(item_price * item_cnt, 0) AS sales_net
        FROM sales_transformation
    )
    
    INSERT INTO pos.lengolf_sales_old_pos_staging (
        -- Core fields
        date, receipt_number, invoice_number, invoice_payment_type, payment_method,
        order_type, staff_name, customer_name, customer_phone_number, customer_id,
        is_voided, voided_reason, item_notes, product_name, product_id, sku_number,
        item_cnt, item_price_before_discount, item_price, sales_total, sales_vat,
        sales_gross, sales_discount, sales_net, sales_timestamp, created_at, updated_at,
        -- ETL tracking
        etl_source, etl_batch_id, etl_processed_at
    )
    SELECT 
        date, receipt_number, invoice_number, invoice_payment_type, payment_method,
        order_type, staff_name, customer_name, customer_phone_number, customer_id,
        is_voided, voided_reason, item_notes, product_name, product_id, sku_number,
        item_cnt, item_price_before_discount, item_price, sales_total, sales_vat,
        sales_gross, sales_discount, sales_net, sales_timestamp, created_at_bkk, created_at_bkk,
        -- ETL tracking
        'legacy_pos', batch_id, now()
    FROM final_calculations
    WHERE date IS NOT NULL AND sales_timestamp IS NOT NULL;

    GET DIAGNOSTICS result_inserted = ROW_COUNT;
    
    -- Update product info and customer matching (existing logic)
    UPDATE pos.lengolf_sales_old_pos_staging 
    SET 
        sku_number = COALESCE(p.sku, pos.lengolf_sales_old_pos_staging.sku_number),
        item_cost = p.cost,
        product_category = cat.name,
        product_tab = cat.name,
        product_parent_category = parent_cat.name,
        is_sim_usage = CASE WHEN COALESCE(p.is_sim_usage, FALSE) THEN 1 ELSE 0 END,
        sales_cost = CASE WHEN p.cost IS NOT NULL THEN p.cost * pos.lengolf_sales_old_pos_staging.item_cnt ELSE NULL END,
        gross_profit = CASE 
            WHEN p.cost IS NOT NULL 
            THEN pos.lengolf_sales_old_pos_staging.sales_net - (p.cost * pos.lengolf_sales_old_pos_staging.item_cnt)
            ELSE NULL
        END,
        updated_at = now()
    FROM products.products p
    LEFT JOIN products.categories cat ON p.category_id = cat.id
    LEFT JOIN products.categories parent_cat ON cat.parent_id = parent_cat.id
    WHERE pos.lengolf_sales_old_pos_staging.product_id = p.id
      AND pos.lengolf_sales_old_pos_staging.etl_batch_id = batch_id;
    
    SELECT MAX(sales_timestamp) INTO result_latest 
    FROM pos.lengolf_sales_old_pos_staging 
    WHERE etl_batch_id = batch_id;
    
    result_processed := result_inserted;
    result_errors := 0;
    
    RETURN QUERY SELECT result_processed, result_inserted, result_errors, result_latest;
END;
$$;

-- =============================================================================
-- STEP 5: CREATE NEW POS ETL
-- =============================================================================

CREATE OR REPLACE FUNCTION pos.populate_new_pos_staging()
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
    
    -- Clear staging for dates after cutoff
    DELETE FROM pos.lengolf_sales_new_pos_staging 
    WHERE date > cutoff_date;
    
    -- Payment summary CTE (avoiding Cartesian products)
    WITH transaction_payment_summary AS (
        SELECT 
            tp.transaction_id,
            CASE 
                WHEN COUNT(DISTINCT tp.payment_method_id) = 1 THEN 
                    MAX(pm.display_name)
                ELSE 
                    'Split Payment (' || 
                    STRING_AGG(DISTINCT pm.display_name, ', ' ORDER BY pm.display_name) || 
                    ')'
            END as payment_method_display,
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
            ) as payment_details_json
        FROM pos.transaction_payments tp
        JOIN pos.payment_methods_enum pm ON tp.payment_method_id = pm.id
        WHERE tp.payment_status = 'completed'
        GROUP BY tp.transaction_id
    )
    
    INSERT INTO pos.lengolf_sales_new_pos_staging (
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
        -- ETL tracking
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
        
        -- ETL tracking
        'new_pos' as etl_source,
        batch_id as etl_batch_id,
        now() as etl_processed_at,
        t.id as transaction_id,
        ti.id as transaction_item_id,
        tps.payment_details_json as payment_method_details

    FROM pos.transactions t

    JOIN pos.transaction_items ti ON t.id = ti.transaction_id
    LEFT JOIN transaction_payment_summary tps ON t.id = tps.transaction_id
    LEFT JOIN products.products p ON ti.product_id = p.id
    LEFT JOIN products.categories pc ON p.category_id = pc.id
    LEFT JOIN public.customers c ON ti.customer_id = c.id
    LEFT JOIN backoffice.staff s ON ti.staff_id = s.id

    WHERE t.status = 'paid'
      AND ti.line_total_incl_vat > 0
      AND (t.transaction_date AT TIME ZONE 'Asia/Bangkok')::date > cutoff_date
      -- Only new transactions not already processed
      AND NOT EXISTS (
          SELECT 1 FROM pos.lengolf_sales_new_pos_staging nps 
          WHERE nps.transaction_id = t.id 
            AND nps.transaction_item_id = ti.id
      )

    ORDER BY t.transaction_date, t.receipt_number, ti.line_number;

    GET DIAGNOSTICS result_inserted = ROW_COUNT;
    
    SELECT MAX(sales_timestamp) INTO result_latest 
    FROM pos.lengolf_sales_new_pos_staging 
    WHERE etl_batch_id = batch_id;
    
    result_processed := result_inserted;
    result_errors := 0;
    
    RETURN QUERY SELECT result_processed, result_inserted, result_errors, result_latest;
END;
$$;

-- =============================================================================
-- STEP 6: CREATE UNIFIED ETL (Main Function)
-- =============================================================================

CREATE OR REPLACE FUNCTION pos.sync_unified_sales()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
    old_result RECORD;
    new_result RECORD;
    batch_id TEXT := gen_random_uuid()::text;
    sync_start_time TIMESTAMPTZ := now();
    cutoff_date DATE;
    result_json jsonb;
BEGIN
    cutoff_date := pos.get_active_cutoff_date();
    
    -- Log sync start
    INSERT INTO pos.sales_sync_logs (batch_id, process_type, status, start_time)
    VALUES (batch_id, 'unified_sync', 'started', sync_start_time);
    
    BEGIN
        -- STEP 1: Process old POS data into staging
        SELECT * INTO old_result FROM pos.populate_old_pos_staging();
        
        -- STEP 2: Process new POS data into staging  
        SELECT * INTO new_result FROM pos.populate_new_pos_staging();
        
        -- STEP 3: Clear existing data in lengolf_sales for the processed date range
        DELETE FROM pos.lengolf_sales 
        WHERE (etl_source = 'legacy_pos' AND date <= cutoff_date)
           OR (etl_source = 'new_pos' AND date > cutoff_date)
           OR etl_source IS NULL; -- Clean up old data without source tracking
        
        -- STEP 4: Insert old POS data (≤ cutoff date)
        INSERT INTO pos.lengolf_sales 
        SELECT * FROM pos.lengolf_sales_old_pos_staging 
        WHERE date <= cutoff_date;
        
        -- STEP 5: Insert new POS data (> cutoff date)  
        INSERT INTO pos.lengolf_sales
        SELECT * FROM pos.lengolf_sales_new_pos_staging
        WHERE date > cutoff_date;
        
        -- Log success
        UPDATE pos.sales_sync_logs 
        SET status = 'completed', 
            end_time = now(),
            records_processed = old_result.processed_count + new_result.processed_count,
            metadata = jsonb_build_object(
                'old_pos_processed', old_result.processed_count,
                'old_pos_inserted', old_result.inserted_count,
                'new_pos_processed', new_result.processed_count,
                'new_pos_inserted', new_result.inserted_count,
                'cutoff_date', cutoff_date,
                'latest_old_pos_timestamp', old_result.latest_timestamp,
                'latest_new_pos_timestamp', new_result.latest_timestamp
            )
        WHERE batch_id = batch_id;
        
        -- Build success response
        result_json := jsonb_build_object(
            'success', true,
            'batch_id', batch_id,
            'timestamp', now(),
            'cutoff_date', cutoff_date,
            'old_pos_processed', old_result.processed_count,
            'old_pos_inserted', old_result.inserted_count,
            'new_pos_processed', new_result.processed_count,
            'new_pos_inserted', new_result.inserted_count,
            'total_processed', old_result.processed_count + new_result.processed_count,
            'latest_old_pos_timestamp', old_result.latest_timestamp,
            'latest_new_pos_timestamp', new_result.latest_timestamp
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
-- STEP 7: CREATE INDEXES
-- =============================================================================

-- Indexes for staging tables
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_staging_date ON pos.lengolf_sales_old_pos_staging(date);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_old_pos_staging_batch ON pos.lengolf_sales_old_pos_staging(etl_batch_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_staging_date ON pos.lengolf_sales_new_pos_staging(date);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_staging_batch ON pos.lengolf_sales_new_pos_staging(etl_batch_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_new_pos_staging_transaction ON pos.lengolf_sales_new_pos_staging(transaction_id);

-- Additional indexes for main lengolf_sales table
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_etl_source ON pos.lengolf_sales(etl_source);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_etl_batch ON pos.lengolf_sales(etl_batch_id);
CREATE INDEX IF NOT EXISTS idx_lengolf_sales_transaction_id ON pos.lengolf_sales(transaction_id);

-- =============================================================================
-- STEP 8: CUTOFF DATE MANAGEMENT
-- =============================================================================

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
    
    -- Automatically refresh the unified data
    PERFORM pos.sync_unified_sales();
    
    RETURN true;
END;
$$;

-- =============================================================================
-- VALIDATION QUERIES
-- =============================================================================

-- Check setup
SELECT 
    'Direct Unification Setup Complete' as status,
    (SELECT COUNT(*) FROM pos.lengolf_sales WHERE etl_source = 'legacy_pos') as legacy_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales WHERE etl_source = 'new_pos') as new_pos_records,
    (SELECT COUNT(*) FROM pos.lengolf_sales WHERE etl_source IS NULL) as untracked_records,
    pos.get_active_cutoff_date() as active_cutoff_date,
    now() as setup_completed_at;

-- Test ETL function
SELECT pos.sync_unified_sales();

-- Validate cutoff logic
SELECT 
    date,
    etl_source,
    COUNT(*) as records,
    COUNT(DISTINCT receipt_number) as receipts,
    ROUND(SUM(sales_total), 2) as daily_total
FROM pos.lengolf_sales
WHERE date BETWEEN pos.get_active_cutoff_date() - INTERVAL '2 days' 
                AND pos.get_active_cutoff_date() + INTERVAL '2 days'
GROUP BY date, etl_source
ORDER BY date, etl_source;