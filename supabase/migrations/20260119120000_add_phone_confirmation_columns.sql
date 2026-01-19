-- Migration: Add phone confirmation tracking columns to bookings table
-- Purpose: Track which bookings have been confirmed via phone call by staff

-- Add columns for phone confirmation tracking
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS phone_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_confirmed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_confirmed_by TEXT;

-- Create partial index for efficient queries on unconfirmed bookings
-- This index only includes rows where status='confirmed' and phone_confirmed=FALSE
CREATE INDEX IF NOT EXISTS idx_bookings_unconfirmed
ON public.bookings (date, start_time, status, phone_confirmed)
WHERE status = 'confirmed' AND (phone_confirmed = FALSE OR phone_confirmed IS NULL);

-- Add comments for documentation
COMMENT ON COLUMN public.bookings.phone_confirmed IS 'Whether the booking has been confirmed via phone call';
COMMENT ON COLUMN public.bookings.phone_confirmed_at IS 'Timestamp when the booking was confirmed via phone';
COMMENT ON COLUMN public.bookings.phone_confirmed_by IS 'Name of the staff member who made the confirmation call';
