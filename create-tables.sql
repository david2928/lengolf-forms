-- Create the backoffice schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS backoffice;

-- Create staff table
CREATE TABLE IF NOT EXISTS backoffice.staff (
  id SERIAL PRIMARY KEY,
  staff_name TEXT NOT NULL,
  staff_id TEXT UNIQUE,
  pin_hash TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS backoffice.time_entries (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('clock_in', 'clock_out')),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  photo_url TEXT,
  photo_captured BOOLEAN DEFAULT false,
  camera_error TEXT,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'time_entries_staff_id_fkey' 
        AND table_name = 'time_entries'
        AND table_schema = 'backoffice'
    ) THEN
        ALTER TABLE backoffice.time_entries 
        ADD CONSTRAINT time_entries_staff_id_fkey 
        FOREIGN KEY (staff_id) REFERENCES backoffice.staff(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_pin_hash ON backoffice.staff(pin_hash);
CREATE INDEX IF NOT EXISTS idx_staff_active ON backoffice.staff(is_active);
CREATE INDEX IF NOT EXISTS idx_time_entries_staff_timestamp ON backoffice.time_entries(staff_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_timestamp ON backoffice.time_entries(timestamp DESC); 