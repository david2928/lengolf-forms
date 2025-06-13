-- Create Missing Inventory Tables
-- This script creates the inventory tables that should exist but are missing

-- Create inventory_categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_products table if it doesn't exist  
CREATE TABLE IF NOT EXISTS inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES inventory_categories(id),
  name TEXT NOT NULL,
  unit TEXT,
  input_type TEXT NOT NULL DEFAULT 'number',
  input_options JSONB,
  reorder_threshold DECIMAL(10,2),
  supplier TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Admin dashboard fields (from the previous script)
  unit_cost DECIMAL(10,2),
  image_url TEXT,
  purchase_link TEXT
);

-- Create inventory_submission table
CREATE TABLE IF NOT EXISTS inventory_submission (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  staff TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES inventory_products(id),
  category_id UUID NOT NULL REFERENCES inventory_categories(id),
  value_numeric DECIMAL(10,2),
  value_text TEXT,
  value_json JSONB,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_submission_product_id ON inventory_submission(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_submission_date ON inventory_submission(date);
CREATE INDEX IF NOT EXISTS idx_inventory_submission_staff ON inventory_submission(staff);
CREATE INDEX IF NOT EXISTS idx_inventory_products_category_id ON inventory_products(category_id);

-- Add comments
COMMENT ON TABLE inventory_categories IS 'Product categories for inventory management';
COMMENT ON TABLE inventory_products IS 'Products tracked in inventory system';
COMMENT ON TABLE inventory_submission IS 'Daily inventory submissions by staff';

COMMENT ON COLUMN inventory_products.unit_cost IS 'Cost per unit for inventory value calculations';
COMMENT ON COLUMN inventory_products.image_url IS 'URL to product image for admin dashboard display';  
COMMENT ON COLUMN inventory_products.purchase_link IS 'URL to supplier purchase page for reordering';

-- Insert default categories if they don't exist
INSERT INTO inventory_categories (name, display_order) 
VALUES 
  ('Beer', 1),
  ('Liquor', 2), 
  ('Wine', 3),
  ('Non-Alcoholic', 4),
  ('Food & Supplies', 5),
  ('Other', 6)
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Inventory tables created successfully!' as message,
       'Created: inventory_categories, inventory_products, inventory_submission' as details; 