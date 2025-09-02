# Sales Dashboard Performance Optimization: Materialized Views Implementation Plan

**Document Version**: 1.0  
**Created**: July 2025  
**Author**: Lengolf Development Team  

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Current Performance Analysis](#current-performance-analysis)
3. [Materialized View Strategy](#materialized-view-strategy)
4. [Detailed Implementation Plan](#detailed-implementation-plan)
5. [Migration Strategy](#migration-strategy)
6. [Performance Monitoring](#performance-monitoring)
7. [Maintenance and Refresh Strategy](#maintenance-and-refresh-strategy)
8. [Risk Assessment and Mitigation](#risk-assessment-and-mitigation)
9. [Timeline and Milestones](#timeline-and-milestones)

## Executive Summary

### Problem Statement
The current Sales Dashboard experiences significant performance issues:
- **5+ second query execution time** for monthly reports
- **3.8 million buffer reads** per dashboard function call
- Complex real-time aggregations on 14,556+ transaction records
- Repeated calculations for the same time periods
- Inefficient weekly/monthly reporting for large date ranges

### Proposed Solution
Implement a multi-layered materialized view architecture that pre-computes key aggregations at different time granularities, reducing query complexity from O(n) to O(1) for most dashboard operations.

### Expected Benefits
- **90% reduction** in dashboard load times (5s → 0.5s)
- **95% reduction** in database load (3.8M → 200K buffer reads)
- **Real-time refresh** capability for current-day data
- **Scalable architecture** supporting future reporting requirements
- **Enhanced user experience** with near-instantaneous dashboard loads

## Current Performance Analysis

### Database Environment Assessment

#### Data Volume (as of July 2025)
```sql
-- Current data metrics
pos.lengolf_sales: 14,556 rows (17 MB)
- Date range: 2024-03-16 to 2025-07-07 (478 days)
- Unique receipts: 5,760 transactions
- Unique customers: 2,191 customers
- Average: ~30 transactions/day, ~30 rows/day
```

#### Performance Bottlenecks Identified

**1. Complex Dashboard Function Performance**
```sql
-- Current performance test results
EXPLAIN (ANALYZE, BUFFERS) SELECT public.get_dashboard_summary_enhanced(...)
Result: 5013.749 ms execution time
Buffer Usage: 3,821,990 shared hits
```

**2. Query Complexity Issues**
- Multiple CTE scans of the same large table
- Complex customer analytics with LAG functions
- Real-time aggregations across entire dataset
- Repeated date range filtering
- Expensive DISTINCT operations

**3. Specific Performance Hotspots**
```sql
-- Most expensive operations (based on query plan analysis):
1. Customer retention calculations (requires full table scan)
2. Period-over-period comparisons (LAG functions)
3. Daily trend data generation (GROUP BY date with aggregations)
4. SIM utilization calculations (complex business logic)
5. New customer identification (correlated subqueries)
```

#### Current Index Analysis
```sql
-- Existing indexes (good foundation):
idx_lengolf_sales_date_new: (date)
idx_lengolf_sales_timestamp_new: (sales_timestamp)  
idx_lengolf_sales_date_customer: (date, customer_name)
idx_lengolf_sales_receipt_new: (receipt_number)
idx_lengolf_sales_sim_usage_new: (is_sim_usage)

-- Additional indexes needed:
customer_phone_number, date + customer_phone_number (for customer analytics)
```

## Materialized View Strategy

### Architecture Overview

We will implement a **three-tier materialized view architecture**:

1. **Raw Aggregation Layer** - Basic daily/weekly/monthly aggregations
2. **Business Logic Layer** - Complex calculations and customer analytics  
3. **Dashboard Layer** - Optimized views for specific dashboard components

### Tier 1: Raw Aggregation Layer

#### 1.1 Daily Sales Summary (`mv_daily_sales_summary`)
```sql
CREATE MATERIALIZED VIEW pos.mv_daily_sales_summary AS
SELECT 
  date,
  COUNT(*) as total_line_items,
  COUNT(DISTINCT receipt_number) as total_transactions,
  COUNT(DISTINCT customer_phone_number) as total_customers,
  SUM(sales_net) as total_revenue,
  SUM(gross_profit) as total_profit,
  SUM(sales_cost) as total_cost,
  SUM(is_sim_usage) as sim_usage_count,
  SUM(item_cnt) as total_items_sold,
  AVG(sales_net) as avg_line_item_value,
  MIN(sales_timestamp) as first_transaction_time,
  MAX(sales_timestamp) as last_transaction_time,
  -- Financial metrics
  SUM(sales_total) as revenue_incl_vat,
  SUM(sales_vat) as total_vat,
  SUM(sales_discount) as total_discounts,
  -- Advanced metrics
  COUNT(DISTINCT customer_phone_number) FILTER (WHERE is_sim_usage > 0) as sim_customers,
  COUNT(DISTINCT product_name) as unique_products_sold,
  -- Payment method breakdown
  COUNT(DISTINCT receipt_number) FILTER (WHERE payment_method = 'Cash') as cash_transactions,
  COUNT(DISTINCT receipt_number) FILTER (WHERE payment_method = 'Card') as card_transactions,
  COUNT(DISTINCT receipt_number) FILTER (WHERE payment_method LIKE '%QR%') as qr_transactions
FROM pos.lengolf_sales
WHERE is_voided = FALSE
GROUP BY date;

-- Indexes for daily summary
CREATE UNIQUE INDEX idx_mv_daily_sales_summary_date 
ON pos.mv_daily_sales_summary (date);

CREATE INDEX idx_mv_daily_sales_summary_revenue 
ON pos.mv_daily_sales_summary (date, total_revenue);
```

#### 1.2 Weekly Sales Summary (`mv_weekly_sales_summary`)
```sql
CREATE MATERIALIZED VIEW pos.mv_weekly_sales_summary AS
SELECT 
  TO_CHAR(date, 'YYYY-"W"IW') as week_number,
  EXTRACT(YEAR FROM date) as year,
  EXTRACT(WEEK FROM date) as week,
  MIN(date) as week_start_date,
  MAX(date) as week_end_date,
  COUNT(DISTINCT date) as active_days,
  SUM(total_transactions) as total_transactions,
  SUM(total_customers) as total_customers,
  SUM(total_revenue) as total_revenue,
  SUM(total_profit) as total_profit,
  SUM(sim_usage_count) as sim_usage_count,
  ROUND(AVG(total_revenue), 2) as avg_daily_revenue,
  ROUND(SUM(total_revenue) / NULLIF(SUM(total_transactions), 0), 2) as avg_transaction_value,
  ROUND((SUM(total_profit) / NULLIF(SUM(total_revenue), 0)) * 100, 2) as gross_margin_pct,
  -- Dynamic bay count: 3 bays before Sept 1, 2024; 4 bays from Sept 1, 2024 onwards
  ROUND((SUM(sim_usage_count)::DECIMAL / (COUNT(DISTINCT date) * 12 * 
    CASE 
      WHEN MAX(date) < '2024-09-01' THEN 3
      WHEN MIN(date) >= '2024-09-01' THEN 4
      ELSE 3.5  -- Approximate average for mixed periods
    END
  )) * 100, 2) as sim_utilization_pct,
  -- Operational metrics  
  COUNT(DISTINCT date) as operating_days,
  SUM(total_customers) / COUNT(DISTINCT date) as avg_daily_customers,
  MAX(total_revenue) as peak_day_revenue,
  MIN(total_revenue) as lowest_day_revenue
FROM pos.mv_daily_sales_summary
GROUP BY TO_CHAR(date, 'YYYY-"W"IW'), EXTRACT(YEAR FROM date), EXTRACT(WEEK FROM date);

-- Indexes for weekly summary
CREATE UNIQUE INDEX idx_mv_weekly_sales_summary_week 
ON pos.mv_weekly_sales_summary (week_number);

CREATE INDEX idx_mv_weekly_sales_summary_year_week 
ON pos.mv_weekly_sales_summary (year, week);
```

#### 1.3 Monthly Sales Summary (`mv_monthly_sales_summary`)
```sql
CREATE MATERIALIZED VIEW pos.mv_monthly_sales_summary AS
SELECT 
  TO_CHAR(date, 'YYYY-MM') as month_number,
  EXTRACT(YEAR FROM date) as year,
  EXTRACT(MONTH FROM date) as month,
  TO_CHAR(date, 'Month YYYY') as month_name,
  MIN(date) as month_start_date,
  MAX(date) as month_end_date,
  COUNT(DISTINCT date) as active_days,
  SUM(total_transactions) as total_transactions,
  SUM(total_customers) as total_customers,
  SUM(total_revenue) as total_revenue,
  SUM(total_profit) as total_profit,
  SUM(sim_usage_count) as sim_usage_count,
  ROUND(AVG(total_revenue), 2) as avg_daily_revenue,
  ROUND(SUM(total_revenue) / NULLIF(SUM(total_transactions), 0), 2) as avg_transaction_value,
  ROUND((SUM(total_profit) / NULLIF(SUM(total_revenue), 0)) * 100, 2) as gross_margin_pct,
  -- Dynamic bay count: 3 bays before Sept 1, 2024; 4 bays from Sept 1, 2024 onwards
  ROUND((SUM(sim_usage_count)::DECIMAL / (COUNT(DISTINCT date) * 12 * 
    CASE 
      WHEN MAX(date) < '2024-09-01' THEN 3
      WHEN MIN(date) >= '2024-09-01' THEN 4
      ELSE 3.5  -- Approximate average for mixed periods
    END
  )) * 100, 2) as sim_utilization_pct,
  -- Peak analysis
  (SELECT week_number FROM pos.mv_weekly_sales_summary w 
   WHERE w.year = EXTRACT(YEAR FROM mv_daily_sales_summary.date) 
     AND EXTRACT(MONTH FROM w.week_start_date) = EXTRACT(MONTH FROM mv_daily_sales_summary.date)
   ORDER BY w.total_revenue DESC LIMIT 1) as peak_week,
  (SELECT week_number FROM pos.mv_weekly_sales_summary w 
   WHERE w.year = EXTRACT(YEAR FROM mv_daily_sales_summary.date) 
     AND EXTRACT(MONTH FROM w.week_start_date) = EXTRACT(MONTH FROM mv_daily_sales_summary.date)
   ORDER BY w.total_revenue ASC LIMIT 1) as lowest_week,
  -- Working days calculation
  COUNT(DISTINCT date) as working_days
FROM pos.mv_daily_sales_summary
GROUP BY TO_CHAR(date, 'YYYY-MM'), EXTRACT(YEAR FROM date), EXTRACT(MONTH FROM date), TO_CHAR(date, 'Month YYYY');

-- Indexes for monthly summary
CREATE UNIQUE INDEX idx_mv_monthly_sales_summary_month 
ON pos.mv_monthly_sales_summary (month_number);

CREATE INDEX idx_mv_monthly_sales_summary_year_month 
ON pos.mv_monthly_sales_summary (year, month);
```

### Tier 2: Business Logic Layer

#### 2.1 Customer Analytics (`mv_customer_analytics`)
```sql
CREATE MATERIALIZED VIEW pos.mv_customer_analytics AS
WITH customer_first_seen AS (
  SELECT 
    customer_phone_number,
    MIN(date) AS first_seen_date,
    MIN(sales_timestamp) AS first_transaction_timestamp
  FROM pos.lengolf_sales
  WHERE customer_phone_number IS NOT NULL 
    AND customer_phone_number NOT IN ('', '-')
    AND is_voided = FALSE
  GROUP BY customer_phone_number
),
customer_metrics AS (
  SELECT 
    s.customer_phone_number,
    s.date,
    COUNT(DISTINCT s.receipt_number) as daily_transactions,
    SUM(s.sales_net) as daily_revenue,
    COUNT(*) as daily_line_items,
    SUM(s.is_sim_usage) as daily_sim_usage,
    CASE 
      WHEN cfs.first_seen_date = s.date THEN 1 
      ELSE 0 
    END as is_new_customer_flag
  FROM pos.lengolf_sales s
  JOIN customer_first_seen cfs ON s.customer_phone_number = cfs.customer_phone_number
  WHERE s.customer_phone_number IS NOT NULL 
    AND s.customer_phone_number NOT IN ('', '-')
    AND s.is_voided = FALSE
  GROUP BY s.customer_phone_number, s.date, cfs.first_seen_date
)
SELECT 
  date,
  COUNT(DISTINCT customer_phone_number) as total_unique_customers,
  COUNT(DISTINCT customer_phone_number) FILTER (WHERE is_new_customer_flag = 1) as new_customers,
  COUNT(DISTINCT customer_phone_number) FILTER (WHERE is_new_customer_flag = 0) as returning_customers,
  SUM(daily_transactions) as total_customer_transactions,
  SUM(daily_revenue) as total_customer_revenue,
  SUM(daily_sim_usage) as total_customer_sim_usage,
  ROUND(AVG(daily_revenue), 2) as avg_customer_daily_spend,
  ROUND(AVG(daily_transactions), 2) as avg_customer_daily_transactions,
  -- Customer retention metrics
  ROUND(
    (COUNT(DISTINCT customer_phone_number) FILTER (WHERE is_new_customer_flag = 0)::DECIMAL / 
     NULLIF(COUNT(DISTINCT customer_phone_number), 0)) * 100, 2
  ) as retention_rate_pct
FROM customer_metrics
GROUP BY date;

-- Indexes for customer analytics
CREATE UNIQUE INDEX idx_mv_customer_analytics_date 
ON pos.mv_customer_analytics (date);

CREATE INDEX idx_mv_customer_analytics_metrics 
ON pos.mv_customer_analytics (date, new_customers, returning_customers);
```

#### 2.2 Product Performance (`mv_product_performance`)
```sql
CREATE MATERIALIZED VIEW pos.mv_product_performance AS
SELECT 
  date,
  product_category,
  product_name,
  COUNT(*) as total_sales,
  SUM(item_cnt) as total_quantity,
  SUM(sales_net) as total_revenue,
  SUM(gross_profit) as total_profit,
  SUM(sales_cost) as total_cost,
  COUNT(DISTINCT receipt_number) as unique_transactions,
  COUNT(DISTINCT customer_phone_number) as unique_customers,
  ROUND(AVG(sales_net), 2) as avg_sale_value,
  ROUND((SUM(gross_profit) / NULLIF(SUM(sales_net), 0)) * 100, 2) as profit_margin_pct,
  -- SIM usage specific
  SUM(is_sim_usage) as sim_usage_count,
  CASE WHEN SUM(is_sim_usage) > 0 THEN 1 ELSE 0 END as is_sim_product
FROM pos.lengolf_sales
WHERE is_voided = FALSE
GROUP BY date, product_category, product_name;

-- Indexes for product performance
CREATE INDEX idx_mv_product_performance_date_category 
ON pos.mv_product_performance (date, product_category);

CREATE INDEX idx_mv_product_performance_sim 
ON pos.mv_product_performance (date, is_sim_product);
```

### Tier 3: Dashboard Layer

#### 3.1 Dashboard Summary Cache (`mv_dashboard_summary_cache`)
```sql
CREATE MATERIALIZED VIEW pos.mv_dashboard_summary_cache AS
WITH date_periods AS (
  SELECT DISTINCT
    date,
    date as start_date,
    date as end_date,
    'daily' as period_type
  FROM pos.mv_daily_sales_summary
  UNION ALL
  -- Last 7 days periods
  SELECT 
    ds.date,
    ds.date - INTERVAL '6 days' as start_date,
    ds.date as end_date,
    'last_7_days' as period_type
  FROM pos.mv_daily_sales_summary ds
  UNION ALL
  -- Last 30 days periods  
  SELECT 
    ds.date,
    ds.date - INTERVAL '29 days' as start_date,
    ds.date as end_date,
    'last_30_days' as period_type
  FROM pos.mv_daily_sales_summary ds
  UNION ALL
  -- Month-to-date periods
  SELECT 
    ds.date,
    DATE_TRUNC('month', ds.date)::DATE as start_date,
    ds.date as end_date,
    'month_to_date' as period_type
  FROM pos.mv_daily_sales_summary ds
)
SELECT 
  dp.date as reference_date,
  dp.period_type,
  dp.start_date,
  dp.end_date,
  -- Aggregated metrics
  SUM(ds.total_transactions) as total_transactions,
  SUM(ds.total_customers) as unique_customers,
  SUM(ds.total_revenue) as total_revenue,
  SUM(ds.total_profit) as total_profit,
  SUM(ds.sim_usage_count) as sim_utilization_count,
  ROUND(SUM(ds.total_revenue) / NULLIF(SUM(ds.total_transactions), 0), 2) as avg_transaction_value,
  ROUND((SUM(ds.total_profit) / NULLIF(SUM(ds.total_revenue), 0)) * 100, 2) as gross_margin_pct,
  ROUND((SUM(ds.sim_usage_count)::DECIMAL / (COUNT(ds.date) * 3 * 12)) * 100, 2) as sim_utilization_pct,
  -- Customer metrics from analytics view
  SUM(ca.new_customers) as new_customers,
  ROUND(AVG(ca.retention_rate_pct), 2) as avg_retention_rate_pct,
  -- Time series data for trends (JSON)
  json_agg(
    json_build_object(
      'date', ds.date,
      'revenue', ds.total_revenue,
      'profit', ds.total_profit,
      'customers', ds.total_customers,
      'transactions', ds.total_transactions,
      'sim_utilization', ROUND((ds.sim_usage_count::DECIMAL / (1 * 3 * 12)) * 100, 2)
    ) ORDER BY ds.date
  ) as trend_data
FROM date_periods dp
JOIN pos.mv_daily_sales_summary ds ON ds.date BETWEEN dp.start_date AND dp.end_date
LEFT JOIN pos.mv_customer_analytics ca ON ca.date = ds.date
GROUP BY dp.date, dp.period_type, dp.start_date, dp.end_date;

-- Indexes for dashboard cache
CREATE UNIQUE INDEX idx_mv_dashboard_summary_cache_key 
ON pos.mv_dashboard_summary_cache (reference_date, period_type);

CREATE INDEX idx_mv_dashboard_summary_cache_period 
ON pos.mv_dashboard_summary_cache (period_type, reference_date);
```

#### 3.2 Weekly Reports Cache (`mv_weekly_reports_cache`)
```sql
CREATE MATERIALIZED VIEW pos.mv_weekly_reports_cache AS
SELECT 
  ws.week_number,
  ws.year,
  ws.week,
  ws.week_start_date || ' - ' || ws.week_end_date as week_range,
  ws.total_revenue,
  ws.total_profit,
  ws.total_transactions,
  ws.total_customers,
  -- Calculate new customers for the week
  (SELECT SUM(ca.new_customers) 
   FROM pos.mv_customer_analytics ca 
   WHERE ca.date BETWEEN ws.week_start_date AND ws.week_end_date) as new_customers,
  ws.avg_transaction_value,
  ws.gross_margin_pct,
  ws.sim_utilization_pct,
  ws.sim_usage_count,
  -- Customer retention rate (weekly average)
  (SELECT ROUND(AVG(ca.retention_rate_pct), 2)
   FROM pos.mv_customer_analytics ca 
   WHERE ca.date BETWEEN ws.week_start_date AND ws.week_end_date) as customer_retention_rate,
  ws.avg_daily_customers / ws.active_days as avg_transactions_per_day,
  -- Growth calculations (week-over-week)
  LAG(ws.total_revenue) OVER (ORDER BY ws.year, ws.week) as prev_week_revenue,
  LAG(ws.total_profit) OVER (ORDER BY ws.year, ws.week) as prev_week_profit,
  LAG(ws.total_customers) OVER (ORDER BY ws.year, ws.week) as prev_week_customers,
  -- Growth percentages
  CASE 
    WHEN LAG(ws.total_revenue) OVER (ORDER BY ws.year, ws.week) > 0 
    THEN ROUND(((ws.total_revenue - LAG(ws.total_revenue) OVER (ORDER BY ws.year, ws.week)) / 
                LAG(ws.total_revenue) OVER (ORDER BY ws.year, ws.week)) * 100, 2)
    ELSE 0 
  END as revenue_growth_pct,
  CASE 
    WHEN LAG(ws.total_profit) OVER (ORDER BY ws.year, ws.week) > 0 
    THEN ROUND(((ws.total_profit - LAG(ws.total_profit) OVER (ORDER BY ws.year, ws.week)) / 
                LAG(ws.total_profit) OVER (ORDER BY ws.year, ws.week)) * 100, 2)
    ELSE 0 
  END as profit_growth_pct,
  CASE 
    WHEN LAG(ws.total_customers) OVER (ORDER BY ws.year, ws.week) > 0 
    THEN ROUND(((ws.total_customers - LAG(ws.total_customers) OVER (ORDER BY ws.year, ws.week)) / 
                LAG(ws.total_customers) OVER (ORDER BY ws.year, ws.week)) * 100, 2)
    ELSE 0 
  END as customer_growth_pct
FROM pos.mv_weekly_sales_summary ws
ORDER BY ws.year, ws.week;

-- Indexes for weekly reports cache
CREATE UNIQUE INDEX idx_mv_weekly_reports_cache_week 
ON pos.mv_weekly_reports_cache (week_number);

CREATE INDEX idx_mv_weekly_reports_cache_year_week 
ON pos.mv_weekly_reports_cache (year, week);
```

#### 3.3 Monthly Reports Cache (`mv_monthly_reports_cache`)
```sql
CREATE MATERIALIZED VIEW pos.mv_monthly_reports_cache AS
SELECT 
  ms.month_number,
  ms.year,
  ms.month,
  ms.month_name,
  ms.total_revenue,
  ms.total_profit,
  ms.total_transactions,
  ms.total_customers,
  -- Calculate new customers for the month
  (SELECT SUM(ca.new_customers) 
   FROM pos.mv_customer_analytics ca 
   WHERE ca.date BETWEEN ms.month_start_date AND ms.month_end_date) as new_customers,
  ms.avg_transaction_value,
  ms.gross_margin_pct,
  ms.sim_utilization_pct,
  ms.sim_usage_count,
  -- Customer retention rate (monthly average)
  (SELECT ROUND(AVG(ca.retention_rate_pct), 2)
   FROM pos.mv_customer_analytics ca 
   WHERE ca.date BETWEEN ms.month_start_date AND ms.month_end_date) as customer_retention_rate,
  ms.avg_daily_revenue as avg_transactions_per_day,
  ms.working_days,
  ms.peak_week,
  ms.lowest_week,
  -- Growth calculations (month-over-month)
  LAG(ms.total_revenue) OVER (ORDER BY ms.year, ms.month) as prev_month_revenue,
  LAG(ms.total_profit) OVER (ORDER BY ms.year, ms.month) as prev_month_profit,
  LAG(ms.total_customers) OVER (ORDER BY ms.year, ms.month) as prev_month_customers,
  -- Growth percentages
  CASE 
    WHEN LAG(ms.total_revenue) OVER (ORDER BY ms.year, ms.month) > 0 
    THEN ROUND(((ms.total_revenue - LAG(ms.total_revenue) OVER (ORDER BY ms.year, ms.month)) / 
                LAG(ms.total_revenue) OVER (ORDER BY ms.year, ms.month)) * 100, 2)
    ELSE 0 
  END as revenue_growth_pct,
  CASE 
    WHEN LAG(ms.total_profit) OVER (ORDER BY ms.year, ms.month) > 0 
    THEN ROUND(((ms.total_profit - LAG(ms.total_profit) OVER (ORDER BY ms.year, ms.month)) / 
                LAG(ms.total_profit) OVER (ORDER BY ms.year, ms.month)) * 100, 2)
    ELSE 0 
  END as profit_growth_pct,
  CASE 
    WHEN LAG(ms.total_customers) OVER (ORDER BY ms.year, ms.month) > 0 
    THEN ROUND(((ms.total_customers - LAG(ms.total_customers) OVER (ORDER BY ms.year, ms.month)) / 
                LAG(ms.total_customers) OVER (ORDER BY ms.year, ms.month)) * 100, 2)
    ELSE 0 
  END as customer_growth_pct
FROM pos.mv_monthly_sales_summary ms
ORDER BY ms.year, ms.month;

-- Indexes for monthly reports cache
CREATE UNIQUE INDEX idx_mv_monthly_reports_cache_month 
ON pos.mv_monthly_reports_cache (month_number);

CREATE INDEX idx_mv_monthly_reports_cache_year_month 
ON pos.mv_monthly_reports_cache (year, month);
```

## Detailed Implementation Plan

### Phase 1: Foundation Setup (Week 1)

#### 1.1 Additional Indexing for Performance
```sql
-- Add missing indexes to optimize materialized view creation
CREATE INDEX idx_lengolf_sales_customer_phone_date 
ON pos.lengolf_sales (customer_phone_number, date) 
WHERE customer_phone_number IS NOT NULL 
  AND customer_phone_number NOT IN ('', '-');

CREATE INDEX idx_lengolf_sales_voided_date 
ON pos.lengolf_sales (is_voided, date) 
WHERE is_voided = FALSE;

CREATE INDEX idx_lengolf_sales_composite_analytics 
ON pos.lengolf_sales (date, customer_phone_number, is_voided, sales_net) 
WHERE is_voided = FALSE 
  AND customer_phone_number IS NOT NULL 
  AND customer_phone_number NOT IN ('', '-');
```

#### 1.2 Create Base Materialized Views
1. **Create daily sales summary** (`mv_daily_sales_summary`)
2. **Create customer analytics** (`mv_customer_analytics`)  
3. **Create product performance** (`mv_product_performance`)
4. **Initial refresh and validation**

#### 1.3 Performance Testing
```sql
-- Test individual view performance
EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM pos.mv_daily_sales_summary 
WHERE date BETWEEN '2025-06-01' AND '2025-06-30';

-- Measure improvement
\timing on
SELECT SUM(total_revenue) FROM pos.mv_daily_sales_summary 
WHERE date BETWEEN '2025-06-01' AND '2025-06-30';
```

### Phase 2: Aggregation Layer (Week 2)

#### 2.1 Create Weekly and Monthly Views
1. **Create weekly sales summary** (`mv_weekly_sales_summary`)
2. **Create monthly sales summary** (`mv_monthly_sales_summary`)
3. **Validate aggregation accuracy** against existing functions

#### 2.2 Build Dashboard Cache Layer
1. **Create dashboard summary cache** (`mv_dashboard_summary_cache`)
2. **Create weekly reports cache** (`mv_weekly_reports_cache`)
3. **Create monthly reports cache** (`mv_monthly_reports_cache`)

### Phase 3: API Integration (Week 3)

#### 3.1 Create Optimized Dashboard Functions
```sql
-- New high-performance dashboard function
CREATE OR REPLACE FUNCTION pos.get_dashboard_summary_enhanced_mv(
  start_date DATE,
  end_date DATE,
  comparison_start_date DATE,
  comparison_end_date DATE
) RETURNS JSON AS $$
DECLARE
  current_period JSON;
  comparison_period JSON;
  trend_data JSON;
  result JSON;
BEGIN
  -- Get current period from materialized view cache
  SELECT json_build_object(
    'total_revenue', SUM(total_revenue),
    'gross_profit', SUM(total_profit),
    'transaction_count', SUM(total_transactions),
    'unique_customers', SUM(unique_customers),
    'avg_transaction_value', ROUND(SUM(total_revenue) / NULLIF(SUM(total_transactions), 0), 2),
    'gross_margin_pct', ROUND((SUM(total_profit) / NULLIF(SUM(total_revenue), 0)) * 100, 2),
    'sim_utilization_pct', ROUND(AVG(sim_utilization_pct), 2),
    'sim_utilization_count', SUM(sim_utilization_count),
    'new_customers', SUM(new_customers)
  ) INTO current_period
  FROM pos.mv_daily_sales_summary ds
  LEFT JOIN pos.mv_customer_analytics ca ON ca.date = ds.date
  WHERE ds.date BETWEEN start_date AND end_date;

  -- Get comparison period from materialized view cache
  SELECT json_build_object(
    'total_revenue', SUM(total_revenue),
    'gross_profit', SUM(total_profit),
    'transaction_count', SUM(total_transactions),
    'unique_customers', SUM(unique_customers),
    'avg_transaction_value', ROUND(SUM(total_revenue) / NULLIF(SUM(total_transactions), 0), 2),
    'gross_margin_pct', ROUND((SUM(total_profit) / NULLIF(SUM(total_revenue), 0)) * 100, 2),
    'sim_utilization_pct', ROUND(AVG(sim_utilization_pct), 2),
    'sim_utilization_count', SUM(sim_utilization_count),
    'new_customers', SUM(new_customers)
  ) INTO comparison_period
  FROM pos.mv_daily_sales_summary ds
  LEFT JOIN pos.mv_customer_analytics ca ON ca.date = ds.date
  WHERE ds.date BETWEEN comparison_start_date AND comparison_end_date;

  -- Get trend data
  SELECT json_build_object(
    'revenue', json_agg(ds.total_revenue ORDER BY ds.date),
    'profit', json_agg(ds.total_profit ORDER BY ds.date),
    'utilization', json_agg(ds.sim_utilization_pct ORDER BY ds.date),
    'customers', json_agg(ca.new_customers ORDER BY ds.date),
    'transaction', json_agg(ds.avg_transaction_value ORDER BY ds.date),
    'margin', json_agg(ds.gross_margin_pct ORDER BY ds.date)
  ) INTO trend_data
  FROM pos.mv_daily_sales_summary ds
  LEFT JOIN pos.mv_customer_analytics ca ON ca.date = ds.date
  WHERE ds.date BETWEEN start_date AND end_date;

  -- Build final result
  SELECT json_build_object(
    'current_period', current_period,
    'comparison_period', comparison_period,
    'trend_data', trend_data
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

#### 3.2 Create Weekly/Monthly Report Functions
```sql
-- Weekly reports function
CREATE OR REPLACE FUNCTION pos.get_weekly_reports_mv(
  start_date DATE,
  end_date DATE
) RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'week', week_number,
        'weekRange', week_range,
        'totalRevenue', total_revenue,
        'grossProfit', total_profit,
        'transactionCount', total_transactions,
        'uniqueCustomers', total_customers,
        'newCustomers', new_customers,
        'avgTransactionValue', avg_transaction_value,
        'grossMarginPct', gross_margin_pct,
        'simUtilizationPct', sim_utilization_pct,
        'simUsageCount', sim_usage_count,
        'customerRetentionRate', customer_retention_rate,
        'avgTransactionsPerDay', avg_transactions_per_day,
        'revenueGrowth', revenue_growth_pct,
        'profitGrowth', profit_growth_pct,
        'customerGrowth', customer_growth_pct
      ) ORDER BY year, week
    )
    FROM pos.mv_weekly_reports_cache
    WHERE week_start_date >= start_date 
      AND week_end_date <= end_date
  );
END;
$$ LANGUAGE plpgsql;

-- Monthly reports function  
CREATE OR REPLACE FUNCTION pos.get_monthly_reports_mv(
  start_date DATE,
  end_date DATE
) RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(
      json_build_object(
        'month', month_number,
        'monthName', month_name,
        'totalRevenue', total_revenue,
        'grossProfit', total_profit,
        'transactionCount', total_transactions,
        'uniqueCustomers', total_customers,
        'newCustomers', new_customers,
        'avgTransactionValue', avg_transaction_value,
        'grossMarginPct', gross_margin_pct,
        'simUtilizationPct', sim_utilization_pct,
        'simUsageCount', sim_usage_count,
        'customerRetentionRate', customer_retention_rate,
        'avgTransactionsPerDay', avg_transactions_per_day,
        'workingDays', working_days,
        'peakWeek', peak_week,
        'lowWeek', lowest_week,
        'revenueGrowth', revenue_growth_pct,
        'profitGrowth', profit_growth_pct,
        'customerGrowth', customer_growth_pct
      ) ORDER BY year, month
    )
    FROM pos.mv_monthly_reports_cache
    WHERE month_start_date >= start_date 
      AND month_end_date <= end_date
  );
END;
$$ LANGUAGE plpgsql;
```

### Phase 4: API Endpoint Updates (Week 3)

#### 4.1 Update Dashboard API Routes
```typescript
// app/api/sales/dashboard-summary-mv/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDevSession } from '@/lib/dev-session';
import { authOptions } from '@/lib/auth-config';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate, compareStartDate, compareEndDate } = body;

    // Call optimized materialized view function
    const { data, error } = await supabase
      .rpc('get_dashboard_summary_enhanced_mv', {
        start_date: startDate,
        end_date: endDate,
        comparison_start_date: compareStartDate,
        comparison_end_date: compareEndDate
      });

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}
```

#### 4.2 Create Weekly/Monthly Report Endpoints
```typescript
// app/api/sales/weekly-reports-mv/route.ts
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession(authOptions, request);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { startDate, endDate } = body;

    const { data, error } = await supabase
      .rpc('get_weekly_reports_mv', {
        start_date: startDate,
        end_date: endDate
      });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch weekly reports' },
      { status: 500 }
    );
  }
}

