-- Fix package expiration date logic to allow usage on expiration day
-- Issue: Packages expiring today were blocked from usage because the condition was
-- "expiration_date > CURRENT_DATE" which excludes packages expiring today.
-- Solution: Change to "expiration_date >= CURRENT_DATE" to include packages expiring today.
--
-- Business Logic: Packages should be usable until the END of the expiration day (23:59),
-- not until the START of the expiration day (00:00).

-- ============================================================================
-- PART 1: Fix get_available_packages() function
-- ============================================================================

CREATE OR REPLACE FUNCTION backoffice.get_available_packages()
RETURNS TABLE(
    id uuid,
    customer_name character varying,
    package_type_name character varying,
    first_use_date date,
    expiration_date date,
    remaining_hours numeric,
    is_activated boolean,
    customer_id uuid,
    customer_code character varying,
    contact_number character varying,
    email character varying
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        c.customer_name,
        pt.name as package_type_name,
        p.first_use_date,
        p.expiration_date,
        COALESCE(pt.hours - COALESCE(SUM(pu.used_hours), 0), pt.hours) as remaining_hours,
        (p.first_use_date IS NOT NULL) as is_activated,
        c.id as customer_id,
        c.customer_code,
        c.contact_number,
        c.email
    FROM backoffice.packages p
    JOIN backoffice.package_types pt ON p.package_type_id = pt.id
    LEFT JOIN backoffice.package_usage pu ON p.id = pu.package_id
    LEFT JOIN public.customers c ON p.customer_id = c.id
    WHERE c.id IS NOT NULL
    GROUP BY p.id, c.customer_name, c.id, c.customer_code, c.contact_number, c.email, pt.name, pt.hours, p.first_use_date, p.expiration_date
    HAVING COALESCE(pt.hours - COALESCE(SUM(pu.used_hours), 0), pt.hours) > 0
    AND (p.expiration_date IS NULL OR p.expiration_date >= CURRENT_DATE)  -- Changed from > to >= to include today
    ORDER BY c.customer_name, pt.name;
END;
$$;

COMMENT ON FUNCTION backoffice.get_available_packages() IS
'Returns available packages that have remaining hours and have not expired. Packages expiring today are considered available for usage until end of day.';

-- ============================================================================
-- PART 2: Fix customer_active_packages view
-- ============================================================================

DROP VIEW IF EXISTS backoffice.customer_active_packages CASCADE;

CREATE VIEW backoffice.customer_active_packages AS
SELECT
    p.id AS package_id,
    p.customer_id,
    p.customer_name,
    p.purchase_date,
    p.first_use_date,
    p.expiration_date,
    pt.id AS package_type_id,
    pt.name AS package_type_name,
    pt.display_name,
    pt.type AS package_category,
    pt.hours AS total_hours,
    pt.validity_period,
    pt.pax,
    COALESCE((
        SELECT SUM(pu.used_hours)
        FROM backoffice.package_usage pu
        WHERE pu.package_id = p.id
    ), 0) AS used_hours,
    CASE
        WHEN pt.hours IS NULL THEN NULL
        ELSE GREATEST(0, pt.hours - COALESCE((
            SELECT SUM(pu.used_hours)
            FROM backoffice.package_usage pu
            WHERE pu.package_id = p.id
        ), 0))
    END AS remaining_hours,
    CASE
        WHEN p.expiration_date < CURRENT_DATE THEN 'expired'  -- Only expired if BEFORE today
        WHEN pt.hours IS NULL THEN 'unlimited'
        WHEN (pt.hours - COALESCE((
            SELECT SUM(pu.used_hours)
            FROM backoffice.package_usage pu
            WHERE pu.package_id = p.id
        ), 0)) <= 0 THEN 'depleted'
        ELSE 'active'
    END AS package_status
FROM backoffice.packages p
JOIN backoffice.package_types pt ON p.package_type_id = pt.id
WHERE p.expiration_date >= CURRENT_DATE  -- Changed from > to >= to include today
    AND pt.type <> 'Coaching'
    AND p.customer_id IS NOT NULL
ORDER BY p.purchase_date DESC;

COMMENT ON VIEW backoffice.customer_active_packages IS
'View of active customer packages excluding coaching packages. Includes packages expiring today as they are still usable until end of day.';

-- ============================================================================
-- PART 3: Fix customer_analytics view
-- ============================================================================

DROP VIEW IF EXISTS customer_analytics CASCADE;

CREATE VIEW customer_analytics AS
SELECT
  c.id,
  c.customer_code,
  c.customer_name,
  c.contact_number,
  c.email,
  c.preferred_contact_method,
  c.customer_create_date,
  c.created_at,
  c.updated_at,
  c.is_active,

  -- Lifetime spending from POS
  COALESCE(c.total_lifetime_value, 0.00) as lifetime_spending,

  -- Visit count from bookings
  COALESCE(c.total_visits, 0) as total_bookings,

  -- Last visit from bookings
  c.last_visit_date,

  -- Package counts (FIXED: Changed > to >= to include packages expiring today)
  COALESCE(pkg_stats.active_packages, 0) as active_packages,
  COALESCE(pkg_stats.total_packages, 0) as total_packages,

  -- First transaction from POS
  sales_stats.first_purchase_date,
  sales_stats.last_purchase_date,
  COALESCE(sales_stats.transaction_count, 0) as transaction_count,

  -- Average transaction value
  CASE
    WHEN COALESCE(sales_stats.transaction_count, 0) > 0
    THEN COALESCE(c.total_lifetime_value, 0.00) / sales_stats.transaction_count
    ELSE 0.00
  END as average_transaction_value,

  -- Simple customer status
  CASE
    WHEN c.last_visit_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Active'
    WHEN c.last_visit_date >= CURRENT_DATE - INTERVAL '365 days' THEN 'Inactive'
    WHEN c.last_visit_date IS NOT NULL THEN 'Dormant'
    ELSE 'New'
  END as customer_status

FROM public.customers c

-- Package statistics (FIXED: Changed > to >= to include packages expiring today)
LEFT JOIN (
  SELECT
    customer_id,
    COUNT(*) as total_packages,
    COUNT(CASE WHEN expiration_date >= CURRENT_DATE OR expiration_date IS NULL THEN 1 END) as active_packages
  FROM backoffice.packages
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) pkg_stats ON c.id = pkg_stats.customer_id

-- Sales statistics
LEFT JOIN (
  SELECT
    customer_id,
    MIN(date) as first_purchase_date,
    MAX(date) as last_purchase_date,
    COUNT(DISTINCT receipt_number) as transaction_count
  FROM pos.lengolf_sales
  WHERE customer_id IS NOT NULL
    AND is_voided != true
  GROUP BY customer_id
) sales_stats ON c.id = sales_stats.customer_id

WHERE c.is_active = true;

COMMENT ON VIEW customer_analytics IS
'Customer analytics view with package and sales statistics. Includes packages expiring today as active.';

-- ============================================================================
-- PART 4: Fix get_customer_kpis() function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_customer_kpis(
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  start_date DATE;
  end_date DATE;
BEGIN
  -- Set default date range (last 30 days if not specified)
  start_date := COALESCE(date_from, CURRENT_DATE - INTERVAL '30 days');
  end_date := COALESCE(date_to, CURRENT_DATE);

  SELECT json_build_object(
    'totalCustomers', total_customers,
    'activeCustomers', active_customers,
    'newCustomersThisMonth', new_customers_this_month,
    'newCustomersPreviousMonth', new_customers_previous_month,
    'growthRate', CASE
      WHEN new_customers_previous_month > 0
      THEN ROUND(((new_customers_this_month::DECIMAL - new_customers_previous_month::DECIMAL) / new_customers_previous_month::DECIMAL) * 100, 2)
      ELSE 0
    END,
    'totalLifetimeValue', total_lifetime_value,
    'averageLifetimeValue', CASE
      WHEN total_customers > 0
      THEN ROUND(total_lifetime_value / total_customers, 2)
      ELSE 0
    END,
    'customersWithPackages', customers_with_packages,
    'customersWithRecentActivity', customers_with_recent_activity
  ) INTO result
  FROM (
    SELECT
      -- Total customers
      (SELECT COUNT(*) FROM public.customers WHERE is_active = true) as total_customers,

      -- Active customers (visited in last 90 days)
      (SELECT COUNT(*)
       FROM public.customers
       WHERE is_active = true
         AND last_visit_date >= CURRENT_DATE - INTERVAL '90 days') as active_customers,

      -- New customers this month
      (SELECT COUNT(*)
       FROM public.customers
       WHERE is_active = true
         AND customer_create_date >= date_trunc('month', CURRENT_DATE)) as new_customers_this_month,

      -- New customers previous month
      (SELECT COUNT(*)
       FROM public.customers
       WHERE is_active = true
         AND customer_create_date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
         AND customer_create_date < date_trunc('month', CURRENT_DATE)) as new_customers_previous_month,

      -- Total lifetime value
      (SELECT COALESCE(SUM(total_lifetime_value), 0.00)
       FROM public.customers
       WHERE is_active = true) as total_lifetime_value,

      -- Customers with packages (FIXED: Changed > to >= to include packages expiring today)
      (SELECT COUNT(DISTINCT customer_id)
       FROM backoffice.packages
       WHERE customer_id IS NOT NULL
         AND (expiration_date >= CURRENT_DATE OR expiration_date IS NULL)) as customers_with_packages,

      -- Customers with recent activity (last 30 days)
      (SELECT COUNT(*)
       FROM public.customers
       WHERE is_active = true
         AND (last_visit_date >= CURRENT_DATE - INTERVAL '30 days'
              OR updated_at >= CURRENT_DATE - INTERVAL '30 days')) as customers_with_recent_activity
  ) stats;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_customer_kpis(DATE, DATE) IS
'Returns customer KPIs including package statistics. Counts packages expiring today as active.';

-- ============================================================================
-- PART 5: Fix customer_marketing_analytics view (for consistency)
-- ============================================================================

DROP VIEW IF EXISTS public.customer_marketing_analytics CASCADE;

CREATE VIEW public.customer_marketing_analytics AS
SELECT
    c.id,
    c.customer_code,
    c.customer_name,
    c.contact_number,
    c.email,
    c.preferred_contact_method,
    c.customer_create_date,
    c.created_at,
    c.updated_at,
    c.is_active,
    c.last_contacted,
    COALESCE(pos_stats.lifetime_spending, c.total_lifetime_value, 0.00) AS lifetime_spending,
    COALESCE(pos_stats.visit_count, c.total_visits::bigint, 0::bigint)::integer AS total_bookings,
    pos_stats.last_visit_date,
    COALESCE(pkg_stats.active_packages, 0::bigint) AS active_packages,
    COALESCE(pkg_stats.total_packages, 0::bigint) AS total_packages,
    pos_stats.first_purchase_date,
    pos_stats.last_purchase_date,
    COALESCE(pos_stats.transaction_count, 0::bigint) AS transaction_count,
    COALESCE(pos_stats.average_transaction_value, 0.00) AS average_transaction_value,
    CASE
        WHEN pos_stats.last_visit_date >= (CURRENT_DATE - '90 days'::interval) THEN 'Active'
        WHEN pos_stats.last_visit_date >= (CURRENT_DATE - '365 days'::interval) THEN 'Inactive'
        WHEN pos_stats.last_visit_date IS NOT NULL THEN 'Dormant'
        ELSE 'New'
    END AS customer_status,
    pkg_stats.last_package_name,
    pkg_stats.last_package_type,
    pkg_stats.last_package_purchase_date,
    pkg_stats.last_package_expiration_date,
    pkg_stats.last_package_first_use_date,
    COALESCE(coaching_stats.has_coaching, false) AS has_coaching,
    coaching_stats.coaching_sessions_count
FROM customers c
LEFT JOIN (
    SELECT
        lengolf_sales.customer_id,
        max(lengolf_sales.date) AS last_visit_date,
        min(lengolf_sales.date) AS first_purchase_date,
        max(lengolf_sales.date) AS last_purchase_date,
        count(DISTINCT lengolf_sales.date) AS visit_count,
        count(DISTINCT lengolf_sales.id) AS transaction_count,
        sum(
            CASE
                WHEN lengolf_sales.is_voided = false THEN lengolf_sales.sales_net
                ELSE 0::numeric
            END
        ) AS lifetime_spending,
        CASE
            WHEN count(DISTINCT lengolf_sales.date) > 0
            THEN sum(
                CASE
                    WHEN lengolf_sales.is_voided = false THEN lengolf_sales.sales_net
                    ELSE 0::numeric
                END
            ) / count(DISTINCT lengolf_sales.date)::numeric
            ELSE 0::numeric
        END AS average_transaction_value
    FROM pos.lengolf_sales
    WHERE lengolf_sales.customer_id IS NOT NULL
        AND lengolf_sales.is_voided = false
    GROUP BY lengolf_sales.customer_id
) pos_stats ON c.id = pos_stats.customer_id
LEFT JOIN (
    SELECT
        p.customer_id,
        count(*) AS total_packages,
        -- FIXED: Changed > to >= to include packages expiring today
        count(
            CASE
                WHEN p.purchase_date <= CURRENT_DATE
                    AND (p.expiration_date >= CURRENT_DATE OR p.expiration_date IS NULL)
                THEN 1
                ELSE NULL::integer
            END
        ) AS active_packages,
        max(p.purchase_date) AS last_package_purchase_date,
        (array_agg(pt.display_name ORDER BY p.purchase_date DESC))[1] AS last_package_name,
        (array_agg(pt.type ORDER BY p.purchase_date DESC))[1] AS last_package_type,
        (array_agg(p.expiration_date ORDER BY p.purchase_date DESC))[1] AS last_package_expiration_date,
        (array_agg(p.first_use_date ORDER BY p.purchase_date DESC))[1] AS last_package_first_use_date
    FROM backoffice.packages p
    JOIN backoffice.package_types pt ON p.package_type_id = pt.id
    GROUP BY p.customer_id
) pkg_stats ON c.id = pkg_stats.customer_id
LEFT JOIN (
    SELECT
        bookings.customer_id,
        true AS has_coaching,
        count(*) AS coaching_sessions_count
    FROM bookings
    WHERE bookings.booking_type ~~* '%Coaching%'
    GROUP BY bookings.customer_id
) coaching_stats ON c.id = coaching_stats.customer_id
WHERE c.is_active = true;

COMMENT ON VIEW public.customer_marketing_analytics IS
'Marketing analytics view for customers. Includes packages expiring today as active.';

-- ============================================================================
-- PART 6: Verification
-- ============================================================================

DO $$
DECLARE
    available_count integer;
    active_packages_count integer;
BEGIN
    -- Count packages from get_available_packages()
    SELECT COUNT(*) INTO available_count
    FROM backoffice.get_available_packages();

    -- Count active packages from view
    SELECT COUNT(*) INTO active_packages_count
    FROM backoffice.customer_active_packages;

    RAISE NOTICE 'Package expiration fix completed:';
    RAISE NOTICE '- Available packages (via function): %', available_count;
    RAISE NOTICE '- Active packages (via view): %', active_packages_count;
    RAISE NOTICE '- Packages expiring today are now usable until end of day';
END $$;
