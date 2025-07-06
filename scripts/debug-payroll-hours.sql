-- Debug Payroll Hours Calculation for June 2025
-- This script will help identify why hours are showing as 0 despite valid time entries

-- ============================================
-- 1. RAW TIME ENTRIES FOR NEW STAFF
-- ============================================

SELECT 
  'RAW TIME ENTRIES' as section,
  s.staff_name,
  te.action,
  te.timestamp,
  te.timestamp::date as entry_date,
  te.timestamp::time as entry_time,
  EXTRACT(EPOCH FROM te.timestamp) as unix_timestamp
FROM backoffice.time_entries te
JOIN backoffice.staff s ON te.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
AND te.timestamp >= '2025-06-01T00:00:00'
AND te.timestamp <= '2025-06-30T23:59:59'
ORDER BY s.staff_name, te.timestamp;

-- ============================================
-- 2. SIMULATE PAYROLL CALCULATION LOGIC
-- ============================================

-- Simulate the exact logic from calculateDailyHours function
WITH time_entries AS (
  SELECT 
    s.id as staff_id,
    s.staff_name,
    te.action,
    te.timestamp,
    -- This mimics: entryDate.toISOString().split('T')[0]
    (te.timestamp AT TIME ZONE 'UTC')::date as entry_date_utc,
    -- This mimics: clockIn.toISOString().split('T')[0]
    (te.timestamp AT TIME ZONE 'UTC')::date as clock_in_date_utc
  FROM backoffice.time_entries te
  JOIN backoffice.staff s ON te.staff_id = s.id
  WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
  AND te.timestamp >= '2025-06-01T00:00:00'
  AND te.timestamp <= '2025-06-30T23:59:59'
),
daily_groups AS (
  SELECT 
    staff_id,
    staff_name,
    entry_date_utc,
    array_agg(
      json_build_object(
        'action', action,
        'timestamp', timestamp,
        'clock_in_date_utc', clock_in_date_utc
      ) ORDER BY timestamp
    ) as entries
  FROM time_entries
  GROUP BY staff_id, staff_name, entry_date_utc
),
processed_groups AS (
  SELECT 
    staff_id,
    staff_name,
    entry_date_utc,
    entries,
    -- Simulate the pairing logic
    (SELECT count(*) FROM jsonb_array_elements(entries::jsonb) AS e WHERE e->>'action' = 'clock_in') as clock_ins,
    (SELECT count(*) FROM jsonb_array_elements(entries::jsonb) AS e WHERE e->>'action' = 'clock_out') as clock_outs
  FROM daily_groups
)
SELECT 
  'DAILY GROUPS SIMULATION' as section,
  staff_name,
  entry_date_utc,
  clock_ins,
  clock_outs,
  -- This shows if the cross-day logic would work
  CASE 
    WHEN clock_ins = clock_outs THEN 'Should have sessions calculated'
    ELSE 'Would have missing clock-out issue'
  END as expected_result,
  entries
FROM processed_groups
ORDER BY staff_name, entry_date_utc;

-- ============================================
-- 3. MANUAL HOUR CALCULATION 
-- ============================================

-- Calculate hours manually to see what they should be
WITH paired_entries AS (
  SELECT 
    s.staff_name,
    te.timestamp::date as work_date,
    te.action,
    te.timestamp,
    LAG(te.timestamp) OVER (
      PARTITION BY s.id, te.timestamp::date 
      ORDER BY te.timestamp
    ) as prev_timestamp,
    LAG(te.action) OVER (
      PARTITION BY s.id, te.timestamp::date 
      ORDER BY te.timestamp
    ) as prev_action
  FROM backoffice.time_entries te
  JOIN backoffice.staff s ON te.staff_id = s.id
  WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
  AND te.timestamp >= '2025-06-01T00:00:00'
  AND te.timestamp <= '2025-06-30T23:59:59'
),
sessions AS (
  SELECT 
    staff_name,
    work_date,
    prev_timestamp as clock_in,
    timestamp as clock_out,
    EXTRACT(EPOCH FROM (timestamp - prev_timestamp)) / 3600.0 as hours_worked
  FROM paired_entries
  WHERE action = 'clock_out' 
  AND prev_action = 'clock_in'
),
daily_totals AS (
  SELECT 
    staff_name,
    work_date,
    count(*) as sessions_count,
    sum(hours_worked) as total_hours,
    array_agg(
      json_build_object(
        'clock_in', clock_in,
        'clock_out', clock_out,
        'hours', round(hours_worked::numeric, 2)
      ) ORDER BY clock_in
    ) as session_details
  FROM sessions
  GROUP BY staff_name, work_date
)
SELECT 
  'MANUAL CALCULATION' as section,
  staff_name,
  work_date,
  sessions_count,
  round(total_hours::numeric, 2) as total_hours,
  session_details
FROM daily_totals
ORDER BY staff_name, work_date;

-- ============================================
-- 4. TIMEZONE ANALYSIS
-- ============================================

SELECT 
  'TIMEZONE ANALYSIS' as section,
  s.staff_name,
  te.timestamp as original_timestamp,
  te.timestamp AT TIME ZONE 'UTC' as utc_timestamp,
  te.timestamp AT TIME ZONE 'Asia/Bangkok' as bangkok_timestamp,
  (te.timestamp AT TIME ZONE 'UTC')::date as utc_date,
  (te.timestamp AT TIME ZONE 'Asia/Bangkok')::date as bangkok_date,
  -- Show if dates differ between timezones
  CASE 
    WHEN (te.timestamp AT TIME ZONE 'UTC')::date = (te.timestamp AT TIME ZONE 'Asia/Bangkok')::date 
    THEN 'Same date' 
    ELSE 'Different dates - THIS IS THE ISSUE!'
  END as timezone_issue
FROM backoffice.time_entries te
JOIN backoffice.staff s ON te.staff_id = s.id
WHERE s.staff_name IN ('Dolly', 'Net', 'May', 'Winnie')
AND te.timestamp >= '2025-06-01T00:00:00'
AND te.timestamp <= '2025-06-30T23:59:59'
ORDER BY s.staff_name, te.timestamp
LIMIT 10; 