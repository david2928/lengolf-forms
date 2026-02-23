-- Add specification and shaft fields to used_clubs_inventory
-- specification: iron numbers (3-PW, 7), wedge lofts (56°), driver loft (10.5°), etc.
-- shaft: shaft type and flex info (e.g. "Graphite Regular", "Steel Stiff")
ALTER TABLE public.used_clubs_inventory
ADD COLUMN IF NOT EXISTS specification text,
ADD COLUMN IF NOT EXISTS shaft text;

COMMENT ON COLUMN public.used_clubs_inventory.specification IS 'Optional club specification: iron numbers (3-PW), loft (56°), etc.';
COMMENT ON COLUMN public.used_clubs_inventory.shaft IS 'Optional shaft description: material, flex, model (e.g. Graphite Regular)';
