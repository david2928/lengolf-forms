# API Reference Documentation

## Overview

The Lengolf Forms API provides RESTful endpoints for managing golf facility operations including bookings, customer management, inventory tracking, and special events. All APIs use JSON for request/response data and include comprehensive error handling and authentication.

## Base Configuration

### Base URL
```
Production: https://lengolf-forms.vercel.app/api
Development: http://localhost:3000/api
```

### Authentication
Most endpoints require authentication via NextAuth.js session cookies. Admin endpoints require additional role verification.

### Content Type
All requests should include:
```
Content-Type: application/json
Accept: application/json
```

## Booking Management APIs

### Create Booking

#### Endpoint
```
POST /api/bookings/create
```

#### Description
Creates a new booking with Google Calendar integration and LINE notifications.

#### Request Body
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone_number": "+66123456789",
  "date": "2024-07-15",
  "start_time": "14:00",
  "duration": 1.5,
  "number_of_people": 4,
  "customer_notes": "Birthday celebration",
  "booking_type": "package",
  "package_name": "Monthly Package"
}
```

#### Response
```json
{
  "success": true,
  "booking": {
    "id": "booking_123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+66123456789",
    "date": "2024-07-15",
    "start_time": "14:00",
    "duration": 1.5,
    "number_of_people": 4,
    "status": "confirmed",
    "bay": "Bay 1",
    "calendar_events": [
      {
        "calendarId": "bay1@lengolf.com",
        "eventId": "event_456"
      }
    ],
    "created_at": "2024-07-15T10:00:00Z"
  }
}
```

#### Error Responses
```json
// Validation Error
{
  "error": "Validation failed",
  "details": [
    "Email is required",
    "Invalid phone number format"
  ],
  "status": 400
}

// Availability Error
{
  "error": "Time slot not available",
  "message": "The requested time slot is already booked",
  "status": 409
}
```

### Cancel Booking

#### Endpoint
```
POST /api/bookings/{bookingId}/cancel
```

#### Description
Cancels an existing booking, removes Google Calendar events, and sends notifications.

#### Request Body
```json
{
  "employee_name": "Staff Member",
  "cancellation_reason": "Customer requested cancellation"
}
```

#### Response
```json
{
  "message": "Booking booking_123 cancelled successfully",
  "booking": {
    "id": "booking_123",
    "status": "cancelled",
    "cancelled_by_type": "staff",
    "cancelled_by_identifier": "Staff Member",
    "cancellation_reason": "Customer requested cancellation",
    "google_calendar_sync_status": "cancelled_events_deleted"
  }
}
```

#### Error Responses
```json
// Already Cancelled
{
  "message": "Booking booking_123 is already cancelled",
  "booking": { /* existing booking data */ },
  "status": 200
}

