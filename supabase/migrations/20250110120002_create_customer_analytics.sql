-- Customer Management System: Customer Analytics Implementation
-- CMS-005: Customer Analytics Implementation

-- Basic customer metrics view
CREATE OR REPLACE VIEW customer_analytics AS
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
  
  -- Package counts
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

-- Package statistics
LEFT JOIN (
  SELECT 
    customer_id,
    COUNT(*) as total_packages,
    COUNT(CASE WHEN expiration_date > CURRENT_DATE OR expiration_date IS NULL THEN 1 END) as active_packages
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

-- Customer KPI function
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
      
      -- Customers with packages
      (SELECT COUNT(DISTINCT customer_id) 
       FROM backoffice.packages 
       WHERE customer_id IS NOT NULL 
         AND (expiration_date > CURRENT_DATE OR expiration_date IS NULL)) as customers_with_packages,
      
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

-- Customer search function with filters
CREATE OR REPLACE FUNCTION search_customers(
  search_term TEXT DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  date_from DATE DEFAULT NULL,
  date_to DATE DEFAULT NULL,
  contact_method_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50,
  offset_count INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  customer_code VARCHAR,
  customer_name VARCHAR,
  contact_number VARCHAR,
  email VARCHAR,
  preferred_contact_method VARCHAR,
  customer_status TEXT,
  lifetime_spending DECIMAL,
  total_bookings INTEGER,
  last_visit_date DATE,
  active_packages INTEGER,
  created_at TIMESTAMPTZ,
  search_rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.customer_code,
    ca.customer_name,
    ca.contact_number,
    ca.email,
    ca.preferred_contact_method,
    ca.customer_status,
    ca.lifetime_spending,
    ca.total_bookings,
    ca.last_visit_date,
    ca.active_packages,
    ca.created_at,
    CASE 
      WHEN search_term IS NOT NULL 
      THEN ts_rank(c.search_vector, plainto_tsquery('english', search_term))
      ELSE 0
    END as search_rank
  FROM customer_analytics ca
  JOIN public.customers c ON ca.id = c.id
  WHERE 
    -- Search filter
    (search_term IS NULL OR c.search_vector @@ plainto_tsquery('english', search_term))
    
    -- Status filter
    AND (status_filter IS NULL OR ca.customer_status = status_filter)
    
    -- Date range filter
    AND (date_from IS NULL OR ca.customer_create_date >= date_from)
    AND (date_to IS NULL OR ca.customer_create_date <= date_to)
    
    -- Contact method filter
    AND (contact_method_filter IS NULL OR ca.preferred_contact_method = contact_method_filter)
    
    -- Only active customers
    AND ca.is_active = true
  ORDER BY 
    CASE WHEN search_term IS NOT NULL THEN search_rank END DESC,
    ca.customer_name ASC
  LIMIT limit_count
  OFFSET offset_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT ON customer_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_kpis(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION search_customers(TEXT, TEXT, DATE, DATE, TEXT, INTEGER, INTEGER) TO authenticated;