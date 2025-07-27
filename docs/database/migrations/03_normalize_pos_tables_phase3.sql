-- Migration Phase 3: Application code updates needed
-- This file documents the application changes required before Phase 4

-- ============================================================================
-- REQUIRED APPLICATION CHANGES
-- ============================================================================

-- 1. UPDATE ORDER CREATION (confirm-order endpoint)
-- File: app/api/pos/table-sessions/[sessionId]/confirm-order/route.ts
-- Changes needed:
--   - Remove insertion of product_name, category_id, category_name into order_items
--   - These will come from the view instead
--   - Add staff_id lookup from staff_pin

-- 2. UPDATE TRANSACTION SERVICE
-- File: src/services/TransactionService.ts
-- Changes needed:
--   - Use proper BIGINT customer_id instead of UUID
--   - Remove insertion of denormalized fields in transaction_items
--   - Add proper staff_id, customer_id, booking_id propagation

-- 3. UPDATE TABLE SESSION CREATION
-- File: app/api/pos/tables/[tableId]/open/route.ts
-- Changes needed:
--   - Add staff_id lookup and storage
--   - Add customer_id resolution from booking

-- 4. UPDATE ALL READ QUERIES
-- Replace direct table queries with view queries:
--   - pos.order_items → pos.order_items_view
--   - pos.transactions → pos.transactions_view
--   - pos.transaction_items → pos.transaction_items_view

-- ============================================================================
-- TEMPORARY COMPATIBILITY LAYER
-- ============================================================================

-- Create triggers to maintain denormalized data during transition
-- These will be removed in Phase 4

-- Trigger to populate denormalized fields in order_items
CREATE OR REPLACE FUNCTION pos.order_items_maintain_denormalized()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.product_id IS NOT NULL AND (NEW.product_name IS NULL OR NEW.category_name IS NULL) THEN
        SELECT 
            p.name,
            p.category_id,
            c.name
        INTO 
            NEW.product_name,
            NEW.category_id,
            NEW.category_name
        FROM products.products p
        LEFT JOIN products.categories c ON p.category_id = c.id
        WHERE p.id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_items_denormalized
BEFORE INSERT OR UPDATE ON pos.order_items
FOR EACH ROW
EXECUTE FUNCTION pos.order_items_maintain_denormalized();

-- Trigger to populate staff_id from staff_pin
CREATE OR REPLACE FUNCTION pos.maintain_staff_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.staff_pin IS NOT NULL AND NEW.staff_id IS NULL THEN
        SELECT id INTO NEW.staff_id
        FROM backoffice.staff
        WHERE pin = NEW.staff_pin
          AND is_active = true
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with staff_pin
CREATE TRIGGER trg_table_sessions_staff_id
BEFORE INSERT OR UPDATE ON pos.table_sessions
FOR EACH ROW
EXECUTE FUNCTION pos.maintain_staff_id();

CREATE TRIGGER trg_transactions_staff_id
BEFORE INSERT OR UPDATE ON pos.transactions
FOR EACH ROW
EXECUTE FUNCTION pos.maintain_staff_id();

CREATE TRIGGER trg_transaction_items_staff_id
BEFORE INSERT OR UPDATE ON pos.transaction_items
FOR EACH ROW
EXECUTE FUNCTION pos.maintain_staff_id();

-- Trigger to maintain customer_id relationships
CREATE OR REPLACE FUNCTION pos.maintain_customer_id()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_bigint BIGINT;
BEGIN
    -- For table_sessions, resolve from booking
    IF TG_TABLE_NAME = 'table_sessions' AND NEW.booking_id IS NOT NULL AND NEW.customer_id IS NULL THEN
        SELECT bc.id INTO NEW.customer_id
        FROM bookings b
        JOIN public.customers c ON b.customer_id = c.id
        JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
        WHERE b.id = NEW.booking_id
        LIMIT 1;
    END IF;
    
    -- For transactions and transaction_items with UUID customer_id
    IF NEW.customer_id IS NOT NULL AND NEW.customer_id_new IS NULL THEN
        -- Try to convert UUID to BIGINT via phone number match
        SELECT bc.id INTO v_customer_bigint
        FROM public.customers c
        JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
        WHERE c.id = NEW.customer_id::UUID
        LIMIT 1;
        
        IF v_customer_bigint IS NOT NULL THEN
            NEW.customer_id_new = v_customer_bigint;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_table_sessions_customer_id
BEFORE INSERT OR UPDATE ON pos.table_sessions
FOR EACH ROW
EXECUTE FUNCTION pos.maintain_customer_id();

CREATE TRIGGER trg_transactions_customer_id
BEFORE INSERT OR UPDATE ON pos.transactions
FOR EACH ROW
WHEN (pg_trigger_depth() < 1)
EXECUTE FUNCTION pos.maintain_customer_id();

CREATE TRIGGER trg_transaction_items_customer_id
BEFORE INSERT OR UPDATE ON pos.transaction_items
FOR EACH ROW
WHEN (pg_trigger_depth() < 1)
EXECUTE FUNCTION pos.maintain_customer_id();

-- ============================================================================
-- ENHANCED VIEWS WITH INSTEAD OF TRIGGERS
-- ============================================================================

