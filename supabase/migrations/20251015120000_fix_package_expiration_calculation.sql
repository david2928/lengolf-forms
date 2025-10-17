-- Fix package expiration date calculation to subtract 1 day
-- Issue: Packages were calculating 5th July + 1 month = 5th August (inclusive)
-- Fixed: Packages now calculate 5th July + 1 month = 4th August (period - 1 day)

-- ============================================================================
-- PART 1: Update calculate_expiration_date functions
-- ============================================================================

-- Function 1: calculate_expiration_date(package_type_id, first_use_date)
CREATE OR REPLACE FUNCTION backoffice.calculate_expiration_date(package_type_id integer, first_use_date date)
 RETURNS date
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'backoffice', 'public'
AS $function$
DECLARE
    validity_period interval;
    expiration_date date;
BEGIN
    -- Get validity period from package_types using the ID
    SELECT pt.validity_period INTO validity_period
    FROM backoffice.package_types pt
    WHERE pt.id = package_type_id;

    IF validity_period IS NULL THEN
        RETURN NULL; -- Unlimited packages
    END IF;

    -- Calculate expiration date (subtract 1 day to get correct period)
    -- Example: July 5 + 1 month - 1 day = August 4 (31 days total)
    expiration_date := first_use_date + validity_period - INTERVAL '1 day';

    RETURN expiration_date;
END;
$function$;

-- Function 2: calculate_expiration_date(package_type_name, first_use_date)
CREATE OR REPLACE FUNCTION backoffice.calculate_expiration_date(package_type_name text, first_use_date date)
 RETURNS date
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'backoffice', 'public'
AS $function$
DECLARE
    validity_period interval;
    expiration_date date;
BEGIN
    -- Get validity period from package_types
    SELECT pt.validity_period INTO validity_period
    FROM package_types pt
    WHERE pt.name = package_type_name;

    IF validity_period IS NULL THEN
        RETURN NULL; -- Unlimited packages
    END IF;

    -- Calculate expiration date (subtract 1 day to get correct period)
    expiration_date := first_use_date + validity_period - INTERVAL '1 day';

    RETURN expiration_date;
END;
$function$;

-- Function 3: calculate_expiration_date(start_date, period_interval)
CREATE OR REPLACE FUNCTION backoffice.calculate_expiration_date(start_date date, period_interval interval)
 RETURNS date
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'backoffice', 'public'
AS $function$
BEGIN
    IF period_interval IS NULL THEN
        RETURN NULL; -- Unlimited packages
    END IF;

    -- Calculate expiration date (subtract 1 day to get correct period)
    RETURN start_date + period_interval - INTERVAL '1 day';
END;
$function$;

-- ============================================================================
-- PART 2: Update existing packages that match the old calculation logic
-- ============================================================================

-- Only update packages where expiration_date matches the OLD formula
-- This preserves any manual adjustments made by staff
UPDATE backoffice.packages p
SET expiration_date = (p.first_use_date + pt.validity_period - INTERVAL '1 day')::date
FROM backoffice.package_types pt
WHERE p.package_type_id = pt.id
  AND p.first_use_date IS NOT NULL
  AND p.expiration_date IS NOT NULL
  AND pt.validity_period IS NOT NULL
  -- Only update if it matches the old formula (not manually modified)
  AND p.expiration_date = (p.first_use_date + pt.validity_period)::date;

-- ============================================================================
-- PART 3: Verification queries (output for logging)
-- ============================================================================

-- Show summary of updated packages
DO $$
DECLARE
    updated_count integer;
    active_count integer;
    expired_count integer;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO updated_count
    FROM backoffice.packages p
    JOIN backoffice.package_types pt ON p.package_type_id = pt.id
    WHERE p.first_use_date IS NOT NULL
      AND p.expiration_date IS NOT NULL
      AND pt.validity_period IS NOT NULL
      AND p.expiration_date = (p.first_use_date + pt.validity_period - INTERVAL '1 day')::date;

    SELECT COUNT(*) INTO active_count
    FROM backoffice.packages p
    JOIN backoffice.package_types pt ON p.package_type_id = pt.id
    WHERE p.first_use_date IS NOT NULL
      AND p.expiration_date IS NOT NULL
      AND pt.validity_period IS NOT NULL
      AND p.expiration_date = (p.first_use_date + pt.validity_period - INTERVAL '1 day')::date
      AND p.expiration_date >= CURRENT_DATE;

    SELECT COUNT(*) INTO expired_count
    FROM backoffice.packages p
    JOIN backoffice.package_types pt ON p.package_type_id = pt.id
    WHERE p.first_use_date IS NOT NULL
      AND p.expiration_date IS NOT NULL
      AND pt.validity_period IS NOT NULL
      AND p.expiration_date = (p.first_use_date + pt.validity_period - INTERVAL '1 day')::date
      AND p.expiration_date < CURRENT_DATE;

    RAISE NOTICE 'Package expiration date fix completed:';
    RAISE NOTICE '- Total packages updated: %', updated_count;
    RAISE NOTICE '- Active packages: %', active_count;
    RAISE NOTICE '- Expired packages: %', expired_count;
END $$;