// app/api/sales/monthly-reports-mv/route.ts - Similar implementation
```

## Migration Strategy

### Pre-Migration Checklist

#### 1. Data Validation
```sql
-- Validate data consistency between original and materialized views
WITH original_data AS (
  SELECT 
    date,
    SUM(sales_net) as total_revenue,
    COUNT(DISTINCT receipt_number) as total_transactions
  FROM pos.lengolf_sales 
  WHERE date = '2025-06-15'
    AND is_voided = FALSE
  GROUP BY date
),
mv_data AS (
  SELECT 
    date,
    total_revenue,
    total_transactions
  FROM pos.mv_daily_sales_summary
  WHERE date = '2025-06-15'
)
SELECT 
  CASE 
    WHEN od.total_revenue = mvd.total_revenue AND od.total_transactions = mvd.total_transactions 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END as validation_result,
  od.total_revenue as original_revenue,
  mvd.total_revenue as mv_revenue,
  od.total_transactions as original_transactions,
  mvd.total_transactions as mv_transactions
FROM original_data od
FULL OUTER JOIN mv_data mvd ON od.date = mvd.date;
```

#### 2. Performance Benchmarking
```sql
-- Benchmark current vs. new performance
\timing on

-- Current function
SELECT public.get_dashboard_summary_enhanced(
  '2025-06-01'::DATE, '2025-06-30'::DATE, 
  '2025-05-01'::DATE, '2025-05-30'::DATE
);

