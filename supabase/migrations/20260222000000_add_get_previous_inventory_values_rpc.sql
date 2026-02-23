-- Create RPC function to efficiently get the most recent inventory submission
-- for each product before a given reference date using DISTINCT ON
CREATE OR REPLACE FUNCTION get_previous_inventory_values(p_reference_date DATE)
RETURNS TABLE (
  product_id UUID,
  value_numeric NUMERIC,
  date DATE
)
LANGUAGE sql
STABLE
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
