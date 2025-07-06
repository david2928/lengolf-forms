-- Fix Staff Compensation Effective Dates
-- This updates the effective_from dates to cover June 2025

-- ============================================
-- UPDATE COMPENSATION EFFECTIVE DATES
-- ============================================

-- Update all compensation records to be effective from June 1st, 2025
-- This will make them active for June 2025 payroll calculations
UPDATE backoffice.staff_compensation 
SET effective_from = '2025-06-01'
WHERE effective_from = '2025-07-05';

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the updated compensation records
SELECT 
  sc.staff_id,
  s.staff_name,
  sc.base_salary,
  sc.ot_rate_per_hour,
  sc.holiday_rate_per_hour,
  sc.is_service_charge_eligible,
  sc.effective_from,
  sc.effective_to,
  CASE 
    WHEN sc.effective_from <= '2025-06-30' 
    AND (sc.effective_to IS NULL OR sc.effective_to >= '2025-06-30')
    THEN '✅ NOW Active for June 2025'
    ELSE '❌ Still not active for June 2025'
  END as status_for_june
FROM backoffice.staff_compensation sc
JOIN backoffice.staff s ON sc.staff_id = s.id
WHERE s.is_active = true
ORDER BY sc.staff_id; 