-- New materialized view function  
SELECT pos.get_dashboard_summary_enhanced_mv(
  '2025-06-01'::DATE, '2025-06-30'::DATE, 
  '2025-05-01'::DATE, '2025-05-30'::DATE
);
```

### Migration Phases

#### Phase 1: Parallel Deployment (Week 4)
1. **Deploy materialized views in parallel** - Keep existing functions active
2. **Create new API endpoints** with `-mv` suffix
3. **Configure dual-mode operation** - Allow testing both old and new
4. **Extensive validation testing** - Compare outputs side-by-side

#### Phase 2: Gradual Cutover (Week 5)
1. **Feature flag implementation** - Control which users get new views
2. **Monitor performance metrics** - Compare response times and accuracy
3. **A/B testing with admin users** - Validate business logic
4. **Progressive rollout** - 25% → 50% → 75% → 100%

#### Phase 3: Full Migration (Week 6)
1. **Update frontend to use new endpoints** - Remove `-mv` suffix
2. **Deprecate old functions** - Add warnings but keep functional
3. **Monitor system performance** - Ensure no regressions
4. **Remove old API endpoints** after 1 week of successful operation

### Rollback Plan

#### Immediate Rollback (< 1 hour)
```sql
-- Quick rollback: Switch API endpoints back to original functions
-- No data loss - original tables remain unchanged
UPDATE api_configuration SET use_materialized_views = FALSE;
```

#### Full Rollback (< 4 hours)
```sql
-- Remove materialized views if needed
DROP MATERIALIZED VIEW IF EXISTS pos.mv_dashboard_summary_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS pos.mv_weekly_reports_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS pos.mv_monthly_reports_cache CASCADE;
DROP MATERIALIZED VIEW IF EXISTS pos.mv_customer_analytics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS pos.mv_product_performance CASCADE;
DROP MATERIALIZED VIEW IF EXISTS pos.mv_weekly_sales_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS pos.mv_monthly_sales_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS pos.mv_daily_sales_summary CASCADE;

