-- Update specific products to use stock_slider instead of checkbox
-- Run this script in Supabase SQL Editor to update product input types

-- Update products that should use stock slider
-- These products currently have checkbox input type with stock level options
UPDATE inventory_products 
SET 
  input_type = 'stock_slider',
  input_options = NULL,  -- Remove old checkbox options since slider uses predefined values
  updated_at = NOW()
WHERE name IN (
  'Straws',
  'Paper towels', 
  'Ice',
  'Cleaning Supply (Floor Cleaner)',
  'Cleaning Supply (General Cleaner)', 
  'Cleaning Supply (Handwash)',
  'Cleaning Supply (Dishwashing Liquid)',
  'Napkins (normal)',
  'Napkins (wet)', 
  'Paper Plates',
  'Fork/Knives/Spoons'
)
AND input_type = 'checkbox';

-- Update Golf gloves to use the new glove_sizes input type
UPDATE inventory_products 
SET 
  input_type = 'glove_sizes',
  input_options = NULL,  -- Remove old options since glove sizes component handles this
  updated_at = NOW()
WHERE name = 'Golf gloves'
AND input_type IN ('textarea', 'checkbox');

-- Update Cash field to ensure it's number type (should already be, but just in case)
UPDATE inventory_products 
SET 
  input_type = 'number',
  unit = NULL,  -- Remove unit since we'll add "THB" label in the component
  updated_at = NOW()
WHERE name ILIKE '%cash%'
AND input_type != 'number';

-- Show what was updated
SELECT 
  name,
  input_type,
  input_options,
  updated_at
FROM inventory_products 
WHERE name IN (
  'Straws',
  'Paper towels', 
  'Ice',
  'Cleaning Supply (Floor Cleaner)',
  'Cleaning Supply (General Cleaner)', 
  'Cleaning Supply (Handwash)',
  'Cleaning Supply (Dishwashing Liquid)',
  'Napkins (normal)',
  'Napkins (wet)', 
  'Paper Plates',
  'Fork/Knives/Spoons',
  'Golf gloves'
) OR name ILIKE '%cash%'
ORDER BY name;

-- Success message
SELECT 'Product input types updated successfully! Slider and specialized inputs are now configured.' as message; 