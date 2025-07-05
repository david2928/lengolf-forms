# Coaching API Reference

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Base URLs & Routes](#base-urls--routes)
4. [Dashboard Endpoints](#dashboard-endpoints)
5. [Availability Management](#availability-management)
6. [Earnings & Analytics](#earnings--analytics)
7. [Student Management](#student-management)
8. [Booking Integration](#booking-integration)
9. [Error Handling](#error-handling)
10. [Rate Limiting](#rate-limiting)

## Overview

The Coaching API provides comprehensive endpoints for managing golf coaching operations, including schedule management, student tracking, earnings analysis, and administrative functions. All endpoints are built with Next.js API routes and integrate with Supabase PostgreSQL.

### API Versioning
- **Current Version**: v1
- **Base Path**: `/api/coaching/`
- **Content Type**: `application/json`
- **Response Format**: JSON

## Authentication

All coaching endpoints require authentication via session tokens or development bypass.

### Authentication Methods

#### 1. Session-based Authentication (Production)
```typescript
// Headers
Authorization: Bearer <session-token>
// OR
Cookie: next-auth.session-token=<token>
```

#### 2. Development Authentication Bypass
```typescript
// Environment variable
SKIP_AUTH=true
NODE_ENV=development

// API automatically bypasses auth checks
```

### User Roles
- **Coach**: Access to own data only
- **Admin**: Access to all coaches' data via `coach_id` parameter

## Base URLs & Routes

### Production
```
https://lengolf-forms.vercel.app/api/coaching/
```

### Development
```
http://localhost:3000/api/coaching/
```

### Route Structure
```
/api/coaching/
├── dashboard/                 # Dashboard data
├── availability/             # Availability management
│   ├── weekly-schedule/      # Weekly patterns
│   ├── recurring-blocks/     # Recurring unavailable periods
│   └── date-overrides/       # Date-specific overrides
├── bookings/                 # Booking data
├── earnings/                 # Earnings tracking
├── students/                 # Student management
└── coaches/                  # Coach-specific endpoints
    └── me/
        └── availability/     # Personal availability management
```

## Dashboard Endpoints

### Get Dashboard Data

**Endpoint**: `GET /api/coaching/dashboard`

**Description**: Retrieve comprehensive dashboard data for coaches or administrators

#### Request Parameters

**Query Parameters**:
```typescript
interface DashboardQuery {
  year?: number;          // Filter year (default: current year)
  month?: number;         // Filter month (default: current month)
  coach_id?: string;      // Admin-only: Target coach ID
}
```

#### Example Requests

```bash
# Coach viewing own dashboard
GET /api/coaching/dashboard?year=2025&month=1

# Admin viewing specific coach
GET /api/coaching/dashboard?coach_id=coach_123&year=2025&month=1
```

#### Response Structure

```typescript
interface DashboardResponse {
  isAdminView: boolean;
  requiresCoachSelection?: boolean;
  coach: {
    id: string;
    name: string;
    display_name: string;
    email: string;
    experience_years: number;
    specialties: string[];
  };
  earnings: {
    current_month_earnings: string;
    previous_month_earnings: string;
    total_earnings: string;
    current_month_sessions: number;
    total_sessions: number;
    average_session_rate: string;
  };
  monthly_earnings: {
    total_earnings: string;
    session_count: number;
    average_rate: string;
    paid_sessions: number;
    pending_sessions: number;
  };
  recent_sessions: Session[];
  upcoming_sessions: Session[];
  recent_bookings: Booking[];
  availableCoaches?: Coach[];  // Admin only
  selectedCoachId?: string;    // Admin only
}
```

#### Example Response

```json
{
  "isAdminView": false,
  "coach": {
    "id": "coach_123",
    "name": "John Smith",
    "display_name": "Coach John",
    "email": "john@lengolf.com",
    "experience_years": 5,
    "specialties": ["Putting", "Short Game"]
  },
  "earnings": {
    "current_month_earnings": "15000.00",
    "total_earnings": "125000.00",
    "current_month_sessions": 45,
    "total_sessions": 380,
    "average_session_rate": "333.33"
  },
  "recent_sessions": [
    {
      "id": "session_456",
      "customer_name": "Jane Doe",
      "session_date": "2025-01-15",
      "start_time": "14:00",
      "end_time": "15:00",
      "lesson_type": "Individual",
      "session_rate": "500.00",
      "payment_status": "paid"
    }
  ]
}
```

## Availability Management

### Weekly Schedule Management

#### Get Weekly Schedule
**Endpoint**: `GET /api/coaching/availability/weekly-schedule`

**Query Parameters**:
```typescript
{
  coach_id?: string;  // Admin-only: Target coach ID
}
```

**Response**:
```json
{
  "weeklySchedule": [
    {
      "coach_id": "coach_123",
      "day_of_week": 1,
      "start_time": "09:00",
      "end_time": "17:00",
      "is_available": true
    }
  ]
}
```

#### Create/Update Weekly Schedule
**Endpoint**: `POST /api/coaching/availability/weekly-schedule`

**Request Body**:
```json
{
  "coachId": "coach_123",
  "dayOfWeek": 1,
  "startTime": "09:00",
  "endTime": "17:00",
  "isAvailable": true
}
```

#### Delete Weekly Schedule Day
**Endpoint**: `DELETE /api/coaching/availability/weekly-schedule`

**Query Parameters**:
```typescript
{
  coach_id?: string;    // Admin-only
  day_of_week: number;  // 0-6 (Sunday-Saturday)
}
```

### Recurring Blocks Management

#### Get Recurring Blocks
**Endpoint**: `GET /api/coaching/availability/recurring-blocks`

**Query Parameters**:
```typescript
{
  coach_id?: string;  // Admin-only: Target coach ID
}
```

**Response**:
```json
{
  "recurringBlocks": [
    {
      "id": "block_789",
      "coach_id": "coach_123",
      "title": "Lunch Break",
      "day_of_week": 1,
      "start_time": "12:00",
      "end_time": "13:00",
      "is_active": true
    }
  ]
}
```

#### Create Recurring Block
**Endpoint**: `POST /api/coaching/availability/recurring-blocks`

**Request Body**:
```json
{
  "coachId": "coach_123",
  "title": "Staff Meeting",
  "dayOfWeek": 1,
  "startTime": "08:00",
  "endTime": "09:00",
  "isActive": true
}
```

#### Update Recurring Block
**Endpoint**: `PUT /api/coaching/availability/recurring-blocks`

**Request Body**:
```json
{
  "id": "block_789",
  "title": "Updated Meeting",
  "startTime": "08:30",
  "endTime": "09:30"
}
```

#### Delete Recurring Block
**Endpoint**: `DELETE /api/coaching/availability/recurring-blocks`

**Query Parameters**:
```typescript
{
  id: string;            // Block ID to delete
  coach_id?: string;     // Admin-only: Target coach ID
}
```

### Date Overrides Management

#### Get Date Overrides
**Endpoint**: `GET /api/coaching/availability/date-overrides`

**Query Parameters**:
```typescript
{
  coach_id?: string;     // Admin-only: Target coach ID
  start_date?: string;   // Filter start date (YYYY-MM-DD)
  end_date?: string;     // Filter end date (YYYY-MM-DD)
}
```

**Response**:
```json
{
  "dateOverrides": [
    {
      "id": "override_101",
      "coach_id": "coach_123",
      "override_date": "2025-01-20",
      "start_time": "10:00",
      "end_time": "16:00",
      "override_type": "available"
    }
  ]
}
```

#### Create Date Override
**Endpoint**: `POST /api/coaching/availability/date-overrides`

**Request Body**:
```json
{
  "coachId": "coach_123",
  "overrideDate": "2025-01-25",
  "startTime": "09:00",
  "endTime": "12:00",
  "overrideType": "unavailable"
}
```

#### Update Date Override
**Endpoint**: `PUT /api/coaching/availability/date-overrides`

**Request Body**:
```json
{
  "id": "override_101",
  "startTime": "10:00",
  "endTime": "15:00"
}
```

#### Delete Date Override
**Endpoint**: `DELETE /api/coaching/availability/date-overrides`

**Query Parameters**:
```typescript
{
  id: string;            // Override ID to delete
  coach_id?: string;     // Admin-only: Target coach ID
}
```

## Earnings & Analytics

### Get Earnings Data

**Endpoint**: `GET /api/coaching/earnings`

**Description**: Retrieve detailed earnings data with analytics and filtering

#### Query Parameters

```typescript
interface EarningsQuery {
  coach_id?: string;      // Admin-only: Target coach ID
  start_date?: string;    // Filter start date (YYYY-MM-DD)
  end_date?: string;      // Filter end date (YYYY-MM-DD)
  period?: string;        // Predefined period: 'today', 'week', 'month', 'year'
  rate_type?: string;     // Rate type filter (default: 'all')
  limit?: number;         // Pagination limit (default: 50, max: 200)
  offset?: number;        // Pagination offset (default: 0)
}
```

#### Example Requests

```bash
# Get current month earnings
GET /api/coaching/earnings?period=month

# Get earnings by rate type with pagination
GET /api/coaching/earnings?rate_type=individual&limit=25&offset=0

# Admin viewing specific coach earnings
GET /api/coaching/earnings?coach_id=coach_123&start_date=2025-01-01&end_date=2025-01-31
```

#### Response Structure

```typescript
interface EarningsResponse {
  earnings: Earning[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: {
    total_revenue: number;
    avg_per_lesson: number;
    total_lessons: number;
    rate_type_breakdown: Record<string, { count: number; revenue: number }>;
  };
  available_rate_types: RateType[];
  period_info: {
    start_date?: string;
    end_date?: string;
    period?: string;
  };
}

interface Earning {
  receipt_number: string;
  date: string;
  customer_name: string;
  customer_phone_number?: string;
  stable_hash_id?: string;
  coach: string;
  rate_type: string;
  hour_cnt: number;
  rate: string;
  coach_earnings: string;
}
```

#### Example Response

```json
{
  "earnings": [
    {
      "receipt_number": "REC001",
      "date": "2025-01-15",
      "customer_name": "John Doe",
      "coach": "Coach Smith",
      "rate_type": "Individual",
      "hour_cnt": 1.0,
      "rate": "500.00",
      "coach_earnings": "400.00"
    }
  ],
  "summary": {
    "total_revenue": 15000.00,
    "avg_per_lesson": 375.00,
    "total_lessons": 40,
    "rate_type_breakdown": {
      "Individual": { "count": 25, "revenue": 10000.00 },
      "Group": { "count": 15, "revenue": 5000.00 }
    }
  },
  "total": 40,
  "hasMore": false
}
```

## Student Management

### Get Student Data

**Endpoint**: `GET /api/coaching/students`

**Description**: Retrieve complete student roster with package information and activity metrics

#### Query Parameters

```typescript
{
  coach_id?: string;  // Admin-only: Target coach ID
}
```

#### Response Structure

```typescript
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

interface Student {
  student_name: string;
  last_lesson_date: string;
  total_lessons: number;
  packages: StudentPackage[] | null;
}

interface StudentPackage {
  package_name: string;
  total_sessions: number;
  purchase_date: string;
  expiration_date: string;
  status: 'Active' | 'Past';
  used_sessions: number;
  remaining_sessions: number;
}
```

#### Example Response

```json
{
  "students": [
    {
      "student_name": "Alice Johnson",
      "last_lesson_date": "2025-01-10",
      "total_lessons": 12,
      "packages": [
        {
          "package_name": "10-Session Individual",
          "total_sessions": 10,
          "used_sessions": 3,
          "remaining_sessions": 7,
          "purchase_date": "2024-12-01",
          "expiration_date": "2025-06-01",
          "status": "Active"
        }
      ]
    }
  ],
  "summary": {
    "total_students": 25,
    "active_students_l30d": 18,
    "inactive_students": 7,
    "total_lessons": 245,
    "coach_name": "Coach Smith"
  }
}
```

## Booking Integration

### Get Coaching Bookings

**Endpoint**: `GET /api/coaching/bookings`

**Description**: Retrieve coaching-related bookings with filtering and pagination

#### Query Parameters

```typescript
interface BookingsQuery {
  coach_id?: string;      // Admin-only: Target coach ID
  start_date?: string;    // Filter start date (YYYY-MM-DD)
  end_date?: string;      // Filter end date (YYYY-MM-DD)
  status?: string;        // Booking status filter (default: 'all')
  period?: string;        // Predefined period: 'today', 'week', 'month', 'year'
  limit?: number;         // Pagination limit (default: 50, max: 200)
  offset?: number;        // Pagination offset (default: 0)
}
```

#### Response Structure

```typescript
interface BookingsResponse {
  bookings: Booking[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  summary: {
    total_bookings: number;
    upcoming_bookings: number;
    completed_bookings: number;
  };
}

interface Booking {
  id: string;
  customer_name: string;
  contact_number: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  number_of_pax: number;
  bay_number: string;
  package_name?: string;
  notes?: string;
  status?: string;
}
```

## Error Handling

### Error Response Format

All API endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  error: string;           // Error message
  code?: string;          // Error code
  details?: any;          // Additional error details
  timestamp: string;      // ISO timestamp
}
```

### Common Error Codes

#### Authentication Errors
```json
// 401 Unauthorized
{
  "error": "Unauthorized",
  "code": "AUTH_REQUIRED",
  "timestamp": "2025-01-15T10:30:00Z"
}

// 403 Forbidden
{
  "error": "Coach access required",
  "code": "INSUFFICIENT_PERMISSIONS",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Validation Errors
```json
// 400 Bad Request
{
  "error": "Invalid date format",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "start_date",
    "expected": "YYYY-MM-DD",
    "received": "2025/01/15"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Resource Errors
```json
// 404 Not Found
{
  "error": "Coach not found",
  "code": "RESOURCE_NOT_FOUND",
  "details": {
    "coach_id": "invalid_coach_123"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

#### Server Errors
```json
// 500 Internal Server Error
{
  "error": "Database connection failed",
  "code": "INTERNAL_ERROR",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### HTTP Status Codes

| Status | Description | Use Case |
|--------|-------------|----------|
| 200 | OK | Successful GET requests |
| 201 | Created | Successful POST requests |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Duplicate resource creation |
| 422 | Unprocessable Entity | Validation errors |
| 500 | Internal Server Error | Server-side errors |

## Rate Limiting

### Current Limits
- **Development**: No rate limiting
- **Production**: 100 requests per minute per IP

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1642665600
```

### Rate Limit Exceeded Response
```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "reset_time": "2025-01-15T10:35:00Z"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Maintainer**: Development Team

**Related Documentation**:
- [Coaching System Overview](../features/COACHING_SYSTEM.md)
- [Database Schema](../technical/DATABASE_SCHEMA.md)
- [Authentication System](../technical/AUTHENTICATION_SYSTEM.md)