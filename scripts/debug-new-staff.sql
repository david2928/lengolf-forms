-- Debug script to check current state of new staff members
-- This will help us understand what's wrong with service charge eligibility and time entries

-- ============================================
-- 1. CHECK STAFF RECORDS
-- ============================================
SELECT 
  'STAFF RECORDS' as section,
  s.id,
  s.staff_name,
  s.staff_id,
  s.is_active,
  s.is_service_charge_eligible as staff_table_eligible,
  s.created_at
FROM backoffice.staff s
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
ORDER BY s.staff_name;

-- ============================================
-- 2. CHECK COMPENSATION RECORDS
-- ============================================
SELECT 
  'COMPENSATION RECORDS' as section,
  s.staff_name,
  sc.base_salary,
  sc.ot_rate_per_hour,
  sc.holiday_rate_per_hour,
  sc.is_service_charge_eligible as compensation_table_eligible,
  sc.effective_from,
  sc.effective_to,
  CASE 
    WHEN sc.effective_from <= '2025-06-01' AND (sc.effective_to IS NULL OR sc.effective_to >= '2025-06-30') 
    THEN '✅ Active for June 2025'
    ELSE '❌ Not active for June 2025'
  END as june_2025_status
FROM backoffice.staff_compensation sc
JOIN backoffice.staff s ON sc.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
ORDER BY s.staff_name;

-- ============================================
-- 3. CHECK TIME ENTRIES
-- ============================================
SELECT 
  'TIME ENTRIES SUMMARY' as section,
  s.staff_name,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE te.action = 'clock_in') as clock_ins,
  COUNT(*) FILTER (WHERE te.action = 'clock_out') as clock_outs,
  MIN(DATE(te.timestamp)) as first_entry_date,
  MAX(DATE(te.timestamp)) as last_entry_date
FROM backoffice.time_entries te
JOIN backoffice.staff s ON te.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
AND te.timestamp >= '2025-06-01'
AND te.timestamp <= '2025-06-30 23:59:59'
GROUP BY s.staff_name
ORDER BY s.staff_name;

-- ============================================
-- 4. CHECK DETAILED TIME ENTRIES
-- ============================================
SELECT 
  'DETAILED TIME ENTRIES' as section,
  s.staff_name,
  DATE(te.timestamp) as entry_date,
  te.action,
  te.timestamp::time as entry_time,
  te.photo_captured
FROM backoffice.time_entries te
JOIN backoffice.staff s ON te.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
AND te.timestamp >= '2025-06-01'
AND te.timestamp <= '2025-06-30 23:59:59'
ORDER BY s.staff_name, te.timestamp;

-- ============================================
-- 5. CHECK IF STAFF EXISTS AT ALL
-- ============================================
SELECT 
  'STAFF EXISTENCE CHECK' as section,
  COUNT(*) as total_staff_count
FROM backoffice.staff s
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie');

-- ============================================
-- 6. CHECK PAYROLL CALCULATION QUERY
-- ============================================
-- This mimics what the payroll system would do to calculate data
SELECT 
  'PAYROLL CALCULATION TEST' as section,
  s.staff_name,
  sc.base_salary,
  sc.is_service_charge_eligible,
  COUNT(DISTINCT DATE(te.timestamp)) as working_days,
  SUM(
    CASE 
      WHEN te.action = 'clock_in' THEN 1
      WHEN te.action = 'clock_out' THEN -1
      ELSE 0
    END
  ) as clock_balance
FROM backoffice.staff s
LEFT JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id
LEFT JOIN backoffice.time_entries te ON s.id = te.staff_id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
AND (te.timestamp IS NULL OR (te.timestamp >= '2025-06-01' AND te.timestamp <= '2025-06-30 23:59:59'))
AND (sc.effective_from IS NULL OR sc.effective_from <= '2025-06-01')
AND (sc.effective_to IS NULL OR sc.effective_to >= '2025-06-30')
GROUP BY s.staff_name, sc.base_salary, sc.is_service_charge_eligible
ORDER BY s.staff_name;

-- ============================================
-- 7. CHECK ALL STAFF FOR COMPARISON
-- ============================================
SELECT 
  'ALL STAFF COMPARISON' as section,
  s.staff_name,
  s.is_service_charge_eligible as staff_table_eligible,
  sc.is_service_charge_eligible as compensation_table_eligible,
  CASE 
    WHEN s.is_service_charge_eligible = sc.is_service_charge_eligible THEN '✅ Match'
    ELSE '❌ Mismatch'
  END as eligibility_match
FROM backoffice.staff s
LEFT JOIN backoffice.staff_compensation sc ON s.id = sc.staff_id
WHERE s.is_active = true
AND (sc.effective_from IS NULL OR sc.effective_from <= '2025-06-01')
AND (sc.effective_to IS NULL OR sc.effective_to >= '2025-06-30')
ORDER BY s.staff_name; 