-- Restore original API endpoints
-- No data recovery needed - original data intact
```

## Performance Monitoring

### Real-time Performance Metrics

#### 1. Query Performance Monitoring
```sql
-- Monitor query performance improvements
CREATE OR REPLACE VIEW pos.performance_monitoring AS
SELECT 
  query_type,
  avg_execution_time_ms,
  avg_buffer_hits,
  query_count,
  last_updated
FROM (
  VALUES 
    ('dashboard_summary_original', 5013.7, 3821990, 0, NOW()),
    ('dashboard_summary_mv', 0.0, 0, 0, NOW()),
    ('weekly_reports_original', 0.0, 0, 0, NOW()),
    ('weekly_reports_mv', 0.0, 0, 0, NOW())
) AS t(query_type, avg_execution_time_ms, avg_buffer_hits, query_count, last_updated);
```

#### 2. Materialized View Freshness Monitoring
```sql
-- Monitor materialized view freshness
CREATE OR REPLACE VIEW pos.mv_freshness_monitor AS
SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated,
  last_refresh,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
  EXTRACT(EPOCH FROM (NOW() - last_refresh))/3600 as hours_since_refresh
FROM pg_matviews 
WHERE schemaname = 'pos'
  AND matviewname LIKE 'mv_%'
ORDER BY last_refresh DESC;
```

#### 3. Alert System for Stale Data
```sql
-- Alert when materialized views are stale (> 2 hours old)
CREATE OR REPLACE FUNCTION pos.check_mv_freshness() RETURNS TEXT AS $$
DECLARE
  stale_views TEXT;
