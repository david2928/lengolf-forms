# Lengolf Forms Backend Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Database Architecture](#database-architecture)
4. [API Endpoints](#api-endpoints)
5. [Authentication & Authorization](#authentication--authorization)
6. [External Integrations](#external-integrations)
7. [Data Flow & Business Logic](#data-flow--business-logic)
8. [Caching Strategy](#caching-strategy)
9. [Error Handling](#error-handling)
10. [Security Considerations](#security-considerations)
11. [Performance Optimizations](#performance-optimizations)
12. [Monitoring & Logging](#monitoring--logging)

## Architecture Overview

The Lengolf Forms backend is built on a modern serverless architecture using Next.js API routes, providing a full-stack solution for golf academy management. The system follows a microservices-like pattern with dedicated API endpoints for different business domains.

### Core Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │  Supabase DB    │    │ External APIs   │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ API Routes  │◄┼────┼►│ PostgreSQL  │ │    │ │Google Cal.  │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Middleware  │ │    │ │ RLS Policies│ │    │ │ LINE API    │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ Auth Layer  │ │    │ │ Functions   │ │    │ │ Cloud Run   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Technology Stack

### Core Backend Technologies
- **Runtime**: Node.js (via Next.js)
- **Framework**: Next.js 14.2.20 (App Router)
- **Language**: TypeScript 5.3.3
- **Database**: PostgreSQL (via Supabase)
- **ORM/Client**: Supabase JavaScript Client 2.47.6
- **Authentication**: NextAuth.js 4.24.7
- **Caching**: NodeCache 5.1.2

### External Service Integrations
- **Calendar**: Google Calendar API (googleapis 144.0.0)
- **Messaging**: LINE Messaging API
- **Authentication**: Google OAuth 2.0
- **Cloud Services**: Google Cloud Run
- **Deployment**: Vercel

### Development Tools
- **Date Handling**: date-fns 3.6.0, date-fns-tz 3.2.0
- **HTTP Client**: node-fetch 2.6.7
- **CSV Processing**: csv-parser 3.2.0
- **Environment**: dotenv 16.4.7

## Database Architecture

### Primary Database (Supabase)
The application uses two Supabase instances:
1. **Primary Instance**: Legacy system (via `supabase.ts`)
2. **Refactored Instance**: Current active system (via `refac-supabase.ts`)

### Schema Structure

#### Core Tables
```sql
-- Bookings table
bookings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TEXT NOT NULL,
  duration INTEGER NOT NULL,
  number_of_people INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  bay TEXT,
  customer_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by_type TEXT,
  updated_by_identifier TEXT,
  cancelled_by_type TEXT,
  cancelled_by_identifier TEXT,
  cancellation_reason TEXT,
  google_calendar_sync_status TEXT,
  calendar_event_id TEXT,
  calendar_events JSONB,
  booking_type TEXT,
  package_name TEXT,
  stable_hash_id TEXT
)

-- Customers table (public schema)
public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code VARCHAR,
  customer_name VARCHAR NOT NULL,
  contact_number VARCHAR,
  email VARCHAR,
  address TEXT,
  date_of_birth DATE,
  notes TEXT,
  total_lifetime_value NUMERIC,
  total_visits INTEGER,
  stable_hash_id VARCHAR
)

-- Package types table (backoffice schema)
backoffice.package_types (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  duration_hours INTEGER,
  price DECIMAL,
  description TEXT
)

-- Allowed users table (backoffice schema)
backoffice.allowed_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL
)
```

#### Database Functions
The system uses PostgreSQL functions for complex queries:
- `get_package_monitor_data()`: Returns package monitoring statistics
- `get_available_packages()`: Returns available customer packages

### Connection Management
```typescript
// Service role client for admin operations
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

// Regular client for user operations
export const refacSupabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
```

## API Endpoints

### Booking Management

#### `POST /api/bookings/create`
Creates a new booking with comprehensive validation.

**Request Body:**
```typescript
interface BookingRequest {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone_number: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  duration: number; // hours
  number_of_people: number;
  status: 'confirmed' | 'cancelled';
  bay?: string;
  customer_notes?: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  bookingId?: string;
  error?: string;
}
```

**Business Logic:**
1. Validates all required fields
2. Inserts booking into database
3. Returns booking ID for further processing

#### `GET /api/bookings/list-by-date?date=YYYY-MM-DD`
Retrieves all bookings for a specific date.

**Query Parameters:**
- `date`: Date in YYYY-MM-DD format (required)

**Response:**
```typescript
{
  bookings: Booking[];
}
```

**Business Logic:**
1. Validates date format
2. Queries bookings table with date filter
3. Orders results by start_time
4. Maps database fields to frontend interface

#### `GET /api/bookings/availability`
Checks bay availability for booking slots.

#### `POST /api/bookings/calendar/events`
Fetches calendar events for specific bay and date.

#### `PUT /api/bookings/update-calendar-id`
Updates calendar synchronization status.

### Customer Management

#### `GET /api/customers`
Retrieves customer list with caching.

**Query Parameters:**
- `forceRefresh`: Boolean to bypass cache (optional)

**Response:**
```typescript
interface Customer {
  id: string;
  customer_name: string;
  contact_number: string;
  stable_hash_id: string;
}[]
```

**Caching Strategy:**
- 24-hour TTL cache using NodeCache
- Force refresh capability
- Automatic cache warming

#### `POST /api/customers`
Refreshes customer cache manually.

#### `GET /api/customers/with-packages`
Retrieves customers with their associated packages.

### Package Management

#### `GET /api/packages/monitor`
Returns package monitoring dashboard data.

**Response:**
```typescript
interface PackageMonitorData {
  unlimited_active: number;
  unlimited_packages: Package[];
  expiring_count: number;
  expiring_packages: Package[];
  diamond_active: number;
  diamond_packages: Package[];
}
```

**Business Logic:**
- Calls PostgreSQL function `get_package_monitor_data()`
- Returns structured data for dashboard display

#### `GET /api/packages/available`
Returns available packages for booking assignment.

**Response:**
```typescript
interface AvailablePackage {
  id: string;
  label: string;
  details: {
    customerName: string;
    packageTypeName: string;
    firstUseDate: string | null;
    expirationDate: string;
    remainingHours: number;
    isActivated: boolean;
  };
}[]
```

**Business Logic:**
1. Calls `get_available_packages()` function
2. Formats packages with display labels
3. Handles inactive packages with status prefix

#### `POST /api/packages/activate`
Activates a customer package.

#### `GET /api/packages/by-customer/[customerId]`
Retrieves packages for specific customer.

#### `GET /api/packages/usage`
Records package usage.

### CRM Integration

#### `GET /api/crm/update-customers`
Triggers customer data synchronization via Google Cloud Run.

**Authentication:** Google Service Account

**Response:**
```typescript
{
  success: boolean;
  batch_id: string;
  records_processed: number;
  status: string;
  timestamp: string;
}
```

**Business Logic:**
1. Authenticates with Google Cloud using service account
2. Makes authenticated request to Cloud Run service
3. Returns synchronization results

#### `POST /api/crm/upload-csv`
Handles CSV file uploads for customer data.

### Notification System

#### `POST /api/notify`
Sends notifications via LINE Messaging API.

**Request Body:**
```typescript
{
  message: string;
  bookingType?: string;
  customer_notes?: string;
}
```

**Business Logic:**
1. Determines target LINE groups based on booking type
2. Formats message with customer notes
3. Sends to multiple groups simultaneously
4. Handles group-specific routing:
   - Default group: All notifications
   - Ratchavin group: Ratchavin coaching bookings
   - Coaching group: General coaching bookings

### Authentication

#### `GET|POST /api/auth/[...nextauth]`
NextAuth.js authentication handler.

**Supported Providers:**
- Google OAuth 2.0

**Session Configuration:**
- JWT strategy
- 30-day session duration
- Custom authorization callback

### Utility Endpoints

#### `GET /api/debug`
Development debugging endpoints.

#### `GET /api/test-db`
Database connection testing.

#### `POST /api/refresh-customers`
Manual customer data refresh trigger.

## Authentication & Authorization

### Authentication Flow
The system uses NextAuth.js with Google OAuth for secure authentication:

1. User initiates sign-in
2. Redirected to Google OAuth
3. Google returns authorization code
4. NextAuth exchanges code for tokens
5. User profile retrieved from Google
6. Email checked against allowed_users table
7. JWT session created if authorized

### Authorization Strategy
1. **Email Whitelist**: Users must be in `backoffice.allowed_users` table
2. **JWT Sessions**: Stateless session management
3. **Middleware Protection**: Route-level access control

### Implementation Details
```typescript
// Auth configuration
export const authOptions: NextAuthOptions = {
  providers: [GoogleProvider({...})],
  callbacks: {
    async signIn({ user }) {
      return await isUserAllowed(user.email)
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
}

// Authorization check
export async function isUserAllowed(email: string): Promise<boolean> {
  const { data } = await refacSupabaseAdmin
    .schema('backoffice')
    .from('allowed_users')
    .select('email')
    .eq('email', email.toLowerCase())
    .single();
  
  return !!data;
}
```

### Protected Routes
Middleware protects all routes except:
- `/api/*` (API routes)
- `/auth/*` (Authentication pages)
- `/_next/*` (Next.js internals)
- `/public/*` (Static assets)

## External Integrations

### Google Calendar Integration

#### Service Account Authentication
```typescript
const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    project_id: process.env.GOOGLE_PROJECT_ID
  }
});
```

#### Calendar Management
- **Bay Calendars**: Separate calendars for each golf bay
- **Coaching Calendars**: Dedicated calendars for coaching sessions
- **Event Synchronization**: Automatic booking-to-event creation
- **Color Coding**: Bay-specific event colors

#### Key Functions
```typescript
// Create calendar events
async function createCalendarEvents(
  calendar: calendar_v3.Calendar,
  inputData: CalendarFormatInput
): Promise<CalendarEventResult[]>

// Check availability
async function getBayAvailability(
  calendar: calendar_v3.Calendar,
  bayNumber: string,
  date: string
): Promise<{ start: string; end: string }[]>

// Event management
async function updateCalendarEvent(...)
async function deleteCalendarEvent(...)
```

### LINE Messaging API Integration

#### Client Implementation
```typescript
export class LineMessagingClient {
  private channelAccessToken: string;
  
  async pushTextMessage(groupId: string, text: string)
  async pushFlexMessage(groupId: string, altText: string, contents: any)
}
```

#### Multi-Group Notification Strategy
1. **Default Group**: Receives all booking notifications
2. **Coaching Group**: Receives general coaching notifications
3. **Ratchavin Group**: Receives Ratchavin-specific coaching notifications

### Google Cloud Run Integration

#### CRM Data Synchronization
- **Service URL**: `https://lengolf-crm-1071951248692.asia-southeast1.run.app/`
- **Authentication**: Google ID Token
- **Purpose**: Customer data synchronization from external CRM
- **Trigger**: Manual via dashboard or scheduled

## Data Flow & Business Logic

### Booking Creation Flow
1. User submits booking form
2. Frontend validates input data
3. API validates required fields
4. Booking inserted into database
5. Calendar events created (if applicable)
6. LINE notifications sent
7. Success response returned

### Package Monitoring Flow
1. Dashboard requests package data
2. API calls `get_package_monitor_data()` function
3. Database returns aggregated package statistics
4. Data formatted for frontend display
5. Response includes unlimited, expiring, and diamond packages

### Customer Data Sync Flow
1. Sync triggered (manual or scheduled)
2. Google Cloud authentication
3. Cloud Run service called
4. CRM data processed and updated
5. Customer cache cleared
6. Sync results returned

## Caching Strategy

### Implementation
```typescript
import NodeCache from 'node-cache';

// 24-hour TTL cache
const cache = new NodeCache({ stdTTL: 86400 });

// Usage pattern
let customers = cache.get(CACHE_KEY);
if (!customers || forceRefresh) {
  customers = await fetchCustomers();
  cache.set(CACHE_KEY, customers);
}
```

### Cache Keys
- `customers_list`: Customer data cache
- Additional caches can be implemented for packages, bookings

### Cache Management
- **TTL**: 24 hours default
- **Manual Refresh**: Force refresh capability
- **Cache Warming**: Automatic refresh on POST requests

## Error Handling

### API Error Response Pattern
```typescript
// Success response
{
  success: true,
  data: any,
  [additionalFields]: any
}

// Error response
{
  success: false,
  error: string,
  details?: string
}
```

### Error Categories
1. **Validation Errors**: 400 status with detailed field information
2. **Authentication Errors**: 401 status with auth failure details
3. **Authorization Errors**: 403 status for access denied
4. **Database Errors**: 500 status with sanitized error messages
5. **External Service Errors**: 500 status with service-specific handling

### Logging Strategy
```typescript
// Structured logging
console.error('Booking creation API error:', {
  error: error.message,
  bookingData: sanitizedData,
  timestamp: new Date().toISOString()
});

// Success logging
console.log('Successfully inserted booking with ID:', insertedData.id);
```

## Security Considerations

### Data Protection
1. **Environment Variables**: Sensitive credentials stored securely
2. **Service Role Keys**: Separate from anonymous keys
3. **Input Validation**: Comprehensive validation on all endpoints
4. **SQL Injection Prevention**: Parameterized queries via Supabase client

### Authentication Security
1. **JWT Tokens**: Secure session management
2. **Email Whitelist**: Database-driven authorization
3. **OAuth 2.0**: Google authentication integration
4. **Session Expiry**: 30-day maximum session duration

### API Security
1. **CORS Configuration**: Proper origin restrictions
2. **Rate Limiting**: Implemented at Vercel level
3. **Input Sanitization**: All user inputs validated
4. **Error Message Sanitization**: No sensitive data in error responses

### Database Security
1. **Row Level Security (RLS)**: Comprehensive RLS policies on all backoffice tables
2. **Service Role Separation**: Admin vs. user access patterns
3. **Connection Encryption**: TLS for all database connections
4. **Function Security**: Fixed search_path configuration to prevent injection attacks
5. **Schema Isolation**: Backoffice schema separate from public data

⚠️ **Security Alert**: Critical security vulnerabilities were identified and addressed. See `SECURITY_REMEDIATION.md` for complete details on RLS configuration, function search path fixes, and implementation steps. Execute `security-fixes.sql` for immediate critical fixes.

## Performance Optimizations

### Database Optimizations
1. **Indexed Queries**: Proper indexing on frequently queried columns
2. **Connection Pooling**: Supabase handles connection management
3. **Query Optimization**: Efficient SQL via database functions
4. **Selective Field Retrieval**: Only fetch required columns

### Caching Optimizations
1. **Customer Data Caching**: 24-hour cache for customer lists
2. **Cache Warming**: Proactive cache refresh
3. **Conditional Requests**: Cache bypass when needed

### API Optimizations
1. **Parallel Processing**: Multiple calendar events created simultaneously
2. **Async Operations**: Non-blocking external service calls
3. **Response Compression**: Handled by Vercel
4. **Static Asset Optimization**: CDN delivery via Vercel

### Frontend-Backend Optimizations
1. **SWR Integration**: Client-side caching and revalidation
2. **Optimistic Updates**: Immediate UI feedback
3. **Lazy Loading**: Dynamic imports for heavy components

## Monitoring & Logging

### Application Logging
```typescript
// Structured logging patterns
console.log('Processing LINE notification for:', { 
  message, 
  bookingType, 
  customer_notes 
});

console.error('LINE Messaging API Error:', {
  error: error.message,
  groupId: groupId.substring(0, 8) + '...',
  timestamp: new Date().toISOString()
});
```

### Performance Monitoring
1. **Vercel Analytics**: Built-in performance monitoring
2. **Database Monitoring**: Supabase dashboard metrics
3. **External Service Monitoring**: Google Cloud Console for Cloud Run

### Error Tracking
1. **Console Logging**: Structured error logging
2. **Client-Side Errors**: Next.js error boundaries
3. **API Error Responses**: Consistent error format

### Health Checks
```typescript
// Database connection test
export async function checkRefacConnection() {
  try {
    const { error } = await refacSupabaseAdmin
      .schema('backoffice')
      .from('package_types')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    console.log('✅ Successfully connected to refac Supabase backoffice schema.');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to refac Supabase:', error);
    return false;
  }
}
```

### Monitoring Endpoints
- Database connection health checks
- External service availability checks
- Cache performance metrics

## Deployment & Infrastructure

### Vercel Deployment
- **Platform**: Vercel serverless functions
- **Runtime**: Node.js 18.x
- **Build Process**: Next.js build optimization
- **Environment Variables**: Secure variable management

### Database Hosting
- **Provider**: Supabase (managed PostgreSQL)
- **Backup Strategy**: Automated Supabase backups
- **Scaling**: Automatic connection pooling

### External Service Dependencies
- **Google APIs**: Calendar, OAuth, Cloud Run
- **LINE Platform**: Messaging API
- **Supabase**: Database and authentication

This comprehensive backend documentation provides a complete overview of the Lengolf Forms system architecture, implementation details, and operational considerations. The system is designed for scalability, maintainability, and robust error handling while integrating multiple external services seamlessly. 