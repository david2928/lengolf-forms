-- Migration Phase 1: Add new columns and create views
-- This migration adds missing columns and creates views without breaking existing functionality

-- Step 1: Fix customer_id data type in transactions table
-- First, we need to handle the UUID to BIGINT conversion
ALTER TABLE pos.transactions ADD COLUMN customer_id_new BIGINT;
ALTER TABLE pos.transaction_items ADD COLUMN customer_id_new BIGINT;

-- Step 2: Add foreign key constraints for new columns
ALTER TABLE pos.transactions 
    ADD CONSTRAINT fk_transactions_customer_new 
    FOREIGN KEY (customer_id_new) 
    REFERENCES backoffice.customers(id) 
    ON DELETE SET NULL;

ALTER TABLE pos.transaction_items 
    ADD CONSTRAINT fk_transaction_items_customer_new 
    FOREIGN KEY (customer_id_new) 
    REFERENCES backoffice.customers(id) 
    ON DELETE SET NULL;

-- Step 3: Create context views with all columns (including denormalized ones)
CREATE OR REPLACE VIEW pos.order_items_view AS
SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    COALESCE(p.name, oi.product_name) AS product_name,
    COALESCE(p.category_id, oi.category_id) AS category_id,
    COALESCE(c.name, oi.category_name) AS category_name,
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

-- Transaction items view with all denormalized data
CREATE OR REPLACE VIEW pos.transaction_items_view AS
SELECT 
    ti.id,
    ti.transaction_id,
    ti.item_sequence,
    ti.order_id,
    ti.table_session_id,
    ti.product_id,
    COALESCE(p.name, ti.product_name) AS product_name,
    COALESCE(c.name, ti.product_category) AS product_category,
    COALESCE(pc.name, ti.product_parent_category) AS product_parent_category,
    COALESCE(p.sku, ti.sku_number) AS sku_number,
    ti.item_cnt,
    ti.item_price_incl_vat,
    ti.item_price_excl_vat,
    ti.item_discount,
    ti.sales_total,
    ti.sales_net,
    ti.payment_method,
    ti.payment_amount_allocated,
    COALESCE(s.pin, ti.staff_pin) AS staff_pin,
    ti.staff_id,
    COALESCE(ti.customer_id_new, ti.customer_id::BIGINT) AS customer_id,
    COALESCE(cust.name, ti.customer_name) AS customer_name,
    COALESCE(t.table_number, ti.table_number) AS table_number,
    ti.is_sim_usage,
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
LEFT JOIN backoffice.customers cust ON COALESCE(ti.customer_id_new, ti.customer_id::BIGINT) = cust.id
LEFT JOIN pos.table_sessions ts ON ti.table_session_id = ts.id
LEFT JOIN pos.tables t ON ts.table_id = t.id;

-- Transactions view
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
    COALESCE(s.pin, tr.staff_pin) AS staff_pin,
    tr.staff_id,
    COALESCE(tr.customer_id_new, tr.customer_id::BIGINT) AS customer_id,
    COALESCE(t.table_number, tr.table_number) AS table_number,
    tr.transaction_date,
    tr.created_at,
    tr.updated_at
FROM pos.transactions tr
LEFT JOIN backoffice.staff s ON tr.staff_id = s.id
LEFT JOIN pos.table_sessions ts ON tr.table_session_id = ts.id
LEFT JOIN pos.tables t ON ts.table_id = t.id;

-- Step 4: Create performance materialized views
CREATE MATERIALIZED VIEW pos.daily_sales_summary AS
SELECT 
    DATE(tr.transaction_date) as sale_date,
    tr.staff_id,
    s.name as staff_name,
    s.pin as staff_pin,
    COUNT(DISTINCT tr.id) as transaction_count,
    COUNT(DISTINCT COALESCE(tr.customer_id_new, tr.customer_id::BIGINT)) as unique_customers,
    SUM(tr.total_amount) as total_sales,
    SUM(tr.vat_amount) as total_vat,
    SUM(tr.discount_amount) as total_discounts,
    AVG(tr.total_amount) as avg_transaction_value,
    JSONB_AGG(DISTINCT tr.payment_methods) as payment_methods_used
FROM pos.transactions tr
LEFT JOIN backoffice.staff s ON tr.staff_id = s.id
WHERE tr.payment_status = 'completed'
GROUP BY DATE(tr.transaction_date), tr.staff_id, s.name, s.pin
WITH DATA;

-- Create indexes on materialized view
CREATE INDEX idx_daily_sales_summary_date ON pos.daily_sales_summary(sale_date);
CREATE INDEX idx_daily_sales_summary_staff ON pos.daily_sales_summary(staff_id);

-- Product sales analytics view
CREATE MATERIALIZED VIEW pos.product_sales_analytics AS
SELECT 
    ti.product_id,
    COALESCE(p.name, ti.product_name) as product_name,
    COALESCE(p.sku, ti.sku_number) as sku_number,
    COALESCE(c.name, ti.product_category) as category_name,
    COALESCE(pc.name, ti.product_parent_category) as parent_category_name,
    DATE_TRUNC('month', ti.sales_timestamp) as sales_month,
    COUNT(DISTINCT ti.transaction_id) as transaction_count,
    SUM(ti.item_cnt) as total_quantity_sold,
    SUM(ti.sales_total) as total_revenue,
    SUM(ti.sales_net) as total_net_revenue,
    AVG(ti.item_price_incl_vat) as avg_selling_price,
    COUNT(DISTINCT COALESCE(ti.customer_id_new, ti.customer_id::BIGINT)) as unique_customers
FROM pos.transaction_items ti
LEFT JOIN products.products p ON ti.product_id = p.id
LEFT JOIN products.categories c ON p.category_id = c.id
LEFT JOIN products.categories pc ON c.parent_id = pc.id
WHERE ti.is_voided = false
GROUP BY 
    ti.product_id, 
    COALESCE(p.name, ti.product_name), 
    COALESCE(p.sku, ti.sku_number), 
    COALESCE(c.name, ti.product_category), 
    COALESCE(pc.name, ti.product_parent_category), 
    DATE_TRUNC('month', ti.sales_timestamp)
WITH DATA;

-- Create indexes on product analytics view
CREATE INDEX idx_product_sales_product ON pos.product_sales_analytics(product_id);
CREATE INDEX idx_product_sales_month ON pos.product_sales_analytics(sales_month);
CREATE INDEX idx_product_sales_category ON pos.product_sales_analytics(category_name);

-- Step 5: Create refresh function for materialized views
CREATE OR REPLACE FUNCTION pos.refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.daily_sales_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.product_sales_analytics;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON pos.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_product_id ON pos.transaction_items(product_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_staff_id ON pos.transaction_items(staff_id);
CREATE INDEX IF NOT EXISTS idx_transactions_staff_id ON pos.transactions(staff_id);

-- Comments
COMMENT ON VIEW pos.order_items_view IS 'Normalized view of order items with product and category information';
COMMENT ON VIEW pos.transaction_items_view IS 'Normalized view of transaction items with full context from related tables';
COMMENT ON VIEW pos.transactions_view IS 'Normalized view of transactions with staff and table information';
COMMENT ON MATERIALIZED VIEW pos.daily_sales_summary IS 'Daily aggregated sales data for reporting - refresh daily';
COMMENT ON MATERIALIZED VIEW pos.product_sales_analytics IS 'Monthly product sales analytics - refresh daily or on-demand';