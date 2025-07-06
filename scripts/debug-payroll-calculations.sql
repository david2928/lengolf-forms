-- Debug Payroll Calculations Script
-- This will help us see what the calculation logic is producing

-- ============================================
-- 1. TEST TIME ENTRY PROCESSING FOR JUNE 2025
-- ============================================

-- Check time entries that would be processed for June 2025
SELECT 
  staff_id,
  action,
  timestamp,
  DATE(timestamp) as entry_date,
  EXTRACT(DOW FROM timestamp) as day_of_week, -- 0=Sunday, 1=Monday
  'Raw entry' as status
FROM backoffice.time_entries
WHERE timestamp >= '2025-06-01' 
AND timestamp <= '2025-06-30 23:59:59'
ORDER BY staff_id, timestamp;

-- ============================================
-- 2. MANUAL DAILY HOURS CALCULATION FOR JUNE 2025
-- ============================================

-- Simulate the daily hours calculation logic
WITH paired_entries AS (
  SELECT 
    staff_id,
    DATE(timestamp) as entry_date,
    LAG(CASE WHEN action = 'clock_in' THEN timestamp END) 
      OVER (PARTITION BY staff_id, DATE(timestamp) ORDER BY timestamp) as clock_in_time,
    CASE WHEN action = 'clock_out' THEN timestamp END as clock_out_time,
    action,
    timestamp
  FROM backoffice.time_entries
  WHERE timestamp >= '2025-06-01' 
  AND timestamp <= '2025-06-30 23:59:59'
),
calculated_sessions AS (
  SELECT 
    staff_id,
    entry_date,
    clock_in_time,
    clock_out_time,
    CASE 
      WHEN clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600.0
      ELSE 0 
    END as session_hours,
    CASE 
      WHEN clock_in_time IS NULL AND action = 'clock_out' THEN 'Missing clock-in'
      WHEN clock_out_time IS NULL AND action = 'clock_in' THEN 'Missing clock-out'
      ELSE 'OK'
    END as status
  FROM paired_entries
  WHERE action = 'clock_out' OR (action = 'clock_in' AND clock_out_time IS NULL)
)
SELECT 
  staff_id,
  entry_date,
  COUNT(*) as total_entries,
  SUM(session_hours) as total_hours,
  ARRAY_AGG(status) as session_statuses,
  CASE 
    WHEN SUM(session_hours) >= 6 THEN 'Working day'
    WHEN SUM(session_hours) > 0 THEN 'Partial day'
    ELSE 'No hours'
  END as day_classification
FROM calculated_sessions
GROUP BY staff_id, entry_date
ORDER BY staff_id, entry_date;

-- ============================================
-- 3. CHECK STAFF COMPENSATION DATA
-- ============================================

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
    THEN '✅ Active for June 2025'
    ELSE '❌ Not active for June 2025'
  END as status_for_june
FROM backoffice.staff_compensation sc
JOIN backoffice.staff s ON sc.staff_id = s.id
WHERE s.is_active = true
ORDER BY sc.staff_id;

-- ============================================
-- 4. CHECK PUBLIC HOLIDAYS FOR JUNE 2025
-- ============================================

SELECT 
  holiday_date,
  holiday_name,
  is_active,
  CASE 
    WHEN holiday_date BETWEEN '2025-06-01' AND '2025-06-30' 
    THEN '✅ June 2025 holiday'
    ELSE '📅 Other month'
  END as relevance
FROM backoffice.public_holidays
WHERE is_active = true
AND EXTRACT(YEAR FROM holiday_date) = 2025
ORDER BY holiday_date; 