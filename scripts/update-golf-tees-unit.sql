-- Update Golf Tees (Rubber) unit from "pieces" to "tees"
-- Run this script in Supabase SQL Editor

-- First check the current state
SELECT 
  id,
  name,
  unit,
  input_type,
  category_id
FROM inventory_products 
WHERE name ILIKE '%golf tees%rubber%' 
   OR name ILIKE '%golf tees (rubber)%'
   OR name = 'Golf Tees (Rubber)';

-- Update the unit
UPDATE inventory_products 
SET 
  unit = 'tees',
  updated_at = NOW()
WHERE name ILIKE '%golf tees%rubber%' 
   OR name ILIKE '%golf tees (rubber)%'
   OR name = 'Golf Tees (Rubber)';

-- Verify the update
SELECT 
  id,
  name,
  unit,
  input_type,
  category_id,
  updated_at
FROM inventory_products 
WHERE name ILIKE '%golf tees%rubber%' 
   OR name ILIKE '%golf tees (rubber)%'
   OR name = 'Golf Tees (Rubber)';

-- Show success message
SELECT 'Golf Tees (Rubber) unit updated successfully from "pieces" to "tees"' AS result; 