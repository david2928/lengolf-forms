-- Inventory Management Database Schema Setup
-- Run this script in Supabase SQL Editor to create the inventory tables

-- 1. Create inventory_categories table
CREATE TABLE IF NOT EXISTS inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create inventory_products table
CREATE TABLE IF NOT EXISTS inventory_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES inventory_categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  unit VARCHAR(50), -- 'bottles', 'pieces', 'packs', etc.
  input_type VARCHAR(50) NOT NULL, -- 'number', 'checkbox', 'textarea', 'select'
  input_options JSONB, -- For checkbox/select options
  reorder_threshold DECIMAL(10,2),
  supplier VARCHAR(200),
  display_order INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create inventory_submissions table
CREATE TABLE IF NOT EXISTS inventory_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_name VARCHAR(100) NOT NULL,
  submission_date DATE NOT NULL,
  inventory_data JSONB NOT NULL, -- { "product_id": "value", ... }
  reorder_alerts JSONB, -- Generated alerts for low stock
  notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID, -- Reference to user if using user management
  UNIQUE(submission_date, staff_name) -- One submission per staff per day
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_inventory_submissions_date ON inventory_submissions(submission_date);
CREATE INDEX IF NOT EXISTS idx_inventory_submissions_staff ON inventory_submissions(staff_name);
CREATE INDEX IF NOT EXISTS idx_inventory_products_category ON inventory_products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_products_active ON inventory_products(is_active);
CREATE INDEX IF NOT EXISTS idx_inventory_categories_active ON inventory_categories(is_active);

-- 5. Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 6. Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_inventory_categories_updated_at ON inventory_categories;
CREATE TRIGGER update_inventory_categories_updated_at
    BEFORE UPDATE ON inventory_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_products_updated_at ON inventory_products;
CREATE TRIGGER update_inventory_products_updated_at
    BEFORE UPDATE ON inventory_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable Row Level Security (RLS) - following Supabase best practices
ALTER TABLE inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_submissions ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for authenticated users
-- Categories - read access for all authenticated users
CREATE POLICY "Allow read access to inventory categories" ON inventory_categories
    FOR SELECT USING (auth.role() = 'authenticated');

-- Products - read access for all authenticated users
CREATE POLICY "Allow read access to inventory products" ON inventory_products
    FOR SELECT USING (auth.role() = 'authenticated');

-- Submissions - read and insert access for authenticated users
CREATE POLICY "Allow read access to inventory submissions" ON inventory_submissions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow insert access to inventory submissions" ON inventory_submissions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- For development/admin access, also allow service role full access
CREATE POLICY "Allow service role full access to categories" ON inventory_categories
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to products" ON inventory_products
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service role full access to submissions" ON inventory_submissions
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Success message
SELECT 'Inventory database schema created successfully!' as message; 