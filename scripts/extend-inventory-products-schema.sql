-- Inventory Products Schema Extension
-- Migration script for admin dashboard metadata fields
-- Run this script in Supabase SQL Editor

-- Add new columns to inventory_products table for admin dashboard
ALTER TABLE inventory_products 
ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS purchase_link TEXT;

-- Add comments to document the new fields
COMMENT ON COLUMN inventory_products.unit_cost IS 'Cost per unit for inventory value calculations';
COMMENT ON COLUMN inventory_products.image_url IS 'URL to product image for admin dashboard display';  
COMMENT ON COLUMN inventory_products.purchase_link IS 'URL to supplier purchase page for reordering';

-- Verify the schema changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_products' 
AND column_name IN ('unit_cost', 'image_url', 'purchase_link')
ORDER BY column_name;

-- Success message
SELECT 'Inventory products schema extended successfully!' as message,
       'Added: unit_cost, image_url, purchase_link columns' as details; 