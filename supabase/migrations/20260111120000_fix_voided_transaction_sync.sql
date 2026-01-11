-- Migration: Fix voided transaction synchronization
-- Date: 2026-01-11
-- Description:
--   1. Removes voided transactions from lengolf_sales (they should not be in sales data)
--   2. Updates ETL function to remove voided transactions going forward
-- Impact: 6 transactions, 13 line items, 19,095 THB total sales will be removed

-- =============================================================================
-- STEP 1: Remove voided transactions from lengolf_sales
-- =============================================================================

-- Backup voided records before deletion (for audit trail)
CREATE TABLE IF NOT EXISTS pos.lengolf_sales_voided_archive (
    LIKE pos.lengolf_sales INCLUDING ALL,
    archived_at TIMESTAMPTZ DEFAULT now(),
    archived_reason TEXT
);

-- Archive the records we're about to delete
INSERT INTO pos.lengolf_sales_voided_archive
SELECT ls.*, now(), 'Transaction voided - removed from sales data'
FROM pos.lengolf_sales ls
JOIN pos.transactions t ON ls.receipt_number = t.receipt_number
WHERE ls.etl_source = 'new_pos'
  AND t.status = 'voided'
  AND ls.is_voided = false;

-- Delete voided transaction records from lengolf_sales
DELETE FROM pos.lengolf_sales ls
USING pos.transactions t
WHERE ls.receipt_number = t.receipt_number
  AND ls.etl_source = 'new_pos'
  AND t.status = 'voided';

-- Log the fix
DO $$
DECLARE
    rows_deleted INTEGER;
BEGIN
    GET DIAGNOSTICS rows_deleted = ROW_COUNT;
    RAISE NOTICE 'Deleted % rows (voided transactions removed from sales data)', rows_deleted;
END $$;

-- =============================================================================
-- STEP 2: Update ETL function to include voided transaction synchronization
-- =============================================================================

CREATE OR REPLACE FUNCTION pos.sync_unified_sales_incremental()
RETURNS jsonb
LANGUAGE plpgsql
AS $function$
DECLARE
    batch_id_var TEXT := gen_random_uuid()::text;
    sync_start_time TIMESTAMPTZ := now();
    cutoff_date DATE;
    new_result RECORD;
    result_json jsonb;
    legacy_frozen BOOLEAN := false;
    records_inserted INTEGER := 0;
    records_voided INTEGER := 0;
