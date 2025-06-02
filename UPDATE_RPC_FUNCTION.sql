-- Updated get_package_monitor_data function to use package type instead of hardcoded IDs
-- This replaces the hardcoded WHERE pt.id IN (7, 11) with WHERE pt.type = 'Unlimited'
-- Now includes 'package_type' field in the JSON objects and supports both unlimited and diamond field names
-- Apply this manually to your Supabase database

CREATE OR REPLACE FUNCTION get_package_monitor_data()
RETURNS TABLE (
  unlimited_active bigint,
  unlimited_packages json,
  expiring_count bigint,
  expiring_packages json,
  -- Legacy fields for API compatibility
  diamond_active bigint,
  diamond_packages json
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH unlimited_data AS (
    SELECT 
      count(*) as unlimited_active,
      json_agg(
        json_build_object(
          'id', p.id,
          'customer_name', p.customer_name,
          'package_type_name', pt.name,
          'package_type', pt.type,
          'purchase_date', p.purchase_date,
          'first_use_date', p.first_use_date,
          'expiration_date', p.expiration_date,
          'employee_name', p.employee_name
        )
      ) as unlimited_packages
    FROM packages p
    JOIN package_types pt ON p.package_type_id = pt.id
    WHERE pt.type = 'Unlimited'  -- Changed from pt.id IN (7, 11) to use type field
    AND p.expiration_date >= CURRENT_DATE
  ),
  expiring_data AS (
    SELECT 
      count(*) as expiring_count,
      json_agg(
        json_build_object(
          'id', p.id,
          'customer_name', p.customer_name,
          'package_type_name', pt.name,
          'package_type', pt.type,
          'purchase_date', p.purchase_date,
          'first_use_date', p.first_use_date,
          'expiration_date', p.expiration_date,
          'employee_name', p.employee_name,
          'remaining_hours', COALESCE(
            (SELECT pt.hours - COALESCE(SUM(pu.used_hours), 0)
             FROM package_usage pu
             WHERE pu.package_id = p.id),
            pt.hours
          ),
          'used_hours', COALESCE(
            (SELECT SUM(pu.used_hours)
             FROM package_usage pu
             WHERE pu.package_id = p.id),
            0
          )
        )
      ) as expiring_packages
    FROM packages p
    JOIN package_types pt ON p.package_type_id = pt.id
    WHERE p.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  )
  SELECT 
    u.unlimited_active,
    u.unlimited_packages,
    e.expiring_count,
    e.expiring_packages,
    -- Legacy compatibility fields for backward compatibility
    u.unlimited_active as diamond_active,
    u.unlimited_packages as diamond_packages
  FROM unlimited_data u, expiring_data e;
END;
$$;

-- Drop existing get_customer_packages functions to resolve overloading conflict
-- This removes both the varchar and text parameter versions
DROP FUNCTION IF EXISTS get_customer_packages(varchar, boolean);
DROP FUNCTION IF EXISTS get_customer_packages(text, boolean);
DROP FUNCTION IF EXISTS get_customer_packages(character varying, boolean);

-- Updated get_customer_packages function to include package_type field
-- This adds the package_type field to the customer packages API response
-- Apply this manually to your Supabase database

CREATE OR REPLACE FUNCTION get_customer_packages(p_customer_name text, p_active boolean DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  customer_name text,
  package_type_name text,
  package_type text,
  purchase_date date,
  first_use_date date,
  expiration_date date,
  employee_name text,
  remaining_hours numeric,
  used_hours numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.customer_name::text,
    pt.name::text as package_type_name,
    pt.type::text as package_type,
    p.purchase_date,
    p.first_use_date,
    p.expiration_date,
    p.employee_name::text,
    ROUND(COALESCE(pt.hours - COALESCE((
      SELECT SUM(pu.used_hours)
      FROM package_usage pu
      WHERE pu.package_id = p.id
    ), 0), 0)::numeric, 1) as remaining_hours,
    ROUND(COALESCE((
      SELECT SUM(pu.used_hours)
      FROM package_usage pu
      WHERE pu.package_id = p.id
    ), 0)::numeric, 1) as used_hours
  FROM packages p
  JOIN package_types pt ON p.package_type_id = pt.id
  WHERE p.customer_name = p_customer_name
  AND (
    p_active IS NULL 
    OR 
    CASE 
      WHEN p_active = true THEN p.expiration_date > CURRENT_DATE
      ELSE p.expiration_date <= CURRENT_DATE
    END
  )
  ORDER BY p.expiration_date DESC;
END;
$$;

-- Updated get_packages_by_customer_name function for create booking flow
-- This replaces the hardcoded pt.name LIKE '%Unlimited%' with pt.type = 'Unlimited'
-- Apply this manually to your Supabase database

CREATE OR REPLACE FUNCTION get_packages_by_customer_name(p_customer_name text)
RETURNS TABLE (
  id uuid,
  customer_name text,
  package_type_name text,
  first_use_date date,
  expiration_date date,
  remaining_hours numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH package_hours AS (
        SELECT 
            p.id,
            COALESCE(SUM(pu.used_hours), 0) as used_hours
        FROM packages p
        LEFT JOIN package_usage pu ON p.id = pu.package_id
        GROUP BY p.id
    )
    SELECT 
        p.id,
        p.customer_name::text,
        pt.name::text as package_type_name,
        p.first_use_date,
        p.expiration_date,
        CASE 
            WHEN pt.type = 'Unlimited' THEN NULL  -- Changed from pt.name LIKE '%Unlimited%'
            ELSE pt.hours - COALESCE(ph.used_hours, 0)
        END as remaining_hours
    FROM packages p
    JOIN package_types pt ON p.package_type_id = pt.id
    LEFT JOIN package_hours ph ON p.id = ph.id
    WHERE 
        REGEXP_REPLACE(p.customer_name, '\s+', ' ', 'g') = REGEXP_REPLACE(p_customer_name, '\s+', ' ', 'g')
        AND p.expiration_date >= CURRENT_DATE
        AND (
            pt.type = 'Unlimited'  -- Changed from pt.name LIKE '%Unlimited%'
            OR (pt.hours - COALESCE(ph.used_hours, 0)) > 0
        )
    ORDER BY p.first_use_date DESC;
END;
$$;

-- Alternative version if you want to also update the return type signature:
-- (Uncomment this version if you want to remove legacy field names entirely)

/*
CREATE OR REPLACE FUNCTION get_package_monitor_data()
RETURNS TABLE (
  unlimited_active bigint,
  unlimited_packages json,
  expiring_count bigint,
  expiring_packages json
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH unlimited_data AS (
    SELECT 
      count(*) as unlimited_active,
      json_agg(
        json_build_object(
          'id', p.id,
          'customer_name', p.customer_name,
          'package_type_name', pt.name,
          'package_type', pt.type,
          'purchase_date', p.purchase_date,
          'first_use_date', p.first_use_date,
          'expiration_date', p.expiration_date,
          'employee_name', p.employee_name
        )
      ) as unlimited_packages
    FROM packages p
    JOIN package_types pt ON p.package_type_id = pt.id
    WHERE pt.type = 'Unlimited'
    AND p.expiration_date >= CURRENT_DATE
  ),
  expiring_data AS (
    SELECT 
      count(*) as expiring_count,
      json_agg(
        json_build_object(
          'id', p.id,
          'customer_name', p.customer_name,
          'package_type_name', pt.name,
          'package_type', pt.type,
          'purchase_date', p.purchase_date,
          'first_use_date', p.first_use_date,
          'expiration_date', p.expiration_date,
          'employee_name', p.employee_name,
          'remaining_hours', COALESCE(
            (SELECT pt.hours - COALESCE(SUM(pu.used_hours), 0)
             FROM package_usage pu
             WHERE pu.package_id = p.id),
            pt.hours
          ),
          'used_hours', COALESCE(
            (SELECT SUM(pu.used_hours)
             FROM package_usage pu
             WHERE pu.package_id = p.id),
            0
          )
        )
      ) as expiring_packages
    FROM packages p
    JOIN package_types pt ON p.package_type_id = pt.id
    WHERE p.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
  )
  SELECT 
    u.unlimited_active,
    u.unlimited_packages,
    e.expiring_count,
    e.expiring_packages
  FROM unlimited_data u, expiring_data e;
END;
$$;
*/ 