-- Query to get Dolly's hours for May 2025
-- This shows daily hours, weekly totals, and overtime calculation

WITH dolly_entries AS (
  SELECT 
    te.staff_id,
    s.staff_name,
    te.timestamp,
    te.action,
    DATE(te.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok') as date_bangkok,
    te.timestamp AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok' as timestamp_bangkok
  FROM backoffice.time_entries te
  JOIN backoffice.staff s ON te.staff_id = s.id
  WHERE s.staff_name = 'Dolly'
    AND te.timestamp >= '2025-05-01T00:00:00+07:00'
    AND te.timestamp <= '2025-05-31T23:59:59+07:00'
  ORDER BY te.timestamp
),

daily_hours AS (
  SELECT 
    staff_id,
    staff_name,
    date_bangkok,
    SUM(
      CASE 
        WHEN action = 'clock_out' THEN 
          EXTRACT(EPOCH FROM (timestamp_bangkok - LAG(timestamp_bangkok) OVER (PARTITION BY staff_id, date_bangkok ORDER BY timestamp_bangkok))) / 3600
        ELSE 0 
      END
    ) as hours_worked
  FROM dolly_entries
  WHERE action IN ('clock_in', 'clock_out')
  GROUP BY staff_id, staff_name, date_bangkok
  HAVING SUM(
    CASE 
      WHEN action = 'clock_out' THEN 
        EXTRACT(EPOCH FROM (timestamp_bangkok - LAG(timestamp_bangkok) OVER (PARTITION BY staff_id, date_bangkok ORDER BY timestamp_bangkok))) / 3600
      ELSE 0 
    END
  ) > 0
),

weekly_hours AS (
  SELECT 
    staff_id,
    staff_name,
    DATE_TRUNC('week', date_bangkok) as week_start,
    SUM(hours_worked) as total_hours,
    GREATEST(0, SUM(hours_worked) - 48) as overtime_hours
  FROM daily_hours
  GROUP BY staff_id, staff_name, DATE_TRUNC('week', date_bangkok)
)

SELECT 
  'DOLLY HOURS - MAY 2025' as report_title,
  '' as separator1,
  'DAILY BREAKDOWN:' as daily_header
UNION ALL
SELECT 
  TO_CHAR(date_bangkok, 'Day DD/MM/YYYY') as day_date,
  ROUND(hours_worked::numeric, 2)::text || ' hours' as hours,
  '' as empty
FROM daily_hours
ORDER BY date_bangkok

UNION ALL
SELECT 
  '' as separator2,
  'WEEKLY BREAKDOWN:' as weekly_header,
  '' as empty2

UNION ALL
SELECT 
  'Week of ' || TO_CHAR(week_start, 'DD/MM/YYYY') as week,
  'Total: ' || ROUND(total_hours::numeric, 2)::text || ' hours' as total,
  CASE 
    WHEN overtime_hours > 0 THEN 'OT: ' || ROUND(overtime_hours::numeric, 2)::text || ' hours'
    ELSE 'No overtime'
  END as overtime
FROM weekly_hours
ORDER BY week_start

UNION ALL
SELECT 
  '' as separator3,
  'MONTHLY TOTALS:' as monthly_header,
  '' as empty3

UNION ALL
SELECT 
  'Total Days Worked' as metric,
  COUNT(DISTINCT date_bangkok)::text as value,
  '' as empty4
FROM daily_hours

UNION ALL
SELECT 
  'Total Hours' as metric,
  ROUND(SUM(hours_worked)::numeric, 2)::text as value,
  '' as empty5
FROM daily_hours

UNION ALL
SELECT 
  'Regular Hours' as metric,
  ROUND((SUM(hours_worked) - SUM(GREATEST(0, SUM(hours_worked) - 48)))::numeric, 2)::text as value,
  '' as empty6
FROM (
  SELECT DATE_TRUNC('week', date_bangkok) as week, SUM(hours_worked) as hours_worked
  FROM daily_hours
  GROUP BY DATE_TRUNC('week', date_bangkok)
) weekly_totals

UNION ALL
SELECT 
  'Overtime Hours' as metric,
  ROUND(SUM(GREATEST(0, hours_worked - 48))::numeric, 2)::text as value,
  '' as empty7
FROM (
  SELECT DATE_TRUNC('week', date_bangkok) as week, SUM(hours_worked) as hours_worked
  FROM daily_hours
  GROUP BY DATE_TRUNC('week', date_bangkok)
) weekly_totals; 