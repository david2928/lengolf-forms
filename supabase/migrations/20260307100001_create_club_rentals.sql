-- Create club_rentals table: tracks all club rental reservations (indoor + course)
-- Indoor rentals link to bay bookings via booking_id; course rentals are standalone (booking_id = NULL)

CREATE TABLE public.club_rentals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_code text NOT NULL UNIQUE,
  rental_club_set_id uuid NOT NULL REFERENCES public.rental_club_sets(id),

  -- Link to bay booking (NULL for standalone course rentals)
  booking_id text REFERENCES public.bookings(id) ON DELETE SET NULL,

  -- Customer info
  customer_id uuid REFERENCES public.customers(id),
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  user_id uuid,  -- booking app profile ID (nullable for guest checkout)

  -- Rental classification
  rental_type text NOT NULL CHECK (rental_type IN ('indoor', 'course')),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN (
    'reserved',      -- Booked, awaiting pickup/session
    'confirmed',     -- Staff confirmed (course rentals after payment arranged)
    'checked_out',   -- Customer has the clubs
    'returned',      -- Clubs returned
    'cancelled',     -- Cancelled before checkout
    'no_show'        -- Reserved but never picked up
  )),

  -- Timing
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,          -- Indoor only: matches bay booking start time
  duration_hours numeric(4,1),  -- Indoor: 1, 2, 4
  duration_days int,            -- Course: 1, 3, 7, 14

  -- Pricing
  rental_price numeric(10,2) NOT NULL DEFAULT 0,
  add_ons jsonb DEFAULT '[]'::jsonb,
  add_ons_total numeric(10,2) DEFAULT 0,
  delivery_requested boolean DEFAULT false,
  delivery_address text,
  delivery_fee numeric(10,2) DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,

  -- POS linkage (when staff charges via POS)
  pos_order_id uuid,

  -- Staff operations
  checked_out_at timestamptz,
  checked_out_by text,
  returned_at timestamptz,
  returned_by text,
  notes text,

  -- Source tracking
  source text DEFAULT 'booking_app' CHECK (source IN (
    'website', 'booking_app', 'liff', 'staff', 'line'
  )),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for availability queries (exclude terminal statuses)
CREATE INDEX idx_club_rentals_availability
  ON public.club_rentals (rental_club_set_id, start_date, end_date)
  WHERE status NOT IN ('cancelled', 'no_show', 'returned');

-- Fast lookup by booking (for indoor rentals linked to bay bookings)
CREATE INDEX idx_club_rentals_booking
  ON public.club_rentals (booking_id)
  WHERE booking_id IS NOT NULL;

-- Dashboard queries by status and date
CREATE INDEX idx_club_rentals_status_date
  ON public.club_rentals (status, start_date);

-- Customer lookup
CREATE INDEX idx_club_rentals_customer
  ON public.club_rentals (customer_id)
  WHERE customer_id IS NOT NULL;

-- Enable RLS
ALTER TABLE public.club_rentals ENABLE ROW LEVEL SECURITY;

-- Users can read their own rentals (by user_id from booking app)
CREATE POLICY "club_rentals_user_read" ON public.club_rentals
  FOR SELECT USING (auth.uid() = user_id);

-- Service role has full access (for staff app + booking API)
CREATE POLICY "club_rentals_service_all" ON public.club_rentals
  FOR ALL USING (auth.role() = 'service_role');

-- Anon can insert (for guest course rental bookings from booking app)
CREATE POLICY "club_rentals_anon_insert" ON public.club_rentals
  FOR INSERT WITH CHECK (auth.role() = 'anon');

COMMENT ON TABLE public.club_rentals IS 'Club rental reservations - indoor (linked to bay bookings) and course (standalone)';
