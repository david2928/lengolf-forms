-- Update Beer and Non-Alcoholic product reorder thresholds to 2-week stock levels
-- Based on 90-day POS sales averages from pos.lengolf_sales
-- Calculation: CEIL(90_day_total_qty / 90 * 14) with minimum of 1

-- Beer products (5 products)
UPDATE inventory_products SET reorder_threshold = 59, updated_at = NOW()
WHERE name = 'Singha' AND is_active = true;
-- 373 sold / 90 days * 14 = 58.1 → 59

UPDATE inventory_products SET reorder_threshold = 10, updated_at = NOW()
WHERE name = 'Asahi' AND is_active = true;
-- 62 sold / 90 days * 14 = 9.6 → 10

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE name = 'Heineken' AND is_active = true;
-- 12 sold / 90 days * 14 = 1.9 → 2

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE name = 'Chatri IPA' AND is_active = true;
-- 10 sold / 90 days * 14 = 1.6 → 2

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE name = 'Hoegaarden' AND is_active = true;
-- 5 sold / 90 days * 14 = 0.8 → 1

-- Non-Alcoholic products (19 products)
UPDATE inventory_products SET reorder_threshold = 68, updated_at = NOW()
WHERE name = 'Still water' AND is_active = true;
-- 437 sold / 90 days * 14 = 68.0

UPDATE inventory_products SET reorder_threshold = 22, updated_at = NOW()
WHERE name = 'Coke Zero' AND is_active = true;
-- 136 sold / 90 days * 14 = 21.2 → 22

UPDATE inventory_products SET reorder_threshold = 12, updated_at = NOW()
WHERE name = 'Soda water (Singha)' AND is_active = true;
-- 76 sold / 90 days * 14 = 11.8 → 12

UPDATE inventory_products SET reorder_threshold = 8, updated_at = NOW()
WHERE name = 'Coke Original' AND is_active = true;
-- 51 sold / 90 days * 14 = 7.9 → 8

UPDATE inventory_products SET reorder_threshold = 5, updated_at = NOW()
WHERE name = 'Sprite' AND is_active = true;
-- 31 sold / 90 days * 14 = 4.8 → 5

UPDATE inventory_products SET reorder_threshold = 5, updated_at = NOW()
WHERE name = 'Tea Bags' AND is_active = true;
-- 31 sold / 90 days * 14 = 4.8 → 5 (Hot Tea sold 31 times)

UPDATE inventory_products SET reorder_threshold = 3, updated_at = NOW()
WHERE name = 'Gatorade - Blue' AND is_active = true;
-- 19 sold / 90 days * 14 = 3.0

UPDATE inventory_products SET reorder_threshold = 3, updated_at = NOW()
WHERE name = 'Festilia (Lime)' AND is_active = true;
-- 15 sold / 90 days * 14 = 2.3 → 3 (Festilia Lemon Mint sold 15 times)

UPDATE inventory_products SET reorder_threshold = 3, updated_at = NOW()
WHERE name = 'Zuza (Lime)' AND is_active = true;
-- 14 sold / 90 days * 14 = 2.2 → 3

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE name = 'Festilia (Orange)' AND is_active = true;
-- 11 sold / 90 days * 14 = 1.7 → 2 (Festilia Shogun Orange sold 11 times)

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE name = 'Gatorade - Lime' AND is_active = true;
-- 9 sold / 90 days * 14 = 1.4 → 2 (Gatorade Yellow sold 9 times)

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE name = 'Tonic water (Schweppes)' AND is_active = true;
-- 7 sold / 90 days * 14 = 1.1 → 2 (Schweppes Soda Water sold 7 times)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE name = 'Zuza (Lychee)' AND is_active = true;
-- 5 sold / 90 days * 14 = 0.8 → 1

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE name = 'Red Bull' AND is_active = true;
-- 2 sold / 90 days * 14 = 0.3 → 1 (Redbull sold 2 times)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE name = 'Zuza (Passion Fruit)' AND is_active = true;
-- 0 sold in 90 days → minimum 1

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE name = 'Coke Regular (Big Bottle)' AND is_active = true;
-- Keep at 1 (no matching POS data)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE name = 'Coke Zero (Big Bottle)' AND is_active = true;
-- Keep at 1 (no matching POS data)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE name = 'Sprite (Big Bottle)' AND is_active = true;
-- Keep at 1 (no matching POS data)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE name = 'Water (Big Bottle)' AND is_active = true;
-- Reduce from 10 → 1 (no matching POS data)
