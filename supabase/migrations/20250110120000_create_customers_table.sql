-- Customer Management System: Create public.customers table
-- CMS-001: Database Schema Implementation

-- Phone normalization function for international phone matching
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_input VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  IF phone_input IS NULL OR TRIM(phone_input) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  phone_input := REGEXP_REPLACE(phone_input, '[^0-9]', '', 'g');
  
  -- Handle different formats:
  -- International: +66812345678 → 812345678 (remove country code)
  -- Local with 0: 0812345678 → 812345678 (remove leading 0)
  -- Mobile: 812345678 → 812345678 (keep as is)
  
  -- Remove country code +66 (Thailand)
  IF LENGTH(phone_input) >= 11 AND LEFT(phone_input, 2) = '66' THEN
    phone_input := RIGHT(phone_input, LENGTH(phone_input) - 2);
  END IF;
  
  -- Remove leading 0 for local numbers
  IF LENGTH(phone_input) = 10 AND LEFT(phone_input, 1) = '0' THEN
    phone_input := RIGHT(phone_input, 9);
  END IF;
  
  -- Return last 9 digits for matching
  RETURN RIGHT(phone_input, 9);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Customer table with minimal fields (matching existing backoffice.customers + analytics)
CREATE TABLE public.customers (
  -- Primary Identification
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code VARCHAR(20) UNIQUE NOT NULL, -- CUS-001, CUS-002, etc.
  
  -- Core Information (minimal)
  customer_name VARCHAR(255) NOT NULL,
  contact_number VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  date_of_birth DATE,
  
  -- Simple Notes (integrated)
  notes TEXT,
  
  -- Analytics (auto-calculated)
  total_lifetime_value DECIMAL(12,2) DEFAULT 0.00,
  total_visits INTEGER DEFAULT 0,
  last_visit_date DATE,
  
  -- Phone-First Customer Mapping
  normalized_phone VARCHAR(20),
  
  -- Customer Profiles (linked website profiles)
  customer_profiles JSONB DEFAULT '[]'::jsonb, -- Array of linked profile IDs
  
  -- Contact Preferences
  preferred_contact_method VARCHAR(10) CHECK (preferred_contact_method IN ('Phone', 'LINE', 'Email')),
  
  -- Legacy POS Integration
  current_pos_customer_id BIGINT, -- Current POS customer ID
  legacy_pos_customer_ids BIGINT[], -- Array of old POS IDs
  stable_hash_id VARCHAR(255), -- For linking with existing data
  pos_sync_history JSONB DEFAULT '[]'::jsonb, -- Track POS ID changes
  
  -- System Information
  customer_create_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  
  -- Search Optimization
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', 
      coalesce(customer_name, '') || ' ' ||
      coalesce(contact_number, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(customer_code, '')
    )
  ) STORED,
  
  -- Constraints
  CONSTRAINT chk_contact_info CHECK (
    contact_number IS NOT NULL OR email IS NOT NULL
  )
);

-- Indexes for Performance & Customer Mapping
CREATE INDEX idx_customers_search ON public.customers USING GIN(search_vector);
CREATE INDEX idx_customers_contact_number ON public.customers(contact_number);
CREATE INDEX idx_customers_email ON public.customers(lower(email)) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_customer_code ON public.customers(customer_code);
CREATE INDEX idx_customers_normalized_phone ON public.customers(normalized_phone);
CREATE INDEX idx_customers_active ON public.customers(is_active);
CREATE INDEX idx_customers_created_at ON public.customers(created_at);
CREATE INDEX idx_customers_profiles ON public.customers USING GIN(customer_profiles);
CREATE INDEX idx_customers_current_pos_id ON public.customers(current_pos_customer_id);
CREATE INDEX idx_customers_stable_hash_id ON public.customers(stable_hash_id);

-- Customer Code Generation Function
CREATE OR REPLACE FUNCTION generate_customer_code()
RETURNS VARCHAR(20) AS $$
DECLARE
  new_code VARCHAR(20);
  counter INTEGER;
BEGIN
  -- Get next sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 5) AS INTEGER)), 0) + 1
  INTO counter
  FROM public.customers
  WHERE customer_code ~ '^CUS-\d+$';
  
  -- Format as CUS-001, CUS-002, etc.
  new_code := 'CUS-' || LPAD(counter::TEXT, 3, '0');
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic customer code generation
CREATE OR REPLACE FUNCTION set_customer_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_code IS NULL THEN
    NEW.customer_code := generate_customer_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_customer_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION set_customer_code();

-- Auto-generate normalized phone for international phone matching
CREATE OR REPLACE FUNCTION set_normalized_phone()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.contact_number IS NOT NULL THEN
    NEW.normalized_phone := normalize_phone_number(NEW.contact_number);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_normalized_phone
  BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION set_normalized_phone();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- RLS Policy (allow authenticated users to read/write)
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read customers" ON public.customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert customers" ON public.customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update customers" ON public.customers
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions to service role
GRANT ALL ON public.customers TO service_role;
GRANT ALL ON public.customers TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;