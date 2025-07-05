CREATE OR REPLACE FUNCTION get_sales_by_sku(start_date DATE, end_date DATE)
RETURNS TABLE(
    date DATE,
    sku_number TEXT,
    product_name TEXT,
    total_quantity NUMERIC,
    total_amount NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.date,
        s.sku_number,
        MAX(s.product_name) as product_name,
        SUM(s.item_cnt) as total_quantity,
        SUM(s.item_price_incl_vat) as total_amount
    FROM
        pos.lengolf_sales s
    WHERE
        s.date >= start_date
        AND s.date <= end_date
        AND s.sku_number IS NOT NULL
        AND s.sku_number <> '-'
        AND s.is_voided = false
    GROUP BY
        s.date,
        s.sku_number
    ORDER BY
        s.date,
        s.sku_number;
END;
$$ LANGUAGE plpgsql; 