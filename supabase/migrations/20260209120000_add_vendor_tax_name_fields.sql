-- Add tax filing name fields to vendors table
-- These store the legal name for WHT filing (PND3/PND53) separately from the display name
ALTER TABLE backoffice.vendors
  ADD COLUMN IF NOT EXISTS tax_first_name text,
  ADD COLUMN IF NOT EXISTS tax_last_name text,
  ADD COLUMN IF NOT EXISTS prefix text DEFAULT 'คุณ';
