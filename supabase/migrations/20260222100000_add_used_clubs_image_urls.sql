-- Add image_urls array column to support multiple photos per club
-- image_url remains as the primary/thumbnail image for backward compatibility
ALTER TABLE public.used_clubs_inventory
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';

COMMENT ON COLUMN public.used_clubs_inventory.image_urls IS 'Array of all image URLs for this club. First entry matches image_url (primary/thumbnail).';
