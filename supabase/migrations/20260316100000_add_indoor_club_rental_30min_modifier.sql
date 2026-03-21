-- Add 30-minute modifiers to indoor club rental POS products

-- Shift existing display_order up by 1 to make room for 30min at position 1
UPDATE products.product_modifiers SET display_order = display_order + 1
WHERE product_id IN ('66df0042-21fb-4cdb-a9f5-053520c7608e', 'df2d116b-3464-478f-846b-fe13e41880b4')
AND modifier_type = 'time';

-- Premium Indoor Club Rental - 30 Minutes @ 75 THB (half of 1h rate)
INSERT INTO products.product_modifiers (id, product_id, modifier_type, name, price, cost_multiplier, is_default, is_active, display_order)
VALUES (gen_random_uuid(), '66df0042-21fb-4cdb-a9f5-053520c7608e', 'time', '30 Minutes', 75.00, 0.500, false, true, 1);

-- Premium+ Indoor Club Rental - 30 Minutes @ 125 THB (half of 1h rate)
INSERT INTO products.product_modifiers (id, product_id, modifier_type, name, price, cost_multiplier, is_default, is_active, display_order)
VALUES (gen_random_uuid(), 'df2d116b-3464-478f-846b-fe13e41880b4', 'time', '30 Minutes', 125.00, 0.500, false, true, 1);
