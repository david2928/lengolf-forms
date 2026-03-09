-- Create rental_club_sets table: bookable club inventory for indoor and course rentals
-- This is separate from used_clubs_inventory (which tracks clubs for sale)

CREATE TABLE public.rental_club_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  tier text NOT NULL CHECK (tier IN ('premium', 'premium-plus')),
  gender text NOT NULL CHECK (gender IN ('mens', 'womens')),
  brand text,
  model text,
  description text,
  specifications jsonb DEFAULT '[]'::jsonb,
  image_url text,
  rental_type text NOT NULL CHECK (rental_type IN ('indoor', 'course', 'both')),
  -- Indoor pricing (per-hour tiers)
  indoor_price_1h numeric(10,2) DEFAULT 0,
  indoor_price_2h numeric(10,2) DEFAULT 0,
  indoor_price_4h numeric(10,2) DEFAULT 0,
  -- Course pricing (per-day tiers)
  course_price_1d numeric(10,2) DEFAULT 0,
  course_price_3d numeric(10,2) DEFAULT 0,
  course_price_7d numeric(10,2) DEFAULT 0,
  course_price_14d numeric(10,2) DEFAULT 0,
  quantity int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed actual inventory (3 premium sets)
INSERT INTO public.rental_club_sets (name, slug, tier, gender, brand, model, description, specifications, rental_type,
  indoor_price_1h, indoor_price_2h, indoor_price_4h,
  course_price_1d, course_price_3d, course_price_7d, course_price_14d,
  quantity, display_order)
VALUES
  (
    'Premium Men''s - Callaway Warbird',
    'premium-mens-warbird',
    'premium', 'mens', 'Callaway', 'Warbird',
    'Full men''s set with Driver, Fairway Woods, Irons 5-PW/SW, and Odyssey putter. Uniflex shafts.',
    '["Driver", "5-Wood", "Irons 5-9", "PW", "SW", "Odyssey Putter"]'::jsonb,
    'both',
    150.00, 250.00, 400.00,
    1200.00, 2400.00, 4800.00, 8400.00,
    1, 1
  ),
  (
    'Premium Women''s - Majesty Shuttle',
    'premium-womens-majesty',
    'premium', 'womens', 'Majesty', 'Shuttle 2023',
    'Full women''s set with Driver, TaylorMade Gloire 5W, Irons 7-PW, Wedge, and Putter. Ladies flex.',
    '["Driver", "TaylorMade Gloire 5W", "Irons 7-9", "PW", "56° Wedge", "Putter"]'::jsonb,
    'both',
    150.00, 250.00, 400.00,
    1200.00, 2400.00, 4800.00, 8400.00,
    1, 2
  ),
  (
    'Premium+ Men''s - Callaway Paradym',
    'premium-plus-mens-paradym',
    'premium-plus', 'mens', 'Callaway', 'Paradym Forged Carbon',
    'Tour-level men''s set: Driver 10.5° + 3W + 5W + 4H with Ventus TR shafts, Irons 5-PW, Jaws Raw Wedges (52°, 56°), Odyssey White Hot putter. Callaway camo bag included.',
    '["Driver 10.5°", "3-Wood", "5-Wood", "4-Hybrid", "Irons 5-PW", "Jaws Raw 52°", "Jaws Raw 56°", "Odyssey Putter"]'::jsonb,
    'both',
    250.00, 450.00, 800.00,
    1800.00, 3600.00, 7200.00, 12600.00,
    1, 3
  );

-- Enable RLS (read-only for anon, full access for service role)
ALTER TABLE public.rental_club_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rental_club_sets_public_read" ON public.rental_club_sets
  FOR SELECT USING (true);

CREATE POLICY "rental_club_sets_service_write" ON public.rental_club_sets
  FOR ALL USING (auth.role() = 'service_role');

COMMENT ON TABLE public.rental_club_sets IS 'Bookable club set inventory for indoor simulator and course rentals';
