-- Product Management Migration Script
-- Imports products from all-products.csv into the new products schema
-- Handles category hierarchy and product mapping

-- First, create a temporary table to load CSV data
CREATE TEMP TABLE temp_csv_products (
    product_id TEXT,
    product_name TEXT,
    tab TEXT,
    category TEXT,
    sku TEXT,
    barcode TEXT,
    price NUMERIC
);

-- Note: You'll need to copy CSV data into this table using:
-- COPY temp_csv_products(product_id, product_name, tab, category, sku, barcode, price) 
-- FROM '/path/to/all-products.csv' 
-- WITH CSV HEADER;

-- Clean the data - remove empty rows
DELETE FROM temp_csv_products 
WHERE product_id IS NULL 
   OR product_id = '' 
   OR product_name IS NULL 
   OR product_name = '';

-- Create category hierarchy based on CSV data
-- Level 1: Tabs (top level categories)
INSERT INTO products.categories (id, parent_id, name, slug, display_order, is_active)
SELECT 
    gen_random_uuid(),
    NULL,
    tab,
    lower(replace(replace(tab, ' ', '-'), '&', 'and')),
    ROW_NUMBER() OVER (ORDER BY tab),
    true
FROM (
    SELECT DISTINCT tab 
    FROM temp_csv_products 
    WHERE tab IS NOT NULL AND tab != ''
) AS tabs
ON CONFLICT (slug) DO NOTHING;

-- Level 2: Categories (sub-categories under tabs)
INSERT INTO products.categories (id, parent_id, name, slug, display_order, is_active)
SELECT 
    gen_random_uuid(),
    parent.id,
    sub.category,
    lower(replace(replace(concat(parent.name, '-', sub.category), ' ', '-'), '&', 'and')),
    ROW_NUMBER() OVER (PARTITION BY parent.id ORDER BY sub.category),
    true
FROM (
    SELECT DISTINCT tab, category 
    FROM temp_csv_products 
    WHERE tab IS NOT NULL AND tab != ''
      AND category IS NOT NULL AND category != ''
) AS sub
JOIN products.categories parent ON parent.name = sub.tab AND parent.parent_id IS NULL
ON CONFLICT (slug) DO NOTHING;

-- Import products
INSERT INTO products.products (
    id,
    category_id,
    name,
    slug,
    price,
    sku,
    legacy_qashier_id,
    legacy_pos_name,
    is_active,
    display_order,
    created_by,
    is_custom_product,
    show_in_staff_ui
)
SELECT 
    gen_random_uuid(),
    cat.id,
    csv.product_name,
    lower(replace(replace(csv.product_name, ' ', '-'), '&', 'and')),
    COALESCE(csv.price, 0),
    NULLIF(csv.sku, ''),
    csv.product_id,
    csv.product_name,
    true,
    ROW_NUMBER() OVER (PARTITION BY cat.id ORDER BY csv.product_name),
    'migration_script',
    -- Mark as custom if price is 0 (like "Golf Lesson Used" products)
    CASE 
        WHEN csv.price = 0 OR csv.product_name LIKE '%Used%' THEN true
        ELSE false
    END,
    -- Hide custom products from staff UI
    CASE 
        WHEN csv.price = 0 OR csv.product_name LIKE '%Used%' THEN false
        ELSE true
    END
FROM temp_csv_products csv
JOIN products.categories tab_cat ON tab_cat.name = csv.tab AND tab_cat.parent_id IS NULL
JOIN products.categories cat ON cat.parent_id = tab_cat.id AND cat.name = csv.category
WHERE csv.product_name IS NOT NULL 
  AND csv.product_name != ''
ON CONFLICT (slug) DO NOTHING;

-- Create a summary report
SELECT 
    'Migration Summary' as report_type,
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE is_custom_product = true) as custom_products,
    COUNT(*) FILTER (WHERE show_in_staff_ui = false) as hidden_from_staff,
    COUNT(*) FILTER (WHERE price = 0) as zero_price_products
FROM products.products
WHERE created_by = 'migration_script';

-- Show category hierarchy
SELECT 
    parent.name as tab,
    child.name as category,
    COUNT(p.id) as product_count
FROM products.categories parent
LEFT JOIN products.categories child ON child.parent_id = parent.id
LEFT JOIN products.products p ON p.category_id = child.id
WHERE parent.parent_id IS NULL
GROUP BY parent.name, child.name
ORDER BY parent.name, child.name;

-- Drop temporary table
DROP TABLE temp_csv_products;