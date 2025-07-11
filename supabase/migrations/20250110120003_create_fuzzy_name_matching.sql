-- Customer Management System: Fuzzy Name Matching Function
-- CMS-006: Customer Mapping Service Support

-- Enable pg_trgm extension for similarity functions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to find customers by fuzzy name matching
CREATE OR REPLACE FUNCTION find_customers_by_fuzzy_name(
  search_name TEXT,
  min_similarity REAL DEFAULT 0.7
)
RETURNS TABLE(
  id UUID,
  customer_code VARCHAR,
  customer_name VARCHAR,
  contact_number VARCHAR,
  email VARCHAR,
  normalized_phone VARCHAR,
  similarity REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.customer_code,
    c.customer_name,
    c.contact_number,
    c.email,
    c.normalized_phone,
    similarity(c.customer_name, search_name) as similarity
  FROM public.customers c
  WHERE 
    c.is_active = true
    AND c.customer_name IS NOT NULL
    AND similarity(c.customer_name, search_name) >= min_similarity
  ORDER BY 
    similarity(c.customer_name, search_name) DESC,
    c.customer_name ASC;
END;
$$ LANGUAGE plpgsql;

-- Create index for trigram similarity searches
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING GIN (customer_name gin_trgm_ops);

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_customers_by_fuzzy_name(TEXT, REAL) TO authenticated;
GRANT EXECUTE ON FUNCTION find_customers_by_fuzzy_name(TEXT, REAL) TO service_role;