-- Simplified Admin Inventory Functions
-- This version uses generic types that should work with any string column configuration

-- Function to get inventory overview with reorder status for admin dashboard
CREATE OR REPLACE FUNCTION get_inventory_overview_with_reorder_status()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  category_id UUID,
  category_name TEXT,
  current_stock NUMERIC,
  current_stock_text TEXT,
  reorder_threshold NUMERIC,
  unit_cost NUMERIC,
  image_url TEXT,
  purchase_link TEXT,
  supplier TEXT,
  unit TEXT,
  input_type TEXT,
  last_updated_by TEXT,
  last_submission_date DATE,
  reorder_status TEXT,
  stock_difference NUMERIC
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH latest_inventory AS (
    -- Get the most recent submission for each product
    SELECT DISTINCT ON (s.product_id) 
      s.product_id,
      s.staff::TEXT,
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
      p.name::TEXT as product_name,
      p.category_id,
      c.name::TEXT as category_name,
      COALESCE(p.unit, '')::TEXT as unit,
      p.reorder_threshold,
      p.unit_cost,
      p.image_url,
      p.purchase_link,
      COALESCE(p.supplier, '')::TEXT as supplier,
      COALESCE(p.input_type, 'number')::TEXT as input_type,
      COALESCE(li.staff, '')::TEXT as last_updated_by,
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
      -- Determine reorder status (FIXED: now handles stock_slider values)
      CASE 
        -- Handle stock slider products based on value_text
        WHEN p.input_type = 'stock_slider' AND li.value_text = 'Out of Stock' THEN 'REORDER_NEEDED'
        WHEN p.input_type = 'stock_slider' AND li.value_text = 'Need to Order' THEN 'REORDER_NEEDED'
        WHEN p.input_type = 'stock_slider' AND li.value_text = 'Enough Stock' THEN 'ADEQUATE'
        WHEN p.input_type = 'stock_slider' AND li.value_text IS NULL THEN 'NO_DATA'
        -- Handle numeric products (existing logic)
        WHEN p.input_type != 'stock_slider' AND li.value_numeric IS NULL THEN 'NO_DATA'
        WHEN p.input_type != 'stock_slider' AND p.reorder_threshold IS NULL THEN 'NO_THRESHOLD'
        WHEN p.input_type != 'stock_slider' AND li.value_numeric <= p.reorder_threshold THEN 'REORDER_NEEDED'
        WHEN p.input_type != 'stock_slider' AND li.value_numeric <= (p.reorder_threshold * 1.2) THEN 'LOW_STOCK'
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
    iwp.value_text as current_stock_text,
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
  value_numeric NUMERIC,
  staff TEXT,
  product_name TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.date as submission_date,
    s.value_numeric,
    s.staff::TEXT,
    p.name::TEXT as product_name
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