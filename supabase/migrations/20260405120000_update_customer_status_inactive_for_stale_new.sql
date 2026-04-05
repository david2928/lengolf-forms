-- Update customer_status logic:
-- Never-visited customers created over 30 days ago are now "Inactive" instead of "New"
-- "New" is reserved for never-visited customers created within the last 30 days

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

  COALESCE(c.total_lifetime_value, 0.00) as lifetime_spending,
  COALESCE(c.total_visits, 0) as total_bookings,
  c.last_visit_date,

  COALESCE(pkg_stats.active_packages, 0) as active_packages,
  COALESCE(pkg_stats.total_packages, 0) as total_packages,

  sales_stats.first_purchase_date,
  sales_stats.last_purchase_date,
  COALESCE(sales_stats.transaction_count, 0) as transaction_count,

  CASE
    WHEN COALESCE(sales_stats.transaction_count, 0) > 0
    THEN COALESCE(c.total_lifetime_value, 0.00) / sales_stats.transaction_count
    ELSE 0.00
  END as average_transaction_value,

  CASE
    WHEN c.last_visit_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'Active'
    WHEN c.last_visit_date >= CURRENT_DATE - INTERVAL '365 days' THEN 'Inactive'
    WHEN c.last_visit_date IS NOT NULL THEN 'Dormant'
    WHEN c.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 'New'
    ELSE 'Inactive'
  END as customer_status

FROM public.customers c

LEFT JOIN (
  SELECT
    customer_id,
    COUNT(*) as total_packages,
    COUNT(CASE WHEN expiration_date >= CURRENT_DATE OR expiration_date IS NULL THEN 1 END) as active_packages
  FROM backoffice.packages
  WHERE customer_id IS NOT NULL
  GROUP BY customer_id
) pkg_stats ON c.id = pkg_stats.customer_id

LEFT JOIN (
  SELECT
    customer_id,
    MIN(date) as first_purchase_date,
    MAX(date) as last_purchase_date,
    COUNT(DISTINCT receipt_number) as transaction_count
  FROM pos.lengolf_sales
  WHERE customer_id IS NOT NULL AND is_voided <> true
  GROUP BY customer_id
) sales_stats ON c.id = sales_stats.customer_id

WHERE c.is_active = true;