BEGIN
    cutoff_date := pos.get_active_cutoff_date();

    -- Log sync start
    INSERT INTO pos.sales_sync_logs (batch_id, process_type, status, start_time)
    VALUES (batch_id_var, 'incremental_sync', 'started', sync_start_time);

    BEGIN
        -- Check if legacy data is already frozen (exists in main table with legacy source)
        SELECT EXISTS(
            SELECT 1 FROM pos.lengolf_sales
            WHERE etl_source = 'legacy_pos'
            LIMIT 1
        ) INTO legacy_frozen;

        -- STEP 1: Only process legacy data if not already frozen
        IF NOT legacy_frozen THEN
            -- First time: Process all legacy data (this will only happen once)
            PERFORM pos.populate_old_pos_staging();

            -- Insert legacy data into main table
            INSERT INTO pos.lengolf_sales
            SELECT * FROM pos.lengolf_sales_old_pos_staging
            WHERE date <= cutoff_date;
        END IF;

        -- STEP 2: Remove voided transactions (NEW LOGIC)
        -- Archive and delete records where transaction was voided after ETL processing
        -- First archive them
        INSERT INTO pos.lengolf_sales_voided_archive
        SELECT ls.*, now(), 'Transaction voided - auto-removed by ETL'
        FROM pos.lengolf_sales ls
        JOIN pos.transactions t ON ls.receipt_number = t.receipt_number
        WHERE ls.etl_source = 'new_pos'
          AND t.status = 'voided';

        -- Then delete them from lengolf_sales
        DELETE FROM pos.lengolf_sales ls
        USING pos.transactions t
        WHERE ls.receipt_number = t.receipt_number
          AND ls.etl_source = 'new_pos'
          AND t.status = 'voided';

        GET DIAGNOSTICS records_voided = ROW_COUNT;

        -- STEP 3: Process only NEW transactions from new POS (incremental)
        SELECT * INTO new_result FROM pos.populate_new_pos_staging();

        -- STEP 4: Only insert NEW POS data that doesn't already exist
        WITH new_records AS (
            SELECT s.*
            FROM pos.lengolf_sales_new_pos_staging s
            WHERE s.date > cutoff_date
              AND s.transaction_item_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM pos.lengolf_sales main
                  WHERE main.transaction_item_id = s.transaction_item_id
              )
        )
        INSERT INTO pos.lengolf_sales
        SELECT * FROM new_records;

        GET DIAGNOSTICS records_inserted = ROW_COUNT;

        -- Log success
        UPDATE pos.sales_sync_logs
        SET status = 'completed',
            end_time = now(),
            records_processed = COALESCE(new_result.processed_count, 0),
            metadata = jsonb_build_object(
                'new_pos_processed', COALESCE(new_result.processed_count, 0),
                'new_pos_inserted', records_inserted,
                'records_voided', records_voided,
                'cutoff_date', cutoff_date,
                'latest_new_pos_timestamp', new_result.latest_timestamp,
                'legacy_data_already_frozen', legacy_frozen,
                'processing_mode', 'incremental_with_duplicate_check_and_void_removal'
            )
        WHERE batch_id = batch_id_var;

        -- Build success response
        result_json := jsonb_build_object(
            'success', true,
            'batch_id', batch_id_var,
            'timestamp', now(),
            'cutoff_date', cutoff_date,
            'processing_mode', 'incremental_with_duplicate_check_and_void_removal',
            'legacy_data_frozen', legacy_frozen,
            'new_pos_processed', COALESCE(new_result.processed_count, 0),
            'new_pos_inserted', records_inserted,
            'records_voided', records_voided,
            'latest_new_pos_timestamp', new_result.latest_timestamp
        );

    EXCEPTION WHEN OTHERS THEN
        -- Log error
        UPDATE pos.sales_sync_logs
        SET status = 'failed',
            end_time = now(),
            error_message = SQLERRM
        WHERE batch_id = batch_id_var;

        -- Build error response
        result_json := jsonb_build_object(
            'success', false,
            'batch_id', batch_id_var,
            'timestamp', now(),
            'error', SQLERRM
        );
    END;

    RETURN result_json;
END;
$function$;

-- =============================================================================
-- STEP 3: Create reconciliation monitoring function
-- =============================================================================

CREATE OR REPLACE FUNCTION pos.check_voided_transaction_consistency()
RETURNS TABLE(
    total_voided_in_sales INTEGER,
    affected_receipts TEXT[],
    total_sales_impact NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH voided_still_in_sales AS (
        SELECT
            t.receipt_number,
            SUM(ls.item_price_incl_vat) as receipt_total
        FROM pos.transactions t
        JOIN pos.lengolf_sales ls ON t.receipt_number = ls.receipt_number
        WHERE ls.etl_source = 'new_pos'
          AND t.status = 'voided'
        GROUP BY t.receipt_number
    )
    SELECT
        COUNT(*)::INTEGER as total_voided_in_sales,
        ARRAY_AGG(receipt_number) as affected_receipts,
        ROUND(SUM(receipt_total)::numeric, 2) as total_sales_impact
    FROM voided_still_in_sales;
END;
$$;

COMMENT ON FUNCTION pos.check_voided_transaction_consistency() IS
'Monitoring function to detect voided transactions that still exist in lengolf_sales (should be 0)';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify the fix worked
DO $$
DECLARE
    voided_count INTEGER;
    archived_count INTEGER;
BEGIN
    -- Check if any voided transactions still exist in lengolf_sales
    SELECT COUNT(DISTINCT t.receipt_number)
    INTO voided_count
    FROM pos.transactions t
    JOIN pos.lengolf_sales ls ON t.receipt_number = ls.receipt_number
    WHERE ls.etl_source = 'new_pos'
      AND t.status = 'voided';

    -- Check how many were archived
    SELECT COUNT(DISTINCT receipt_number)
    INTO archived_count
    FROM pos.lengolf_sales_voided_archive;

    IF voided_count > 0 THEN
        RAISE WARNING 'Still have % voided transactions in lengolf_sales - migration may need review', voided_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All voided transactions removed from lengolf_sales (% archived)', archived_count;
    END IF;
END $$;
