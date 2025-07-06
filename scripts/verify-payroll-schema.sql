-- Payroll Schema Verification Script
-- Run each section separately in Supabase SQL Editor

-- ============================================
-- 1. CHECK TABLE RECORD COUNTS
-- ============================================

SELECT 
  'public_holidays' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as status
FROM backoffice.public_holidays

UNION ALL

SELECT 
  'staff_compensation' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY - THIS IS THE PROBLEM!'
  END as status
FROM backoffice.staff_compensation

UNION ALL

SELECT 
  'payroll_settings' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA'
    ELSE '❌ EMPTY'
  END as status
FROM backoffice.payroll_settings

UNION ALL

SELECT 
  'monthly_service_charge' as table_name,
  COUNT(*) as record_count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ HAS DATA (expected to be empty)'
    ELSE '✅ EMPTY (expected)'
  END as status
FROM backoffice.monthly_service_charge

ORDER BY table_name;

-- ============================================
-- 2. CHECK STAFF TABLE COLUMN
-- ============================================

SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable,
  CASE 
    WHEN column_name = 'is_service_charge_eligible' THEN '✅ COLUMN EXISTS'
    ELSE '❌ COLUMN MISSING'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'backoffice' 
AND table_name = 'staff' 
AND column_name = 'is_service_charge_eligible';

-- ============================================
-- 3. CHECK CURRENT STAFF (should have compensation data)
-- ============================================

SELECT 
  s.id,
  s.staff_name,
  s.is_active,
  CASE 
    WHEN s.is_service_charge_eligible IS NOT NULL THEN '✅ Column exists'
    ELSE '❌ Column missing'
  END as column_check,
  CASE 
    WHEN sc.staff_id IS NOT NULL THEN '✅ Has compensation'
    ELSE '❌ Missing compensation - THIS IS THE PROBLEM!'
  END as compensation_status
FROM backoffice.staff s
LEFT JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id 
WHERE s.is_active = true
ORDER BY s.staff_name;

-- ============================================
-- 4. CHECK PAYROLL SETTINGS
-- ============================================

SELECT 
  setting_key,
  setting_value,
  CASE 
    WHEN setting_key = 'daily_allowance_thb' THEN '✅ Daily allowance setting exists'
    ELSE '✅ Other setting'
  END as status
FROM backoffice.payroll_settings
ORDER BY setting_key; 