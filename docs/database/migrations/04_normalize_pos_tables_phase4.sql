-- Migration Phase 4: Final cleanup - Remove denormalized columns
-- WARNING: Only run this after verifying all application code uses views

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================

-- Run readiness check before proceeding
SELECT * FROM pos.check_normalization_readiness();

-- Verify no recent inserts are using denormalized fields
DO $$
DECLARE
    v_recent_denormalized_usage INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_recent_denormalized_usage
    FROM pos.order_items
    WHERE created_at > NOW() - INTERVAL '24 hours'
      AND (product_name IS NOT NULL OR category_name IS NOT NULL);
    
    IF v_recent_denormalized_usage > 0 THEN
        RAISE EXCEPTION 'Recent records still using denormalized fields. Application may not be ready.';
    END IF;
END $$;

-- ============================================================================
-- COLUMN REMOVAL
-- ============================================================================

-- Step 1: Drop temporary triggers
DROP TRIGGER IF EXISTS trg_order_items_denormalized ON pos.order_items;
DROP TRIGGER IF EXISTS trg_table_sessions_staff_id ON pos.table_sessions;
DROP TRIGGER IF EXISTS trg_transactions_staff_id ON pos.transactions;
DROP TRIGGER IF EXISTS trg_transaction_items_staff_id ON pos.transaction_items;
DROP TRIGGER IF EXISTS trg_table_sessions_customer_id ON pos.table_sessions;
DROP TRIGGER IF EXISTS trg_transactions_customer_id ON pos.transactions;
DROP TRIGGER IF EXISTS trg_transaction_items_customer_id ON pos.transaction_items;

-- Step 2: Drop trigger functions
DROP FUNCTION IF EXISTS pos.order_items_maintain_denormalized();
DROP FUNCTION IF EXISTS pos.maintain_staff_id();
DROP FUNCTION IF EXISTS pos.maintain_customer_id();

-- Step 3: Remove denormalized columns from order_items
ALTER TABLE pos.order_items 
    DROP COLUMN IF EXISTS product_name,
    DROP COLUMN IF EXISTS category_id,
    DROP COLUMN IF EXISTS category_name;

-- Step 4: Remove denormalized columns from transaction_items
ALTER TABLE pos.transaction_items 
    DROP COLUMN IF EXISTS product_name,
    DROP COLUMN IF EXISTS product_category,
    DROP COLUMN IF EXISTS product_parent_category,
    DROP COLUMN IF EXISTS sku_number,
    DROP COLUMN IF EXISTS staff_pin,
    DROP COLUMN IF EXISTS customer_name,
    DROP COLUMN IF EXISTS table_number;

-- Step 5: Remove redundant columns from transactions
ALTER TABLE pos.transactions 
    DROP COLUMN IF EXISTS staff_pin,
    DROP COLUMN IF EXISTS table_number;

-- Step 6: Handle customer_id migration
-- Rename customer_id_new to customer_id after dropping old UUID column
ALTER TABLE pos.transactions DROP COLUMN IF EXISTS customer_id;
ALTER TABLE pos.transactions RENAME COLUMN customer_id_new TO customer_id;

ALTER TABLE pos.transaction_items DROP COLUMN IF EXISTS customer_id;
ALTER TABLE pos.transaction_items RENAME COLUMN customer_id_new TO customer_id;

-- Step 7: Remove staff_pin from table_sessions (keep staff_id)
ALTER TABLE pos.table_sessions 
    DROP COLUMN IF EXISTS staff_pin;

-- ============================================================================
-- FINAL CONSTRAINTS
-- ============================================================================

-- Add NOT NULL constraints where appropriate
ALTER TABLE pos.table_sessions 
    ALTER COLUMN staff_id SET NOT NULL;

-- Add check constraints
ALTER TABLE pos.order_items
    ADD CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
    ADD CONSTRAINT chk_order_items_prices CHECK (unit_price >= 0 AND total_price >= 0);

ALTER TABLE pos.transaction_items
    ADD CONSTRAINT chk_transaction_items_quantity CHECK (item_cnt > 0),
    ADD CONSTRAINT chk_transaction_items_prices CHECK (
        item_price_incl_vat >= 0 AND 
        item_price_excl_vat >= 0 AND 
        sales_total >= 0 AND 
        sales_net >= 0
    );