// Not Found
{
  "error": "Booking with ID booking_123 not found",
  "status": 404
}
```

### Get Booking Details

#### Endpoint
```
GET /api/bookings/{bookingId}
```

#### Description
Retrieves detailed information about a specific booking.

#### Response
```json
{
  "booking": {
    "id": "booking_123",
    "user_id": "user_456",
    "name": "John Doe",
    "email": "john@example.com",
    "phone_number": "+66123456789",
    "date": "2024-07-15",
    "start_time": "14:00",
    "duration": 1.5,
    "number_of_people": 4,
    "status": "confirmed",
    "bay": "Bay 1",
    "customer_notes": "Birthday celebration",
    "calendar_events": [...],
    "booking_type": "package",
    "package_name": "Monthly Package",
    "created_at": "2024-07-15T10:00:00Z",
    "updated_at": "2024-07-15T10:00:00Z"
  }
}
```

### List Bookings

#### Endpoint
```
GET /api/bookings?date=2024-07-15&status=confirmed&limit=50&offset=0
```

#### Description
Retrieves a paginated list of bookings with optional filtering.

#### Query Parameters
- `date`: Filter by specific date (YYYY-MM-DD)
- `status`: Filter by booking status (confirmed, cancelled)
- `start_date`: Start date for date range filtering
- `end_date`: End date for date range filtering
- `bay`: Filter by specific bay
- `limit`: Number of results per page (default: 50)
- `offset`: Number of results to skip (default: 0)

#### Response
```json
{
  "bookings": [...],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "has_next": true,
    "has_prev": false
  }
}
```

## Availability APIs

### Check Bay Availability

#### Endpoint
```
GET /api/availability?date=2024-07-15&time=14:00&duration=1.5
```

#### Description
Checks availability for all bays at a specific date and time.

#### Query Parameters
- `date`: Date to check (YYYY-MM-DD, required)
- `time`: Start time to check (HH:MM, required)
- `duration`: Duration in hours (required)

#### Response
```json
{
  "date": "2024-07-15",
  "time": "14:00",
  "duration": 1.5,
  "available": true,
  "available_bays": ["Bay 1", "Bay 3", "Bay 5"],
  "occupied_bays": ["Bay 2", "Bay 4"],
  "recommended_bay": "Bay 1"
}
```

### Get Available Time Slots

#### Endpoint
```
GET /api/availability/slots?date=2024-07-15&duration=1.5
```

#### Description
Returns all available time slots for a specific date and duration.

#### Response
```json
{
  "date": "2024-07-15",
  "duration": 1.5,
  "available_slots": [
    {
      "time": "09:00",
      "available_bays": ["Bay 1", "Bay 2", "Bay 3"]
    },
    {
      "time": "10:30",
      "available_bays": ["Bay 1", "Bay 4"]
    }
  ]
}
```

## Customer Management APIs

### Search Customers

#### Endpoint
```
GET /api/crm/customers/search?q=john&limit=20
```

#### Description
Searches customers in the CRM system with fuzzy matching.

#### Query Parameters
- `q`: Search query (name, email, or phone)
- `limit`: Maximum results (default: 20)
- `exact`: Exact match only (default: false)

#### Response
```json
{
  "customers": [
    {
      "stable_hash_id": "customer_hash_123",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+66123456789",
      "membership_type": "VIP",
      "vip_tier": "Gold",
      "total_bookings": 25,
      "last_visit": "2024-07-10"
    }
  ],
  "total_found": 1
}
```

### Get Customer Profile

#### Endpoint
```
GET /api/crm/customers/{stableHashId}
```

#### Description
Retrieves comprehensive customer profile data.

#### Response
```json
{
  "customer": {
    "stable_hash_id": "customer_hash_123",
    "basic_info": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+66123456789"
    },
    "vip_data": {
      "tier": "Gold",
      "display_name": "John D.",
      "marketing_preference": true
    },
    "packages": [
      {
        "id": "package_456",
        "name": "Monthly Package",
        "remaining_hours": 8.5,
        "total_hours": 20,
        "expiration_date": "2024-08-15"
      }
    ],
    "booking_stats": {
      "total_bookings": 25,
      "cancelled_bookings": 2,
      "no_show_count": 0,
      "last_visit": "2024-07-10",
      "average_duration": 1.5
    }
  }
}
```

### Link Customer Profile

#### Endpoint
```
POST /api/crm/customers/link
```

#### Description
Links an authenticated user profile to a CRM customer.

#### Request Body
```json
{
  "profile_id": "user_456",
  "stable_hash_id": "customer_hash_123",
  "match_method": "manual",
  "match_confidence": 1.0
}
```

#### Response
```json
{
  "success": true,
  "link": {
    "profile_id": "user_456",
    "stable_hash_id": "customer_hash_123",
    "match_confidence": 1.0,
    "linked_at": "2024-07-15T10:00:00Z"
  }
}
```

## Package Management APIs

### Get Customer Packages

#### Endpoint
```
GET /api/packages/customer/{stableHashId}
```

#### Description
Retrieves all packages for a specific customer.

#### Response
```json
{
  "packages": [
    {
      "id": "package_456",
      "stable_hash_id": "customer_hash_123",
      "package_name": "Monthly Package",
      "package_display_name": "Monthly Golf Package",
      "package_category": "Monthly",
      "total_hours": 20,
      "remaining_hours": 8.5,
      "used_hours": 11.5,
      "purchase_date": "2024-06-15T10:00:00Z",
      "first_use_date": "2024-06-20",
      "expiration_date": "2024-08-15",
      "validity_period_definition": "2 months"
    }
  ]
}
```

### Update Package Usage

#### Endpoint
```
POST /api/packages/{packageId}/use
```

#### Description
Records package hour usage for a booking.

#### Request Body
```json
{
  "hours_used": 1.5,
  "booking_id": "booking_123",
  "usage_date": "2024-07-15"
}
```

#### Response
```json
{
  "success": true,
  "package": {
    "id": "package_456",
    "remaining_hours": 7.0,
    "used_hours": 13.0,
    "last_used": "2024-07-15"
  }
}
```

## Inventory Management APIs

### Get Inventory Structure

#### Endpoint
```
GET /api/inventory/structure
```

#### Description
Returns the complete inventory category and product structure.

#### Response
```json
{
  "categories": [
    {
      "id": "category_123",
      "name": "Golf Equipment",
      "display_order": 1,
      "is_active": true,
      "products": [
        {
          "id": "product_456",
          "name": "Golf Balls - Titleist",
          "unit": "dozens",
          "input_type": "number",
          "reorder_threshold": 10,
          "supplier": "Pro Shop Supply",
          "display_order": 1,
          "is_active": true
        }
      ]
    }
  ]
}
```

### Submit Inventory Data

#### Endpoint
```
POST /api/inventory/submit
```

#### Description
Submits daily inventory counts and updates.

#### Request Body
```json
{
  "date": "2024-07-15",
  "staff": "John Smith",
  "submissions": [
    {
      "product_id": "product_456",
      "category_id": "category_123",
      "value_numeric": 12,
      "note": "Received new shipment"
    },
    {
      "product_id": "product_789",
      "category_id": "category_123",
      "value_text": "Good condition",
      "note": "All equipment functional"
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "submissions_created": 2,
  "date": "2024-07-15",
  "staff": "John Smith",
  "low_stock_alerts": [
    {
      "product_id": "product_999",
      "product_name": "Cleaning Supplies",
      "current_stock": 3,
      "threshold": 5
    }
  ]
}
```

### Get Stock Alerts

#### Endpoint
```
GET /api/inventory/alerts
```

#### Description
Returns current low stock alerts based on reorder thresholds.

#### Response
```json
{
  "alerts": [
    {
      "product_id": "product_456",
      "product_name": "Golf Balls - Titleist",
      "category_name": "Golf Equipment",
      "current_stock": 8,
      "reorder_threshold": 10,
      "supplier": "Pro Shop Supply",
      "days_below_threshold": 3,
      "last_restocked": "2024-07-01"
    }
  ],
  "alert_count": 1
}
```

## Special Events APIs

### Submit US Open Score

#### Endpoint
```
POST /api/events/us-open/scores
```

#### Description
Submits customer scores for US Open tournament with screenshot evidence.

#### Request Body
```json
{
  "employee": "John Smith",
  "customer_id": 12345,
  "date": "2024-07-15",
  "stableford_score": 35,
  "stroke_score": 82,
  "stableford_screenshot": "base64_image_data",
  "stroke_screenshot": "base64_image_data"
}
```

#### Response
```json
{
  "success": true,
  "score_id": 789,
  "message": "Score submitted successfully",
  "leaderboard_position": 15,
  "screenshot_urls": {
    "stableford": "https://storage.com/stableford_12345_1642234567.jpg",
    "stroke": "https://storage.com/stroke_12345_1642234567.jpg"
  }
}
```

### Get Tournament Leaderboard

#### Endpoint
```
GET /api/events/us-open/leaderboard?format=stableford&limit=50
```

#### Description
Retrieves current tournament leaderboard standings.

#### Query Parameters
- `format`: Scoring format (stableford, stroke)
- `limit`: Number of entries to return
- `date_range`: Filter by date range

#### Response
```json
{
  "tournament_info": {
    "name": "US Open 2024",
    "start_date": "2024-07-01",
    "end_date": "2024-07-31",
    "total_participants": 156,
    "total_scores": 423
  },
  "leaderboard": [
    {
      "rank": 1,
      "customer_id": 12345,
      "customer_name": "Tiger Woods",
      "total_score": 245,
      "round_count": 7,
      "average_score": 35.0,
      "best_round": 42,
      "latest_submission": "2024-07-14"
    }
  ]
}
```

## Notification APIs

### Send LINE Notification

#### Endpoint
```
POST /api/notify
```

#### Description
Sends notifications via LINE messaging system.

#### Request Body
```json
{
  "message": "🏌️ New Booking Confirmed\n\nCustomer: John Doe\nDate: 2024-07-15\nTime: 14:00",
  "group": "default",
  "booking_type": "package"
}
```

#### Response
```json
{
  "success": true,
  "message_id": "line_msg_123",
  "sent_to": "default",
  "sent_at": "2024-07-15T10:00:00Z"
}
```

### Get Notification Status

#### Endpoint
```
GET /api/notify/status/{messageId}
```

#### Description
Checks the delivery status of a sent notification.

#### Response
```json
{
  "message_id": "line_msg_123",
  "status": "delivered",
  "sent_at": "2024-07-15T10:00:00Z",
  "delivered_at": "2024-07-15T10:00:05Z",
  "group": "default"
}
```

## Admin APIs

### Get System Statistics

#### Endpoint
```
GET /api/admin/stats?period=week
```

#### Description
Retrieves system usage and performance statistics.

#### Query Parameters
- `period`: Time period (day, week, month, year)
- `start_date`: Custom start date
- `end_date`: Custom end date

#### Response
```json
{
  "period": "week",
  "start_date": "2024-07-08",
  "end_date": "2024-07-15",
  "stats": {
    "bookings": {
      "total": 75,
      "confirmed": 70,
      "cancelled": 5,
      "revenue": 15000
    },
    "customers": {
      "total_active": 245,
      "new_registrations": 8,
      "vip_customers": 45
    },
    "inventory": {
      "submissions": 49,
      "low_stock_alerts": 3,
      "categories_updated": 6
    },
    "system": {
      "api_calls": 2847,
      "avg_response_time": 145,
      "error_rate": 0.02
    }
  }
}
```

### Export Data

#### Endpoint
```
POST /api/admin/export
```

#### Description
Generates data exports in various formats.

#### Request Body
```json
{
  "export_type": "bookings|customers|inventory|scores",
  "format": "csv|excel|json",
  "date_range": {
    "start": "2024-07-01",
    "end": "2024-07-31"
  },
  "filters": {
    "status": "confirmed",
    "include_cancelled": false
  }
}
```

#### Response
```json
{
  "success": true,
  "export_id": "export_123",
  "download_url": "https://api.lengolf.com/downloads/export_123.csv",
  "expires_at": "2024-07-16T10:00:00Z",
  "record_count": 150
}
```

## Error Handling

### Standard Error Response Format

All API endpoints return errors in a consistent format:

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)",
  "code": "ERROR_CODE",
  "status": 400,
  "timestamp": "2024-07-15T10:00:00Z",
  "path": "/api/bookings/create"
}
```

### HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `409`: Conflict (resource already exists)
- `422`: Unprocessable Entity (business logic error)
- `429`: Too Many Requests (rate limited)
- `500`: Internal Server Error

### Common Error Codes

#### Authentication Errors
- `AUTH_REQUIRED`: Authentication required
- `INVALID_TOKEN`: Invalid or expired token
- `INSUFFICIENT_PERMISSIONS`: User lacks required permissions

#### Validation Errors
- `VALIDATION_FAILED`: Request validation failed
- `INVALID_FORMAT`: Invalid data format
- `REQUIRED_FIELD_MISSING`: Required field not provided

#### Business Logic Errors
- `BOOKING_CONFLICT`: Time slot already booked
- `PACKAGE_EXPIRED`: Customer package has expired
- `INSUFFICIENT_HOURS`: Not enough package hours remaining
- `CUSTOMER_NOT_FOUND`: Customer not found in system

#### System Errors
- `DATABASE_ERROR`: Database operation failed
- `EXTERNAL_API_ERROR`: External service unavailable
- `STORAGE_ERROR`: File storage operation failed

## Rate Limiting

### Limits
- **Authenticated users**: 1000 requests per hour
- **Public endpoints**: 100 requests per hour per IP
- **Admin endpoints**: 5000 requests per hour

### Headers
Rate limit information is included in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642234567
```

### Exceeded Limits
When rate limits are exceeded:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "status": 429,
  "retry_after": 3600
}
```

## Webhooks

### LINE Webhook

#### Endpoint
```
POST /api/line/webhook
```

#### Description
Receives webhook events from LINE platform.

#### Headers
```
X-Line-Signature: signature_value
```

#### Payload
```json
{
  "events": [
    {
      "type": "message",
      "message": {
        "type": "text",
        "text": "Hello"
      },
      "source": {
        "type": "group",
        "groupId": "group_123"
      }
    }
  ]
}
```

## Development Guidelines

### API Versioning
- Current version: v1 (implicit)
- Future versions will use URL versioning: `/api/v2/`

### Request/Response Guidelines
- Use camelCase for JSON keys
- Include timestamps in ISO 8601 format
- Use consistent field naming across endpoints
- Provide meaningful error messages

### Authentication Flow
1. User authenticates via NextAuth.js
2. Session cookie is set
3. Subsequent API requests include session cookie
4. Server validates session and user permissions

### Testing APIs
Use the following tools for API testing:
- **Postman**: Collection available at `/docs/postman/`
- **curl**: Examples provided for each endpoint
- **Integration tests**: Located at `/__tests__/api/`

### Mock Data
Development environment includes mock data for:
- Sample bookings
- Test customers
- Inventory items
- Tournament scores

Access mock data via `/api/dev/` endpoints (development only). 