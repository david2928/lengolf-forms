-- Update Beer and Non-Alcoholic product reorder thresholds to 2-week stock levels
-- Based on 90-day POS sales averages from pos.lengolf_sales
-- Calculation: CEIL(90_day_total_qty / 90 * 14) with minimum of 1
-- Using stable product IDs instead of mutable names
-- Note: Supabase migrations are already transactional - no explicit BEGIN/COMMIT needed

-- Beer products (5 products)
UPDATE inventory_products SET reorder_threshold = 59, updated_at = NOW()
WHERE id = '3fc520b0-caaa-46d5-ba10-3203ddc82fd6' AND is_active = true;
-- Singha: 373 sold / 90 days * 14 = 58.1 → 59

UPDATE inventory_products SET reorder_threshold = 10, updated_at = NOW()
WHERE id = '3eb5b489-ec2f-4d63-ac61-fc6942ffad79' AND is_active = true;
-- Asahi: 62 sold / 90 days * 14 = 9.6 → 10

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE id = '524b81d1-f896-45fe-951d-82ab610bb97e' AND is_active = true;
-- Heineken: 12 sold / 90 days * 14 = 1.9 → 2

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE id = 'cdbaf68f-81b3-4b9d-b7c3-b5c908fd4f8f' AND is_active = true;
-- Chatri IPA: 10 sold / 90 days * 14 = 1.6 → 2

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE id = '3e942c1f-74cc-4bdc-b8ff-925e5cf679d4' AND is_active = true;
-- Hoegaarden: 5 sold / 90 days * 14 = 0.8 → 1

-- Non-Alcoholic products (19 products)
UPDATE inventory_products SET reorder_threshold = 68, updated_at = NOW()
WHERE id = 'a9e45dcc-1d92-4610-bf9f-85742669f309' AND is_active = true;
-- Still water: 437 sold / 90 days * 14 = 68.0

UPDATE inventory_products SET reorder_threshold = 22, updated_at = NOW()
WHERE id = 'f9c48e9e-2a9e-4dd0-911c-04a4d985b50f' AND is_active = true;
-- Coke Zero: 136 sold / 90 days * 14 = 21.2 → 22

UPDATE inventory_products SET reorder_threshold = 12, updated_at = NOW()
WHERE id = '03a691a6-5ceb-4b85-8f54-d772c0f5bbb9' AND is_active = true;
-- Soda water (Singha): 76 sold / 90 days * 14 = 11.8 → 12

UPDATE inventory_products SET reorder_threshold = 8, updated_at = NOW()
WHERE id = '792826be-a424-4b6e-96a5-a6b739e1a32b' AND is_active = true;
-- Coke Original: 51 sold / 90 days * 14 = 7.9 → 8

UPDATE inventory_products SET reorder_threshold = 5, updated_at = NOW()
WHERE id = 'd1fda7e8-5cae-4311-ba29-bc10bbc6f487' AND is_active = true;
-- Sprite: 31 sold / 90 days * 14 = 4.8 → 5

UPDATE inventory_products SET reorder_threshold = 5, updated_at = NOW()
WHERE id = '076ce86a-fa8e-4257-992c-64e7ab7ff4ec' AND is_active = true;
-- Tea Bags: 31 sold / 90 days * 14 = 4.8 → 5 (Hot Tea sold 31 times)

UPDATE inventory_products SET reorder_threshold = 3, updated_at = NOW()
WHERE id = 'e6c26288-f159-4c1e-8886-e15a463ac4a7' AND is_active = true;
-- Gatorade - Blue: 19 sold / 90 days * 14 = 3.0

UPDATE inventory_products SET reorder_threshold = 3, updated_at = NOW()
WHERE id = 'c830157b-a2c1-42ce-b0dd-65a2de41d646' AND is_active = true;
-- Festilia (Lime): 15 sold / 90 days * 14 = 2.3 → 3 (Festilia Lemon Mint sold 15 times)

UPDATE inventory_products SET reorder_threshold = 3, updated_at = NOW()
WHERE id = '9c02c55a-e006-462e-a2f3-9a2bcb24d882' AND is_active = true;
-- Zuza (Lime): 14 sold / 90 days * 14 = 2.2 → 3

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE id = 'd2035bea-f3bc-4291-9cbc-7db06b393c9f' AND is_active = true;
-- Festilia (Orange): 11 sold / 90 days * 14 = 1.7 → 2 (Festilia Shogun Orange sold 11 times)

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE id = '61574e66-0410-416a-88ce-3dce84ebd2bf' AND is_active = true;
-- Gatorade - Lime: 9 sold / 90 days * 14 = 1.4 → 2 (Gatorade Yellow sold 9 times)

UPDATE inventory_products SET reorder_threshold = 2, updated_at = NOW()
WHERE id = '401b639e-8fee-4a2e-b4b7-6a1d31526d3a' AND is_active = true;
-- Tonic water (Schweppes): 7 sold / 90 days * 14 = 1.1 → 2 (Schweppes Soda Water sold 7 times)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE id = '4347a0c8-b9e8-4f22-96e4-50fd6bf1fe04' AND is_active = true;
-- Zuza (Lychee): 5 sold / 90 days * 14 = 0.8 → 1

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE id = '558cfd78-78c6-4b57-ba9b-1fc5babf605b' AND is_active = true;
-- Red Bull: 2 sold / 90 days * 14 = 0.3 → 1 (Redbull sold 2 times)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE id = 'cbcb769c-c379-43ed-beb9-0d18cc713c77' AND is_active = true;
-- Zuza (Passion Fruit): 0 sold in 90 days → minimum 1

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE id = '226d3f8a-7ac4-46be-8e27-78a708a9f756' AND is_active = true;
-- Coke Regular (Big Bottle): keep at 1 (no matching POS data)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE id = 'f7ffd036-e2f6-41b2-90ab-017786bae33b' AND is_active = true;
-- Coke Zero (Big Bottle): keep at 1 (no matching POS data)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE id = '91cb14dc-1fde-4a62-b3fd-aa2c4912ecc1' AND is_active = true;
-- Sprite (Big Bottle): keep at 1 (no matching POS data)

UPDATE inventory_products SET reorder_threshold = 1, updated_at = NOW()
WHERE id = '8787d404-611d-490c-b358-bf092590f31c' AND is_active = true;
-- Water (Big Bottle): reduce from 10 → 1 (no matching POS data)