BEGIN
  SELECT string_agg(matviewname, ', ')
  INTO stale_views
  FROM pg_matviews 
  WHERE schemaname = 'pos'
    AND matviewname LIKE 'mv_%'
    AND EXTRACT(EPOCH FROM (NOW() - last_refresh))/3600 > 2;
    
  IF stale_views IS NOT NULL THEN
    RETURN 'ALERT: Stale materialized views: ' || stale_views;
  ELSE
    RETURN 'OK: All materialized views are fresh';
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Maintenance and Refresh Strategy

### Automated Refresh Strategy

#### 1. Near Real-time Refresh (Every 15 minutes)
```sql
-- Refresh base daily summary every 15 minutes for current day
CREATE OR REPLACE FUNCTION pos.refresh_current_day_mv() RETURNS VOID AS $$
BEGIN
  -- Only refresh if current day has new data
  IF EXISTS (
    SELECT 1 FROM pos.lengolf_sales 
    WHERE date = CURRENT_DATE 
      AND updated_at > (
        SELECT COALESCE(MAX(last_refresh), '1900-01-01'::timestamp)
        FROM pg_stat_user_tables 
        WHERE relname = 'mv_daily_sales_summary'
      )
  ) THEN
    -- Refresh daily summary for current date only
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_daily_sales_summary;
    
    -- Refresh customer analytics for current date
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_customer_analytics;
    
    -- Refresh dashboard cache that depends on current date
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_dashboard_summary_cache;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule using pg_cron (if available) or application-level cron
SELECT cron.schedule('refresh-current-day', '*/15 * * * *', 'SELECT pos.refresh_current_day_mv();');
```

