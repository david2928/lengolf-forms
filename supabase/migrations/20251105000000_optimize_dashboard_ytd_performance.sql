-- Migration: Optimize Sales Dashboard YTD Performance
-- Purpose: Fix timeout issues when selecting YTD by pre-calculating customer first purchase dates
-- Date: 2025-11-05

-- Create a materialized view to store customer first purchase dates
-- This eliminates the expensive NOT EXISTS subquery in the dashboard functions
CREATE MATERIALIZED VIEW IF NOT EXISTS pos.customer_first_purchase_dates AS
SELECT
    customer_phone_number,
    MIN(date) as first_purchase_date,
    COUNT(*) as total_purchases,
    MAX(date) as last_purchase_date
FROM pos.lengolf_sales
WHERE is_voided = false
  AND customer_phone_number IS NOT NULL
  AND customer_phone_number NOT IN ('', '-')
GROUP BY customer_phone_number;

-- Create a unique index on the materialized view for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_first_purchase_phone
ON pos.customer_first_purchase_dates(customer_phone_number);

-- Create an index on first_purchase_date for range queries
CREATE INDEX IF NOT EXISTS idx_customer_first_purchase_date
ON pos.customer_first_purchase_dates(first_purchase_date);

-- Create a function to refresh the materialized view
-- This should be called periodically (e.g., via a cron job or after ETL runs)
CREATE OR REPLACE FUNCTION pos.refresh_customer_first_purchase_dates()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.customer_first_purchase_dates;
END;
$$;

-- Initial refresh
REFRESH MATERIALIZED VIEW pos.customer_first_purchase_dates;

-- Now create optimized versions of the dashboard functions
-- Drop the old function first
DROP FUNCTION IF EXISTS public.get_dashboard_summary_enhanced_optimized(date, date, date, date);

