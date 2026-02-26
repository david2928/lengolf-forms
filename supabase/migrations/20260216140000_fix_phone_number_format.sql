-- Fix malformed phone numbers in bookings table
-- Issue: Many phone numbers are 9 digits (missing leading 0)
-- This prevents Google Ads offline conversion matching
--
-- Examples:
--   "983454402" → "0983454402" (add leading 0)
--   "064811858" → "0064811858" (already has 0, but only 9 digits - leave as-is for manual review)
--   "BLOCKED" → NULL (invalid, clear it)

-- Step 1: Clear obviously invalid phone numbers
UPDATE public.bookings
SET phone_number = NULL
WHERE phone_number IN ('BLOCKED', 'N/A', 'NA', 'n/a', 'na', '-', '')
  OR phone_number ~ '^[^0-9+]+$';  -- Contains no digits

-- Step 2: Fix 9-digit phones starting with 6-9 (missing leading 0)
-- Thai mobile numbers start with 06, 08, or 09
UPDATE public.bookings
SET phone_number = '0' || phone_number
WHERE phone_number ~ '^[6-9][0-9]{8}$'  -- Exactly 9 digits starting with 6-9
  AND phone_number NOT LIKE '+%';       -- Not already E.164 format

-- Step 3: Log the changes for verification
DO $$
DECLARE
  cleared_count INTEGER;
  fixed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cleared_count
  FROM public.bookings
  WHERE phone_number IS NULL
    AND created_at >= NOW() - INTERVAL '90 days';

  SELECT COUNT(*) INTO fixed_count
  FROM public.bookings
  WHERE phone_number ~ '^0[6-9][0-9]{8}$'  -- Now 10 digits
    AND created_at >= NOW() - INTERVAL '90 days';

  RAISE NOTICE 'Phone number cleanup completed:';
  RAISE NOTICE '  - Cleared invalid entries: check bookings with NULL phone_number';
  RAISE NOTICE '  - Fixed 9-digit numbers: % bookings now have 10-digit format', fixed_count;
END $$;

-- Step 4: Create helper function to validate phone numbers going forward
CREATE OR REPLACE FUNCTION public.validate_thai_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Null is allowed (optional field)
  IF phone IS NULL THEN
    RETURN TRUE;
  END IF;

  -- Strip whitespace
  phone := TRIM(phone);

  -- Valid formats:
  -- 1. E.164 with +: +66xxxxxxxxx (12 chars)
  -- 2. Thai local: 0xxxxxxxxx (10 chars)
  -- 3. International format: 66xxxxxxxxx (11 chars)
  RETURN phone ~ '^\+66[0-9]{9}$'     -- E.164
      OR phone ~ '^0[0-9]{9}$'        -- Thai local
      OR phone ~ '^66[0-9]{9}$';      -- Country code without +
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.validate_thai_phone IS
  'Validates Thai phone number format. Returns TRUE for valid formats or NULL. Used for form validation.';
