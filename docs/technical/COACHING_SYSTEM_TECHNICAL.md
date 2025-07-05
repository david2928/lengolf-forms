# Coaching System Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Component Structure](#component-structure)
3. [State Management](#state-management)
4. [Database Integration](#database-integration)
5. [Authentication & Security](#authentication--security)
6. [Performance Optimizations](#performance-optimizations)
7. [Development Setup](#development-setup)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Considerations](#deployment-considerations)
10. [Troubleshooting](#troubleshooting)

## Architecture Overview

The Coaching System follows a modern full-stack architecture with clear separation between coach-facing and admin-facing interfaces, built on Next.js 14 with TypeScript and Supabase integration.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
├─────────────────────────────────────────────────────────────┤
│  Coach Portal        │  Admin Portal        │  Components   │
│  /coaching          │  /admin/coaching     │  Shared UI    │
│  ├── Dashboard      │  ├── Booking Assist │  ├── Cards    │
│  ├── Availability   │  ├── KPI Monitor    │  ├── Tables   │
│  └── Calendar       │  └── Student Mgmt   │  └── Modals   │
├─────────────────────────────────────────────────────────────┤
│                     API Layer                               │
├─────────────────────────────────────────────────────────────┤
│  /api/coaching/*    │  Authentication      │  Validation   │
│  ├── dashboard     │  ├── Session Mgmt    │  ├── Schema   │
│  ├── availability  │  ├── Role Control    │  ├── Sanitize │
│  ├── earnings      │  └── Dev Bypass      │  └── Types    │
│  ├── students      │                      │               │
│  └── bookings      │                      │               │
├─────────────────────────────────────────────────────────────┤
│                   Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL │  Row Level Security │  Functions    │
│  ├── Coach Tables    │  ├── User Isolation │  ├── RPC     │
│  ├── Availability   │  ├── Admin Access   │  ├── Triggers │
│  ├── Earnings       │  └── Data Privacy   │  └── Views    │
│  └── Integration    │                     │               │
└─────────────────────────────────────────────────────────────┘
```

### Design Principles

1. **Separation of Concerns**: Clear boundaries between coach and admin functionality
2. **Role-Based Access**: Granular permissions with coach data isolation
3. **Component Reusability**: Shared UI components with consistent design
4. **Type Safety**: Full TypeScript coverage with strict type checking
5. **Performance First**: Optimized queries, caching, and lazy loading
6. **Development Experience**: Hot reload, auth bypass, and comprehensive tooling

## Component Structure

### Directory Organization

```
src/
├── components/
│   ├── coaching/                    # Coach portal components
│   │   ├── dashboard/              # Dashboard-specific components
│   │   │   ├── DashboardHeader.tsx
│   │   │   ├── DashboardStats.tsx
│   │   │   ├── EarningsSummary.tsx
│   │   │   ├── UpcomingLessons.tsx
│   │   │   └── CombinedCalendarView.tsx
│   │   ├── availability/           # Availability management
│   │   │   ├── WeeklyScheduleManager.tsx
│   │   │   ├── RecurringBlocksManager.tsx
│   │   │   ├── DateOverridesManager.tsx
│   │   │   └── AvailabilityCalendar.tsx
│   │   └── modals/                 # Modal dialogs
│   │       ├── StudentsModal.tsx
│   │       ├── BookingsModal.tsx
│   │       └── EarningsModal.tsx
│   └── admin/
│       └── coaching/               # Admin portal components
│           ├── coaching-dashboard-header.tsx
│           ├── coaching-kpi-cards.tsx
│           ├── coaching-search-filters.tsx
│           ├── next-available-slots.tsx
│           ├── weekly-schedule.tsx
│           ├── student-management.tsx
│           ├── inactive-students.tsx
│           └── index.tsx
├── hooks/                          # Custom React hooks
│   ├── useCoachDashboard.ts
│   ├── useCoachingDashboard.ts     # Admin dashboard hook
│   ├── useCoachStudents.ts
│   ├── useCoachBookings.ts
│   └── useCoachEarnings.ts
├── lib/
│   └── coachingUtils.ts            # Utility functions
└── types/
    └── coaching.ts                 # TypeScript type definitions
```

### Component Architecture Patterns

#### 1. Container/Presenter Pattern

```typescript
// Container Component (Smart)
export default function CoachDashboard() {
  const { dashboardData, error, isLoading } = useCoachDashboard(selectedYear, selectedMonth);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} />;
  
  return (
    <div>
      <DashboardHeader {...headerProps} />
      <DashboardStats {...statsProps} />
      <EarningsSummary {...earningsProps} />
    </div>
  );
}

// Presenter Component (Dumb)
export function DashboardStats({ monthly_earnings, upcoming_sessions_count }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard title="Monthly Earnings" value={monthly_earnings.total_earnings} />
      <StatCard title="Sessions This Month" value={upcoming_sessions_count} />
    </div>
  );
}
```

#### 2. Custom Hooks Pattern

```typescript
// Business logic encapsulation
export function useCoachDashboard(year: number, month: number, coachId?: string) {
  const [dashboardData, setDashboardData] = useState<CoachDashboardData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/coaching/dashboard?year=${year}&month=${month}${coachId ? `&coach_id=${coachId}` : ''}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [year, month, coachId]);

  return { dashboardData, error, isLoading };
}
```

#### 3. Compound Component Pattern

```typescript
// Calendar with sub-components
export function AvailabilityCalendar({ coachId }: Props) {
  return (
    <CalendarProvider coachId={coachId}>
      <Calendar.Header />
      <Calendar.Grid>
        <Calendar.TimeSlots />
        <Calendar.AvailabilityBlocks />
        <Calendar.BookingOverlay />
      </Calendar.Grid>
      <Calendar.Legend />
    </CalendarProvider>
  );
}
```

## State Management

### State Management Strategy

The coaching system uses a hybrid approach combining:

1. **Local State**: Component-specific state with `useState`
2. **Custom Hooks**: Business logic state encapsulation
3. **Context API**: Shared state for complex forms
4. **SWR Caching**: Server state management and caching

### State Categories

#### 1. UI State (Local)
```typescript
// Component-specific UI state
const [selectedWeek, setSelectedWeek] = useState<Date>(getMonday());
const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
const [activeTab, setActiveTab] = useState<'calendar' | 'schedule'>('calendar');
```

#### 2. Server State (SWR)
```typescript
// Server state with caching
import useSWR from 'swr';

function useCoachEarnings(coachId: string, period: string) {
  const { data, error, mutate } = useSWR(
    [`/api/coaching/earnings`, coachId, period],
    ([url, id, p]) => fetcher(`${url}?coach_id=${id}&period=${p}`),
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 5000
    }
  );

  return {
    earnings: data?.earnings || [],
    summary: data?.summary,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}
```

#### 3. Form State (React Hook Form)
```typescript
// Complex form state management
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const availabilitySchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  isAvailable: z.boolean()
});

export function WeeklyScheduleForm() {
  const form = useForm<AvailabilityFormData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: {
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true
    }
  });

  const onSubmit = async (data: AvailabilityFormData) => {
    try {
      await updateWeeklySchedule(data);
      toast.success('Schedule updated successfully');
    } catch (error) {
      toast.error('Failed to update schedule');
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields */}
      </form>
    </Form>
  );
}
```

#### 4. Global State (Context)
```typescript
// Availability management context
interface AvailabilityContextType {
  coachId: string;
  weeklySchedule: WeeklySchedule;
  recurringBlocks: RecurringBlock[];
  dateOverrides: DateOverride[];
  updateSchedule: (schedule: WeeklySchedule) => void;
  addRecurringBlock: (block: RecurringBlock) => void;
  removeRecurringBlock: (blockId: string) => void;
}

export const AvailabilityContext = createContext<AvailabilityContextType | null>(null);

export function AvailabilityProvider({ children, coachId }: Props) {
  const [state, dispatch] = useReducer(availabilityReducer, initialState);
  
  const contextValue = {
    ...state,
    coachId,
    updateSchedule: (schedule: WeeklySchedule) => 
      dispatch({ type: 'UPDATE_SCHEDULE', payload: schedule }),
    addRecurringBlock: (block: RecurringBlock) => 
      dispatch({ type: 'ADD_RECURRING_BLOCK', payload: block }),
    // ... other actions
  };

  return (
    <AvailabilityContext.Provider value={contextValue}>
      {children}
    </AvailabilityContext.Provider>
  );
}
```

## Database Integration

### Database Schema Design

#### Core Tables Structure

```sql
-- Coach weekly availability patterns
CREATE TABLE coach_weekly_schedules (
  coach_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (coach_id, day_of_week),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Recurring unavailable blocks
CREATE TABLE coach_recurring_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL,
  title TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Date-specific availability overrides
CREATE TABLE coach_date_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL,
  override_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  override_type TEXT NOT NULL CHECK (override_type IN ('available', 'unavailable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coach_id, override_date, start_time, end_time),
  CONSTRAINT valid_time_range CHECK (
    (start_time IS NULL AND end_time IS NULL) OR 
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

-- Earnings tracking
CREATE TABLE coach_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT NOT NULL,
  date DATE NOT NULL,
  customer_name TEXT,
  customer_phone_number TEXT,
  stable_hash_id TEXT,
  coach TEXT NOT NULL,
  rate_type TEXT NOT NULL,
  hour_cnt DECIMAL(4,2) DEFAULT 1.0,
  rate DECIMAL(10,2) NOT NULL,
  coach_earnings DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(receipt_number, coach, rate_type)
);
```

#### Database Functions

```sql
-- Get comprehensive student summary for a coach
CREATE OR REPLACE FUNCTION get_student_coaching_summary(coach_name TEXT)
RETURNS TABLE (
  student_name TEXT,
  last_lesson_date DATE,
  total_lessons BIGINT,
  packages JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH coach_bookings AS (
    SELECT 
      b.customer_name,
      MAX(b.booking_date) as last_booking_date,
      COUNT(*) as booking_count
    FROM backoffice.bookings b
    WHERE b.booking_type ILIKE '%' || coach_name || '%'
      AND b.status != 'cancelled'
    GROUP BY b.customer_name
  ),
  customer_packages AS (
    SELECT 
      c.customer_name,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'package_name', p.package_name,
          'total_sessions', p.sessions,
          'purchase_date', cp.purchase_date,
          'expiration_date', cp.expiration_date,
          'status', CASE 
            WHEN cp.expiration_date >= CURRENT_DATE THEN 'Active'
            ELSE 'Past'
          END,
          'used_sessions', COALESCE(p.sessions - cp.remaining_sessions, 0),
          'remaining_sessions', cp.remaining_sessions
        )
      ) as packages
    FROM backoffice.customers c
    LEFT JOIN backoffice.customer_packages cp ON c.customer_name = cp.customer_name
    LEFT JOIN backoffice.packages p ON cp.package_id = p.id
    WHERE cp.package_id IS NOT NULL
    GROUP BY c.customer_name
  )
  SELECT 
    cb.customer_name::TEXT,
    cb.last_booking_date::DATE,
    cb.booking_count::BIGINT,
    COALESCE(cp.packages, '[]'::JSONB)
  FROM coach_bookings cb
  LEFT JOIN customer_packages cp ON cb.customer_name = cp.customer_name
  ORDER BY cb.last_booking_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Indexes for Performance

```sql
-- Optimize coach-specific queries
CREATE INDEX idx_coach_weekly_schedules_coach_id ON coach_weekly_schedules(coach_id);
CREATE INDEX idx_coach_recurring_blocks_coach_day ON coach_recurring_blocks(coach_id, day_of_week) WHERE is_active = true;
CREATE INDEX idx_coach_date_overrides_coach_date ON coach_date_overrides(coach_id, override_date);
CREATE INDEX idx_coach_earnings_coach_date ON coach_earnings(coach, date DESC);

-- Optimize availability queries
CREATE INDEX idx_coach_date_overrides_date_range ON coach_date_overrides(override_date) WHERE override_date >= CURRENT_DATE;

-- Optimize earnings analytics
CREATE INDEX idx_coach_earnings_rate_type ON coach_earnings(coach, rate_type, date DESC);
```

### Data Access Patterns

#### 1. Coach Data Isolation

```typescript
// Ensure coaches only access their own data
async function getCoachData(session: Session, coachId?: string) {
  const userEmail = session.user?.email;
  const isAdmin = await checkAdminRole(userEmail);
  
  // Admin can specify coach_id, coaches use their own ID
  const targetCoachId = isAdmin && coachId ? coachId : await getCoachIdByEmail(userEmail);
  
  if (!targetCoachId) {
    throw new Error('Coach not found');
  }
  
  return targetCoachId;
}
```

#### 2. Optimized Queries

```typescript
// Batch availability data fetching
async function getCoachAvailability(coachId: string, dateRange: DateRange) {
  const [weeklySchedule, recurringBlocks, dateOverrides] = await Promise.all([
    supabase
      .from('coach_weekly_schedules')
      .select('*')
      .eq('coach_id', coachId),
    
    supabase
      .from('coach_recurring_blocks')
      .select('*')
      .eq('coach_id', coachId)
      .eq('is_active', true)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true }),
    
    supabase
      .from('coach_date_overrides')
      .select('*')
      .eq('coach_id', coachId)
      .gte('override_date', dateRange.start)
      .lte('override_date', dateRange.end)
      .order('override_date', { ascending: true })
  ]);

  return {
    weeklySchedule: weeklySchedule.data || [],
    recurringBlocks: recurringBlocks.data || [],
    dateOverrides: dateOverrides.data || []
  };
}
```

#### 3. Transaction Handling

```typescript
// Atomic availability updates
async function updateCoachAvailability(coachId: string, updates: AvailabilityUpdates) {
  const { data, error } = await supabase.rpc('update_coach_availability', {
    p_coach_id: coachId,
    p_weekly_schedule: updates.weeklySchedule,
    p_recurring_blocks: updates.recurringBlocks,
    p_date_overrides: updates.dateOverrides
  });

  if (error) {
    throw new Error(`Failed to update availability: ${error.message}`);
  }

  return data;
}
```

## Authentication & Security

### Authentication Architecture

```typescript
// Development authentication bypass
export async function getDevSession(authOptions: AuthOptions, request: NextRequest) {
  // Production authentication
  if (process.env.NODE_ENV === 'production' || process.env.SKIP_AUTH !== 'true') {
    return await getServerSession(authOptions);
  }

  // Development bypass
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (isValidDevToken(token)) {
      return createMockSession(token);
    }
  }

  // Default development session
  return {
    user: {
      email: 'dev@lengolf.com',
      name: 'Development User',
      isAdmin: true,
      isCoach: true
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}
```

### Role-Based Access Control

```typescript
// Role checking utilities
export async function checkCoachRole(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('allowed_users')
    .select('is_coach')
    .eq('email', email)
    .single();
  
  return data?.is_coach || false;
}

export async function checkAdminRole(email: string): Promise<boolean> {
  const { data } = await supabase
    .from('allowed_users')
    .select('is_admin')
    .eq('email', email)
    .single();
  
  return data?.is_admin || false;
}

// API endpoint protection
export async function requireCoachAccess(request: NextRequest) {
  const session = await getDevSession(authOptions, request);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const isCoach = await checkCoachRole(session.user.email);
  if (!isCoach) {
    return NextResponse.json({ error: 'Coach access required' }, { status: 403 });
  }
  
  return null; // Access granted
}
```

### Data Privacy & Security

#### 1. Row Level Security (RLS)

```sql
-- Enable RLS on coach tables
ALTER TABLE coach_weekly_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_recurring_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_date_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_earnings ENABLE ROW LEVEL SECURITY;

-- Coach can only access their own data
CREATE POLICY "coaches_own_data" ON coach_weekly_schedules
  FOR ALL USING (coach_id = current_setting('request.jwt.claims', true)::json->>'coach_id');

-- Admins can access all data
CREATE POLICY "admin_full_access" ON coach_weekly_schedules
  FOR ALL USING (current_setting('request.jwt.claims', true)::json->>'role' = 'admin');
```

#### 2. Input Validation & Sanitization

```typescript
// Zod schema validation
const availabilitySchema = z.object({
  coachId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
  isAvailable: z.boolean()
});

export async function validateAndSanitize<T>(schema: z.ZodSchema<T>, input: unknown): Promise<T> {
  try {
    return schema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid input', error.errors);
    }
    throw error;
  }
}
```

## Performance Optimizations

### Frontend Optimizations

#### 1. Component Memoization

```typescript
// Memoize expensive calculations
const AvailabilityGrid = React.memo(({ schedule, slots }: Props) => {
  const processedSlots = useMemo(() => {
    return processAvailabilitySlots(schedule, slots);
  }, [schedule, slots]);

  return (
    <div className="grid">
      {processedSlots.map(slot => (
        <SlotComponent key={slot.id} slot={slot} />
      ))}
    </div>
  );
});

// Memoize callback functions
const handleSlotClick = useCallback((slotId: string) => {
  onSlotSelect(slotId);
}, [onSlotSelect]);
```

#### 2. Data Fetching Optimization

```typescript
// SWR with optimized caching
const swrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 30000,
  dedupingInterval: 10000,
  errorRetryInterval: 5000,
  errorRetryCount: 3
};

function useOptimizedEarnings(coachId: string, dateRange: DateRange) {
  return useSWR(
    ['earnings', coachId, dateRange.start, dateRange.end],
    ([, id, start, end]) => fetchEarnings(id, start, end),
    swrOptions
  );
}
```

#### 3. Virtual Scrolling for Large Lists

```typescript
// Virtual scrolling for earnings list
import { FixedSizeList as List } from 'react-window';

function EarningsList({ earnings }: Props) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <EarningRow earning={earnings[index]} />
    </div>
  );

  return (
    <List
      height={400}
      itemCount={earnings.length}
      itemSize={80}
      overscanCount={5}
    >
      {Row}
    </List>
  );
}
```

### Backend Optimizations

#### 1. Database Query Optimization

```typescript
// Optimized availability query with joins
const getAvailabilityData = async (coachId: string, dateRange: DateRange) => {
  const { data, error } = await supabase.rpc('get_coach_availability_optimized', {
    p_coach_id: coachId,
    p_start_date: dateRange.start,
    p_end_date: dateRange.end
  });

  return data;
};

// SQL function with optimized joins
CREATE OR REPLACE FUNCTION get_coach_availability_optimized(
  p_coach_id TEXT,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  WITH availability_data AS (
    SELECT 
      'weekly_schedule' as type,
      day_of_week,
      start_time,
      end_time,
      is_available
    FROM coach_weekly_schedules
    WHERE coach_id = p_coach_id
    
    UNION ALL
    
    SELECT 
      'recurring_block' as type,
      day_of_week,
      start_time,
      end_time,
      NOT is_active as is_available
    FROM coach_recurring_blocks
    WHERE coach_id = p_coach_id AND is_active = true
    
    UNION ALL
    
    SELECT 
      'date_override' as type,
      EXTRACT(DOW FROM override_date)::INTEGER as day_of_week,
      start_time,
      end_time,
      (override_type = 'available') as is_available
    FROM coach_date_overrides
    WHERE coach_id = p_coach_id 
      AND override_date BETWEEN p_start_date AND p_end_date
  )
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'type', type,
      'day_of_week', day_of_week,
      'start_time', start_time,
      'end_time', end_time,
      'is_available', is_available
    )
  ) INTO result
  FROM availability_data;
  
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. Caching Strategy

```typescript
// Redis caching for expensive queries
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function getCachedEarningsSummary(coachId: string, period: string) {
  const cacheKey = `earnings:${coachId}:${period}`;
  
  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from database
  const summary = await calculateEarningsSummary(coachId, period);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(summary));
  
  return summary;
}
```

## Development Setup

### Local Development Environment

#### 1. Prerequisites

```bash
# Node.js and npm
node --version  # v18.0.0 or higher
npm --version   # v8.0.0 or higher

# Environment setup
cp .env.example .env.local

# Required environment variables
NEXT_PUBLIC_REFAC_SUPABASE_URL=your_supabase_url
REFAC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_nextauth_secret
SKIP_AUTH=true  # Enable development bypass
```

#### 2. Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Database migrations (if needed)
npx supabase db push
```

#### 3. Development Features

```typescript
// Hot reload for coaching components
if (process.env.NODE_ENV === 'development') {
  // Enable React Fast Refresh
  module.hot?.accept();
}

// Development data seeding
if (process.env.NODE_ENV === 'development') {
  await seedDevelopmentData();
}
```

### Database Setup

#### 1. Supabase Configuration

```sql
-- Development setup script
-- Run in Supabase SQL Editor

-- Create coach tables
\i create-coaching-schema.sql

-- Insert development data
INSERT INTO coach_weekly_schedules (coach_id, day_of_week, start_time, end_time) VALUES
  ('dev_coach_1', 1, '09:00', '17:00'),
  ('dev_coach_1', 2, '09:00', '17:00'),
  ('dev_coach_2', 1, '10:00', '16:00');

-- Create indexes
\i create-coaching-indexes.sql
```

#### 2. Development Data

```typescript
// Seed development data
export async function seedCoachingData() {
  const devCoaches = [
    {
      id: 'dev_coach_1',
      name: 'John Smith',
      display_name: 'Coach John',
      email: 'john@dev.lengolf.com'
    },
    {
      id: 'dev_coach_2', 
      name: 'Sarah Wilson',
      display_name: 'Coach Sarah',
      email: 'sarah@dev.lengolf.com'
    }
  ];

  // Insert development coaches and sample data
  await Promise.all([
    insertCoaches(devCoaches),
    insertSampleSchedules(),
    insertSampleEarnings(),
    insertSampleStudents()
  ]);
}
```

## Testing Strategy

### Unit Testing

```typescript
// Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardStats } from '../DashboardStats';

describe('DashboardStats', () => {
  const mockProps = {
    monthly_earnings: {
      total_earnings: '15000.00',
      session_count: 45,
      average_rate: '333.33'
    },
    upcoming_sessions_count: 8
  };

  it('displays earnings correctly', () => {
    render(<DashboardStats {...mockProps} />);
    
    expect(screen.getByText('฿15,000.00')).toBeInTheDocument();
    expect(screen.getByText('45 sessions')).toBeInTheDocument();
    expect(screen.getByText('8 upcoming')).toBeInTheDocument();
  });

  it('handles zero earnings', () => {
    const zeroProps = {
      ...mockProps,
      monthly_earnings: { ...mockProps.monthly_earnings, total_earnings: '0.00' }
    };
    
    render(<DashboardStats {...zeroProps} />);
    expect(screen.getByText('฿0.00')).toBeInTheDocument();
  });
});
```

### Integration Testing

```typescript
// API endpoint testing
import { createMocks } from 'node-mocks-http';
import handler from '../api/coaching/dashboard/route';

describe('/api/coaching/dashboard', () => {
  beforeEach(() => {
    // Setup test database
    process.env.SKIP_AUTH = 'true';
    process.env.NODE_ENV = 'development';
  });

  it('returns dashboard data for coach', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { coach_id: 'test_coach_1' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data).toHaveProperty('coach');
    expect(data).toHaveProperty('earnings');
    expect(data.coach.id).toBe('test_coach_1');
  });

  it('handles invalid coach ID', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: { coach_id: 'invalid_coach' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(404);
    const data = JSON.parse(res._getData());
    expect(data.error).toBe('Coach not found');
  });
});
```

### End-to-End Testing

```typescript
// Playwright E2E tests
import { test, expect } from '@playwright/test';

test.describe('Coaching Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Set development auth bypass
    await page.goto('/coaching');
  });

  test('coach can view dashboard', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Coach Dashboard');
    await expect(page.locator('[data-testid="earnings-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="sessions-card"]')).toBeVisible();
  });

  test('coach can manage availability', async ({ page }) => {
    await page.click('[data-testid="manage-availability-btn"]');
    await expect(page).toHaveURL('/coaching/availability');
    
    await page.click('[data-testid="weekly-schedule-tab"]');
    await expect(page.locator('[data-testid="schedule-grid"]')).toBeVisible();
  });

  test('admin can view all coaches', async ({ page }) => {
    // Simulate admin session
    await page.goto('/admin/coaching');
    
    await expect(page.locator('[data-testid="coach-selector"]')).toBeVisible();
    await page.selectOption('[data-testid="coach-selector"]', 'test_coach_1');
    
    await expect(page.locator('[data-testid="next-available-slots"]')).toBeVisible();
  });
});
```

## Deployment Considerations

### Production Environment

#### 1. Environment Variables

```bash
# Production .env
NEXT_PUBLIC_REFAC_SUPABASE_URL=https://your-project.supabase.co
REFAC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXTAUTH_SECRET=your_strong_secret
NEXTAUTH_URL=https://your-domain.com

# Disable development features
SKIP_AUTH=false
NODE_ENV=production
```

#### 2. Database Migrations

```sql
-- Production migration checklist
-- 1. Backup existing data
-- 2. Run schema migrations
-- 3. Update indexes
-- 4. Verify data integrity

-- Schema migration
\i migrate-coaching-schema-v2.sql

-- Update indexes for production
CREATE INDEX CONCURRENTLY idx_coach_earnings_performance 
ON coach_earnings(coach, date DESC, rate_type);

-- Verify migration
SELECT COUNT(*) FROM coach_weekly_schedules;
SELECT COUNT(*) FROM coach_earnings;
```

#### 3. Performance Monitoring

```typescript
// Production performance monitoring
import { Analytics } from '@vercel/analytics/react';

export function CoachingApp() {
  useEffect(() => {
    // Track coaching dashboard views
    if (process.env.NODE_ENV === 'production') {
      analytics.track('coaching_dashboard_view', {
        coach_id: coachId,
        timestamp: new Date().toISOString()
      });
    }
  }, [coachId]);

  return (
    <>
      <CoachingDashboard />
      <Analytics />
    </>
  );
}
```

### Security Considerations

#### 1. Production Security

```typescript
// Remove development bypasses
export async function getServerSession(request: NextRequest) {
  // Never bypass auth in production
  if (process.env.NODE_ENV === 'production') {
    return await getServerSessionFromCookies(request);
  }
  
  // Development only
  if (process.env.SKIP_AUTH === 'true') {
    return createDevelopmentSession();
  }
  
  return await getServerSessionFromCookies(request);
}
```

#### 2. Data Encryption

```sql
-- Encrypt sensitive data at rest
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Hash phone numbers for privacy
UPDATE coach_earnings 
SET customer_phone_number = encode(digest(customer_phone_number, 'sha256'), 'hex')
WHERE customer_phone_number IS NOT NULL;
```

## Troubleshooting

### Common Issues

#### 1. Authentication Problems

```typescript
// Debug authentication issues
if (process.env.NODE_ENV === 'development') {
  console.log('Auth Debug:', {
    skipAuth: process.env.SKIP_AUTH,
    session: session ? 'exists' : 'missing',
    userEmail: session?.user?.email,
    isCoach: await checkCoachRole(session?.user?.email),
    isAdmin: await checkAdminRole(session?.user?.email)
  });
}
```

#### 2. Database Connection Issues

```typescript
// Database troubleshooting
async function checkDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('coach_weekly_schedules')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database error:', error);
      return false;
    }
    
    console.log('Database connection: OK');
    return true;
  } catch (err) {
    console.error('Database connection failed:', err);
    return false;
  }
}
```

#### 3. Performance Issues

```typescript
// Performance debugging
const performanceMonitor = {
  markStart: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${label}-start`);
    }
  },
  
  markEnd: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      console.log(`${label}: ${measure.duration.toFixed(2)}ms`);
    }
  }
};

// Usage in components
useEffect(() => {
  performanceMonitor.markStart('dashboard-load');
  
  fetchDashboardData().then(() => {
    performanceMonitor.markEnd('dashboard-load');
  });
}, []);
```

### Debug Tools

#### 1. Development Tools

```typescript
// React Developer Tools integration
if (process.env.NODE_ENV === 'development') {
  window.__COACHING_DEBUG__ = {
    schedules: weeklySchedule,
    earnings: earningsData,
    students: studentsData,
    auth: { isCoach, isAdmin, coachId }
  };
}
```

#### 2. Network Debugging

```typescript
// API request logging
const apiClient = {
  async request(url: string, options: RequestInit = {}) {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, options);
      const duration = Date.now() - startTime;
      
      console.log(`API ${options.method || 'GET'} ${url}: ${response.status} (${duration}ms)`);
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`API Error: ${error}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Network Error: ${error}`);
      throw error;
    }
  }
};
```

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: Development Team

**Related Documentation**:
- [Coaching System Overview](../features/COACHING_SYSTEM.md)
- [Coaching API Reference](../api/COACHING_API_REFERENCE.md)
- [Database Schema](../technical/DATABASE_SCHEMA.md)