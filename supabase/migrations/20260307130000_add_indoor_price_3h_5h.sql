-- Add 3h and 5h indoor pricing columns to rental_club_sets
ALTER TABLE rental_club_sets ADD COLUMN IF NOT EXISTS indoor_price_3h numeric;
ALTER TABLE rental_club_sets ADD COLUMN IF NOT EXISTS indoor_price_5h numeric;

-- Populate prices for existing sets (matching website PREMIUM_CLUB_PRICING / PREMIUM_PLUS_CLUB_PRICING)
UPDATE rental_club_sets SET indoor_price_3h = 350, indoor_price_5h = 450 WHERE tier = 'premium';
UPDATE rental_club_sets SET indoor_price_3h = 650, indoor_price_5h = 950 WHERE tier = 'premium-plus';

-- Add 3h and 5h time modifiers to POS product_modifiers
-- Premium Indoor Club Rental (66df0042-21fb-4cdb-a9f5-053520c7608e)
INSERT INTO products.product_modifiers (id, product_id, modifier_type, name, price, cost_multiplier, is_default, is_active, display_order)
VALUES
  (gen_random_uuid(), '66df0042-21fb-4cdb-a9f5-053520c7608e', 'time', '3 Hours', 350.00, 3.000, false, true, 2),
  (gen_random_uuid(), '66df0042-21fb-4cdb-a9f5-053520c7608e', 'time', '5 Hours', 450.00, 5.000, false, true, 4)
ON CONFLICT DO NOTHING;

-- Premium+ Indoor Club Rental (df2d116b-3464-478f-846b-fe13e41880b4)
INSERT INTO products.product_modifiers (id, product_id, modifier_type, name, price, cost_multiplier, is_default, is_active, display_order)
VALUES
  (gen_random_uuid(), 'df2d116b-3464-478f-846b-fe13e41880b4', 'time', '3 Hours', 650.00, 3.000, false, true, 2),
  (gen_random_uuid(), 'df2d116b-3464-478f-846b-fe13e41880b4', 'time', '5 Hours', 950.00, 5.000, false, true, 4)
ON CONFLICT DO NOTHING;

-- Fix display_order so all modifiers are in chronological order (1h=1, 2h=2, 3h=3, 4h=4, 5h=5)
-- Premium Indoor
UPDATE products.product_modifiers SET display_order = 1 WHERE product_id = '66df0042-21fb-4cdb-a9f5-053520c7608e' AND name = '1 Hour';
UPDATE products.product_modifiers SET display_order = 2 WHERE product_id = '66df0042-21fb-4cdb-a9f5-053520c7608e' AND name = '2 Hours';
UPDATE products.product_modifiers SET display_order = 3 WHERE product_id = '66df0042-21fb-4cdb-a9f5-053520c7608e' AND name = '3 Hours';
UPDATE products.product_modifiers SET display_order = 4 WHERE product_id = '66df0042-21fb-4cdb-a9f5-053520c7608e' AND name = '4 Hours';
UPDATE products.product_modifiers SET display_order = 5 WHERE product_id = '66df0042-21fb-4cdb-a9f5-053520c7608e' AND name = '5 Hours';
-- Premium+ Indoor
UPDATE products.product_modifiers SET display_order = 1 WHERE product_id = 'df2d116b-3464-478f-846b-fe13e41880b4' AND name = '1 Hour';
UPDATE products.product_modifiers SET display_order = 2 WHERE product_id = 'df2d116b-3464-478f-846b-fe13e41880b4' AND name = '2 Hours';
UPDATE products.product_modifiers SET display_order = 3 WHERE product_id = 'df2d116b-3464-478f-846b-fe13e41880b4' AND name = '3 Hours';
UPDATE products.product_modifiers SET display_order = 4 WHERE product_id = 'df2d116b-3464-478f-846b-fe13e41880b4' AND name = '4 Hours';
UPDATE products.product_modifiers SET display_order = 5 WHERE product_id = 'df2d116b-3464-478f-846b-fe13e41880b4' AND name = '5 Hours';
