-- Fix duplicate key issue in mv_weekly_sales_summary by using week_start_date as unique key
-- Migration: 20260108230000_fix_weekly_mv_duplicate_key.sql

-- The issue: EXTRACT(year FROM date) and EXTRACT(week FROM date) create duplicates
-- Example: Both "2025-01-01" and "2025-12-29" have year=2025 and week=1
-- Solution: Use week_start_date as the unique identifier since it's guaranteed unique

-- Drop the old unique index
DROP INDEX IF EXISTS pos.idx_mv_weekly_sales_summary_unique;

-- Recreate the materialized view with proper grouping
DROP MATERIALIZED VIEW IF EXISTS pos.mv_weekly_sales_summary CASCADE;

CREATE MATERIALIZED VIEW pos.mv_weekly_sales_summary AS
WITH weekly_data AS (
  SELECT
    date_trunc('week', ls.date::timestamp with time zone)::date AS week_start_date,
    (date_trunc('week', ls.date::timestamp with time zone) + INTERVAL '6 days')::date AS week_end_date,
    EXTRACT(week FROM ls.date)::integer AS week_number,
    EXTRACT(isoyear FROM ls.date)::integer AS year,  -- Use ISO year to avoid duplicates
    CONCAT(
      EXTRACT(isoyear FROM ls.date)::text,
      '-W',
      LPAD(EXTRACT(week FROM ls.date)::text, 2, '0')
    ) AS week_iso,
    ls.receipt_number,
    ls.customer_id,
    ls.sales_net,
    ls.gross_profit,
    ls.date
  FROM pos.lengolf_sales ls
  WHERE (ls.is_voided = false OR ls.is_voided IS NULL)
)
SELECT
  week_start_date,
  week_end_date,
  week_number,
  year,
  week_iso,
  COUNT(DISTINCT receipt_number) AS transaction_count,
  COUNT(DISTINCT customer_id) FILTER (WHERE customer_id IS NOT NULL) AS unique_customers,
  SUM(sales_net) AS total_revenue,
  SUM(gross_profit) AS total_profit,
  CASE
    WHEN COUNT(DISTINCT receipt_number) > 0
    THEN SUM(sales_net) / COUNT(DISTINCT receipt_number)::numeric
    ELSE 0
  END AS avg_transaction_value
FROM weekly_data
GROUP BY week_start_date, week_end_date, week_number, year, week_iso;

-- Create unique index on week_start_date (guaranteed unique)
CREATE UNIQUE INDEX idx_mv_weekly_sales_summary_week_start
ON pos.mv_weekly_sales_summary (week_start_date);

-- Create index for date range queries
CREATE INDEX idx_mv_weekly_sales_summary_dates
ON pos.mv_weekly_sales_summary (week_start_date, week_end_date);

-- Create index for year-week lookups (note: may have duplicates with ISO weeks spanning years)
CREATE INDEX idx_mv_weekly_sales_summary_year_week
ON pos.mv_weekly_sales_summary (year, week_number);

COMMENT ON MATERIALIZED VIEW pos.mv_weekly_sales_summary IS
'Weekly sales summary using ISO year to avoid duplicate week numbers. Refreshed hourly by pos.refresh_all_mv().';
