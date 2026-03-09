-- Add dedicated delivery_time and return_time columns to club_rentals
-- Previously these were encoded in the notes field as free text
ALTER TABLE club_rentals ADD COLUMN IF NOT EXISTS delivery_time text;
ALTER TABLE club_rentals ADD COLUMN IF NOT EXISTS return_time text;