#### 2. Weekly Refresh (Every Sunday at 2 AM)
```sql
-- Refresh weekly and monthly aggregations
CREATE OR REPLACE FUNCTION pos.refresh_weekly_mv() RETURNS VOID AS $$
BEGIN
  -- Refresh weekly aggregations
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_weekly_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_weekly_reports_cache;
  
  -- Refresh monthly aggregations if we're in a new month
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 AND EXTRACT(DAY FROM CURRENT_DATE) <= 7 THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_monthly_sales_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_monthly_reports_cache;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Schedule weekly refresh
SELECT cron.schedule('refresh-weekly', '0 2 * * 0', 'SELECT pos.refresh_weekly_mv();');
```

#### 3. Monthly Full Refresh (First Sunday of each month at 3 AM)
```sql
-- Complete refresh of all materialized views
CREATE OR REPLACE FUNCTION pos.refresh_all_mv() RETURNS VOID AS $$
BEGIN
  -- Refresh all materialized views in dependency order
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_daily_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_customer_analytics;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_product_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_weekly_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_monthly_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_dashboard_summary_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_weekly_reports_cache;
  REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_monthly_reports_cache;
END;
$$ LANGUAGE plpgsql;

-- Schedule monthly full refresh
SELECT cron.schedule('refresh-monthly', '0 3 1 * *', 'SELECT pos.refresh_all_mv();');
```

