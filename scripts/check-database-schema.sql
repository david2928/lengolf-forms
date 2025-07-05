-- Check Database Schema for Inventory Tables
-- Run this first to see what column types you actually have

-- Check inventory_products table structure
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_products' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check inventory_categories table structure  
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_categories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check inventory_submission table structure
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'inventory_submission' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%inventory%'
ORDER BY table_name; 