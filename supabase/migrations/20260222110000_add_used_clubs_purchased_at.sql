-- Add purchased_at date column to track when clubs were purchased
ALTER TABLE public.used_clubs_inventory
ADD COLUMN IF NOT EXISTS purchased_at date;