### Manual Refresh Capabilities

#### Admin-triggered Refresh
```sql
-- API function for manual refresh
CREATE OR REPLACE FUNCTION pos.manual_refresh_mv(view_name TEXT DEFAULT 'all') RETURNS JSON AS $$
DECLARE
  result JSON;
  start_time TIMESTAMP;
  end_time TIMESTAMP;
BEGIN
  start_time := clock_timestamp();
  
  CASE view_name
    WHEN 'all' THEN
      PERFORM pos.refresh_all_mv();
    WHEN 'daily' THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_daily_sales_summary;
      REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_customer_analytics;
    WHEN 'weekly' THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_weekly_sales_summary;
      REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_weekly_reports_cache;
    WHEN 'monthly' THEN
      REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_monthly_sales_summary;
      REFRESH MATERIALIZED VIEW CONCURRENTLY pos.mv_monthly_reports_cache;
    ELSE
      RAISE EXCEPTION 'Invalid view_name: %. Use: all, daily, weekly, monthly', view_name;
  END CASE;
  
  end_time := clock_timestamp();
  
  SELECT json_build_object(
    'success', true,
    'view_refreshed', view_name,
    'duration_ms', EXTRACT(EPOCH FROM (end_time - start_time)) * 1000,
    'timestamp', end_time
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Risk Assessment and Mitigation

### Identified Risks

#### 1. **Data Consistency Risk**
- **Risk**: Materialized views becoming out of sync with source data
- **Impact**: Incorrect business metrics and decisions
- **Mitigation**: 
  - Automated data validation checks
  - Real-time freshness monitoring
  - Automated alerts for stale data
  - Regular reconciliation processes

#### 2. **Performance Degradation During Refresh**
- **Risk**: Database performance impact during materialized view refresh
- **Impact**: Slower response times during refresh periods
- **Mitigation**:
  - Use `REFRESH MATERIALIZED VIEW CONCURRENTLY` to avoid locking
  - Schedule refreshes during low-traffic periods
  - Incremental refresh strategies where possible
  - Monitoring and alerting for refresh duration

#### 3. **Storage Space Requirements**
- **Risk**: Materialized views consuming significant additional storage
- **Impact**: Increased hosting costs and storage management complexity
- **Mitigation**:
  - Regular monitoring of view sizes
  - Automated cleanup of old partitions
  - Storage optimization through selective indexing
  - Archive older data to separate tables

#### 4. **Migration Complexity**
- **Risk**: Complex migration affecting business operations
- **Impact**: Potential downtime or incorrect data during transition
- **Mitigation**:
  - Parallel deployment strategy
  - Comprehensive testing environment
  - Gradual rollout with rollback capabilities
  - Real-time validation during migration

### Contingency Plans

#### Emergency Data Recovery
```sql
-- Emergency procedure to rebuild all materialized views
CREATE OR REPLACE FUNCTION pos.emergency_rebuild_mv() RETURNS JSON AS $$
DECLARE
  result JSON;
  start_time TIMESTAMP;
