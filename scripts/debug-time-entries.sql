-- Debug Time Entries Script
-- Run this in Supabase SQL Editor to check time entries data

-- ============================================
-- 1. CHECK ALL TIME ENTRIES BY MONTH
-- ============================================

SELECT 
  DATE_TRUNC('month', timestamp) as month,
  COUNT(*) as entry_count,
  MIN(timestamp) as earliest_entry,
  MAX(timestamp) as latest_entry,
  ARRAY_AGG(DISTINCT staff_id) as staff_ids
FROM backoffice.time_entries
GROUP BY DATE_TRUNC('month', timestamp)
ORDER BY month DESC
LIMIT 12;

-- ============================================
-- 2. CHECK JUNE 2024 SPECIFICALLY
-- ============================================

SELECT 
  DATE(timestamp) as date,
  staff_id,
  action,
  timestamp,
  TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted_timestamp
FROM backoffice.time_entries
WHERE timestamp >= '2024-06-01' 
AND timestamp <= '2024-06-30 23:59:59'
ORDER BY timestamp;

-- ============================================
-- 3. CHECK CURRENT YEAR (2025) JUNE
-- ============================================

SELECT 
  DATE(timestamp) as date,
  staff_id,
  action,
  timestamp,
  TO_CHAR(timestamp, 'YYYY-MM-DD HH24:MI:SS') as formatted_timestamp
FROM backoffice.time_entries
WHERE timestamp >= '2025-06-01' 
AND timestamp <= '2025-06-30 23:59:59'
ORDER BY timestamp;

-- ============================================
-- 4. CHECK WHAT MONTHS ACTUALLY HAVE DATA
-- ============================================

SELECT 
  TO_CHAR(timestamp, 'YYYY-MM') as month_year,
  COUNT(*) as entry_count,
  COUNT(DISTINCT staff_id) as unique_staff,
  MIN(DATE(timestamp)) as first_date,
  MAX(DATE(timestamp)) as last_date
FROM backoffice.time_entries
GROUP BY TO_CHAR(timestamp, 'YYYY-MM')
ORDER BY month_year DESC; 