-- Create INSTEAD OF triggers for views to handle INSERT/UPDATE operations
-- This allows the application to work with views as if they were tables

CREATE OR REPLACE FUNCTION pos.order_items_view_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO pos.order_items (
        order_id, product_id, quantity, unit_price, total_price,
        modifiers, notes, created_at, updated_at
    ) VALUES (
        NEW.order_id, NEW.product_id, NEW.quantity, NEW.unit_price, NEW.total_price,
        NEW.modifiers, NEW.notes, COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW())
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_order_items_view_insert
INSTEAD OF INSERT ON pos.order_items_view
FOR EACH ROW
EXECUTE FUNCTION pos.order_items_view_insert();

-- ============================================================================
-- MONITORING QUERIES
-- ============================================================================

-- Query to monitor denormalized field usage
CREATE OR REPLACE VIEW pos.denormalization_usage AS
SELECT 
    'order_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN product_name IS NOT NULL THEN 1 END) as rows_with_product_name,
    COUNT(CASE WHEN category_name IS NOT NULL THEN 1 END) as rows_with_category_name
FROM pos.order_items
UNION ALL
SELECT 
    'transaction_items' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN product_name IS NOT NULL THEN 1 END) as rows_with_product_name,
    COUNT(CASE WHEN product_category IS NOT NULL THEN 1 END) as rows_with_category_name
FROM pos.transaction_items
UNION ALL
SELECT 
    'transactions' as table_name,
    COUNT(*) as total_rows,
    COUNT(CASE WHEN staff_pin IS NOT NULL AND staff_id IS NULL THEN 1 END) as rows_without_staff_id,
    COUNT(CASE WHEN customer_id IS NOT NULL AND customer_id_new IS NULL THEN 1 END) as rows_without_customer_id_new
FROM pos.transactions;

-- Query to check application readiness for Phase 4
CREATE OR REPLACE FUNCTION pos.check_normalization_readiness()
RETURNS TABLE (
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: Are new records using proper foreign keys?
    RETURN QUERY
    SELECT 
        'Recent transactions using staff_id'::TEXT,
        CASE 
            WHEN COUNT(*) > 0 AND COUNT(CASE WHEN staff_id IS NOT NULL THEN 1 END) = COUNT(*) 
            THEN 'READY'::TEXT
            ELSE 'NOT READY'::TEXT
        END,
        FORMAT('%s of %s recent transactions have staff_id', 
            COUNT(CASE WHEN staff_id IS NOT NULL THEN 1 END), 
            COUNT(*))::TEXT
    FROM pos.transactions
    WHERE created_at > NOW() - INTERVAL '7 days';
    
    -- Check 2: Are views being used?
    RETURN QUERY
    SELECT 
        'View usage in last 24 hours'::TEXT,
        'CHECK MANUALLY'::TEXT,
        'Review application logs for view queries'::TEXT;
    
    -- Check 3: Data consistency
    RETURN QUERY
    SELECT 
        'Data consistency between normalized and denormalized'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'CONSISTENT'::TEXT
            ELSE 'INCONSISTENT'::TEXT
        END,
        FORMAT('%s inconsistent records found', COUNT(*))::TEXT
    FROM pos.order_items oi
    LEFT JOIN products.products p ON oi.product_id = p.id
    WHERE oi.product_name != p.name
       OR oi.product_id IS NOT NULL AND p.id IS NULL;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROLLBACK PROCEDURES
-- ============================================================================

-- Function to rollback to denormalized structure if needed
CREATE OR REPLACE FUNCTION pos.rollback_normalization_phase3()
RETURNS void AS $$
BEGIN
    -- Drop triggers
    DROP TRIGGER IF EXISTS trg_order_items_denormalized ON pos.order_items;
    DROP TRIGGER IF EXISTS trg_table_sessions_staff_id ON pos.table_sessions;
    DROP TRIGGER IF EXISTS trg_transactions_staff_id ON pos.transactions;
    DROP TRIGGER IF EXISTS trg_transaction_items_staff_id ON pos.transaction_items;
    DROP TRIGGER IF EXISTS trg_table_sessions_customer_id ON pos.table_sessions;
    DROP TRIGGER IF EXISTS trg_transactions_customer_id ON pos.transactions;
    DROP TRIGGER IF EXISTS trg_transaction_items_customer_id ON pos.transaction_items;
    DROP TRIGGER IF EXISTS trg_order_items_view_insert ON pos.order_items_view;
    
    -- Drop functions
    DROP FUNCTION IF EXISTS pos.order_items_maintain_denormalized();
    DROP FUNCTION IF EXISTS pos.maintain_staff_id();
    DROP FUNCTION IF EXISTS pos.maintain_customer_id();
    DROP FUNCTION IF EXISTS pos.order_items_view_insert();
    
    RAISE NOTICE 'Phase 3 rollback completed';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON VIEW pos.denormalization_usage IS 'Monitor usage of denormalized fields to track migration progress';
COMMENT ON FUNCTION pos.check_normalization_readiness() IS 'Check if application is ready for Phase 4 column removal';
COMMENT ON FUNCTION pos.rollback_normalization_phase3() IS 'Rollback Phase 3 changes if needed';