-- Create optimized version of get_dashboard_summary_enhanced
CREATE OR REPLACE FUNCTION public.get_dashboard_summary_enhanced_optimized(
    start_date date,
    end_date date,
    comparison_start_date date DEFAULT NULL,
    comparison_end_date date DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
  current_period JSON;
  comparison_period JSON;
  trend_data JSON;
  result JSON;
  cutoff_date DATE := '2025-08-12';
  period_days INTEGER;
  comparison_period_days INTEGER;
  bay_cutoff_date DATE := '2024-09-01';
  period_bay_count NUMERIC;
  comparison_bay_count NUMERIC;
BEGIN
  -- Calculate number of days in periods
  period_days := (end_date - start_date + 1);

  -- Validate input dates and calculate comparison period days
  IF comparison_start_date IS NOT NULL AND comparison_end_date IS NOT NULL THEN
    IF comparison_start_date > comparison_end_date THEN
      comparison_period_days := (comparison_start_date - comparison_end_date + 1);
      DECLARE
        temp_date DATE;
      BEGIN
        temp_date := comparison_start_date;
        comparison_start_date := comparison_end_date;
        comparison_end_date := temp_date;
      END;
    ELSE
      comparison_period_days := (comparison_end_date - comparison_start_date + 1);
    END IF;
  ELSE
    comparison_period_days := 0;
  END IF;

  -- Calculate average bay count for the period
  period_bay_count := CASE
    WHEN end_date < bay_cutoff_date THEN 3.0
    WHEN start_date >= bay_cutoff_date THEN 4.0
    ELSE (
      ((bay_cutoff_date - start_date) * 3.0 +
       (end_date - bay_cutoff_date + 1) * 4.0) / period_days
    )
  END;

  -- OPTIMIZED: Current period metrics using materialized view for new customers
  WITH current_metrics AS (
    SELECT
      COALESCE(SUM(sales_net), 0) as total_revenue,
      COALESCE(SUM(gross_profit), 0) as gross_profit,
      COUNT(DISTINCT receipt_number) as transaction_count,
      COUNT(DISTINCT customer_phone_number) as unique_customers,
      CASE
        WHEN COUNT(DISTINCT receipt_number) > 0
        THEN COALESCE(SUM(sales_net), 0) / COUNT(DISTINCT receipt_number)::numeric
        ELSE 0
      END as avg_transaction_value,
      CASE
        WHEN SUM(sales_net) > 0
        THEN (SUM(gross_profit) / SUM(sales_net) * 100)
        ELSE 0
      END as gross_margin_pct,
      CASE
        WHEN period_days > 0 AND period_bay_count > 0 THEN
          CASE
            WHEN start_date < cutoff_date AND end_date < cutoff_date THEN
              ROUND(
                (COALESCE((
                  SELECT SUM(item_cnt)
                  FROM pos.lengolf_sales
                  WHERE date >= start_date
                    AND date <= end_date
                    AND is_sim_usage = 1
                    AND is_voided = false
                ), 0) / (period_days * 12 * period_bay_count) * 100)::NUMERIC, 2
              )
            WHEN start_date >= cutoff_date THEN
              ROUND(
                (COALESCE((
                  SELECT SUM(duration)
                  FROM public.bookings
                  WHERE date >= start_date
                    AND date <= end_date
                    AND status = 'confirmed'
                ), 0) / (period_days * 12 * 4.0) * 100)::NUMERIC, 2
              )
            ELSE
              ROUND(
                ((COALESCE((
                  SELECT SUM(item_cnt)
                  FROM pos.lengolf_sales
                  WHERE date >= start_date
                    AND date < cutoff_date
                    AND is_sim_usage = 1
                    AND is_voided = false
                ), 0) +
                COALESCE((
                  SELECT SUM(duration)
                  FROM public.bookings
                  WHERE date >= cutoff_date
                    AND date <= end_date
                    AND status = 'confirmed'
                ), 0)) / (period_days * 12 * period_bay_count) * 100)::NUMERIC, 2
              )
          END
        ELSE
          0
      END as sim_utilization_pct,
      COUNT(*) FILTER (WHERE is_sim_usage = 1) as sim_utilization_count,
      -- OPTIMIZED: New customers using materialized view (MUCH FASTER!)
      (SELECT COUNT(DISTINCT ls.customer_phone_number)
       FROM pos.lengolf_sales ls
       INNER JOIN pos.customer_first_purchase_dates cfpd
         ON ls.customer_phone_number = cfpd.customer_phone_number
       WHERE ls.date >= start_date
         AND ls.date <= end_date
         AND ls.is_voided = false
         AND ls.customer_phone_number IS NOT NULL
         AND cfpd.first_purchase_date >= start_date
         AND cfpd.first_purchase_date <= end_date
      ) as new_customers
    FROM pos.lengolf_sales
    WHERE date >= start_date
      AND date <= end_date
      AND is_voided = false
  )
  SELECT json_build_object(
    'total_revenue', total_revenue,
    'gross_profit', gross_profit,
    'transaction_count', transaction_count,
    'unique_customers', unique_customers,
    'avg_transaction_value', avg_transaction_value,
    'gross_margin_pct', gross_margin_pct,
    'sim_utilization_pct', sim_utilization_pct,
    'sim_utilization_count', sim_utilization_count,
    'new_customers', new_customers
  ) INTO current_period
  FROM current_metrics;

  -- OPTIMIZED: Comparison period metrics (if provided and valid)
  IF comparison_start_date IS NOT NULL AND comparison_end_date IS NOT NULL AND comparison_period_days > 0 THEN
    comparison_bay_count := CASE
      WHEN comparison_end_date < bay_cutoff_date THEN 3.0
      WHEN comparison_start_date >= bay_cutoff_date THEN 4.0
      ELSE (
        ((bay_cutoff_date - comparison_start_date) * 3.0 +
         (comparison_end_date - bay_cutoff_date + 1) * 4.0) / comparison_period_days
      )
    END;

    WITH comparison_metrics AS (
      SELECT
        COALESCE(SUM(sales_net), 0) as total_revenue,
        COALESCE(SUM(gross_profit), 0) as gross_profit,
        COUNT(DISTINCT receipt_number) as transaction_count,
        COUNT(DISTINCT customer_phone_number) as unique_customers,
        CASE
          WHEN COUNT(DISTINCT receipt_number) > 0
          THEN COALESCE(SUM(sales_net), 0) / COUNT(DISTINCT receipt_number)::numeric
          ELSE 0
        END as avg_transaction_value,
        CASE
          WHEN SUM(sales_net) > 0
          THEN (SUM(gross_profit) / SUM(sales_net) * 100)
          ELSE 0
        END as gross_margin_pct,
        CASE
          WHEN comparison_period_days > 0 AND comparison_bay_count > 0 THEN
            CASE
              WHEN comparison_start_date < cutoff_date AND comparison_end_date < cutoff_date THEN
                ROUND(
                  (COALESCE((
                    SELECT SUM(item_cnt)
                    FROM pos.lengolf_sales
                    WHERE date >= comparison_start_date
                      AND date <= comparison_end_date
                      AND is_sim_usage = 1
                      AND is_voided = false
                  ), 0) / (comparison_period_days * 12 * comparison_bay_count) * 100)::NUMERIC, 2
                )
              WHEN comparison_start_date >= cutoff_date THEN
                ROUND(
                  (COALESCE((
                    SELECT SUM(duration)
                    FROM public.bookings
                    WHERE date >= comparison_start_date
                      AND date <= comparison_end_date
                      AND status = 'confirmed'
                  ), 0) / (comparison_period_days * 12 * 4.0) * 100)::NUMERIC, 2
                )
              ELSE
                ROUND(
                  ((COALESCE((
                    SELECT SUM(item_cnt)
                    FROM pos.lengolf_sales
                    WHERE date >= comparison_start_date
                      AND date < cutoff_date
                      AND is_sim_usage = 1
                      AND is_voided = false
                  ), 0) +
                  COALESCE((
                    SELECT SUM(duration)
                    FROM public.bookings
                    WHERE date >= cutoff_date
                      AND date <= comparison_end_date
                      AND status = 'confirmed'
                  ), 0)) / (comparison_period_days * 12 * comparison_bay_count) * 100)::NUMERIC, 2
                )
            END
          ELSE
            0
        END as sim_utilization_pct,
        COUNT(*) FILTER (WHERE is_sim_usage = 1) as sim_utilization_count,
        -- OPTIMIZED: New customers for comparison period using materialized view
        (SELECT COUNT(DISTINCT ls.customer_phone_number)
         FROM pos.lengolf_sales ls
         INNER JOIN pos.customer_first_purchase_dates cfpd
           ON ls.customer_phone_number = cfpd.customer_phone_number
         WHERE ls.date >= comparison_start_date
           AND ls.date <= comparison_end_date
           AND ls.is_voided = false
           AND ls.customer_phone_number IS NOT NULL
           AND cfpd.first_purchase_date >= comparison_start_date
           AND cfpd.first_purchase_date <= comparison_end_date
        ) as new_customers
      FROM pos.lengolf_sales
      WHERE date >= comparison_start_date
        AND date <= comparison_end_date
        AND is_voided = false
    )
    SELECT json_build_object(
      'total_revenue', total_revenue,
      'gross_profit', gross_profit,
      'transaction_count', transaction_count,
      'unique_customers', unique_customers,
      'avg_transaction_value', avg_transaction_value,
      'gross_margin_pct', gross_margin_pct,
      'sim_utilization_pct', sim_utilization_pct,
      'sim_utilization_count', sim_utilization_count,
      'new_customers', new_customers
    ) INTO comparison_period
    FROM comparison_metrics;
  ELSE
    comparison_period := json_build_object(
      'total_revenue', 0,
      'gross_profit', 0,
      'transaction_count', 0,
      'unique_customers', 0,
      'avg_transaction_value', 0,
      'gross_margin_pct', 0,
      'sim_utilization_pct', 0,
      'sim_utilization_count', null,
      'new_customers', 0
    );
  END IF;

  -- OPTIMIZED: Trend data with optimized daily new customer calculation
  WITH daily_trends AS (
    SELECT
      ls.date,
      SUM(ls.sales_net) as daily_revenue,
      SUM(ls.gross_profit) as daily_profit,
      CASE
        WHEN ls.date < cutoff_date THEN
          ROUND(
            (COALESCE((
              SELECT SUM(item_cnt)
              FROM pos.lengolf_sales
              WHERE date = ls.date
                AND is_sim_usage = 1
                AND is_voided = false
            ), 0) / (12 * CASE WHEN ls.date < bay_cutoff_date THEN 3 ELSE 4 END) * 100)::NUMERIC, 2
          )
        ELSE
          ROUND(
            (COALESCE((
              SELECT SUM(duration)
              FROM public.bookings
              WHERE date = ls.date
                AND status = 'confirmed'
            ), 0) / (12 * 4) * 100)::NUMERIC, 2
          )
      END as daily_sim_utilization,
      CASE
        WHEN COUNT(DISTINCT ls.receipt_number) > 0
        THEN SUM(ls.sales_net) / COUNT(DISTINCT ls.receipt_number)::numeric
        ELSE 0
      END as daily_avg_transaction,
      CASE
        WHEN SUM(ls.sales_net) > 0
        THEN (SUM(ls.gross_profit) / SUM(ls.sales_net) * 100)
        ELSE 0
      END as daily_margin
    FROM pos.lengolf_sales ls
    WHERE ls.date >= start_date
      AND ls.date <= end_date
      AND ls.is_voided = false
    GROUP BY ls.date
    ORDER BY ls.date
  ),
  daily_new_customers AS (
    SELECT
      dt.date,
      dt.daily_revenue,
      dt.daily_profit,
      dt.daily_sim_utilization,
      dt.daily_avg_transaction,
      dt.daily_margin,
      -- OPTIMIZED: Daily new customers using materialized view
      (SELECT COUNT(DISTINCT cfpd.customer_phone_number)
       FROM pos.customer_first_purchase_dates cfpd
       WHERE cfpd.first_purchase_date = dt.date
      ) as daily_new_customers
    FROM daily_trends dt
  )
  SELECT json_build_object(
    'revenue', json_agg(json_build_object('date', date, 'value', daily_revenue) ORDER BY date),
    'profit', json_agg(json_build_object('date', date, 'value', daily_profit) ORDER BY date),
    'utilization', json_agg(json_build_object('date', date, 'value', daily_sim_utilization) ORDER BY date),
    'customers', json_agg(json_build_object('date', date, 'value', daily_new_customers) ORDER BY date),
    'transaction', json_agg(json_build_object('date', date, 'value', daily_avg_transaction) ORDER BY date),
    'margin', json_agg(json_build_object('date', date, 'value', daily_margin) ORDER BY date)
  ) INTO trend_data
  FROM daily_new_customers;

  -- Build final result
  result := json_build_object(
    'current_period', current_period,
    'comparison_period', comparison_period,
    'trend_data', trend_data
  );

  RETURN result;
END;
$function$;

-- Add a comment explaining the optimization
COMMENT ON FUNCTION public.get_dashboard_summary_enhanced_optimized IS
'Optimized version of get_dashboard_summary_enhanced that uses the pos.customer_first_purchase_dates
materialized view to eliminate expensive NOT EXISTS subqueries. This dramatically improves performance
for large date ranges like YTD (Year To Date). The materialized view should be refreshed periodically
using pos.refresh_customer_first_purchase_dates().';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary_enhanced_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION pos.refresh_customer_first_purchase_dates TO authenticated;

-- Add a trigger to auto-refresh the materialized view when needed
-- Note: For very large tables, you may want to schedule this via cron instead
-- For now, we'll create a function that can be called manually or via a scheduled job
