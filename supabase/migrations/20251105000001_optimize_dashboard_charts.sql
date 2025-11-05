-- Migration: Optimize get_dashboard_charts for YTD Performance
-- Purpose: Fix timeout issues in charts endpoint by using the materialized view
-- Date: 2025-11-05

-- Drop the old optimized function if it exists
DROP FUNCTION IF EXISTS public.get_dashboard_charts_optimized(date, date);

-- Create optimized version of get_dashboard_charts
CREATE OR REPLACE FUNCTION public.get_dashboard_charts_optimized(
    start_date date,
    end_date date
)
RETURNS json
LANGUAGE plpgsql
AS $function$
DECLARE
    result JSON;
    cutoff_date DATE := '2025-08-12';
    bay_cutoff_date DATE := '2024-09-01';
BEGIN
    WITH
    -- Proper receipt-level aggregation (one row per receipt) for revenue calculations
    receipt_totals AS (
        SELECT
            date,
            receipt_number,
            customer_phone_number,
            payment_method,
            SUM(sales_net) as receipt_total_amount,
            SUM(gross_profit) as receipt_gross_profit,
            SUM(sales_gross) as receipt_gross_amount
        FROM pos.lengolf_sales
        WHERE date BETWEEN start_date AND end_date
          AND is_voided = false
        GROUP BY date, receipt_number, customer_phone_number, payment_method
    ),
    -- Separate category grouping for category breakdown
    category_line_items AS (
        SELECT
            product_parent_category,
            SUM(sales_net) as category_revenue,
            SUM(gross_profit) as category_profit,
            COUNT(*) as category_transaction_count
        FROM pos.lengolf_sales
        WHERE date BETWEEN start_date AND end_date
          AND is_voided = false
        GROUP BY product_parent_category
    ),
    -- Payment method aggregation from receipts
    payment_totals AS (
        SELECT
            rt.payment_method,
            COUNT(DISTINCT rt.receipt_number) as method_transaction_count,
            SUM(rt.receipt_total_amount) as method_total_amount
        FROM receipt_totals rt
        GROUP BY rt.payment_method
    ),
    -- Daily revenue trends from receipts with unique customers
    daily_revenue AS (
        SELECT
            rt.date,
            SUM(rt.receipt_total_amount) as revenue,
            SUM(rt.receipt_gross_profit) as profit,
            COUNT(DISTINCT rt.receipt_number) as transactions,
            COUNT(DISTINCT rt.customer_phone_number) as unique_customers
        FROM receipt_totals rt
        GROUP BY rt.date
        ORDER BY rt.date
    ),
    -- Hybrid daily sim utilization calculation with dynamic bay count
    daily_sim_utilization AS (
        WITH date_series AS (
            SELECT generate_series(start_date, end_date, interval '1 day')::date as date
        ),
        sim_hours_per_day AS (
            SELECT
                ds.date,
                CASE
                    WHEN ds.date < cutoff_date THEN
                        COALESCE((
                            SELECT SUM(item_cnt)
                            FROM pos.lengolf_sales
                            WHERE date = ds.date
                              AND is_sim_usage = 1
                              AND is_voided = false
                        ), 0)
                    ELSE
                        COALESCE((
                            SELECT SUM(duration)
                            FROM public.bookings
                            WHERE date = ds.date
                              AND status = 'confirmed'
                        ), 0)
                END as sim_hours
            FROM date_series ds
        )
        SELECT
            date,
            sim_hours as sim_transactions,
            (12 * CASE
                WHEN date < bay_cutoff_date THEN 3
                ELSE 4
            END) as total_transactions,
            ROUND(
                (sim_hours / (12 * CASE
                    WHEN date < bay_cutoff_date THEN 3
                    ELSE 4
                END)::DECIMAL * 100)::NUMERIC,
                2
            ) as utilization_percentage
        FROM sim_hours_per_day
        ORDER BY date
    ),
    -- OPTIMIZED: Customer growth tracking using materialized view
    daily_customers AS (
        SELECT
            rt.date,
            COUNT(DISTINCT rt.customer_phone_number) as total_customers,
            -- OPTIMIZED: Returning customers - customers who had purchases before this date
            COUNT(DISTINCT CASE
                WHEN EXISTS (
                    SELECT 1 FROM pos.customer_first_purchase_dates cfpd
                    WHERE cfpd.customer_phone_number = rt.customer_phone_number
                      AND cfpd.first_purchase_date < rt.date
                ) THEN rt.customer_phone_number
            END) as returning_customers,
            -- OPTIMIZED: New customers - customers whose first purchase was on this date
            COUNT(DISTINCT CASE
                WHEN EXISTS (
                    SELECT 1 FROM pos.customer_first_purchase_dates cfpd
                    WHERE cfpd.customer_phone_number = rt.customer_phone_number
                      AND cfpd.first_purchase_date = rt.date
                ) THEN rt.customer_phone_number
            END) as new_customers
        FROM receipt_totals rt
        WHERE rt.customer_phone_number IS NOT NULL
        GROUP BY rt.date
        ORDER BY rt.date
    )

    SELECT json_build_object(
        'revenue_trends', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'date', dr.date,
                    'revenue', dr.revenue,
                    'profit', dr.profit,
                    'transactions', dr.transactions,
                    'unique_customers', dr.unique_customers
                ) ORDER BY dr.date
            ) FROM daily_revenue dr),
            '[]'::json
        ),
        'sim_utilization_trends', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'date', dsu.date,
                    'sim_transactions', dsu.sim_transactions,
                    'total_transactions', dsu.total_transactions,
                    'utilization_percentage', dsu.utilization_percentage
                ) ORDER BY dsu.date
            ) FROM daily_sim_utilization dsu),
            '[]'::json
        ),
        'category_breakdown', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'category', cli.product_parent_category,
                    'revenue', cli.category_revenue,
                    'profit', cli.category_profit,
                    'transaction_count', cli.category_transaction_count
                ) ORDER BY cli.category_revenue DESC
            ) FROM category_line_items cli),
            '[]'::json
        ),
        'payment_methods', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'payment_category', pt.payment_method,
                    'transaction_count', pt.method_transaction_count,
                    'total_amount', pt.method_total_amount
                ) ORDER BY pt.method_total_amount DESC
            ) FROM payment_totals pt),
            '[]'::json
        ),
        'customer_growth', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'date', dc.date,
                    'new_customers', dc.new_customers,
                    'returning_customers', dc.returning_customers,
                    'total_customers', dc.total_customers
                ) ORDER BY dc.date
            ) FROM daily_customers dc),
            '[]'::json
        )
    ) INTO result;

    RETURN result;
END;
$function$;

-- Add a comment explaining the optimization
COMMENT ON FUNCTION public.get_dashboard_charts_optimized IS
'Optimized version of get_dashboard_charts that uses the pos.customer_first_purchase_dates
materialized view to eliminate expensive NOT EXISTS subqueries in customer growth calculations.
This dramatically improves performance for large date ranges like YTD (Year To Date).';

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_charts_optimized TO authenticated;
