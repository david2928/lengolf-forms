-- Fix package monitor to show packages expiring today
-- Issue: Packages expiring today are shown as EXPIRED in the package monitor
-- even though they are still usable until the end of the day.
-- Root cause: get_package_monitor_data_v2 uses "expiration_date > CURRENT_DATE"
-- instead of "expiration_date >= CURRENT_DATE"
--
-- This migration makes get_package_monitor_data_v2 consistent with the earlier fix
-- in migration 20250203000000_fix_package_expiration_today.sql

-- ============================================================================
-- Fix get_package_monitor_data_v2 function
-- ============================================================================

CREATE OR REPLACE FUNCTION backoffice.get_package_monitor_data_v2()
RETURNS TABLE(
    unlimited_active bigint,
    unlimited_packages json,
    expiring_count bigint,
    expiring_packages json,
    diamond_active bigint,
    diamond_packages json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unlimited_count bigint;
    unlimited_data json;
    expiring_count_var bigint;
    expiring_data json;
    diamond_count bigint;
    diamond_data json;
BEGIN
    -- Get ACTIVE unlimited packages (type = 'Unlimited') with fresh customer data
    -- FIXED: Changed > to >= to include packages expiring today
    SELECT COUNT(*), COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO unlimited_count, unlimited_data
    FROM (
        SELECT
            p.id,
            c.customer_name,
            c.contact_number,
            pt.name as package_type_name,
            pt.type as package_type,
            p.purchase_date,
            p.first_use_date,
            p.expiration_date,
            p.employee_name,
            'Unlimited' as remaining_hours
        FROM backoffice.packages p
        JOIN backoffice.package_types pt ON p.package_type_id = pt.id
        JOIN public.customers c ON p.customer_id = c.id
        WHERE pt.type = 'Unlimited'  -- All unlimited type packages (Diamond, Diamond+, Early Bird+)
        AND p.first_use_date IS NOT NULL  -- Must be activated
        AND (p.expiration_date IS NULL OR p.expiration_date >= CURRENT_DATE)  -- Changed from > to >=
        ORDER BY p.expiration_date ASC NULLS LAST
        LIMIT 50
    ) t;

    -- Get packages expiring SOON (within 7 days, currently active) - ALL package types with fresh customer data
    -- FIXED: Changed > to >= to include packages expiring today
    SELECT COUNT(*), COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO expiring_count_var, expiring_data
    FROM (
        SELECT
            p.id,
            c.customer_name,
            c.contact_number,
            pt.name as package_type_name,
            pt.type as package_type,
            p.purchase_date,
            p.first_use_date,
            p.expiration_date,
            p.employee_name,
            CASE
                WHEN pt.hours IS NULL THEN 'Unlimited'
                ELSE COALESCE(pt.hours - COALESCE(usage_sum.total_used, 0), pt.hours)::text
            END as remaining_hours,
            COALESCE(usage_sum.total_used, 0) as used_hours
        FROM backoffice.packages p
        JOIN backoffice.package_types pt ON p.package_type_id = pt.id
        JOIN public.customers c ON p.customer_id = c.id
        LEFT JOIN (
            SELECT
                pu.package_id,
                SUM(pu.used_hours) as total_used
            FROM backoffice.package_usage pu
            GROUP BY pu.package_id
        ) usage_sum ON p.id = usage_sum.package_id
        WHERE p.expiration_date IS NOT NULL
        AND p.expiration_date >= CURRENT_DATE  -- Changed from > to >= (includes packages expiring today)
        AND p.expiration_date <= CURRENT_DATE + INTERVAL '7 days'  -- Expires within 7 days
        AND p.first_use_date IS NOT NULL  -- Must be activated
        AND (pt.hours IS NULL OR COALESCE(pt.hours - COALESCE(usage_sum.total_used, 0), 0) > 0)  -- Has remaining hours or unlimited
        ORDER BY p.expiration_date ASC
        LIMIT 50
    ) t;

    -- Get ACTIVE diamond packages (names containing 'Diamond') with fresh customer data
    -- FIXED: Changed > to >= to include packages expiring today
    SELECT COUNT(*), COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO diamond_count, diamond_data
    FROM (
        SELECT
            p.id,
            c.customer_name,
            c.contact_number,
            pt.name as package_type_name,
            pt.type as package_type,
            p.purchase_date,
            p.first_use_date,
            p.expiration_date,
            p.employee_name,
            'Unlimited' as remaining_hours
        FROM backoffice.packages p
        JOIN backoffice.package_types pt ON p.package_type_id = pt.id
        JOIN public.customers c ON p.customer_id = c.id
        WHERE pt.name ILIKE '%diamond%'  -- Diamond and Diamond+ packages
        AND p.first_use_date IS NOT NULL  -- Must be activated
        AND (p.expiration_date IS NULL OR p.expiration_date >= CURRENT_DATE)  -- Changed from > to >=
        ORDER BY p.expiration_date ASC NULLS LAST
        LIMIT 50
    ) t;

    RETURN QUERY SELECT unlimited_count, unlimited_data, expiring_count_var, expiring_data, diamond_count, diamond_data;
END;
$$;

COMMENT ON FUNCTION backoffice.get_package_monitor_data_v2() IS
'Returns package monitor data with customer information. Packages expiring today are included as they are usable until end of day.';

-- ============================================================================
-- Also fix the original get_package_monitor_data function for consistency
-- ============================================================================

CREATE OR REPLACE FUNCTION backoffice.get_package_monitor_data()
RETURNS TABLE(
    unlimited_active bigint,
    unlimited_packages json,
    expiring_count bigint,
    expiring_packages json,
    diamond_active bigint,
    diamond_packages json
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unlimited_count bigint;
    unlimited_data json;
    expiring_count_var bigint;
    expiring_data json;
    diamond_count bigint;
    diamond_data json;
BEGIN
    -- Get ACTIVE unlimited packages (type = 'Unlimited')
    -- FIXED: Changed > to >= to include packages expiring today
    SELECT COUNT(*), COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO unlimited_count, unlimited_data
    FROM (
        SELECT
            p.id,
            p.customer_name,
            pt.name as package_type_name,
            pt.type as package_type,
            p.purchase_date,
            p.first_use_date,
            p.expiration_date,
            p.employee_name,
            'Unlimited' as remaining_hours
        FROM backoffice.packages p
        JOIN backoffice.package_types pt ON p.package_type_id = pt.id
        WHERE pt.type = 'Unlimited'  -- All unlimited type packages (Diamond, Diamond+, Early Bird+)
        AND p.first_use_date IS NOT NULL  -- Must be activated
        AND (p.expiration_date IS NULL OR p.expiration_date >= CURRENT_DATE)  -- Changed from > to >=
        ORDER BY p.expiration_date ASC NULLS LAST
        LIMIT 50
    ) t;

    -- Get packages expiring SOON (within 7 days, currently active) - ALL package types
    -- FIXED: Changed > to >= to include packages expiring today
    SELECT COUNT(*), COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO expiring_count_var, expiring_data
    FROM (
        SELECT
            p.id,
            p.customer_name,
            pt.name as package_type_name,
            pt.type as package_type,
            p.purchase_date,
            p.first_use_date,
            p.expiration_date,
            p.employee_name,
            CASE
                WHEN pt.hours IS NULL THEN 'Unlimited'
                ELSE COALESCE(pt.hours - COALESCE(usage_sum.total_used, 0), pt.hours)::text
            END as remaining_hours,
            COALESCE(usage_sum.total_used, 0) as used_hours
        FROM backoffice.packages p
        JOIN backoffice.package_types pt ON p.package_type_id = pt.id
        LEFT JOIN (
            SELECT
                pu.package_id,
                SUM(pu.used_hours) as total_used
            FROM backoffice.package_usage pu
            GROUP BY pu.package_id
        ) usage_sum ON p.id = usage_sum.package_id
        WHERE p.expiration_date IS NOT NULL
        AND p.expiration_date >= CURRENT_DATE  -- Changed from > to >= (includes packages expiring today)
        AND p.expiration_date <= CURRENT_DATE + INTERVAL '7 days'  -- Expires within 7 days
        AND p.first_use_date IS NOT NULL  -- Must be activated
        AND (pt.hours IS NULL OR COALESCE(pt.hours - COALESCE(usage_sum.total_used, 0), 0) > 0)  -- Has remaining hours or unlimited
        ORDER BY p.expiration_date ASC
        LIMIT 50
    ) t;

    -- Get ACTIVE diamond packages (names containing 'Diamond')
    -- FIXED: Changed > to >= to include packages expiring today
    SELECT COUNT(*), COALESCE(json_agg(row_to_json(t)), '[]'::json)
    INTO diamond_count, diamond_data
    FROM (
        SELECT
            p.id,
            p.customer_name,
            pt.name as package_type_name,
            pt.type as package_type,
            p.purchase_date,
            p.first_use_date,
            p.expiration_date,
            p.employee_name,
            'Unlimited' as remaining_hours
        FROM backoffice.packages p
        JOIN backoffice.package_types pt ON p.package_type_id = pt.id
        WHERE pt.name ILIKE '%diamond%'  -- Diamond and Diamond+ packages
        AND p.first_use_date IS NOT NULL  -- Must be activated
        AND (p.expiration_date IS NULL OR p.expiration_date >= CURRENT_DATE)  -- Changed from > to >=
        ORDER BY p.expiration_date ASC NULLS LAST
        LIMIT 50
    ) t;

    RETURN QUERY SELECT unlimited_count, unlimited_data, expiring_count_var, expiring_data, diamond_count, diamond_data;
END;
$$;

COMMENT ON FUNCTION backoffice.get_package_monitor_data() IS
'Returns package monitor data. Packages expiring today are included as they are usable until end of day.';

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
    monitor_data RECORD;
BEGIN
    -- Test the fixed function
    SELECT * INTO monitor_data
    FROM backoffice.get_package_monitor_data_v2();

    RAISE NOTICE 'Package monitor expiration fix completed:';
    RAISE NOTICE '- Unlimited packages: %', monitor_data.unlimited_active;
    RAISE NOTICE '- Expiring packages: %', monitor_data.expiring_count;
    RAISE NOTICE '- Diamond packages: %', monitor_data.diamond_active;
    RAISE NOTICE '- Packages expiring today are now shown in the monitor until end of day';
END $$;