-- ============================================================================
-- RECREATE VIEWS WITHOUT COALESCE
-- ============================================================================

-- Now that denormalized columns are gone, simplify views
CREATE OR REPLACE VIEW pos.order_items_view AS
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    p.name AS product_name,
    p.category_id,
    c.name AS category_name,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.modifiers,
    oi.notes,
    oi.created_at,
    oi.updated_at
FROM pos.order_items oi
LEFT JOIN products.products p ON oi.product_id = p.id
LEFT JOIN products.categories c ON p.category_id = c.id;

CREATE OR REPLACE VIEW pos.transaction_items_view AS
SELECT 
    ti.id,
    ti.transaction_id,
    ti.item_sequence,
    ti.order_id,
    ti.table_session_id,
    ti.product_id,
    p.name AS product_name,
    c.name AS product_category,
    pc.name AS product_parent_category,
    p.sku AS sku_number,
    ti.item_cnt,
    ti.item_price_incl_vat,
    ti.item_price_excl_vat,
    ti.item_discount,
    ti.sales_total,
    ti.sales_net,
    ti.payment_method,
    ti.payment_amount_allocated,
    s.pin AS staff_pin,
    ti.staff_id,
    ti.customer_id,
    cust.name AS customer_name,
    t.table_number,
    ti.is_sim_usage OR COALESCE(p.is_sim_usage, false) AS is_sim_usage,
    ti.item_notes,
    ti.is_voided,
    ti.voided_at,
    ti.voided_by,
    ti.sales_timestamp,
    ti.created_at,
    ti.updated_at
FROM pos.transaction_items ti
LEFT JOIN products.products p ON ti.product_id = p.id
LEFT JOIN products.categories c ON p.category_id = c.id
LEFT JOIN products.categories pc ON c.parent_id = pc.id
LEFT JOIN backoffice.staff s ON ti.staff_id = s.id
LEFT JOIN backoffice.customers cust ON ti.customer_id = cust.id
LEFT JOIN pos.table_sessions ts ON ti.table_session_id = ts.id
LEFT JOIN pos.tables t ON ts.table_id = t.id;

CREATE OR REPLACE VIEW pos.transactions_view AS
SELECT 
    tr.id,
    tr.transaction_id,
    tr.receipt_number,
    tr.subtotal,
    tr.vat_amount,
    tr.total_amount,
    tr.discount_amount,
    tr.payment_methods,
    tr.payment_status,
    tr.table_session_id,
    tr.order_id,
    s.pin AS staff_pin,
    tr.staff_id,
    tr.customer_id,
    t.table_number,
    tr.transaction_date,
    tr.created_at,
    tr.updated_at
FROM pos.transactions tr
LEFT JOIN backoffice.staff s ON tr.staff_id = s.id
LEFT JOIN pos.table_sessions ts ON tr.table_session_id = ts.id
LEFT JOIN pos.tables t ON ts.table_id = t.id;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Refresh materialized views with new structure
REFRESH MATERIALIZED VIEW CONCURRENTLY pos.daily_sales_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY pos.product_sales_analytics;

-- Update table statistics
ANALYZE pos.orders;
ANALYZE pos.order_items;
ANALYZE pos.transactions;
ANALYZE pos.transaction_items;
ANALYZE pos.table_sessions;

-- ============================================================================
-- CLEANUP
-- ============================================================================

-- Drop temporary monitoring views
DROP VIEW IF EXISTS pos.denormalization_usage;

-- Drop temporary helper functions
DROP FUNCTION IF EXISTS pos.get_customer_id_for_transaction(UUID, UUID);

-- ============================================================================
-- FINAL DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE pos.order_items IS 'Normalized order items - use order_items_view for product details';
COMMENT ON TABLE pos.transaction_items IS 'Normalized transaction items - use transaction_items_view for full context';
COMMENT ON TABLE pos.transactions IS 'Normalized transactions - use transactions_view for staff and table details';

-- Summary comment
COMMENT ON SCHEMA pos IS 'POS schema - fully normalized as of Phase 4 migration. All product, category, customer, and staff information is retrieved via views that join to source tables.';

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================

-- If rollback is needed, use the backup tables created in Phase 1:
-- pos.migration_backup_transactions
-- pos.migration_backup_transaction_items
-- pos.migration_backup_orders
-- pos.migration_backup_order_items