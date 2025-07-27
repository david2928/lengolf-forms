-- Clean POS Normalization Migration
-- This migration creates the ideal normalized schema without backward compatibility
-- Safe for development environments

-- ============================================================================
-- BACKUP EXISTING DATA
-- ============================================================================

-- Create backup tables
CREATE TABLE pos.backup_orders AS SELECT * FROM pos.orders;
CREATE TABLE pos.backup_order_items AS SELECT * FROM pos.order_items;
CREATE TABLE pos.backup_transactions AS SELECT * FROM pos.transactions;
CREATE TABLE pos.backup_transaction_items AS SELECT * FROM pos.transaction_items;
CREATE TABLE pos.backup_table_sessions AS SELECT * FROM pos.table_sessions;

-- ============================================================================
-- CLEAN NORMALIZED SCHEMA
-- ============================================================================

-- Drop existing tables
DROP TABLE IF EXISTS pos.transaction_items CASCADE;
DROP TABLE IF EXISTS pos.transactions CASCADE;
DROP TABLE IF EXISTS pos.order_items CASCADE;
DROP TABLE IF EXISTS pos.orders CASCADE;

-- Add missing columns to table_sessions
ALTER TABLE pos.table_sessions 
    ADD COLUMN IF NOT EXISTS staff_id INTEGER,
    ADD COLUMN IF NOT EXISTS customer_id BIGINT;

-- Clean up table_sessions
ALTER TABLE pos.table_sessions
    DROP COLUMN IF EXISTS staff_pin;

-- Add constraints to table_sessions
ALTER TABLE pos.table_sessions
    ADD CONSTRAINT fk_table_sessions_staff 
    FOREIGN KEY (staff_id) 
    REFERENCES backoffice.staff(id) 
    ON DELETE SET NULL,
    ADD CONSTRAINT fk_table_sessions_customer 
    FOREIGN KEY (customer_id) 
    REFERENCES backoffice.customers(id) 
    ON DELETE SET NULL;

-- Recreate orders table (normalized)
CREATE TABLE pos.orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_session_id    UUID NOT NULL REFERENCES pos.table_sessions(id) ON DELETE CASCADE,
    order_number        INTEGER NOT NULL DEFAULT nextval('pos.orders_order_number_seq'),
    status              TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    total_amount        NUMERIC NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    tax_amount          NUMERIC DEFAULT 0 CHECK (tax_amount >= 0),
    subtotal_amount     NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal_amount >= 0),
    staff_id            INTEGER REFERENCES backoffice.staff(id) ON DELETE SET NULL,
    customer_id         BIGINT REFERENCES backoffice.customers(id) ON DELETE SET NULL,
    booking_id          UUID REFERENCES bookings(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at        TIMESTAMPTZ DEFAULT now(),
    confirmed_by        TEXT,
    cancelled_at        TIMESTAMPTZ,
    cancelled_by        TEXT,
    cancellation_reason TEXT,
    notes               TEXT
);

-- Recreate order_items table (normalized)
CREATE TABLE pos.order_items (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL REFERENCES pos.orders(id) ON DELETE CASCADE,
    product_id          UUID REFERENCES products.products(id) ON DELETE SET NULL,
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    unit_price          NUMERIC NOT NULL CHECK (unit_price >= 0),
    total_price         NUMERIC NOT NULL CHECK (total_price >= 0),
    modifiers           JSONB DEFAULT '[]'::jsonb,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Recreate transactions table (normalized)
CREATE TABLE pos.transactions (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id   UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    receipt_number   VARCHAR(50) NOT NULL UNIQUE,
    subtotal         NUMERIC NOT NULL CHECK (subtotal >= 0),
    vat_amount       NUMERIC NOT NULL CHECK (vat_amount >= 0),
    total_amount     NUMERIC NOT NULL CHECK (total_amount >= 0),
    discount_amount  NUMERIC DEFAULT 0 CHECK (discount_amount >= 0),
    payment_methods  JSONB,
    payment_status   VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'voided')),
    table_session_id UUID NOT NULL REFERENCES pos.table_sessions(id) ON DELETE CASCADE,
    order_id         UUID REFERENCES pos.orders(id) ON DELETE SET NULL,
    staff_id         INTEGER NOT NULL REFERENCES backoffice.staff(id) ON DELETE RESTRICT,
    customer_id      BIGINT REFERENCES backoffice.customers(id) ON DELETE SET NULL,
    booking_id       UUID REFERENCES bookings(id) ON DELETE SET NULL,
    transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Recreate transaction_items table (normalized)
