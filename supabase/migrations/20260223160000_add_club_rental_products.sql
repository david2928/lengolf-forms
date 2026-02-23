-- Add Club Rental Products with Premium+ Tier
-- Creates "Clubs" category with Indoor/Course subcategories, products with time modifiers

DO $$
DECLARE
  v_clubs_id uuid := gen_random_uuid();
  v_indoor_id uuid := gen_random_uuid();
  v_course_id uuid := gen_random_uuid();
  v_prem_indoor_id uuid := gen_random_uuid();
  v_premplus_indoor_id uuid := gen_random_uuid();
  v_prem_course_id uuid := gen_random_uuid();
  v_premplus_course_id uuid := gen_random_uuid();
BEGIN
  -- 1. Create category hierarchy (trophy icon, green color)
  INSERT INTO products.categories (id, parent_id, name, slug, display_order, color_code, icon, is_active)
  VALUES
    (v_clubs_id, NULL, 'Clubs', 'clubs', 6, '#10B981', 'trophy', true),
    (v_indoor_id, v_clubs_id, 'Indoor Rental', 'clubs-indoor-rental', 1, '#10B981', 'trophy', true),
    (v_course_id, v_clubs_id, 'Course Rental', 'clubs-course-rental', 2, '#10B981', 'trophy', true);

  -- 2. Create products with has_modifiers = true
  INSERT INTO products.products (id, category_id, name, slug, price, cost, unit, is_active, show_in_staff_ui, display_order, has_modifiers)
  VALUES
    -- Indoor: Premium (Callaway Warbird / Majesty Shuttle)
    (v_prem_indoor_id,     v_indoor_id, 'Premium Indoor Club Rental',  'premium-indoor-club-rental',      150.00, 0, 'item', true, true, 1, true),
    -- Indoor: Premium+ (Callaway Paradym)
    (v_premplus_indoor_id, v_indoor_id, 'Premium+ Indoor Club Rental', 'premium-plus-indoor-club-rental', 250.00, 0, 'item', true, true, 2, true),
    -- Course: Premium
    (v_prem_course_id,     v_course_id, 'Premium Course Club Rental',  'premium-course-club-rental',      1200.00, 0, 'item', true, true, 1, true),
    -- Course: Premium+
    (v_premplus_course_id, v_course_id, 'Premium+ Course Club Rental', 'premium-plus-course-club-rental', 1800.00, 0, 'item', true, true, 2, true);

  -- 3. Delivery add-on (no modifiers)
  INSERT INTO products.products (id, category_id, name, slug, price, cost, unit, is_active, show_in_staff_ui, display_order, has_modifiers)
  VALUES
    (gen_random_uuid(), v_clubs_id, 'Club Delivery (Bangkok)', 'club-delivery-bangkok', 500.00, 0, 'item', true, true, 1, false);

  -- 4. Premium Indoor modifiers
  INSERT INTO products.product_modifiers (id, product_id, modifier_type, name, price, cost_multiplier, is_default, is_active, display_order)
  VALUES
    (gen_random_uuid(), v_prem_indoor_id, 'time', '1 Hour',  150.00, 1.000, true,  true, 1),
    (gen_random_uuid(), v_prem_indoor_id, 'time', '2 Hours', 250.00, 2.000, false, true, 2),
    (gen_random_uuid(), v_prem_indoor_id, 'time', '4 Hours', 400.00, 4.000, false, true, 3);

  -- 5. Premium+ Indoor modifiers
  INSERT INTO products.product_modifiers (id, product_id, modifier_type, name, price, cost_multiplier, is_default, is_active, display_order)
  VALUES
    (gen_random_uuid(), v_premplus_indoor_id, 'time', '1 Hour',  250.00, 1.000, true,  true, 1),
    (gen_random_uuid(), v_premplus_indoor_id, 'time', '2 Hours', 450.00, 2.000, false, true, 2),
    (gen_random_uuid(), v_premplus_indoor_id, 'time', '4 Hours', 800.00, 4.000, false, true, 3);

  -- 6. Premium Course modifiers
  INSERT INTO products.product_modifiers (id, product_id, modifier_type, name, price, cost_multiplier, is_default, is_active, display_order)
  VALUES
    (gen_random_uuid(), v_prem_course_id, 'time', '1 Day',   1200.00, 1.000, true,  true, 1),
    (gen_random_uuid(), v_prem_course_id, 'time', '3 Days',  2400.00, 2.000, false, true, 2),
    (gen_random_uuid(), v_prem_course_id, 'time', '7 Days',  4800.00, 4.000, false, true, 3),
    (gen_random_uuid(), v_prem_course_id, 'time', '14 Days', 8400.00, 7.000, false, true, 4);

  -- 7. Premium+ Course modifiers
  INSERT INTO products.product_modifiers (id, product_id, modifier_type, name, price, cost_multiplier, is_default, is_active, display_order)
  VALUES
    (gen_random_uuid(), v_premplus_course_id, 'time', '1 Day',    1800.00, 1.000, true,  true, 1),
    (gen_random_uuid(), v_premplus_course_id, 'time', '3 Days',   3600.00, 2.000, false, true, 2),
    (gen_random_uuid(), v_premplus_course_id, 'time', '7 Days',   7200.00, 4.000, false, true, 3),
    (gen_random_uuid(), v_premplus_course_id, 'time', '14 Days', 12600.00, 7.000, false, true, 4);

  -- 8. Deactivate old "Premium Golf Club Rental" (replaced by new products with proper naming)
  UPDATE products.products
  SET is_active = false, updated_at = now()
  WHERE id = '014c6306-ae8d-4108-86c7-0b465a3357e1';

END $$;
