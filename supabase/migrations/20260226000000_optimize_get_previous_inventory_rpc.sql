-- Optimize get_previous_inventory_values RPC function
-- Changes:
-- 1. Add ROWS 50 hint to help query planner estimate result size
-- 2. Add explicit SECURITY INVOKER for clarity (was implicit default)
--
-- This function returns the most recent inventory value for each product
-- before a given date, used for spike detection warnings in the inventory form.

CREATE OR REPLACE FUNCTION get_previous_inventory_values(p_reference_date DATE)
RETURNS TABLE (
  product_id UUID,
  value_numeric NUMERIC,
  date DATE
)
LANGUAGE sql
STABLE
SECURITY INVOKER
ROWS 50
AS $$
  SELECT DISTINCT ON (product_id)
    product_id,
    value_numeric,
    date
  FROM inventory_submission
  WHERE date < p_reference_date
    AND value_numeric IS NOT NULL
  ORDER BY product_id, date DESC;
$$;
