-- Inventory Reorder Analysis Query
-- This query shows the latest inventory levels by product name,
-- ranked by the difference between current stock and reorder level (smallest to largest)

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
    p.name as product_name,
    p.unit,
    p.reorder_threshold,
    p.supplier,
    c.name as category_name,
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
      WHEN li.value_numeric IS NULL THEN 'No numeric data'
      WHEN p.reorder_threshold IS NULL THEN 'No threshold set'
      WHEN li.value_numeric <= p.reorder_threshold THEN 'REORDER NEEDED'
      WHEN li.value_numeric <= (p.reorder_threshold * 1.2) THEN 'LOW STOCK'
      ELSE 'ADEQUATE'
    END as reorder_status
  FROM latest_inventory li
  JOIN inventory_products p ON li.product_id = p.id
  JOIN inventory_categories c ON p.category_id = c.id
  WHERE p.is_active = true
)
SELECT 
  product_name,
  category_name,
  current_stock,
  unit,
  reorder_threshold,
  stock_difference,
  reorder_status,
  supplier,
  last_updated_by,
  last_submission_date,
  -- Additional context for non-numeric values
  CASE 
    WHEN value_text IS NOT NULL THEN value_text
    WHEN value_json IS NOT NULL THEN value_json::text
    ELSE NULL
  END as additional_notes
FROM inventory_with_products
WHERE 
  -- Only show products with numeric values and reorder thresholds for ranking
  current_stock IS NOT NULL 
  AND reorder_threshold IS NOT NULL
ORDER BY 
  -- Order by stock difference (smallest to largest)
  -- This puts the most critical reorders first (negative differences)
  stock_difference ASC,
  product_name ASC;

-- Alternative query to show ALL products including non-numeric ones
-- Uncomment the section below if you want to see all inventory items

/*
-- COMPREHENSIVE INVENTORY VIEW (includes all products)
SELECT 
  product_name,
  category_name,
  current_stock,
  unit,
  reorder_threshold,
  stock_difference,
  reorder_status,
  supplier,
  last_updated_by,
  last_submission_date,
  CASE 
    WHEN value_text IS NOT NULL THEN value_text
    WHEN value_json IS NOT NULL THEN value_json::text
    ELSE NULL
  END as additional_notes
FROM inventory_with_products
ORDER BY 
  -- First show items with numeric stock differences
  CASE WHEN stock_difference IS NOT NULL THEN 0 ELSE 1 END,
  stock_difference ASC NULLS LAST,
  product_name ASC;
*/

-- Summary statistics query
-- Uncomment to see overall inventory health metrics

/*
-- INVENTORY HEALTH SUMMARY
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN reorder_status = 'REORDER NEEDED' THEN 1 END) as needs_reorder,
  COUNT(CASE WHEN reorder_status = 'LOW STOCK' THEN 1 END) as low_stock,
  COUNT(CASE WHEN reorder_status = 'ADEQUATE' THEN 1 END) as adequate_stock,
  COUNT(CASE WHEN reorder_status = 'No threshold set' THEN 1 END) as no_threshold,
  COUNT(CASE WHEN reorder_status = 'No numeric data' THEN 1 END) as no_numeric_data,
  ROUND(AVG(stock_difference), 2) as avg_stock_difference
FROM inventory_with_products;
*/ 