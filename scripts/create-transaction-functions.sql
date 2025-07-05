-- Transaction Management Database Functions
-- This script creates/updates transaction-related database functions with correct discount calculations

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_transaction_details(TEXT);
DROP FUNCTION IF EXISTS get_transactions_list(DATE, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT);

-- Function to get detailed transaction information
CREATE OR REPLACE FUNCTION get_transaction_details(p_receipt_number TEXT)
RETURNS TABLE (
  transaction_summary JSON,
  transaction_items JSON[]
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_transaction_summary JSON;
  v_transaction_items JSON[];
BEGIN
  -- Get transaction summary
  SELECT json_build_object(
    'receipt_number', t.receipt_number,
    'date', t.date,
    'sales_timestamp', t.sales_timestamp,
    'customer_name', t.customer_name,
    'staff_name', t.staff_name,
    'payment_method', t.payment_method,
    'total_amount', t.total_amount,
    'net_amount', t.net_amount,
    'total_profit', t.total_profit,
    'item_count', t.item_count,
    'sim_usage_count', t.sim_usage_count,
    'status', t.status
  ) INTO v_transaction_summary
  FROM (
    SELECT DISTINCT
      receipt_number,
      date,
      sales_timestamp,
      customer_name,
      staff_name,
      payment_method,
      SUM(sales_total) OVER (PARTITION BY receipt_number) as total_amount,
      SUM(sales_net) OVER (PARTITION BY receipt_number) as net_amount,
      SUM(gross_profit) OVER (PARTITION BY receipt_number) as total_profit,
      COUNT(*) OVER (PARTITION BY receipt_number) as item_count,
      SUM(CASE WHEN is_sim_usage = 1 THEN item_cnt ELSE 0 END) OVER (PARTITION BY receipt_number) as sim_usage_count,
      'COMPLETED' as status
    FROM pos_transaction_items
    WHERE receipt_number = p_receipt_number
    LIMIT 1
  ) t;

  -- Get transaction items with corrected discount calculations
  SELECT array_agg(
    json_build_object(
      'id', id,
      'receipt_number', receipt_number,
      'product_name', product_name,
      'product_category', product_category,
      'product_parent_category', product_parent_category,
      'item_cnt', item_cnt,
      'item_price_incl_vat', item_price_incl_vat,
      'item_price_excl_vat', item_price_excl_vat,
      'item_discount', COALESCE(item_discount, 0),
      'sales_total', sales_total,
      'sales_net', sales_net,
      'sales_discount', COALESCE(sales_discount, 0),
      'gross_profit', gross_profit,
      'is_sim_usage', is_sim_usage,
      'item_notes', item_notes,
      'sku_number', sku_number,
      'discount_percentage', CASE 
        WHEN COALESCE(sales_discount, 0) > 0 
        THEN ROUND(COALESCE(sales_discount, 0) / (sales_total + COALESCE(sales_discount, 0)) * 100)
        ELSE 0 
      END
    )
  ) INTO v_transaction_items
  FROM pos_transaction_items
  WHERE receipt_number = p_receipt_number;

  -- Return the combined result
  RETURN QUERY
  SELECT v_transaction_summary, v_transaction_items;
END;
$$;

-- Function to get transactions list with filters
CREATE OR REPLACE FUNCTION get_transactions_list(
  p_start_date DATE,
  p_end_date DATE,
  p_status TEXT DEFAULT 'ALL',
  p_payment_method TEXT DEFAULT NULL,
  p_staff_name TEXT DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_min_amount NUMERIC DEFAULT NULL,
  p_max_amount NUMERIC DEFAULT NULL,
  p_has_sim_usage BOOLEAN DEFAULT NULL,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50,
  p_sort_by TEXT DEFAULT 'sales_timestamp',
  p_sort_order TEXT DEFAULT 'desc'
)
RETURNS TABLE (
  receipt_number TEXT,
  date DATE,
  sales_timestamp TIMESTAMP WITH TIME ZONE,
  customer_name TEXT,
  staff_name TEXT,
  payment_method TEXT,
  total_amount NUMERIC,
  net_amount NUMERIC,
  total_profit NUMERIC,
  item_count BIGINT,
  sim_usage_count BIGINT,
  status TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH transaction_summary AS (
    SELECT DISTINCT
      t.receipt_number,
      t.date,
      t.sales_timestamp,
      t.customer_name,
      t.staff_name,
      t.payment_method,
      SUM(t.sales_total) OVER (PARTITION BY t.receipt_number) as total_amount,
      SUM(t.sales_net) OVER (PARTITION BY t.receipt_number) as net_amount,
      SUM(t.gross_profit) OVER (PARTITION BY t.receipt_number) as total_profit,
      COUNT(*) OVER (PARTITION BY t.receipt_number) as item_count,
      SUM(CASE WHEN t.is_sim_usage = 1 THEN t.item_cnt ELSE 0 END) OVER (PARTITION BY t.receipt_number) as sim_usage_count,
      'COMPLETED' as status
    FROM pos_transaction_items t
    WHERE t.date >= p_start_date 
      AND t.date <= p_end_date
      AND (p_payment_method IS NULL OR t.payment_method ILIKE '%' || p_payment_method || '%')
      AND (p_staff_name IS NULL OR t.staff_name ILIKE '%' || p_staff_name || '%')
      AND (p_customer_name IS NULL OR t.customer_name ILIKE '%' || p_customer_name || '%')
  ),
  filtered_transactions AS (
    SELECT *
    FROM transaction_summary ts
    WHERE (p_min_amount IS NULL OR ts.total_amount >= p_min_amount)
      AND (p_max_amount IS NULL OR ts.total_amount <= p_max_amount)
      AND (p_has_sim_usage IS NULL OR (p_has_sim_usage AND ts.sim_usage_count > 0) OR (NOT p_has_sim_usage AND ts.sim_usage_count = 0))
  )
  SELECT 
    ft.receipt_number,
    ft.date,
    ft.sales_timestamp,
    ft.customer_name,
    ft.staff_name,
    ft.payment_method,
    ft.total_amount,
    ft.net_amount,
    ft.total_profit,
    ft.item_count,
    ft.sim_usage_count,
    ft.status
  FROM filtered_transactions ft
  ORDER BY 
    CASE 
      WHEN p_sort_by = 'sales_timestamp' AND p_sort_order = 'desc' THEN ft.sales_timestamp
    END DESC,
    CASE 
      WHEN p_sort_by = 'sales_timestamp' AND p_sort_order = 'asc' THEN ft.sales_timestamp
    END ASC,
    CASE 
      WHEN p_sort_by = 'total_amount' AND p_sort_order = 'desc' THEN ft.total_amount
    END DESC,
    CASE 
      WHEN p_sort_by = 'total_amount' AND p_sort_order = 'asc' THEN ft.total_amount
    END ASC,
    ft.sales_timestamp DESC
  LIMIT p_limit
  OFFSET (p_page - 1) * p_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_transaction_details(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_transactions_list(DATE, DATE, TEXT, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, BOOLEAN, INTEGER, INTEGER, TEXT, TEXT) TO authenticated;

-- Success message
SELECT 'Transaction functions created successfully!' as message; 