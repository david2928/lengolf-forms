# Coaching System Database Schema Documentation

## Table of Contents
1. [Overview](#overview)
2. [Schema Organization](#schema-organization)
3. [Core Tables](#core-tables)
4. [Views](#views)
5. [Indexes & Performance](#indexes--performance)
6. [Constraints & Data Integrity](#constraints--data-integrity)
7. [Relationships](#relationships)
8. [Database Functions](#database-functions)
9. [Data Types & Validation](#data-types--validation)
10. [Migration History](#migration-history)

## Overview

The Coaching System database schema consists of 5 main tables and 1 view that manage golf coaching operations at Lengolf Forms. The schema is designed to handle coach availability management, earnings tracking, and integration with the existing booking and user management systems.

### Database Structure Summary

```
Coaching Schema Components:
├── Tables (5)
│   ├── public.coach_weekly_schedules     # Base weekly availability patterns
│   ├── public.coach_recurring_blocks     # Recurring unavailable periods
│   ├── public.coach_date_overrides       # Date-specific availability changes
│   ├── backoffice.coach_rates           # Coaching rate configuration
│   └── backoffice.allowed_users         # Coach profile data (existing table)
└── Views (1)
    └── backoffice.coach_earnings        # Calculated earnings from POS data
```

## Schema Organization

### Public Schema (`public`)
Contains core coaching availability and scheduling tables that handle the real-time booking logic.

### Backoffice Schema (`backoffice`) 
Contains business logic tables for earnings, rates, and user management that integrate with existing systems.

## Core Tables

### 1. `public.coach_weekly_schedules`

**Purpose**: Stores the base weekly availability pattern for each coach across different days of the week.

**Schema Definition**:
```sql
CREATE TABLE public.coach_weekly_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES backoffice.allowed_users(id),
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT coach_weekly_schedules_check CHECK (end_time > start_time),
    UNIQUE (coach_id, day_of_week)
);
```

**Column Details**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key identifier |
| `coach_id` | UUID | YES | - | Foreign key to `allowed_users.id` |
| `day_of_week` | INTEGER | NO | - | Day of week (0=Sunday, 6=Saturday) |
| `start_time` | TIME | NO | - | Start of availability period |
| `end_time` | TIME | NO | - | End of availability period |
| `is_available` | BOOLEAN | YES | `true` | Whether coach is available during this period |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |

**Business Rules**:
- One schedule entry per coach per day of week
- End time must be after start time
- Day of week must be 0-6 (Sunday to Saturday)
- Forms the base layer for availability calculation

**Example Data**:
```sql
INSERT INTO coach_weekly_schedules (coach_id, day_of_week, start_time, end_time) VALUES
('123e4567-e89b-12d3-a456-426614174000', 1, '09:00', '17:00'), -- Monday
('123e4567-e89b-12d3-a456-426614174000', 2, '09:00', '17:00'), -- Tuesday
('123e4567-e89b-12d3-a456-426614174000', 3, '10:00', '16:00'); -- Wednesday
```

---

### 2. `public.coach_recurring_blocks`

**Purpose**: Defines recurring unavailable periods that repeat weekly (e.g., lunch breaks, staff meetings).

**Schema Definition**:
```sql
CREATE TABLE public.coach_recurring_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES backoffice.allowed_users(id),
    title VARCHAR(100) NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT coach_recurring_blocks_check CHECK (end_time > start_time)
);
```

**Column Details**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key identifier |
| `coach_id` | UUID | YES | - | Foreign key to `allowed_users.id` |
| `title` | VARCHAR(100) | NO | - | Description of the unavailable period |
| `day_of_week` | INTEGER | NO | - | Day of week (0=Sunday, 6=Saturday) |
| `start_time` | TIME | NO | - | Start of unavailable period |
| `end_time` | TIME | NO | - | End of unavailable period |
| `is_active` | BOOLEAN | YES | `true` | Whether this block is currently active |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |

**Business Rules**:
- Multiple recurring blocks allowed per coach per day
- End time must be after start time
- Inactive blocks (`is_active = false`) are ignored in availability calculations
- Applied as "unavailable" overlay on weekly schedule

**Example Data**:
```sql
INSERT INTO coach_recurring_blocks (coach_id, title, day_of_week, start_time, end_time) VALUES
('123e4567-e89b-12d3-a456-426614174000', 'Lunch Break', 1, '12:00', '13:00'),
('123e4567-e89b-12d3-a456-426614174000', 'Staff Meeting', 3, '08:30', '09:30'),
('123e4567-e89b-12d3-a456-426614174000', 'Equipment Maintenance', 5, '16:00', '17:00');
```

---

### 3. `public.coach_date_overrides`

**Purpose**: Handles date-specific availability changes that override the normal weekly schedule.

**Schema Definition**:
```sql
CREATE TABLE public.coach_date_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coach_id UUID REFERENCES backoffice.allowed_users(id),
    override_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    override_type VARCHAR(20) NOT NULL CHECK (override_type IN ('available', 'unavailable')),
    title VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    CONSTRAINT coach_date_overrides_check CHECK (
        (override_type = 'unavailable' AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time) OR
        (override_type = 'available' AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),
    UNIQUE (coach_id, override_date, start_time)
);
```

**Column Details**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | NO | `gen_random_uuid()` | Primary key identifier |
| `coach_id` | UUID | YES | - | Foreign key to `allowed_users.id` |
| `override_date` | DATE | NO | - | Specific date for this override |
| `start_time` | TIME | YES | - | Start time of override period |
| `end_time` | TIME | YES | - | End time of override period |
| `override_type` | VARCHAR(20) | NO | - | Type: 'available' or 'unavailable' |
| `title` | VARCHAR(100) | YES | - | Optional title/description |
| `notes` | TEXT | YES | - | Additional notes about the override |
| `created_at` | TIMESTAMPTZ | YES | `now()` | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | YES | `now()` | Last update timestamp |

**Business Rules**:
- Highest priority in availability calculation hierarchy
- Can make normally unavailable times available or vice versa
- Must have start and end times for both available and unavailable overrides
- End time must be after start time
- Unique constraint prevents overlapping overrides for same coach/date/time

**Example Data**:
```sql
INSERT INTO coach_date_overrides (coach_id, override_date, start_time, end_time, override_type, title) VALUES
('123e4567-e89b-12d3-a456-426614174000', '2025-01-20', '09:00', '12:00', 'unavailable', 'Medical Appointment'),
('123e4567-e89b-12d3-a456-426614174000', '2025-01-22', '08:00', '09:00', 'available', 'Early Session'),
('123e4567-e89b-12d3-a456-426614174000', '2025-01-25', '14:00', '18:00', 'unavailable', 'Training Workshop');
```

---

### 4. `backoffice.coach_rates`

**Purpose**: Defines the rate structure for different types of coaching sessions.

**Schema Definition**:
```sql
CREATE TABLE backoffice.coach_rates (
    rate_type TEXT PRIMARY KEY,
    rate NUMERIC(10,2) NOT NULL
);
```

**Column Details**:
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `rate_type` | TEXT | NO | - | Primary key: type of coaching rate |
| `rate` | NUMERIC(10,2) | NO | - | Rate amount in local currency |

**Business Rules**:
- Rate types correspond to package types and booking configurations
- Used for earnings calculations in the `coach_earnings` view
- Rates are in Thai Baht (THB)

**Example Data**:
```sql
INSERT INTO coach_rates (rate_type, rate) VALUES
('Individual, 1 PAX', 500.00),
('Individual, 2 PAX', 750.00),
('Group, 3-4 PAX', 900.00),
('Junior Individual', 400.00),
('VIP Private', 800.00);
```

---

### 5. `backoffice.allowed_users` (Coach Profile Data)

**Purpose**: Extended user table that includes coach-specific profile information.

**Relevant Coach Columns**:
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key referenced by other coach tables |
| `email` | TEXT | Coach email address |
| `is_coach` | BOOLEAN | Whether user has coach role |
| `is_active_coach` | BOOLEAN | Whether coach is currently active |
| `coach_name` | TEXT | Coach's full name |
| `coach_display_name` | TEXT | Display name for booking interface |
| `coach_email` | TEXT | Coach-specific email (may differ from login email) |
| `coach_code` | TEXT | Unique coach identifier code |
| `coach_phone` | TEXT | Coach contact number |
| `coach_bio` | TEXT | Coach biography/description |
| `coach_experience_years` | INTEGER | Years of coaching experience |
| `coach_specialties` | TEXT[] | Array of coaching specialties |
| `coach_started_date` | DATE | Date coach started at facility |
| `coach_profile_image_url` | TEXT | URL to coach profile photo |
| `coach_notes` | TEXT | Internal notes about coach |

**Business Rules**:
- One record per coach with `is_coach = true`
- `coach_id` in other tables references `allowed_users.id`
- Coach profile data drives dashboard display and booking interface

## Views

### `backoffice.coach_earnings`

**Purpose**: Calculated view that derives coach earnings from POS transaction data.

**View Definition**:
```sql
CREATE VIEW backoffice.coach_earnings AS
SELECT 
    a.receipt_number,
    a.date,
    a.customer_name,
    a.customer_phone_number,
    a.stable_hash_id,
    a.coach,
    a.rate_type,
    a.hour_cnt,
    f.rate,
    (a.hour_cnt::numeric * f.rate) AS coach_earnings
FROM (
    -- Complex subquery that extracts coach data from POS transactions
    -- Links coaching lessons to packages and calculates session counts
    SELECT 
        a1.receipt_number,
        a1.date,
        a1.customer_name,
        a1.customer_phone_number,
        b.stable_hash_id,
        max(CASE 
            WHEN a1.product_name LIKE '%Lesson Used (%' 
            THEN upper(substring(a1.product_name, '\\(([^)]+)\\)'))
            ELSE NULL 
        END) AS coach,
        max(CASE
            WHEN a1.product_name = '1 Golf Lesson' THEN 'Individual, 1 PAX'
            WHEN a1.product_name = '1 Golf Lesson (2 PAX)' THEN 'Individual, 2 PAX'
            ELSE d.name
        END::text) AS rate_type,
        count(DISTINCT CASE 
            WHEN a1.product_name LIKE '%Lesson Used (%' 
            THEN a1.id 
            ELSE NULL 
        END) AS hour_cnt
    FROM pos.lengolf_sales a1
    LEFT JOIN backoffice.customers b ON (
        regexp_replace(ltrim(a1.customer_phone_number, '0'), '^0+', '') = 
        regexp_replace(ltrim(b.contact_number::text, '0'), '^0+', '')
    )
    LEFT JOIN backoffice.packages c ON (b.stable_hash_id::text = c.stable_hash_id::text)
    LEFT JOIN backoffice.package_types d ON (c.package_type_id = d.id)
    LEFT JOIN backoffice.package_usage e ON (
        c.id = e.package_id AND a1.date = e.used_date
    )
    WHERE a1.receipt_number IN (
        SELECT DISTINCT receipt_number 
        FROM pos.lengolf_sales 
        WHERE product_name LIKE '%Lesson Used (%'
    )
    AND (d.type = 'Coaching' OR d.type IS NULL)
    AND a1.product_name LIKE '%Lesson%'
    GROUP BY a1.receipt_number, a1.date, a1.customer_name, a1.customer_phone_number, b.stable_hash_id
) a
LEFT JOIN backoffice.coach_rates f ON (f.rate_type = a.rate_type);
```

**Calculated Columns**:
| Column | Type | Description |
|--------|------|-------------|
| `receipt_number` | TEXT | POS receipt identifier |
| `date` | DATE | Date of the coaching session |
| `customer_name` | TEXT | Customer who received coaching |
| `customer_phone_number` | TEXT | Customer contact number |
| `stable_hash_id` | VARCHAR(32) | Customer identifier hash |
| `coach` | TEXT | Coach name extracted from product name |
| `rate_type` | TEXT | Type of coaching session |
| `hour_cnt` | BIGINT | Number of coaching hours/sessions |
| `rate` | NUMERIC(10,2) | Rate per hour from `coach_rates` |
| `coach_earnings` | NUMERIC | Calculated: `hour_cnt * rate` |

**Business Logic**:
- Extracts coach names from POS product names using regex patterns
- Links customers via phone number matching
- Determines rate types from package types or product names
- Calculates earnings by multiplying session count by hourly rate
- Only includes transactions with coaching-related products

## Indexes & Performance

### Primary Key Indexes
```sql
-- Automatically created with PRIMARY KEY constraints
coach_weekly_schedules_pkey (id)
coach_recurring_blocks_pkey (id)
coach_date_overrides_pkey (id)
coach_rates_pkey (rate_type)
```

### Unique Constraint Indexes
```sql
-- Prevent duplicate schedules per coach/day
coach_weekly_schedules_coach_id_day_of_week_key (coach_id, day_of_week)

-- Prevent overlapping date overrides
coach_date_overrides_coach_id_override_date_start_time_key (coach_id, override_date, start_time)
```

### Performance Optimization Indexes
```sql
-- Coach-specific queries
CREATE INDEX idx_coach_weekly_schedules_coach_id ON coach_weekly_schedules(coach_id);
CREATE INDEX idx_coach_recurring_blocks_coach_id ON coach_recurring_blocks(coach_id);
CREATE INDEX idx_coach_date_overrides_coach_id_date ON coach_date_overrides(coach_id, override_date);
```

### Query Performance Patterns

**Availability Lookup (Most Common)**:
```sql
-- Optimized for: Get all availability data for a coach within date range
SELECT * FROM coach_weekly_schedules WHERE coach_id = ? -- Uses idx_coach_weekly_schedules_coach_id
UNION ALL
SELECT * FROM coach_recurring_blocks WHERE coach_id = ? AND is_active = true -- Uses idx_coach_recurring_blocks_coach_id
UNION ALL  
SELECT * FROM coach_date_overrides WHERE coach_id = ? AND override_date BETWEEN ? AND ? -- Uses idx_coach_date_overrides_coach_id_date
```

**Earnings Analysis**:
```sql
-- Optimized for: Coach earnings within date range
SELECT * FROM coach_earnings WHERE coach = ? AND date BETWEEN ? AND ?
-- Note: View performance depends on underlying POS table indexes
```

## Constraints & Data Integrity

### Check Constraints

**Time Validation**:
```sql
-- Ensure end time is after start time in all time-based tables
CONSTRAINT coach_weekly_schedules_check CHECK (end_time > start_time)
CONSTRAINT coach_recurring_blocks_check CHECK (end_time > start_time)
CONSTRAINT coach_date_overrides_check CHECK (
    (override_type = 'unavailable' AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time) OR
    (override_type = 'available' AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
)
```

**Day of Week Validation**:
```sql
-- Ensure valid day of week values (0-6)
CONSTRAINT coach_weekly_schedules_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6)
CONSTRAINT coach_recurring_blocks_day_of_week_check CHECK (day_of_week >= 0 AND day_of_week <= 6)
```

**Override Type Validation**:
```sql
-- Ensure valid override types
CONSTRAINT coach_date_overrides_override_type_check CHECK (override_type IN ('unavailable', 'available'))
```

### Foreign Key Constraints

**Coach References**:
```sql
-- All coaching tables reference the allowed_users table
CONSTRAINT coach_weekly_schedules_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES backoffice.allowed_users(id)
CONSTRAINT coach_recurring_blocks_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES backoffice.allowed_users(id)
CONSTRAINT coach_date_overrides_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES backoffice.allowed_users(id)
```

### Data Validation Rules

**Business Logic Validation**:
1. **Weekly Schedule**: One entry per coach per day of week
2. **Recurring Blocks**: Can have multiple blocks per coach per day
3. **Date Overrides**: Must specify both start and end times for any override type
4. **Rate Types**: Must exist in `coach_rates` table for earnings calculation
5. **Time Ranges**: All time ranges must be valid (end > start)

## Relationships

### Entity Relationship Diagram

```
┌─────────────────────────┐
│   backoffice.           │
│   allowed_users         │
│   ┌─────────────────┐   │
│   │ id (UUID) PK    │───┼──────────────────────────────┐
│   │ email           │   │                              │
│   │ is_coach        │   │                              │
│   │ coach_name      │   │                              │
│   │ coach_*         │   │                              │
│   └─────────────────┘   │                              │
└─────────────────────────┘                              │
                                                         │
┌─────────────────────────┐    ┌─────────────────────────┼─────┐
│   public.               │    │   public.               │     │
│   coach_weekly_schedules│    │   coach_recurring_blocks│     │
│   ┌─────────────────┐   │    │   ┌─────────────────┐   │     │
│   │ id (UUID) PK    │   │    │   │ id (UUID) PK    │   │     │
│   │ coach_id FK     │───┼────┼───│ coach_id FK     │───┼─────┘
│   │ day_of_week     │   │    │   │ title           │   │
│   │ start_time      │   │    │   │ day_of_week     │   │
│   │ end_time        │   │    │   │ start_time      │   │
│   │ is_available    │   │    │   │ end_time        │   │
│   └─────────────────┘   │    │   │ is_active       │   │
└─────────────────────────┘    │   └─────────────────┘   │
                               └─────────────────────────┘
                                                         │
┌─────────────────────────┐    ┌─────────────────────────┼─────┐
│   public.               │    │   backoffice.           │     │
│   coach_date_overrides  │    │   coach_rates           │     │
│   ┌─────────────────┐   │    │   ┌─────────────────┐   │     │
│   │ id (UUID) PK    │   │    │   │ rate_type PK    │   │     │
│   │ coach_id FK     │───┼────┼───│ rate            │   │     │
│   │ override_date   │   │    │   └─────────────────┘   │     │
│   │ start_time      │   │    └─────────────────────────┘     │
│   │ end_time        │   │                                    │
│   │ override_type   │   │                                    │
│   │ title           │   │    ┌─────────────────────────┐     │
│   │ notes           │   │    │   backoffice.           │     │
│   └─────────────────┘   │    │   coach_earnings (VIEW)│     │
└─────────────────────────┘    │   ┌─────────────────┐   │     │
                               │   │ receipt_number  │   │     │
                               │   │ date            │   │     │
                               │   │ coach           │───┼─────┘
                               │   │ rate_type       │───┼─┐
                               │   │ rate            │   │ │
                               │   │ coach_earnings  │   │ │
                               │   └─────────────────┘   │ │
                               └─────────────────────────┘ │
                                         │                 │
                    ┌────────────────────┘                 │
                    │ Derived from POS data                │
                    │ + customer/package linking           │
                    └──────────────────────────────────────┘
```

### Relationship Details

**One-to-Many Relationships**:
- `allowed_users.id` → `coach_weekly_schedules.coach_id` (1:7 max, one per day)
- `allowed_users.id` → `coach_recurring_blocks.coach_id` (1:N, multiple blocks per coach)
- `allowed_users.id` → `coach_date_overrides.coach_id` (1:N, multiple overrides per coach)

**Lookup Relationships**:
- `coach_earnings.rate_type` → `coach_rates.rate_type` (N:1, many earnings to one rate)
- `coach_earnings.coach` → `allowed_users.coach_name` (N:1, text-based lookup)

## Database Functions

### Stored Procedures

#### `get_student_coaching_summary(coach_name TEXT)`

**Purpose**: Retrieves comprehensive student data for a coach including package information.

**Returns**: Table with columns:
- `student_name` TEXT
- `last_lesson_date` DATE  
- `total_lessons` BIGINT
- `packages` JSONB

**Usage**:
```sql
SELECT * FROM get_student_coaching_summary('Coach Smith');
```

**Implementation**: 
- Joins booking data with customer and package information
- Filters bookings by coach name in booking_type field
- Aggregates package data as JSONB for each student
- Used by `/api/coaching/students` endpoint

### Availability Calculation Function (Conceptual)

```sql
-- This would be a useful addition for complex availability queries
CREATE OR REPLACE FUNCTION get_coach_availability(
    p_coach_id UUID,
    p_start_date DATE,
    p_end_date DATE
) RETURNS TABLE (
    availability_date DATE,
    start_time TIME,
    end_time TIME,
    availability_type TEXT,
    source_type TEXT
) AS $$
BEGIN
    -- Implementation would combine weekly schedule, recurring blocks, and date overrides
    -- Following the hierarchy: date_overrides > recurring_blocks > weekly_schedule
END;
$$ LANGUAGE plpgsql;
```

## Data Types & Validation

### Time Zone Handling

**Storage**: All timestamps stored in UTC using `TIMESTAMPTZ`
**Time Fields**: Use `TIME` type for daily schedules (no timezone)
**Application**: Convert to Bangkok timezone (`Asia/Bangkok`) in application layer

### UUID Usage

**Primary Keys**: All main tables use UUID primary keys for:
- Global uniqueness across distributed systems
- No integer sequence conflicts
- Better security (non-guessable IDs)

**Generated Values**:
```sql
DEFAULT gen_random_uuid()  -- PostgreSQL built-in UUID generation
```

### Numeric Precision

**Currency Fields**: `NUMERIC(10,2)` for exact decimal arithmetic
- 10 total digits
- 2 decimal places
- Avoids floating-point precision issues

### Array Types

**Coach Specialties**: `TEXT[]` array for multiple specialties
```sql
-- Example usage
UPDATE allowed_users 
SET coach_specialties = ARRAY['Putting', 'Short Game', 'Driver'] 
WHERE id = 'coach-uuid';
```

## Migration History

### Initial Schema Creation

**Version 1.0** (2024-12-01):
```sql
-- Create base coaching tables
CREATE TABLE coach_weekly_schedules (...);
CREATE TABLE coach_recurring_blocks (...);
CREATE TABLE coach_date_overrides (...);
CREATE TABLE coach_rates (...);

-- Add coach columns to allowed_users
ALTER TABLE allowed_users ADD COLUMN coach_name TEXT;
ALTER TABLE allowed_users ADD COLUMN coach_display_name TEXT;
-- ... other coach columns
```

**Version 1.1** (2024-12-15):
```sql
-- Add performance indexes
CREATE INDEX idx_coach_weekly_schedules_coach_id ON coach_weekly_schedules(coach_id);
CREATE INDEX idx_coach_recurring_blocks_coach_id ON coach_recurring_blocks(coach_id);
CREATE INDEX idx_coach_date_overrides_coach_id_date ON coach_date_overrides(coach_id, override_date);
```

**Version 1.2** (2025-01-01):
```sql
-- Create coach_earnings view
CREATE VIEW coach_earnings AS (...);

-- Add additional validation constraints
ALTER TABLE coach_date_overrides ADD CONSTRAINT coach_date_overrides_check (...);
```

### Future Migrations

**Planned Enhancements**:
1. **Availability Templates**: Predefined schedule templates for new coaches
2. **Booking Integration**: Direct foreign keys to booking records
3. **Advanced Scheduling**: Support for variable-length sessions
4. **Performance Metrics**: Tables for tracking coach performance KPIs

### Migration Best Practices

**Deployment Strategy**:
1. Create new tables/columns first
2. Populate with existing data if needed
3. Add constraints and indexes
4. Update application code
5. Remove deprecated columns/tables

**Rollback Planning**:
- All migrations include rollback scripts
- Test on staging environment first
- Monitor performance after deployment

---

**Last Updated**: January 2025  
**Schema Version**: 1.2  
**Maintainer**: Development Team

**Related Documentation**:
- [Coaching System Overview](../features/COACHING_SYSTEM.md)
- [Coaching API Reference](../api/COACHING_API_REFERENCE.md)
- [Database Schema](DATABASE_SCHEMA.md)