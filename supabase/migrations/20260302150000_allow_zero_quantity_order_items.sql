-- Allow quantity=0 in order_items for soft-delete support
-- The pos.prevent_deletion() trigger blocks DELETE on order_items,
-- so we soft-delete by setting quantity=0 and total_price=0 instead.

-- Relax the CHECK constraint from quantity > 0 to quantity >= 0
ALTER TABLE pos.order_items DROP CONSTRAINT order_items_quantity_check;
ALTER TABLE pos.order_items ADD CONSTRAINT order_items_quantity_check CHECK (quantity >= 0);

-- Update get_vendor_items_for_order to exclude soft-deleted items (qty=0)
CREATE OR REPLACE FUNCTION get_vendor_items_for_order(p_order_id UUID)
RETURNS TABLE(
  product_id UUID,
  product_name TEXT,
  quantity INTEGER,
  item_notes TEXT,
  vendor TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    oi.product_id,
    p.name::TEXT as product_name,
    oi.quantity,
    COALESCE(oi.notes, '')::TEXT as item_notes,
    p.vendor::TEXT as vendor
  FROM pos.order_items oi
  LEFT JOIN products.products p ON oi.product_id = p.id
  WHERE oi.order_id = p_order_id
    AND p.vendor IS NOT NULL
    AND p.vendor != ''
    AND oi.quantity > 0
  GROUP BY oi.product_id, p.name, oi.quantity, oi.notes, p.vendor;
END;
$$;