CREATE TABLE pos.transaction_items (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id            UUID NOT NULL REFERENCES pos.transactions(id) ON DELETE CASCADE,
    item_sequence             INTEGER NOT NULL,
    order_id                  UUID REFERENCES pos.orders(id) ON DELETE SET NULL,
    table_session_id          UUID NOT NULL REFERENCES pos.table_sessions(id) ON DELETE CASCADE,
    product_id                UUID REFERENCES products.products(id) ON DELETE SET NULL,
    item_cnt                  INTEGER NOT NULL DEFAULT 1 CHECK (item_cnt > 0),
    item_price_incl_vat       NUMERIC NOT NULL CHECK (item_price_incl_vat >= 0),
    item_price_excl_vat       NUMERIC NOT NULL CHECK (item_price_excl_vat >= 0),
    item_discount             NUMERIC DEFAULT 0 CHECK (item_discount >= 0),
    sales_total               NUMERIC NOT NULL CHECK (sales_total >= 0),
    sales_net                 NUMERIC NOT NULL CHECK (sales_net >= 0),
    payment_method            VARCHAR(100),
    payment_amount_allocated  NUMERIC CHECK (payment_amount_allocated >= 0),
    staff_id                  INTEGER NOT NULL REFERENCES backoffice.staff(id) ON DELETE RESTRICT,
    customer_id               BIGINT REFERENCES backoffice.customers(id) ON DELETE SET NULL,
    booking_id                UUID REFERENCES bookings(id) ON DELETE SET NULL,
    is_voided                 BOOLEAN DEFAULT false,
    voided_at                 TIMESTAMPTZ,
    voided_by                 VARCHAR(255),
    item_notes                TEXT,
    sales_timestamp           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at                TIMESTAMPTZ DEFAULT now(),
    updated_at                TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Orders indexes
CREATE INDEX idx_orders_table_session_id ON pos.orders(table_session_id);
CREATE INDEX idx_orders_status ON pos.orders(status);
CREATE INDEX idx_orders_created_at ON pos.orders(created_at);
CREATE INDEX idx_orders_order_number ON pos.orders(order_number);
CREATE INDEX idx_orders_staff_id ON pos.orders(staff_id);
CREATE INDEX idx_orders_customer_id ON pos.orders(customer_id);
CREATE INDEX idx_orders_booking_id ON pos.orders(booking_id);
CREATE INDEX idx_orders_session_status ON pos.orders(table_session_id, status);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON pos.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON pos.order_items(product_id);
CREATE INDEX idx_order_items_created_at ON pos.order_items(created_at);

-- Transactions indexes
CREATE INDEX idx_transactions_table_session_id ON pos.transactions(table_session_id);
CREATE INDEX idx_transactions_order_id ON pos.transactions(order_id);
CREATE INDEX idx_transactions_customer_id ON pos.transactions(customer_id);
CREATE INDEX idx_transactions_staff_id ON pos.transactions(staff_id);
CREATE INDEX idx_transactions_booking_id ON pos.transactions(booking_id);
CREATE INDEX idx_transactions_transaction_date ON pos.transactions(transaction_date);
CREATE INDEX idx_transactions_receipt_number ON pos.transactions(receipt_number);
CREATE INDEX idx_transactions_date_staff ON pos.transactions(transaction_date, staff_id);
CREATE INDEX idx_transactions_payment_status ON pos.transactions(payment_status);

-- Transaction items indexes
CREATE INDEX idx_transaction_items_transaction_id ON pos.transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_order_id ON pos.transaction_items(order_id);
CREATE INDEX idx_transaction_items_table_session_id ON pos.transaction_items(table_session_id);
CREATE INDEX idx_transaction_items_product_id ON pos.transaction_items(product_id);
CREATE INDEX idx_transaction_items_customer_id ON pos.transaction_items(customer_id);
CREATE INDEX idx_transaction_items_staff_id ON pos.transaction_items(staff_id);
CREATE INDEX idx_transaction_items_booking_id ON pos.transaction_items(booking_id);
CREATE INDEX idx_transaction_items_sales_timestamp ON pos.transaction_items(sales_timestamp);
CREATE INDEX idx_transaction_items_timestamp_product ON pos.transaction_items(sales_timestamp, product_id);
CREATE INDEX idx_transaction_items_voided ON pos.transaction_items(is_voided);

-- Table sessions indexes
CREATE INDEX idx_table_sessions_staff_id ON pos.table_sessions(staff_id);
CREATE INDEX idx_table_sessions_customer_id ON pos.table_sessions(customer_id);
CREATE INDEX idx_table_sessions_booking_id ON pos.table_sessions(booking_id);

-- ============================================================================
-- VIEWS FOR APPLICATION USE
-- ============================================================================

-- Order items with product context
CREATE VIEW pos.order_items_enriched AS
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    p.name AS product_name,
    p.category_id,
    c.name AS category_name,
    pc.name AS parent_category_name,
    p.sku,
    p.is_sim_usage,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.modifiers,
    oi.notes,
    oi.created_at,
    oi.updated_at
FROM pos.order_items oi
LEFT JOIN products.products p ON oi.product_id = p.id
LEFT JOIN products.categories c ON p.category_id = c.id
LEFT JOIN products.categories pc ON c.parent_id = pc.id;

-- Transaction items with full context
CREATE VIEW pos.transaction_items_enriched AS
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
    COALESCE(p.is_sim_usage, false) AS is_sim_usage,
    ti.item_cnt,
    ti.item_price_incl_vat,
    ti.item_price_excl_vat,
    ti.item_discount,
    ti.sales_total,
    ti.sales_net,
    ti.payment_method,
    ti.payment_amount_allocated,
    s.pin AS staff_pin,
    s.name AS staff_name,
    ti.staff_id,
    ti.customer_id,
    cust.name AS customer_name,
    cust.phone_number AS customer_phone,
    ti.booking_id,
    b.name AS booking_name,
    t.table_number,
    ti.is_voided,
    ti.voided_at,
    ti.voided_by,
    ti.item_notes,
    ti.sales_timestamp,
    ti.created_at,
    ti.updated_at
FROM pos.transaction_items ti
LEFT JOIN products.products p ON ti.product_id = p.id
LEFT JOIN products.categories c ON p.category_id = c.id
LEFT JOIN products.categories pc ON c.parent_id = pc.id
LEFT JOIN backoffice.staff s ON ti.staff_id = s.id
LEFT JOIN backoffice.customers cust ON ti.customer_id = cust.id
LEFT JOIN bookings b ON ti.booking_id = b.id
LEFT JOIN pos.table_sessions ts ON ti.table_session_id = ts.id
LEFT JOIN pos.tables t ON ts.table_id = t.id;

-- Transactions with context
CREATE VIEW pos.transactions_enriched AS
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
    s.name AS staff_name,
    tr.staff_id,
    tr.customer_id,
    cust.name AS customer_name,
    cust.phone_number AS customer_phone,
    tr.booking_id,
    b.name AS booking_name,
    t.table_number,
    tr.transaction_date,
    tr.created_at,
    tr.updated_at
FROM pos.transactions tr
LEFT JOIN backoffice.staff s ON tr.staff_id = s.id
LEFT JOIN backoffice.customers cust ON tr.customer_id = cust.id
LEFT JOIN bookings b ON tr.booking_id = b.id
LEFT JOIN pos.table_sessions ts ON tr.table_session_id = ts.id
LEFT JOIN pos.tables t ON ts.table_id = t.id;

-- Orders with context
CREATE VIEW pos.orders_enriched AS
SELECT 
    o.id,
    o.table_session_id,
    o.order_number,
    o.status,
    o.total_amount,
    o.tax_amount,
    o.subtotal_amount,
    s.pin AS staff_pin,
    s.name AS staff_name,
    o.staff_id,
    o.customer_id,
    cust.name AS customer_name,
    cust.phone_number AS customer_phone,
    o.booking_id,
    b.name AS booking_name,
    t.table_number,
    o.created_at,
    o.confirmed_at,
    o.confirmed_by,
    o.cancelled_at,
    o.cancelled_by,
    o.cancellation_reason,
    o.notes
FROM pos.orders o
LEFT JOIN backoffice.staff s ON o.staff_id = s.id
LEFT JOIN backoffice.customers cust ON o.customer_id = cust.id
LEFT JOIN bookings b ON o.booking_id = b.id
LEFT JOIN pos.table_sessions ts ON o.table_session_id = ts.id
LEFT JOIN pos.tables t ON ts.table_id = t.id;

-- ============================================================================
-- ANALYTICS MATERIALIZED VIEWS
-- ============================================================================

-- Daily sales summary
CREATE MATERIALIZED VIEW pos.daily_sales_summary AS
SELECT 
    DATE(tr.transaction_date) as sale_date,
    tr.staff_id,
    s.name as staff_name,
    s.pin as staff_pin,
    COUNT(DISTINCT tr.id) as transaction_count,
    COUNT(DISTINCT tr.customer_id) as unique_customers,
    COUNT(DISTINCT tr.booking_id) as booking_transactions,
    SUM(tr.total_amount) as total_sales,
    SUM(tr.vat_amount) as total_vat,
    SUM(tr.discount_amount) as total_discounts,
    AVG(tr.total_amount) as avg_transaction_value,
    COUNT(CASE WHEN tr.payment_status = 'completed' THEN 1 END) as completed_transactions,
    COUNT(CASE WHEN tr.payment_status = 'voided' THEN 1 END) as voided_transactions
FROM pos.transactions tr
JOIN backoffice.staff s ON tr.staff_id = s.id
GROUP BY DATE(tr.transaction_date), tr.staff_id, s.name, s.pin
WITH DATA;

-- Product sales analytics
CREATE MATERIALIZED VIEW pos.product_sales_analytics AS
SELECT 
    ti.product_id,
    p.name as product_name,
    p.sku as sku_number,
    c.name as category_name,
    pc.name as parent_category_name,
    p.is_sim_usage,
    DATE_TRUNC('month', ti.sales_timestamp) as sales_month,
    COUNT(DISTINCT ti.transaction_id) as transaction_count,
    SUM(ti.item_cnt) as total_quantity_sold,
    SUM(ti.sales_total) as total_revenue,
    SUM(ti.sales_net) as total_net_revenue,
    AVG(ti.item_price_incl_vat) as avg_selling_price,
    COUNT(DISTINCT ti.customer_id) as unique_customers,
    COUNT(CASE WHEN ti.is_voided THEN 1 END) as voided_items_count,
    SUM(CASE WHEN ti.is_voided THEN ti.sales_total ELSE 0 END) as voided_revenue
FROM pos.transaction_items ti
JOIN products.products p ON ti.product_id = p.id
LEFT JOIN products.categories c ON p.category_id = c.id
LEFT JOIN products.categories pc ON c.parent_id = pc.id
GROUP BY 
    ti.product_id, p.name, p.sku, c.name, pc.name, p.is_sim_usage,
    DATE_TRUNC('month', ti.sales_timestamp)
WITH DATA;

-- Customer analytics
CREATE MATERIALIZED VIEW pos.customer_analytics AS
SELECT 
    tr.customer_id,
    c.name as customer_name,
    c.phone_number,
    COUNT(DISTINCT tr.id) as total_transactions,
    COUNT(DISTINCT tr.booking_id) as booking_transactions,
    COUNT(DISTINCT DATE(tr.transaction_date)) as visit_days,
    SUM(tr.total_amount) as total_spent,
    AVG(tr.total_amount) as avg_transaction_value,
    MIN(tr.transaction_date) as first_visit,
    MAX(tr.transaction_date) as last_visit,
    COUNT(DISTINCT tr.staff_id) as staff_served_by
FROM pos.transactions tr
JOIN backoffice.customers c ON tr.customer_id = c.id
WHERE tr.payment_status = 'completed'
GROUP BY tr.customer_id, c.name, c.phone_number
WITH DATA;

-- Create unique indexes for concurrent refresh
CREATE UNIQUE INDEX idx_daily_sales_summary_unique 
ON pos.daily_sales_summary(sale_date, staff_id);

CREATE UNIQUE INDEX idx_product_sales_analytics_unique 
ON pos.product_sales_analytics(product_id, sales_month);

CREATE UNIQUE INDEX idx_customer_analytics_unique 
ON pos.customer_analytics(customer_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to resolve customer_id from booking
CREATE OR REPLACE FUNCTION pos.get_customer_id_from_booking(p_booking_id UUID)
RETURNS BIGINT AS $$
DECLARE
    v_customer_id BIGINT;
BEGIN
    SELECT bc.id INTO v_customer_id
    FROM bookings b
    JOIN public.customers c ON b.customer_id = c.id
    JOIN backoffice.customers bc ON bc.phone_number = c.phone_number
    WHERE b.id = p_booking_id
    LIMIT 1;
    
    RETURN v_customer_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get staff_id from PIN
CREATE OR REPLACE FUNCTION pos.get_staff_id_from_pin(p_staff_pin VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_staff_id INTEGER;
BEGIN
    SELECT id INTO v_staff_id
    FROM backoffice.staff
    WHERE pin = p_staff_pin
      AND is_active = true
    LIMIT 1;
    
    RETURN v_staff_id;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh all analytics views
CREATE OR REPLACE FUNCTION pos.refresh_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.daily_sales_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.product_sales_analytics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.customer_analytics;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE pos.orders IS 'Normalized orders table with proper foreign keys to staff, customer, and booking';
COMMENT ON TABLE pos.order_items IS 'Normalized order items - use order_items_enriched view for product details';
COMMENT ON TABLE pos.transactions IS 'Normalized transactions with required staff_id and proper customer/booking relationships';
COMMENT ON TABLE pos.transaction_items IS 'Normalized transaction items - use transaction_items_enriched view for full context';
COMMENT ON TABLE pos.table_sessions IS 'Enhanced with staff_id and customer_id foreign keys';

COMMENT ON VIEW pos.order_items_enriched IS 'Order items with product, category, and SKU information from products schema';
COMMENT ON VIEW pos.transaction_items_enriched IS 'Transaction items with full context from all related tables';
COMMENT ON VIEW pos.transactions_enriched IS 'Transactions with staff, customer, booking, and table information';
COMMENT ON VIEW pos.orders_enriched IS 'Orders with staff, customer, booking, and table information';

COMMENT ON MATERIALIZED VIEW pos.daily_sales_summary IS 'Daily sales aggregations by staff - refresh daily';
COMMENT ON MATERIALIZED VIEW pos.product_sales_analytics IS 'Monthly product performance metrics - refresh daily';
COMMENT ON MATERIALIZED VIEW pos.customer_analytics IS 'Customer lifetime value and behavior - refresh daily';

COMMENT ON FUNCTION pos.get_customer_id_from_booking IS 'Resolve BIGINT customer_id from booking UUID via phone number matching';
COMMENT ON FUNCTION pos.get_staff_id_from_pin IS 'Get active staff_id from PIN for foreign key population';
COMMENT ON FUNCTION pos.refresh_analytics IS 'Refresh all materialized views for analytics';

-- Final message
SELECT 'POS database normalization completed successfully! All tables now use proper foreign keys and views provide enriched data.' as status;