# Coaching System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [User Interfaces](#user-interfaces)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [Availability Management](#availability-management)
9. [Student & Earnings Tracking](#student--earnings-tracking)
10. [Admin Functions](#admin-functions)
11. [Development Notes](#development-notes)

## Overview

The Lengolf Forms Coaching System is a comprehensive platform for managing golf coaching operations at the academy. It provides separate interfaces for coaches and administrators, enabling efficient schedule management, student tracking, earnings monitoring, and availability coordination.

### Key Capabilities
- **Coach Dashboard**: Personal dashboard for individual coaches with earnings, students, and schedule management
- **Admin Dashboard**: Centralized booking assistant for staff to help students find available coaching slots
- **Availability Management**: Sophisticated scheduling system with weekly patterns, recurring blocks, and date-specific overrides
- **Student Tracking**: Complete student roster management with package monitoring and activity tracking
- **Earnings Analysis**: Detailed revenue tracking with rate type breakdowns and historical analysis
- **Real-time Calendar Integration**: Visual calendar views showing availability and bookings

## Architecture

### Frontend Structure
```
app/coaching/                    # Coach portal
├── page.tsx                    # Main coach dashboard
└── availability/               # Coach availability management
    └── page.tsx               

app/admin/coaching/             # Admin portal
└── page.tsx                   # Admin booking assistant

src/components/coaching/        # Coach components
├── dashboard/                 # Dashboard components
├── availability/              # Availability management
└── modals/                   # Modal dialogs

src/components/admin/coaching/  # Admin components
├── coaching-dashboard-header.tsx
├── coaching-kpi-cards.tsx
├── weekly-schedule.tsx
└── student-management.tsx
```

### Backend Structure
```
app/api/coaching/              # Coaching API endpoints
├── availability/             # Availability management APIs
├── bookings/                # Booking retrieval
├── coaches/                 # Coach-specific endpoints
├── dashboard/               # Dashboard data
├── earnings/                # Earnings tracking
└── students/                # Student management
```

## Features

### 1. Coach Dashboard (`/coaching`)

**Purpose**: Personal dashboard for individual coaches to manage their coaching business

**Key Features**:
- **Earnings Overview**: Monthly and total earnings with session counts
- **Student Management**: Complete student roster with package tracking
- **Upcoming Lessons**: Calendar view of scheduled coaching sessions
- **Availability Management**: Direct access to schedule configuration
- **Performance Metrics**: Session statistics and rate analysis

**User Roles**: 
- Coaches (view own data)
- Admins (can view any coach's dashboard)

### 2. Admin Booking Assistant (`/admin/coaching`)

**Purpose**: Centralized interface for staff to help students find available coaching slots

**Key Features**:
- **Next Available Slots**: Real-time view of upcoming availability across all coaches
- **Weekly Schedule Grid**: Visual overview of coach availability patterns
- **Student Management**: Cross-coach student tracking and package monitoring
- **Inactive Students**: Identification of students with unused packages
- **KPI Monitoring**: Package hours, available slots, and schedule coverage metrics

**User Roles**: Admin only

### 3. Availability Management (`/coaching/availability`)

**Purpose**: Comprehensive schedule management for coaches

**Key Features**:
- **Calendar View**: Visual overview of complete availability
- **Weekly Schedule**: Base schedule configuration for each day of the week
- **Recurring Blocks**: Repeating unavailable periods (meetings, breaks)
- **Date Overrides**: Specific date modifications (vacations, special availability)

## User Interfaces

### Coach Dashboard Interface

```typescript
// Main dashboard view
interface CoachDashboard {
  earnings: {
    current_month_earnings: string;
    total_earnings: string;
    total_sessions: number;
    average_session_rate: string;
  };
  upcoming_sessions: Session[];
  recent_bookings: Booking[];
  student_summary: StudentsData;
}
```

**Key Components**:
- `DashboardHeader`: Coach selection and period filters
- `DashboardStats`: KPI cards with earnings and session counts
- `UpcomingLessons`: Calendar integration showing scheduled sessions
- `EarningsSummary`: Detailed earnings breakdown
- `CombinedCalendarView`: Interactive schedule and booking view

### Admin Booking Assistant Interface

```typescript
// Admin dashboard state
interface AdminDashboard {
  coaches: Coach[];
  weeklySchedule: WeeklySchedule;
  nextAvailableSlots: AvailableSlot[];
  packageHoursRemaining: number;
  totalAvailableSlots: number;
  coachesWithoutSchedule: number;
}
```

**Key Components**:
- `CoachingKPICards`: System-wide metrics display
- `NextAvailableSlots`: Upcoming availability across all coaches
- `WeeklySchedule`: Grid view of coach availability
- `StudentManagement`: Cross-coach student overview
- `InactiveStudents`: Package utilization monitoring

### Availability Management Interface

**Tab-based Interface**:
1. **Calendar View**: Visual month/week calendar showing availability patterns
2. **Weekly Schedule**: Day-by-day schedule configuration
3. **Recurring Blocks**: Repeating unavailable periods
4. **Date Overrides**: Specific date modifications

## API Endpoints

### Authentication Endpoints

All coaching endpoints require authentication and appropriate role permissions.

```typescript
// Common authentication pattern
const session = await getDevSession(authOptions, request);
if (!session?.user?.email) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Core API Routes

#### 1. Dashboard Data (`/api/coaching/dashboard`)

**Methods**: GET
**Purpose**: Retrieve comprehensive dashboard data for coaches or admins

```typescript
// Query parameters
interface DashboardQuery {
  year?: number;          // Filter year (default: current)
  month?: number;         // Filter month (default: current)
  coach_id?: string;      // Admin coach selection
}

// Response structure
interface DashboardResponse {
  isAdminView: boolean;
  coach: Coach;
  earnings: EarningsData;
  monthly_earnings: MonthlyEarnings;
  recent_sessions: Session[];
  upcoming_sessions: Session[];
  availableCoaches?: Coach[];  // Admin only
}
```

#### 2. Availability Management (`/api/coaching/availability/*`)

**Weekly Schedule** (`/weekly-schedule`):
- GET: Retrieve coach's weekly availability pattern
- POST: Create/update weekly schedule
- DELETE: Remove specific day availability

**Recurring Blocks** (`/recurring-blocks`):
- GET: Retrieve recurring unavailable blocks
- POST: Create new recurring block
- PUT: Update existing block
- DELETE: Remove recurring block

**Date Overrides** (`/date-overrides`):
- GET: Retrieve date-specific availability changes
- POST: Create date override
- PUT: Update existing override
- DELETE: Remove date override

#### 3. Earnings Tracking (`/api/coaching/earnings`)

**Methods**: GET
**Purpose**: Retrieve detailed earnings data with analysis

```typescript
// Query parameters
interface EarningsQuery {
  coach_id?: string;      // Admin coach selection
  start_date?: string;    // Date filter (YYYY-MM-DD)
  end_date?: string;      // Date filter (YYYY-MM-DD)
  period?: string;        // Predefined period
  rate_type?: string;     // Rate type filter
  limit?: number;         // Pagination limit
  offset?: number;        // Pagination offset
}

// Response structure
interface EarningsResponse {
  earnings: Earning[];
  summary: {
    total_revenue: number;
    avg_per_lesson: number;
    total_lessons: number;
    rate_type_breakdown: Record<string, { count: number; revenue: number }>;
  };
  total: number;
  hasMore: boolean;
}
```

#### 4. Student Management (`/api/coaching/students`)

**Methods**: GET
**Purpose**: Retrieve student roster and package information

```typescript
// Response structure
interface StudentsResponse {
  students: Student[];
  summary: {
    total_students: number;
    active_students_l30d: number;
    inactive_students: number;
    total_lessons: number;
    coach_name: string;
  };
}
```

#### 5. Booking Integration (`/api/coaching/bookings`)

**Methods**: GET
**Purpose**: Retrieve coaching-related bookings

```typescript
// Query parameters
interface BookingsQuery {
  coach_id?: string;      // Admin coach selection
  start_date?: string;    // Date filter
  end_date?: string;      // Date filter
  status?: string;        // Booking status
  period?: string;        // Predefined period
  limit?: number;         // Pagination
  offset?: number;        // Pagination
}
```

## Database Schema

### Core Tables

#### `coach_weekly_schedules`
```sql
CREATE TABLE coach_weekly_schedules (
  coach_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0-6 (Sunday-Saturday)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (coach_id, day_of_week)
);
```

#### `coach_recurring_blocks`
```sql
CREATE TABLE coach_recurring_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL,
  title TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,  -- 0-6
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `coach_date_overrides`
```sql
CREATE TABLE coach_date_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL,
  override_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  override_type TEXT NOT NULL,  -- 'available', 'unavailable'
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(coach_id, override_date, start_time, end_time)
);
```

#### `coach_earnings`
```sql
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
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Database Functions

#### `get_student_coaching_summary(coach_name TEXT)`
```sql
-- Returns comprehensive student data including:
-- - Student roster with last lesson dates
-- - Package information and usage
-- - Activity statistics (last 30 days)
-- - Total lesson counts per student
```

## Authentication & Authorization

### Role-Based Access Control

The coaching system implements comprehensive role-based access control with automatic redirects and navigation restrictions.

#### User Role Types

1. **Coach-Only Users** (`is_coach: true, is_admin: false`)
   - Restricted to coaching portal only (`/coaching`)
   - Automatically redirected from other pages
   - No access to main navigation or admin features

2. **Admin Users** (`is_admin: true`)
   - Full system access including admin coaching portal (`/admin/coaching`)
   - Can view any coach's data
   - Access to system-wide analytics and management

3. **Coach + Admin Users** (`is_coach: true, is_admin: true`)
   - Combined access to both coach and admin features
   - Can switch between personal coaching dashboard and admin view

#### Authentication Functions

```typescript
// Core authentication functions in /src/lib/auth.ts
export async function isUserCoach(email: string): Promise<boolean>
export async function isUserAdmin(email: string): Promise<boolean>

// Usage in API routes
const { data: currentUser } = await supabase
  .schema('backoffice')
  .from('allowed_users')
  .select('id, email, is_admin, is_coach, coach_name, coach_display_name')
  .eq('email', session.user.email)
  .single();

if (!currentUser.is_coach && !currentUser.is_admin) {
  return NextResponse.json({ error: 'Not authorized to view coaching data' }, { status: 403 });
}
```

#### NextAuth Integration

```typescript
// JWT token includes both admin and coach status
async jwt({ token, user }) {
  if (user?.email) {
    const adminStatus = await isUserAdmin(user.email);
    const coachStatus = await isUserCoach(user.email);
    token.isAdmin = adminStatus;
    token.isCoach = coachStatus;
  }
  return token;
}

// Session includes role information
async session({ session, token }) {
  if (session.user) {
    session.user.isAdmin = token.isAdmin;
    session.user.isCoach = token.isCoach;
  }
  return session;
}
```

### Access Control Implementation

#### Middleware-Level Protection

```typescript
// middleware.ts - Production role-based redirects
if (req.nextUrl.pathname.startsWith('/coaching')) {
  // Coaching portal access - allow coaches and admins
  return response;
} else if (req.nextUrl.pathname !== '/coaching' && req.nextUrl.pathname !== '/') {
  // Check if user is coach-only
  const { data: user } = await supabase
    .schema('backoffice')
    .from('allowed_users')
    .select('is_coach, is_admin')
    .eq('email', req.nextauth.token?.email)
    .single();

  // Redirect coach-only users to coaching portal
  if (user?.is_coach && !user?.is_admin) {
    return NextResponse.redirect(new URL('/coaching', req.url));
  }
}
```

#### Client-Side Protection

```typescript
// CoachRedirect component for home page
export function CoachRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // Redirect coach-only users to coaching portal
      if (session.user.isCoach && !session.user.isAdmin) {
        router.replace('/coaching');
      }
    }
  }, [session, status, router]);

  return null;
}
```

#### Navigation System

```typescript
// Navigation components with role-based visibility
const isAdmin = session?.user?.isAdmin || false;
const isCoach = session?.user?.isCoach || false;

// Coaching portal link for coaches
{isCoach && (
  <Link href="/coaching">
    <Button variant={pathname.startsWith('/coaching') ? 'secondary' : 'ghost'}>
      Coaching Portal
    </Button>
  </Link>
)}

// Admin dropdown with coaching portal
{isAdmin && (
  <DropdownMenuItem asChild>
    <Link href="/admin/coaching">Coaching Portal</Link>
  </DropdownMenuItem>
)}
```

### Data Access Rules

1. **Coach-Only Users**:
   - Can only access `/coaching` portal
   - View their own coaching data only
   - Automatically redirected from other pages
   - No main application navigation

2. **Admin Users**:
   - Full access to `/admin/coaching` portal
   - Can view any coach's data via `coach_id` parameter
   - Access to system-wide availability and analytics
   - Complete application access

3. **Coach + Admin Users**:
   - Access to both coach and admin features
   - Can view own data in coach portal
   - Can view any coach's data in admin portal
   - Full navigation and feature access

### Development Authentication Bypass

```typescript
// Development mode bypass in /src/lib/auth.ts
export async function isUserCoach(email: string): Promise<boolean> {
  // Development auth bypass - always grant coach in development
  if (isDevAuthBypassEnabled()) {
    return true;
  }
  // Production logic...
}

// Middleware bypass
const shouldBypass = (
  process.env.NODE_ENV === 'development' &&
  process.env.SKIP_AUTH === 'true'
);
```

### Security Features

1. **Multiple Protection Layers**:
   - Middleware-level redirects
   - Client-side route protection
   - API endpoint authentication
   - Navigation visibility control

2. **Production Safety**:
   - Development bypass only works with explicit environment variables
   - Multiple environment checks prevent accidental production deployment
   - Role verification at database level

3. **Session Integration**:
   - Role information included in JWT tokens
   - Real-time role checking
   - Automatic session updates

## Availability Management

### Availability Resolution Hierarchy

1. **Date Overrides** (highest priority)
   - Specific date modifications
   - Can make unavailable days available or vice versa

2. **Recurring Blocks** (medium priority)
   - Weekly repeating unavailable periods
   - Applied to weekly schedule

3. **Weekly Schedule** (base priority)
   - Default availability pattern
   - Foundation for all availability

### Availability Calculation Logic

```typescript
// Pseudo-code for availability resolution
function calculateAvailability(date: Date, coachId: string) {
  // 1. Get base weekly schedule
  const weeklySchedule = getWeeklySchedule(coachId, date.getDay());
  
  // 2. Apply recurring blocks
  const recurringBlocks = getRecurringBlocks(coachId, date.getDay());
  const scheduleWithBlocks = applyRecurringBlocks(weeklySchedule, recurringBlocks);
  
  // 3. Apply date overrides (highest priority)
  const dateOverrides = getDateOverrides(coachId, date);
  const finalAvailability = applyDateOverrides(scheduleWithBlocks, dateOverrides);
  
  return finalAvailability;
}
```

### Calendar Integration

The availability system integrates with the booking calendar to show:
- Available time slots (green)
- Booked time slots (red)
- Unavailable periods (gray)
- Pending bookings (yellow)

## Student & Earnings Tracking

### Student Management Features

1. **Student Roster**: Complete list of students per coach
2. **Package Tracking**: Active and expired packages with usage
3. **Activity Monitoring**: Last lesson dates and frequency
4. **Inactive Detection**: Students with unused packages (30+ days)

### Earnings Analytics

1. **Revenue Calculation**: Integration with POS transaction data
2. **Rate Type Analysis**: Breakdown by different coaching rates
3. **Session Statistics**: Average rates and session counts
4. **Historical Tracking**: Monthly and yearly earnings trends

### Package Integration

```typescript
// Package data structure
interface StudentPackage {
  package_name: string;
  total_sessions: number;
  used_sessions: number;
  remaining_sessions: number;
  purchase_date: string;
  expiration_date: string;
  status: 'Active' | 'Past';
}
```

## Admin Functions

### System-wide Monitoring

1. **Coach Coverage**: Track coaches with missing schedules
2. **Package Utilization**: Monitor total remaining package hours
3. **Availability Overview**: System-wide slot availability
4. **Student Activity**: Cross-coach inactive student detection

### Booking Assistant Features

1. **Next Available**: Real-time slot finder across all coaches
2. **Weekly Grid**: Visual schedule overview for all coaches
3. **Search & Filter**: Find specific coaches or time slots
4. **Direct Booking**: Integration with booking creation system

### KPI Dashboard

```typescript
interface AdminKPIs {
  packageHoursRemaining: number;    // Total unused package hours
  totalAvailableSlots: number;      // Available slots (next 21 days)
  coachesWithoutSchedule: number;   // Coaches missing availability setup
}
```

## Development Notes

### Testing Strategy

1. **Authentication Bypass**: `SKIP_AUTH=true` for development
2. **Mock Data**: Sample coach and student data for testing
3. **API Testing**: Use development tokens for endpoint testing

### Performance Considerations

1. **Database Indexing**: Optimized queries for date ranges and coach filtering
2. **Caching**: SWR implementation for frontend data caching
3. **Pagination**: Large datasets (earnings, bookings) use pagination
4. **Lazy Loading**: Modal content loaded on demand

### Error Handling

1. **API Errors**: Comprehensive error responses with status codes
2. **Frontend Errors**: Error boundaries and user-friendly messages
3. **Validation**: Input validation on both frontend and backend
4. **Logging**: Detailed logging for debugging and monitoring

---

**Last Updated**: January 2025  
**Version**: 1.1  
**Maintainer**: Development Team

**Related Documentation**:
- [API Reference](../api/API_REFERENCE.md)
- [Database Schema](../technical/DATABASE_SCHEMA.md)
- [Authentication System](../technical/AUTHENTICATION_SYSTEM.md)
- [Frontend Overview](../frontend/FRONTEND_OVERVIEW.md)