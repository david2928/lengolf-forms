-- Insert Sample Inventory Data
-- This creates sample products and submissions to test the admin dashboard

-- First, let's get the category IDs
WITH category_ids AS (
  SELECT id, name FROM inventory_categories
)

-- Insert sample products
INSERT INTO inventory_products (category_id, name, unit, input_type, reorder_threshold, supplier, unit_cost, display_order)
SELECT 
  c.id,
  product_name,
  unit,
  'number',
  reorder_threshold,
  supplier,
  unit_cost,
  row_number() OVER ()
FROM category_ids c,
(VALUES
  -- Beer category products
  ('Beer', 'Bud Light', 'bottles', 24, 'Beer Distributor A', 1.25),
  ('Beer', 'Corona', 'bottles', 18, 'Beer Distributor A', 1.75),
  ('Beer', 'Stella Artois', 'bottles', 12, 'Beer Distributor B', 2.00),
  
  -- Liquor category products  
  ('Liquor', 'Grey Goose Vodka', 'bottles', 3, 'Liquor Distributor', 45.00),
  ('Liquor', 'Johnnie Walker Black', 'bottles', 2, 'Liquor Distributor', 55.00),
  ('Liquor', 'Patron Silver', 'bottles', 2, 'Liquor Distributor', 48.00),
  
  -- Wine category products
  ('Wine', 'Kendall Jackson Chardonnay', 'bottles', 6, 'Wine Distributor', 18.00),
  ('Wine', 'Caymus Cabernet', 'bottles', 4, 'Wine Distributor', 65.00),
  
  -- Non-Alcoholic products
  ('Non-Alcoholic', 'Coca Cola', 'cans', 48, 'Beverage Distributor', 0.75),
  ('Non-Alcoholic', 'Bottled Water', 'bottles', 24, 'Beverage Distributor', 0.50),
  
  -- Food & Supplies
  ('Food & Supplies', 'Golf Tees', 'packages', 10, 'Golf Supply Co', 3.50),
  ('Food & Supplies', 'Ball Markers', 'packages', 5, 'Golf Supply Co', 8.00)
) AS products(category_name, product_name, unit, reorder_threshold, supplier, unit_cost)
WHERE c.name = products.category_name
ON CONFLICT DO NOTHING;

-- Insert sample inventory submissions (recent data)
WITH product_data AS (
  SELECT 
    p.id as product_id,
    p.category_id,
    p.name,
    p.reorder_threshold
  FROM inventory_products p
  JOIN inventory_categories c ON p.category_id = c.id
)

INSERT INTO inventory_submission (date, staff, product_id, category_id, value_numeric)
SELECT 
  CURRENT_DATE - INTERVAL '1 day',
  staff_name,
  pd.product_id,
  pd.category_id,
  -- Create realistic stock levels (some below, at, and above reorder thresholds)
  CASE 
    WHEN pd.name LIKE '%Bud Light%' THEN 8   -- Below threshold (24) - needs reorder
    WHEN pd.name LIKE '%Corona%' THEN 5      -- Below threshold (18) - needs reorder  
    WHEN pd.name LIKE '%Stella%' THEN 15     -- Above threshold (12) - adequate
    WHEN pd.name LIKE '%Grey Goose%' THEN 1  -- Below threshold (3) - needs reorder
    WHEN pd.name LIKE '%Johnnie%' THEN 3     -- At threshold (2) - low stock
    WHEN pd.name LIKE '%Patron%' THEN 4      -- Above threshold (2) - adequate
    WHEN pd.name LIKE '%Kendall%' THEN 7     -- Above threshold (6) - low stock
    WHEN pd.name LIKE '%Caymus%' THEN 8      -- Above threshold (4) - adequate
    WHEN pd.name LIKE '%Coca%' THEN 25       -- Below threshold (48) - needs reorder
    WHEN pd.name LIKE '%Water%' THEN 30      -- Above threshold (24) - adequate
    WHEN pd.name LIKE '%Tees%' THEN 12       -- Above threshold (10) - adequate
    WHEN pd.name LIKE '%Markers%' THEN 2     -- Below threshold (5) - needs reorder
    ELSE 10
  END
FROM product_data pd,
(VALUES ('Net'), ('Dolly'), ('May')) AS staff(staff_name);

-- Add some historical data for trends (past 7 days)
INSERT INTO inventory_submission (date, staff, product_id, category_id, value_numeric)
SELECT 
  CURRENT_DATE - INTERVAL '2 days',
  'Net',
  pd.product_id,
  pd.category_id,
  -- Slightly different values for trend data
  CASE 
    WHEN pd.name LIKE '%Bud Light%' THEN 12
    WHEN pd.name LIKE '%Corona%' THEN 8
    WHEN pd.name LIKE '%Coca%' THEN 35
    WHEN pd.name LIKE '%Water%' THEN 28
    ELSE 15
  END
FROM product_data pd
WHERE pd.name IN ('Bud Light', 'Corona', 'Coca Cola', 'Bottled Water');

-- Success message
SELECT 'Sample inventory data inserted successfully!' as message,
       'Added products and submissions to test the admin dashboard' as details; 