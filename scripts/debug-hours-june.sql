-- Debug Hours Calculation for June 2025
-- This will show why hours might not be appearing in the payroll overview

-- Check time entries by staff for June 2025
SELECT 
  'TIME ENTRIES BY STAFF (JUNE 2025)' as section,
  s.staff_name,
  COUNT(*) as total_entries,
  COUNT(*) FILTER (WHERE te.action = 'clock_in') as clock_ins,
  COUNT(*) FILTER (WHERE te.action = 'clock_out') as clock_outs,
  MIN(DATE(te.timestamp)) as first_date,
  MAX(DATE(te.timestamp)) as last_date
FROM backoffice.time_entries te
JOIN backoffice.staff s ON te.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
AND te.timestamp >= '2025-06-01T00:00:00'
AND te.timestamp <= '2025-06-30T23:59:59'
GROUP BY s.staff_name, s.id
ORDER BY s.staff_name;

-- Check daily hours calculation (requires >=6 hours to count as working day)
WITH daily_sessions AS (
  SELECT 
    s.staff_name,
    DATE(te.timestamp) as work_date,
    te.action,
    te.timestamp,
    ROW_NUMBER() OVER (PARTITION BY s.id, DATE(te.timestamp), te.action ORDER BY te.timestamp) as action_seq
  FROM backoffice.time_entries te
  JOIN backoffice.staff s ON te.staff_id = s.id
  WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
  AND te.timestamp >= '2025-06-01T00:00:00'
  AND te.timestamp <= '2025-06-30T23:59:59'
),
paired_sessions AS (
  SELECT 
    ci.staff_name,
    ci.work_date,
    ci.timestamp as clock_in,
    co.timestamp as clock_out,
    CASE 
      WHEN co.timestamp IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (co.timestamp - ci.timestamp)) / 3600.0
      ELSE NULL
    END as hours_worked
  FROM daily_sessions ci
  LEFT JOIN daily_sessions co ON 
    ci.staff_name = co.staff_name 
    AND ci.work_date = co.work_date
    AND ci.action = 'clock_in' 
    AND co.action = 'clock_out'
    AND ci.action_seq = co.action_seq
  WHERE ci.action = 'clock_in'
),
daily_totals AS (
  SELECT 
    staff_name,
    work_date,
    SUM(hours_worked) as total_hours,
    COUNT(*) FILTER (WHERE hours_worked IS NULL) as missing_clockouts,
    CASE 
      WHEN SUM(hours_worked) >= 6 THEN 1 
      ELSE 0 
    END as counts_as_working_day
  FROM paired_sessions
  GROUP BY staff_name, work_date
)
SELECT 
  'DAILY HOURS ANALYSIS (JUNE 2025)' as section,
  staff_name,
  work_date,
  COALESCE(total_hours, 0) as hours_worked,
  missing_clockouts,
  counts_as_working_day,
  CASE 
    WHEN total_hours IS NULL THEN 'Missing clock-out'
    WHEN total_hours < 6 THEN 'Less than 6 hours - not counted as working day'
    ELSE 'Valid working day'
  END as status
FROM daily_totals
ORDER BY staff_name, work_date;

-- Summary of working days (what payroll system will count)
WITH daily_sessions AS (
  SELECT 
    s.id as staff_id,
    s.staff_name,
    DATE(te.timestamp) as work_date,
    te.action,
    te.timestamp,
    ROW_NUMBER() OVER (PARTITION BY s.id, DATE(te.timestamp), te.action ORDER BY te.timestamp) as action_seq
  FROM backoffice.time_entries te
  JOIN backoffice.staff s ON te.staff_id = s.id
  WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
  AND te.timestamp >= '2025-06-01T00:00:00'
  AND te.timestamp <= '2025-06-30T23:59:59'
),
paired_sessions AS (
  SELECT 
    ci.staff_id,
    ci.staff_name,
    ci.work_date,
    ci.timestamp as clock_in,
    co.timestamp as clock_out,
    CASE 
      WHEN co.timestamp IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (co.timestamp - ci.timestamp)) / 3600.0
      ELSE NULL
    END as hours_worked
  FROM daily_sessions ci
  LEFT JOIN daily_sessions co ON 
    ci.staff_id = co.staff_id 
    AND ci.work_date = co.work_date
    AND ci.action = 'clock_in' 
    AND co.action = 'clock_out'
    AND ci.action_seq = co.action_seq
  WHERE ci.action = 'clock_in'
),
daily_totals AS (
  SELECT 
    staff_id,
    staff_name,
    work_date,
    SUM(hours_worked) as total_hours
  FROM paired_sessions
  GROUP BY staff_id, staff_name, work_date
)
SELECT 
  'WORKING DAYS SUMMARY (PAYROLL CALCULATION)' as section,
  staff_name,
  COUNT(*) as total_days_with_entries,
  COUNT(*) FILTER (WHERE total_hours >= 6) as working_days_counted,
  SUM(COALESCE(total_hours, 0)) as total_hours,
  COUNT(*) FILTER (WHERE total_hours IS NULL) as days_with_missing_clockouts,
  CASE 
    WHEN COUNT(*) FILTER (WHERE total_hours >= 6) = 0 THEN 'NO WORKING DAYS - Will show ฿0 allowance'
    ELSE CONCAT(COUNT(*) FILTER (WHERE total_hours >= 6), ' working days - Will show allowance')
  END as payroll_impact
FROM daily_totals
GROUP BY staff_id, staff_name
ORDER BY staff_name;

SELECT 'Hours debug completed! Check if staff have valid working days (>=6 hours/day).' as message; 