BEGIN
  start_time := clock_timestamp();
  
  -- Drop and recreate all materialized views
  DROP MATERIALIZED VIEW IF EXISTS pos.mv_dashboard_summary_cache CASCADE;
  DROP MATERIALIZED VIEW IF EXISTS pos.mv_weekly_reports_cache CASCADE;
  DROP MATERIALIZED VIEW IF EXISTS pos.mv_monthly_reports_cache CASCADE;
  DROP MATERIALIZED VIEW IF EXISTS pos.mv_customer_analytics CASCADE;
  DROP MATERIALIZED VIEW IF EXISTS pos.mv_product_performance CASCADE;
  DROP MATERIALIZED VIEW IF EXISTS pos.mv_weekly_sales_summary CASCADE;
  DROP MATERIALIZED VIEW IF EXISTS pos.mv_monthly_sales_summary CASCADE;
  DROP MATERIALIZED VIEW IF EXISTS pos.mv_daily_sales_summary CASCADE;
  
  -- Recreate all views (implementation would include full CREATE statements)
  -- ... [Full materialized view creation SQL here] ...
  
  SELECT json_build_object(
    'success', true,
    'operation', 'emergency_rebuild',
    'duration_ms', EXTRACT(EPOCH FROM (clock_timestamp() - start_time)) * 1000,
    'timestamp', clock_timestamp()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Timeline and Milestones

### Development Timeline (6 Weeks)

#### Week 1: Foundation and Base Views
- **Days 1-2**: Additional indexing and performance optimization
- **Days 3-5**: Create base materialized views (daily, customer analytics)
- **Days 6-7**: Testing and validation of base views

#### Week 2: Aggregation and Cache Layers  
- **Days 8-10**: Create weekly and monthly aggregation views
- **Days 11-12**: Create dashboard cache layer
- **Days 13-14**: Performance testing and optimization

#### Week 3: API Integration
- **Days 15-17**: Create optimized dashboard functions using materialized views
- **Days 18-19**: Create weekly/monthly report functions
- **Days 20-21**: API endpoint creation and testing

#### Week 4: Testing and Validation
- **Days 22-24**: Comprehensive testing and data validation
- **Days 25-26**: Performance benchmarking and comparison
- **Days 27-28**: User acceptance testing with admin users

#### Week 5: Gradual Migration
- **Days 29-31**: Parallel deployment and feature flag implementation
- **Days 32-33**: Progressive rollout (25% → 50% → 75%)
- **Days 34-35**: Performance monitoring and issue resolution

#### Week 6: Full Deployment
- **Days 36-38**: Complete migration to materialized views
- **Days 39-40**: Legacy cleanup and documentation
- **Days 41-42**: Final performance validation and monitoring setup

### Success Metrics

#### Performance Targets
- **Dashboard load time**: < 500ms (down from 5000ms)
- **Database load**: < 200K buffer reads (down from 3.8M)
- **Concurrent users**: Support 50+ simultaneous dashboard users
- **Report generation**: Weekly/monthly reports in < 1 second

#### Operational Targets
- **Data freshness**: < 15 minutes for current day data
- **System availability**: 99.9% uptime during business hours
- **Refresh reliability**: 100% successful automated refreshes
- **Data accuracy**: 100% consistency with source data

### Post-Implementation Review (Week 7)

#### Performance Analysis
- Compare actual vs. target performance metrics
- Analyze query patterns and optimization opportunities
- Review resource utilization and cost impact

#### Process Improvement
- Document lessons learned and best practices
- Optimize refresh strategies based on usage patterns
- Plan future enhancements and additional materialized views

---

**Document Status**: Draft v1.0  
**Next Review**: Upon completion of Phase 1 implementation  
**Approval Required**: Technical Lead, Database Administrator, Product Owner

## Appendix

### A. SQL Scripts for Implementation
[All complete SQL scripts will be provided in separate files]

### B. Testing and Validation Procedures
[Detailed test cases and validation scripts]

### C. Monitoring and Alerting Configuration
[Complete monitoring setup and alert configurations]

### D. Performance Benchmarks
[Detailed before/after performance comparisons]