# Database Schema Documentation

## Table of Contents
1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Core Tables](#core-tables)
4. [Schema Organization](#schema-organization)
5. [Relationships](#relationships)
6. [Indexes & Performance](#indexes--performance)
7. [Functions & Procedures](#functions--procedures)
8. [Security & RLS](#security--rls)
9. [Migration History](#migration-history)
10. [Backup & Maintenance](#backup--maintenance)

## Overview
The Lengolf Forms system uses PostgreSQL as its primary database, hosted on Supabase. The database is organized into two main schemas: `public` for operational data and `backoffice` for administrative data.

### Key Characteristics
- **Database System**: PostgreSQL 15+ (Supabase)
- **Schema Strategy**: Multi-schema organization for data separation
- **Security**: Row Level Security (RLS) enabled on all tables
- **Backup**: Automated Supabase backups with point-in-time recovery
- **Connection Management**: Connection pooling via Supabase
- **Scaling**: Automatic scaling through Supabase infrastructure

## Database Architecture

### Connection Management
The system uses two types of database connections:

```typescript
// Service Role Client (Admin Operations)
export const refacSupabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Anonymous Client (User Operations)
export const refacSupabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
```

### Schema Organization
```
lengolf_database/
├── public/                 # Operational data
│   ├── bookings           # Main booking records
│   └── booking_history    # Audit trail for bookings
├── backoffice/            # Administrative data
│   ├── customers          # Customer information
│   ├── packages           # Customer packages
│   ├── package_types      # Package definitions
│   ├── allowed_users      # User authentication
│   └── package_monitor    # Package monitoring views
└── auth/                  # Supabase auth tables (managed)
    ├── users
    └── sessions
```

## Core Tables

### 1. Bookings Table (`public.bookings`)
Primary table for all booking records.

```sql
CREATE TABLE public.bookings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,                 -- Auto-normalized via normalize_phone_number()
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  number_of_people INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  bay TEXT,
  customer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Enhancement fields (Phase 3)
  package_id TEXT,                            -- Links to backoffice.packages(id)
  booking_type TEXT DEFAULT 'Walk In',        -- Type of booking
  referral_source TEXT,                       -- How customer found us
  is_new_customer BOOLEAN DEFAULT FALSE,      -- Auto-set by check_new_customer()
  
  -- Audit fields
  updated_by_type TEXT,
  updated_by_identifier TEXT,
  cancelled_by_type TEXT,
  cancelled_by_identifier TEXT,
  cancellation_reason TEXT,
  
  -- Calendar integration
  google_calendar_sync_status TEXT,
  calendar_event_id TEXT,                     -- Deprecated: use calendar_events
  calendar_events JSONB,
  package_name TEXT,                          -- Deprecated: use package_id
  stable_hash_id TEXT                         -- Links to backoffice.customers
);
```

#### Recent Enhancements (Phase 3)
- **package_id**: Direct foreign key to packages table
- **booking_type**: Standardized booking type classification
- **referral_source**: Marketing attribution tracking
- **is_new_customer**: Automatic new customer detection
- **phone_number**: Automatic normalization on insert/update

#### Booking Status Values
- `confirmed`: Active booking
- `cancelled`: Cancelled booking

#### Calendar Events Structure
```typescript
interface CalendarEvent {
  eventId: string;      // Google Calendar event ID
  calendarId: string;   // Google Calendar ID
  status: string;       // Event status
}
```

### 2. Booking History Table (`public.booking_history`)
Audit trail for all booking changes.

```sql
CREATE TABLE public.booking_history (
  id SERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES public.bookings(id),
  action_type TEXT NOT NULL,
  changed_by_type TEXT NOT NULL,
  changed_by_identifier TEXT NOT NULL,
  changes_summary TEXT,
  old_booking_snapshot JSONB,
  new_booking_snapshot JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Customers Table (`backoffice.customers`)
Customer information and CRM integration.

```sql
CREATE TABLE backoffice.customers (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  stable_hash_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Package Types Table (`backoffice.package_types`)
Package definitions and pricing.

```sql
CREATE TABLE backoffice.package_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  duration_hours INTEGER,
  price DECIMAL(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 5. Packages Table (`backoffice.packages`)
Customer package instances and usage tracking.

```sql
CREATE TABLE backoffice.packages (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES backoffice.customers(id),
  package_type_id INTEGER NOT NULL REFERENCES backoffice.package_types(id),
  purchase_date DATE NOT NULL,
  activation_date DATE,
  expiration_date DATE NOT NULL,
  total_hours INTEGER,
  used_hours DECIMAL(5,2) DEFAULT 0,
  remaining_hours DECIMAL(5,2),
  is_unlimited BOOLEAN DEFAULT false,
  is_activated BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6. Allowed Users Table (`backoffice.allowed_users`)
User authentication and authorization.

```sql
CREATE TABLE backoffice.allowed_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Schema Organization

### Public Schema
Contains operational data that directly supports the application's core functionality:
- **Bookings**: All booking records and related data
- **Booking History**: Audit trail for booking changes
- **Functions**: Operational database functions

### Backoffice Schema
Contains administrative and management data:
- **Customers**: Customer information and CRM integration
- **Packages**: Package management and tracking
- **Package Types**: Package definitions and configuration
- **Allowed Users**: User authentication and authorization
- **Views**: Administrative views and reports

## Relationships

### Entity Relationship Diagram
```
backoffice.customers
    ├── 1:N → backoffice.packages
    └── 1:N → public.bookings (via stable_hash_id)

backoffice.package_types
    └── 1:N → backoffice.packages

backoffice.packages
    └── 1:N → public.bookings (via package_name)

public.bookings
    └── 1:N → public.booking_history
```

### Key Relationships

#### Customer to Bookings
```sql
-- Relationship via stable_hash_id
SELECT b.*, c.customer_name
FROM public.bookings b
JOIN backoffice.customers c ON b.stable_hash_id = c.stable_hash_id;
```

#### Package to Bookings
```sql
-- Relationship via package_name
SELECT b.*, p.*, pt.name as package_type_name
FROM public.bookings b
JOIN backoffice.packages p ON b.package_name = pt.name
JOIN backoffice.package_types pt ON p.package_type_id = pt.id;
```

#### Booking History
```sql
-- Complete audit trail for a booking
SELECT bh.*, b.name as customer_name
FROM public.booking_history bh
JOIN public.bookings b ON bh.booking_id = b.id
WHERE b.id = $1
ORDER BY bh.created_at DESC;
```

## Indexes & Performance

### Primary Indexes
```sql
-- Primary keys (automatically indexed)
CREATE UNIQUE INDEX bookings_pkey ON public.bookings(id);
CREATE UNIQUE INDEX customers_pkey ON backoffice.customers(id);
CREATE UNIQUE INDEX packages_pkey ON backoffice.packages(id);

-- Unique constraints
CREATE UNIQUE INDEX customers_stable_hash_id_unique ON backoffice.customers(stable_hash_id);
CREATE UNIQUE INDEX allowed_users_email_unique ON backoffice.allowed_users(email);
```

### Performance Indexes
```sql
-- Booking queries by date
CREATE INDEX bookings_date_idx ON public.bookings(date);
CREATE INDEX bookings_date_bay_idx ON public.bookings(date, bay);

-- Booking history queries
CREATE INDEX booking_history_booking_id_idx ON public.booking_history(booking_id);
CREATE INDEX booking_history_created_at_idx ON public.booking_history(created_at DESC);

-- Customer lookups
CREATE INDEX customers_name_idx ON backoffice.customers(customer_name);
CREATE INDEX customers_contact_idx ON backoffice.customers(contact_number);

-- Package queries
CREATE INDEX packages_customer_id_idx ON backoffice.packages(customer_id);
CREATE INDEX packages_expiration_date_idx ON backoffice.packages(expiration_date);
CREATE INDEX packages_is_unlimited_idx ON backoffice.packages(is_unlimited);
```

### Query Optimization
```sql
-- Optimized booking retrieval by date
EXPLAIN ANALYZE
SELECT id, name, phone_number, date, start_time, duration, bay, status
FROM public.bookings
WHERE date = '2025-06-15'
ORDER BY start_time;

-- Optimized package monitoring query
EXPLAIN ANALYZE
SELECT p.*, c.customer_name, pt.name as package_type_name
FROM backoffice.packages p
JOIN backoffice.customers c ON p.customer_id = c.id
JOIN backoffice.package_types pt ON p.package_type_id = pt.id
WHERE p.is_unlimited = true
AND p.expiration_date > CURRENT_DATE;
```

## Functions & Procedures

### Package Monitoring Function
```sql
CREATE OR REPLACE FUNCTION get_package_monitor_data()
RETURNS TABLE (
  unlimited_active INTEGER,
  unlimited_packages JSON,
  expiring_count INTEGER,
  expiring_packages JSON,
  diamond_active INTEGER,
  diamond_packages JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Unlimited package counts and data
    (SELECT COUNT(*)::INTEGER 
     FROM backoffice.packages p
     WHERE p.is_unlimited = true 
     AND p.expiration_date > CURRENT_DATE),
    
    (SELECT JSON_AGG(
       JSON_BUILD_OBJECT(
         'id', p.id,
         'customer_name', c.customer_name,
         'package_type_name', pt.name,
         'expiration_date', p.expiration_date,
         'used_hours', p.used_hours,
         'is_activated', p.is_activated
       )
     )
     FROM backoffice.packages p
     JOIN backoffice.customers c ON p.customer_id = c.id
     JOIN backoffice.package_types pt ON p.package_type_id = pt.id
     WHERE p.is_unlimited = true 
     AND p.expiration_date > CURRENT_DATE),
    
    -- Expiring packages (within 7 days)
    (SELECT COUNT(*)::INTEGER
     FROM backoffice.packages p
     WHERE p.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'),
    
    (SELECT JSON_AGG(
       JSON_BUILD_OBJECT(
         'id', p.id,
         'customer_name', c.customer_name,
         'package_type_name', pt.name,
         'expiration_date', p.expiration_date,
         'remaining_hours', p.remaining_hours
       )
     )
     FROM backoffice.packages p
     JOIN backoffice.customers c ON p.customer_id = c.id
     JOIN backoffice.package_types pt ON p.package_type_id = pt.id
     WHERE p.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'),
    
    -- Diamond packages
    (SELECT COUNT(*)::INTEGER
     FROM backoffice.packages p
     JOIN backoffice.package_types pt ON p.package_type_id = pt.id
     WHERE LOWER(pt.name) LIKE '%diamond%'
     AND p.expiration_date > CURRENT_DATE),
    
    (SELECT JSON_AGG(
       JSON_BUILD_OBJECT(
         'id', p.id,
         'customer_name', c.customer_name,
         'package_type_name', pt.name,
         'expiration_date', p.expiration_date
       )
     )
     FROM backoffice.packages p
     JOIN backoffice.customers c ON p.customer_id = c.id
     JOIN backoffice.package_types pt ON p.package_type_id = pt.id
     WHERE LOWER(pt.name) LIKE '%diamond%'
     AND p.expiration_date > CURRENT_DATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Available Packages Function
```sql
CREATE OR REPLACE FUNCTION get_available_packages()
RETURNS TABLE (
  id TEXT,
  label TEXT,
  customer_name TEXT,
  package_type_name TEXT,
  remaining_hours DECIMAL,
  expiration_date DATE,
  is_activated BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id::TEXT,
    CASE 
      WHEN p.is_activated THEN 
        c.customer_name || ' - ' || pt.name || ' (' || p.remaining_hours || 'h remaining)'
      ELSE
        '[INACTIVE] ' || c.customer_name || ' - ' || pt.name
    END as label,
    c.customer_name,
    pt.name as package_type_name,
    p.remaining_hours,
    p.expiration_date,
    p.is_activated
  FROM backoffice.packages p
  JOIN backoffice.customers c ON p.customer_id = c.id
  JOIN backoffice.package_types pt ON p.package_type_id = pt.id
  WHERE p.expiration_date > CURRENT_DATE
  AND (p.remaining_hours > 0 OR p.is_unlimited = true)
  ORDER BY p.is_activated DESC, c.customer_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Booking Statistics Function
```sql
CREATE OR REPLACE FUNCTION get_booking_stats(
  start_date DATE,
  end_date DATE
)
RETURNS TABLE (
  total_bookings INTEGER,
  confirmed_bookings INTEGER,
  cancelled_bookings INTEGER,
  total_hours DECIMAL,
  unique_customers INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER as total_bookings,
    COUNT(*) FILTER (WHERE status = 'confirmed')::INTEGER as confirmed_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER as cancelled_bookings,
    SUM(duration) as total_hours,
    COUNT(DISTINCT name)::INTEGER as unique_customers
  FROM public.bookings
  WHERE date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Enhancement Functions (Phase 3)

#### Phone Number Normalization
```sql
CREATE OR REPLACE FUNCTION normalize_phone_number(phone TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone IS NULL OR phone = '' THEN
    RETURN phone;
  END IF;
  
  -- Remove all non-digit characters except + at the beginning
  phone := REGEXP_REPLACE(phone, '[^\d+]', '', 'g');
  
  -- Handle different phone number formats
  IF phone ~ '^\+66' THEN
    -- Already in international format
    RETURN phone;
  ELSIF phone ~ '^66' THEN
    -- Thai format without +
    RETURN '+' || phone;
  ELSIF phone ~ '^0' AND LENGTH(phone) = 10 THEN
    -- Thai mobile format (0xxxxxxxxx)
    RETURN '+66' || SUBSTRING(phone FROM 2);
  ELSIF LENGTH(phone) = 9 THEN
    -- Thai mobile without leading 0
    RETURN '+66' || phone;
  ELSE
    -- Return as-is if format not recognized
    RETURN phone;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

#### New Customer Detection
```sql
CREATE OR REPLACE FUNCTION check_new_customer()
RETURNS TRIGGER AS $$
DECLARE
  existing_bookings INTEGER;
BEGIN
  -- Count existing bookings for this phone number
  SELECT COUNT(*) INTO existing_bookings
  FROM public.bookings
  WHERE phone_number = NEW.phone_number
    AND id != NEW.id  -- Exclude current booking
    AND status = 'confirmed';
  
  -- Set is_new_customer flag
  NEW.is_new_customer := (existing_bookings = 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new customer detection
CREATE OR REPLACE TRIGGER bookings_check_new_customer
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_new_customer();
```

#### Phone Number Normalization Trigger
```sql
-- Create trigger to auto-normalize phone numbers
CREATE OR REPLACE TRIGGER bookings_normalize_phone
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION normalize_phone_number_trigger();

CREATE OR REPLACE FUNCTION normalize_phone_number_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.phone_number := normalize_phone_number(NEW.phone_number);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Security & RLS

### Row Level Security (RLS)
All tables in the `backoffice` schema have RLS enabled:

```sql
-- Enable RLS on all backoffice tables
ALTER TABLE backoffice.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice.package_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE backoffice.allowed_users ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read customers" ON backoffice.customers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read packages" ON backoffice.packages
  FOR SELECT USING (auth.role() = 'authenticated');

-- Service role can bypass RLS
CREATE POLICY "Service role full access" ON backoffice.customers
  FOR ALL USING (auth.role() = 'service_role');
```

### Function Security
All functions use `SECURITY DEFINER` to run with elevated privileges:

```sql
-- Secure function with definer rights
CREATE OR REPLACE FUNCTION secure_function()
RETURNS TABLE(...)
SECURITY DEFINER  -- Runs with function owner's privileges
SET search_path = backoffice, public, pg_temp;  -- Prevent injection
```

### Access Control
```typescript
// Authentication check for API access
export async function isUserAllowed(email: string): Promise<boolean> {
  const { data } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('allowed_users')
    .select('email')
    .eq('email', email.toLowerCase())
    .single();
  
  return !!data;
}

// Admin privilege check
export async function isUserAdmin(email: string): Promise<boolean> {
  const { data } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('allowed_users')
    .select('is_admin')
    .eq('email', email.toLowerCase())
    .single();
  
  return data?.is_admin || false;
}
```

## Migration History

### Current Schema Version
The database schema is maintained through Supabase migrations and manual updates. Key migration points:

#### Phase 1: Initial Schema (2024)
- Basic booking system
- Customer management
- Package system foundation

#### Phase 2: Enhanced Booking System (2025 Q1)
- Booking history and audit trail
- Enhanced calendar integration
- Package usage tracking

#### Phase 3: Admin System (2025 Q2)
- Admin user roles
- Sales dashboard data requirements
- Enhanced security with RLS

### Future Migrations
Planned schema enhancements:
- Hierarchical user roles
- Advanced package types
- Inventory management tables
- Enhanced audit logging

## Backup & Maintenance

### Automated Backups
Supabase provides automated backup management:
- **Point-in-time Recovery**: 7-day retention for Pro plans
- **Daily Backups**: Automated daily snapshots
- **Manual Backups**: On-demand backup creation

### Maintenance Tasks

#### Regular Maintenance
```sql
-- Update table statistics
ANALYZE public.bookings;
ANALYZE backoffice.customers;
ANALYZE backoffice.packages;

-- Vacuum tables to reclaim space
VACUUM ANALYZE public.booking_history;

-- Check for unused indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname IN ('public', 'backoffice');
```

#### Performance Monitoring
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;

-- Monitor table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname IN ('public', 'backoffice')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Data Retention Policies
- **Booking History**: Indefinite retention for audit compliance
- **Cancelled Bookings**: Retained for reporting and analysis
- **Package History**: Retained for customer service and billing
- **System Logs**: 90-day retention in application logs

---

For API integration details, see [Backend Documentation](../BACKEND_DOCUMENTATION.md).  
For performance optimization, see [Performance Guidelines](./PERFORMANCE.md).

**Last Updated**: June 2025  
**Version**: 2.0  
**Maintainer**: Lengolf Development Team 