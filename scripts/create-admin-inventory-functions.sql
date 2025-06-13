-- Admin Inventory Dashboard Database Functions
-- Creates the database functions needed for the admin dashboard API

-- Function to get inventory overview with reorder status for admin dashboard
CREATE OR REPLACE FUNCTION get_inventory_overview_with_reorder_status()
RETURNS TABLE (
  product_id UUID,
  product_name VARCHAR(200),
  category_id UUID,
  category_name VARCHAR(200),
  current_stock DECIMAL,
  reorder_threshold DECIMAL,
  unit_cost DECIMAL,
  image_url TEXT,
  purchase_link TEXT,
  supplier VARCHAR(200),
  unit VARCHAR(50),
  input_type VARCHAR(50),
  last_updated_by VARCHAR(100),
  last_submission_date DATE,
  reorder_status TEXT,
  stock_difference DECIMAL
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH latest_inventory AS (
    -- Get the most recent submission for each product
    SELECT DISTINCT ON (s.product_id) 
      s.product_id,
      s.staff,
      s.date,
      s.value_numeric,
      s.value_text,
      s.value_json,
      s.created_at
    FROM inventory_submission s
    ORDER BY s.product_id, s.created_at DESC
  ),
  inventory_with_products AS (
    -- Join with product information to get names and reorder thresholds
    SELECT 
      p.id as product_id,
      p.name as product_name,
      p.category_id,
      c.name as category_name,
      p.unit,
      p.reorder_threshold,
      p.unit_cost,
      p.image_url,
      p.purchase_link,
      p.supplier,
      p.input_type,
      li.staff as last_updated_by,
      li.date as last_submission_date,
      li.value_numeric as current_stock,
      li.value_text,
      li.value_json,
      -- Calculate the difference (current - reorder threshold)
      CASE 
        WHEN li.value_numeric IS NOT NULL AND p.reorder_threshold IS NOT NULL 
        THEN li.value_numeric - p.reorder_threshold
        ELSE NULL 
      END as stock_difference,
      -- Determine reorder status
      CASE 
        WHEN li.value_numeric IS NULL THEN 'NO_DATA'
        WHEN p.reorder_threshold IS NULL THEN 'NO_THRESHOLD'
        WHEN li.value_numeric <= p.reorder_threshold THEN 'REORDER_NEEDED'
        WHEN li.value_numeric <= (p.reorder_threshold * 1.2) THEN 'LOW_STOCK'
        ELSE 'ADEQUATE'
      END as reorder_status
    FROM inventory_products p
    JOIN inventory_categories c ON p.category_id = c.id
    LEFT JOIN latest_inventory li ON p.id = li.product_id
    WHERE p.is_active = true
  )
  SELECT 
    iwp.product_id,
    iwp.product_name,
    iwp.category_id,
    iwp.category_name,
    iwp.current_stock,
    iwp.reorder_threshold,
    iwp.unit_cost,
    iwp.image_url,
    iwp.purchase_link,
    iwp.supplier,
    iwp.unit,
    iwp.input_type,
    iwp.last_updated_by,
    iwp.last_submission_date,
    iwp.reorder_status,
    iwp.stock_difference
  FROM inventory_with_products iwp
  ORDER BY 
    -- Order by priority: reorder needed first, then by stock difference
    CASE 
      WHEN iwp.reorder_status = 'REORDER_NEEDED' THEN 1
      WHEN iwp.reorder_status = 'LOW_STOCK' THEN 2
      WHEN iwp.reorder_status = 'ADEQUATE' THEN 3
      ELSE 4
    END,
    iwp.stock_difference ASC NULLS LAST,
    iwp.product_name ASC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_inventory_overview_with_reorder_status() TO authenticated;

-- Function to get 14-day trend data for a specific product
CREATE OR REPLACE FUNCTION get_product_trend_data(target_product_id UUID)
RETURNS TABLE (
  submission_date DATE,
  value_numeric DECIMAL,
  staff VARCHAR(100),
  product_name VARCHAR(200)
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.date as submission_date,
    s.value_numeric,
    s.staff,
    p.name as product_name
  FROM inventory_submission s
  JOIN inventory_products p ON s.product_id = p.id
  WHERE s.product_id = target_product_id
    AND s.value_numeric IS NOT NULL  -- Only numerical values
    AND s.date >= CURRENT_DATE - INTERVAL '14 days'
  ORDER BY s.date DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_product_trend_data(UUID) TO authenticated;

-- Success message
SELECT 'Admin inventory functions created successfully!' as message; 