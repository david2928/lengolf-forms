-- Add customer_first_purchase_dates to the hourly materialized view refresh
-- Migration: 20260108210000_add_customer_first_purchase_to_mv_refresh.sql

CREATE OR REPLACE FUNCTION pos.refresh_all_mv()
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  start_time TIMESTAMP;
  end_time TIMESTAMP;
  result JSON;
BEGIN
  start_time := clock_timestamp();

  -- Refresh all materialized views in dependency order
  -- IMPORTANT: customer_first_purchase_dates must be refreshed FIRST
  -- because other views may depend on it
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.customer_first_purchase_dates;

  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_daily_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_customer_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_product_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_weekly_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_monthly_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_weekly_reports_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_monthly_reports_cache;

  end_time := clock_timestamp();

  SELECT json_build_object(
    'success', true,
    'operation', 'refresh_all_mv',
    'duration_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
    'timestamp', end_time,
    'refreshed_views', json_build_array(
      'customer_first_purchase_dates',
      'mv_daily_sales_summary',
      'mv_customer_analytics',
      'mv_product_performance',
      'mv_weekly_sales_summary',
      'mv_monthly_sales_summary',
      'mv_weekly_reports_cache',
      'mv_monthly_reports_cache'
    )
  ) INTO result;

  RETURN result;
END;
$function$;

-- Verify the function was updated
COMMENT ON FUNCTION pos.refresh_all_mv() IS 'Refreshes all materialized views including customer_first_purchase_dates. Runs hourly via pg_cron (jobid 20).';
