# Google Calendar Integration Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Calendar Configuration](#calendar-configuration)
4. [Authentication & Authorization](#authentication--authorization)
5. [Event Management](#event-management)
6. [Bay Availability System](#bay-availability-system)
7. [Booking Synchronization](#booking-synchronization)
8. [Event Lifecycle](#event-lifecycle)
9. [API Endpoints](#api-endpoints)
10. [Database Integration](#database-integration)
11. [Error Handling](#error-handling)
12. [Performance Optimization](#performance-optimization)
13. [Troubleshooting](#troubleshooting)
14. [Future Roadmap](#future-roadmap)

## Overview

The Google Calendar Integration system provides seamless synchronization between the Lengolf booking system and Google Calendar, enabling real-time bay availability checking, automatic event creation for bookings, and centralized calendar management across multiple golf bays and coaching services.

### Key Capabilities
- **Multi-Calendar Management**: Separate calendars for each bay and coaching type
- **Real-Time Availability**: Live bay availability checking against Google Calendar
- **Automatic Event Creation**: Bookings automatically create calendar events
- **Event Lifecycle Management**: Create, update, and delete calendar events
- **Coaching Integration**: Specialized calendars for different coaching types
- **Color Coding**: Bay-specific colors for visual calendar organization
- **Conflict Detection**: Prevents double-booking through availability checks

### Integration Points
- **Booking Creation**: Automatic calendar event creation
- **Booking Updates**: Calendar events updated when bookings change
- **Booking Cancellation**: Calendar events deleted when bookings cancelled
- **Availability Checking**: Real-time bay availability via Google Calendar API
- **Calendar Display**: Visual calendar showing all bay bookings

## Architecture

### System Components
```
Google Calendar Integration
├── Authentication Layer
│   ├── Service Account Authentication
│   ├── OAuth 2.0 Token Management
│   └── API Credential Management
├── Calendar Management
│   ├── Bay Calendars (3 bays)
│   ├── Coaching Calendars (2 types)
│   └── Event Lifecycle Management
├── Availability Engine
│   ├── Real-Time Bay Checking
│   ├── Conflict Detection
│   └── Time Slot Validation
├── Event Synchronization
│   ├── Booking-to-Event Mapping
│   ├── Bidirectional Sync
│   └── Status Tracking
└── Data Layer
    ├── Calendar Event Storage
    ├── Sync Status Tracking
    └── Error Logging
```

### Data Flow
```
Booking System → Event Creation → Google Calendar → Availability Updates → UI Refresh
     ↑                                    ↓
Database Storage ← Status Updates ← Event Confirmation
```

## Calendar Configuration

### Bay Calendars
The system manages separate Google Calendars for each golf bay:

```typescript
export const BAY_CALENDARS = {
  "Bay 1 (Bar)": process.env.BAY_1_CALENDAR_ID,
  "Bay 2": process.env.BAY_2_CALENDAR_ID, 
  "Bay 3 (Entrance)": process.env.BAY_3_CALENDAR_ID
} as const;

type BayName = keyof typeof BAY_CALENDARS;
```

### Coaching Calendars
Specialized calendars for different coaching types:

```typescript
export const COACHING_CALENDARS = {
  "Coaching (Boss)": process.env.COACHING_BOSS_CALENDAR_ID,
  "Coaching (Boss - Ratchavin)": process.env.COACHING_RATCHAVIN_CALENDAR_ID
} as const;

type BookingType = keyof typeof COACHING_CALENDARS;
```

### Color Coding System
Each bay has a distinct color for visual organization:

```typescript
export const BAY_COLORS = {
  'Bay 1 (Bar)': '1',      // Blue
  'Bay 2': '2',            // Green  
  'Bay 3 (Entrance)': '3'  // Purple
} as const;
```

### Environment Configuration
```bash
# Bay Calendar IDs
BAY_1_CALENDAR_ID=a6234ae4e57933edb48a264fff4c5d3d3653f7bedce12cfd9a707c6c0ff092e4@group.calendar.google.com
BAY_2_CALENDAR_ID=3a700346dd902abd4aa448ee63e184a62f05d38bb39cb19a8fc27116c6df3233@group.calendar.google.com
BAY_3_CALENDAR_ID=092757d971c313c2986b43f4c8552382a7e273b183722a44a1c4e1a396568ca3@group.calendar.google.com

# Coaching Calendar IDs
COACHING_BOSS_CALENDAR_ID=coaching-boss-calendar-id
COACHING_RATCHAVIN_CALENDAR_ID=coaching-ratchavin-calendar-id
```

## Authentication & Authorization

### Service Account Setup
The system uses Google Service Account authentication for server-side calendar access:

```typescript
export async function getServiceAccountAuth() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      project_id: process.env.GOOGLE_PROJECT_ID
    },
    scopes: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ]
  });
  
  return auth;
}
```

### Required Permissions
- **Calendar API**: Full calendar access
- **Events Management**: Create, read, update, delete events
- **Free/Busy Access**: Read availability information

### Security Configuration
```typescript
// Credential validation
const validateCredentials = () => {
  const required = [
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_PRIVATE_KEY', 
    'GOOGLE_PROJECT_ID'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required Google credentials: ${missing.join(', ')}`);
  }
};
```

## Event Management

### Calendar Event Creation
When a booking is created, corresponding calendar events are automatically generated:

```typescript
export async function createCalendarEvents(
  calendar: calendar_v3.Calendar,
  inputData: CalendarFormatInput
): Promise<CalendarEventResult[]> {
  const eventData = formatCalendarEvent(inputData);
  const calendarIds = getRelevantCalendarIds(inputData);
  const results: CalendarEventResult[] = [];

  for (const calendarId of calendarIds) {
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData,
      });

      results.push({
        eventId: response.data.id!,
        calendarId,
        status: response.data.status!,
      });
    } catch (error) {
      console.error(`Error creating event in calendar ${calendarId}:`, error);
    }
  }

  return results;
}
```

### Event Data Structure
```typescript
interface CalendarEventResult {
  eventId: string;      // Google Calendar event ID
  calendarId: string;   // Target calendar ID
  status: string;       // Event status (confirmed, etc.)
}

interface CalendarFormatInput {
  id: string;                    // Booking ID
  name: string;                  // Customer name
  phone_number: string;          // Customer phone
  date: string;                  // Booking date (YYYY-MM-DD)
  start_time: string;            // Start time (HH:mm)
  duration: number;              // Duration in hours
  number_of_people: number;      // Number of people
  bay: string | null;            // Bay assignment
  bayDisplayName?: string;       // Formatted bay name
  customer_notes: string | null; // Customer notes
  employeeName: string;          // Staff member
  bookingType: string;           // Booking type
  packageName?: string;          // Package name (if applicable)
}
```

### Event Formatting
```typescript
export function formatCalendarEvent(inputData: CalendarFormatInput): calendar_v3.Schema$Event {
  const startDateTimeStr = `${inputData.date}T${inputData.start_time}:00`;
  const localParsedDate = parse(startDateTimeStr, "yyyy-MM-dd'T'HH:mm:ss", new Date());
  const startDateTimeUTC = fromZonedTime(localParsedDate, 'Asia/Bangkok');
  const endDateTimeUTC = addHours(startDateTimeUTC, inputData.duration);

  const packageInfo = inputData.packageName
    ? `${inputData.bookingType} (${inputData.packageName})`
    : inputData.bookingType;

  const bayDisplay = inputData.bayDisplayName || inputData.bay || 'Unknown Bay';
  const colorId = BAY_COLORS[bayDisplay as BayName];

  const summary = `${inputData.name} (${inputData.phone_number}) (${inputData.number_of_people}) - ${packageInfo} at ${bayDisplay}`;

  const description = `Customer Name: ${inputData.name}
Booking Name: ${inputData.name}
Contact: ${inputData.phone_number}
Type: ${packageInfo}
Pax: ${inputData.number_of_people}
Bay: ${bayDisplay}
Date: ${formatInTimeZone(startDateTimeUTC, 'Asia/Bangkok', 'EEEE, MMMM d')}
Time: ${formatInTimeZone(startDateTimeUTC, 'Asia/Bangkok', 'HH:mm')} - ${formatInTimeZone(endDateTimeUTC, 'Asia/Bangkok', 'HH:mm')}
Via: Backoffice
Booking ID: ${inputData.id}
Booked By: ${inputData.employeeName}
${inputData.customer_notes ? `\nNotes: ${inputData.customer_notes}` : ''}`;

  return {
    summary,
    description,
    start: {
      dateTime: formatInTimeZone(startDateTimeUTC, 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ssXXX"),
      timeZone: 'Asia/Bangkok'
    },
    end: {
      dateTime: formatInTimeZone(endDateTimeUTC, 'Asia/Bangkok', "yyyy-MM-dd'T'HH:mm:ssXXX"),
      timeZone: 'Asia/Bangkok'
    },
    colorId
  };
}
```

## Bay Availability System

### Real-Time Availability Checking
The system provides real-time bay availability by querying Google Calendar:

```typescript
export async function getBayAvailability(
  calendar: calendar_v3.Calendar,
  bayNumber: string,
  date: string
): Promise<{ start: string; end: string }[]> {
  const calendarId = BAY_CALENDARS[bayNumber as BayName];
  
  const startOfDayISO = formatInTimeZone(
    parse(`${date}T00:00:00`, "yyyy-MM-dd'T'HH:mm:ss", new Date()), 
    'Asia/Bangkok', 
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );
  
  const endOfDayISO = formatInTimeZone(
    parse(`${date}T23:59:59`, "yyyy-MM-dd'T'HH:mm:ss", new Date()), 
    'Asia/Bangkok', 
    "yyyy-MM-dd'T'HH:mm:ssXXX"
  );

  const response = await calendar.freebusy.query({
    requestBody: {
      timeMin: startOfDayISO,
      timeMax: endOfDayISO,
      items: [{ id: calendarId }],
      timeZone: 'Asia/Bangkok'
    },
  });

  return response.data.calendars?.[calendarId]?.busy || [];
}
```

### Multi-Bay Availability Check
```typescript
// Check availability across all bays for a specific time slot
export async function checkSlotForAllBays(
  date: string, 
  startTime: string, 
  duration: number,
  excludeBookingId?: string
): Promise<Record<string, boolean>> {
  const availability: Record<string, boolean> = {};
  
  for (const [bayName, calendarId] of Object.entries(BAY_CALENDARS)) {
    try {
      const busyTimes = await getBayAvailability(calendar, bayName, date);
      availability[bayName] = !hasTimeConflict(busyTimes, startTime, duration);
    } catch (error) {
      console.error(`Error checking availability for ${bayName}:`, error);
      availability[bayName] = false; // Assume unavailable on error
    }
  }
  
  return availability;
}
```

### Conflict Detection Algorithm
```typescript
function hasTimeConflict(
  busyTimes: { start: string; end: string }[],
  proposedStart: string,
  durationHours: number
): boolean {
  const proposedStartTime = DateTime.fromISO(`${date}T${proposedStart}`, { zone: 'Asia/Bangkok' });
  const proposedEndTime = proposedStartTime.plus({ hours: durationHours });
  
  return busyTimes.some(busy => {
    const busyStart = DateTime.fromISO(busy.start);
    const busyEnd = DateTime.fromISO(busy.end);
    
    // Check for overlap: (ProposedStart < BusyEnd) && (ProposedEnd > BusyStart)
    return proposedStartTime < busyEnd && proposedEndTime > busyStart;
  });
}
```

## Booking Synchronization

### Create Booking Flow
1. **Validation**: Check bay availability for requested time slot
2. **Database Insert**: Create booking record in database
3. **Calendar Events**: Create events in relevant calendars
4. **Link Storage**: Store event IDs in booking record
5. **Status Update**: Update sync status

```typescript
// Booking creation with calendar sync
const booking = await createBooking(bookingData);
const calendarEvents = await createCalendarEvents(calendar, bookingData);
await linkCalendarEvents(booking.id, calendarEvents);
```

### Update Booking Flow
1. **Conflict Check**: Validate new time slot if changed
2. **Event Deletion**: Delete old calendar events
3. **Event Creation**: Create new calendar events for updated booking
4. **Database Update**: Update booking record
5. **Status Sync**: Update calendar sync status

### Cancel Booking Flow
1. **Event Deletion**: Delete all associated calendar events
2. **Status Update**: Mark booking as cancelled
3. **Sync Status**: Update calendar sync status

```typescript
export async function cancelBookingWithCalendarSync(
  bookingId: string,
  cancellationData: CancellationRequest
): Promise<void> {
  // Get booking with calendar events
  const booking = await getBookingById(bookingId);
  
  // Delete calendar events
  if (booking.calendar_events?.length > 0) {
    for (const event of booking.calendar_events) {
      await deleteCalendarEvent(auth, event.calendarId, event.eventId);
    }
  }
  
  // Update booking status
  await updateBookingStatus(bookingId, 'cancelled', cancellationData);
}
```

## Event Lifecycle

### Event States
```typescript
type EventSyncStatus = 
  | 'pending'           // Awaiting calendar sync
  | 'synced'           // Successfully synced
  | 'error_syncing'    // Sync failed
  | 'partial_sync'     // Some events synced
  | 'cancelled_events_deleted'      // Cancelled with events deleted
  | 'cancelled_partial_deletion_error'  // Some deletion failures
  | 'cancelled_no_events'          // Cancelled, no events to delete
  | 'cancelled_gcal_auth_error';   // Authentication error during cancellation
```

### Calendar Event Storage
```typescript
interface CalendarEventRecord {
  eventId: string;      // Google Calendar event ID
  calendarId: string;   // Calendar where event exists
  status: string;       // Event status
}

// Stored in booking record as JSONB
interface Booking {
  // ... other fields
  calendar_events: CalendarEventRecord[] | null;
  google_calendar_sync_status: EventSyncStatus | null;
}
```

### Event Retrieval
```typescript
export async function fetchBayEvents(
  calendar: calendar_v3.Calendar,
  bayNumber: string,
  date: string
) {
  const calendarId = BAY_CALENDARS[bayNumber as BayName];
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: startOfDay.toISO(),
    timeMax: endOfDay.toISO(),
    singleEvents: true,
    orderBy: 'startTime',
    timeZone: 'Asia/Bangkok',
  });

  return response.data.items?.map(event => ({
    id: event.id,
    summary: event.summary,
    description: event.description,
    start: event.start?.dateTime,
    end: event.end?.dateTime,
    customer_name: extractCustomerName(event),
    booking_type: extractBookingType(event),
    package_name: extractPackageName(event),
    number_of_pax: extractPaxCount(event),
    color: event.colorId
  })) || [];
}
```

## API Endpoints

### Calendar Event Management

#### `POST /api/bookings/calendar/events`
Fetches calendar events for a specific bay and date.

**Request Body**:
```typescript
{
  bayNumber: string;    // "Bay 1 (Bar)", "Bay 2", "Bay 3 (Entrance)"
  date: string;         // "YYYY-MM-DD"
}
```

**Response**:
```typescript
{
  success: boolean;
  events: CalendarEvent[];
}
```

#### `POST /api/bookings/availability`
Checks bay availability for a specific time slot.

**Request Body**:
```typescript
{
  bayNumber: string;
  date: string;
  startTime: string;    // "HH:mm"
  duration: number;     // hours
}
```

**Response**:
```typescript
{
  available: boolean;
  busyTimes: { start: string; end: string }[];
}
```

#### `POST /api/bookings/check-slot-for-all-bays`
Checks availability across all bays for a time slot.

**Request Body**:
```typescript
{
  date: string;
  startTime: string;
  endTime: string;
  excludeBookingId?: string;  // For booking updates
}
```

**Response**:
```typescript
{
  availability: Record<string, boolean>;  // bayName -> isAvailable
}
```

### Calendar Synchronization

#### `PUT /api/bookings/[bookingId]/link-calendar-events`
Links calendar events to a booking record.

**Request Body**:
```typescript
{
  calendar_events: CalendarEventRecord[];
  google_calendar_sync_status: EventSyncStatus;
}
```

## Database Integration

### Calendar Event Storage
Calendar events are stored as JSONB in the bookings table:

```sql
-- Calendar events array structure
calendar_events JSONB -- Array of { eventId, calendarId, status }

-- Sync status tracking
google_calendar_sync_status TEXT -- Current sync state
```

### Example Storage
```sql
UPDATE bookings SET 
  calendar_events = '[
    {
      "eventId": "abc123def456",
      "calendarId": "bay1-calendar-id",
      "status": "confirmed"
    },
    {
      "eventId": "xyz789uvw012", 
      "calendarId": "coaching-calendar-id",
      "status": "confirmed"
    }
  ]'::jsonb,
  google_calendar_sync_status = 'synced'
WHERE id = 'BK12345';
```

### Calendar Event Queries
```sql
-- Find bookings with calendar sync issues
SELECT id, google_calendar_sync_status, calendar_events
FROM bookings 
WHERE google_calendar_sync_status IN ('error_syncing', 'partial_sync');

-- Count events per calendar
SELECT 
  calendar_event->>'calendarId' as calendar_id,
  COUNT(*) as event_count
FROM bookings,
  jsonb_array_elements(calendar_events) as calendar_event
WHERE calendar_events IS NOT NULL
GROUP BY calendar_event->>'calendarId';
```

## Error Handling

### Common Error Scenarios
1. **Authentication Failures**: Service account credential issues
2. **Calendar Not Found**: Invalid calendar ID configuration
3. **Event Creation Failures**: Calendar API rate limits or permissions
4. **Timezone Issues**: Date/time conversion problems
5. **Network Timeouts**: Google API connectivity issues

### Error Recovery Strategies
```typescript
// Retry logic for calendar operations
async function retryCalendarOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Calendar operation failed (attempt ${attempt}):`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
    }
  }
  
  throw new Error('Maximum retry attempts exceeded');
}
```

### Sync Status Management
```typescript
// Update sync status based on operation results
const updateSyncStatus = async (bookingId: string, results: CalendarEventResult[]) => {
  let status: EventSyncStatus;
  
  if (results.length === 0) {
    status = 'error_syncing';
  } else if (results.every(r => r.status === 'confirmed')) {
    status = 'synced';
  } else {
    status = 'partial_sync';
  }
  
  await updateBooking(bookingId, { google_calendar_sync_status: status });
};
```

### Error Logging
```typescript
// Comprehensive error logging for calendar operations
const logCalendarError = (operation: string, error: any, context: any) => {
  console.error(`Calendar ${operation} failed:`, {
    error: error.message || String(error),
    context,
    timestamp: new Date().toISOString(),
    stack: error.stack
  });
};
```

## Performance Optimization

### Caching Strategy
```typescript
// Cache calendar availability data
import NodeCache from 'node-cache';

const availabilityCache = new NodeCache({ 
  stdTTL: 300,  // 5-minute cache
  checkperiod: 60
});

// Cache key generation
const getCacheKey = (bayNumber: string, date: string, time: string, duration: number) => 
  `availability_${bayNumber}_${date}_${time}_${duration}`;
```

### Batch Operations
```typescript
// Batch multiple calendar operations
const batchCalendarOperations = async (operations: CalendarOperation[]) => {
  const promises = operations.map(op => 
    retryCalendarOperation(() => executeOperation(op))
  );
  
  return Promise.allSettled(promises);
};
```

### Rate Limiting
```typescript
// Implement rate limiting for Google Calendar API
import { RateLimiter } from 'limiter';

const calendarLimiter = new RateLimiter(10, 'second'); // 10 requests per second

const rateLimitedRequest = async <T>(operation: () => Promise<T>): Promise<T> => {
  await calendarLimiter.removeTokens(1);
  return operation();
};
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Calendar Events Not Creating
**Symptoms**: Bookings created but no calendar events
**Diagnosis**:
```typescript
// Check sync status
SELECT id, google_calendar_sync_status, calendar_events 
FROM bookings 
WHERE google_calendar_sync_status = 'error_syncing';
```
**Solutions**:
- Verify service account credentials
- Check calendar IDs in environment variables
- Confirm calendar permissions for service account

#### 2. Availability Check Failures
**Symptoms**: All bays showing as unavailable
**Diagnosis**:
```typescript
// Test calendar API access
const testCalendarAccess = async () => {
  try {
    const auth = await getServiceAccountAuth();
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.calendarList.list();
    console.log('Calendar API access successful');
  } catch (error) {
    console.error('Calendar API access failed:', error);
  }
};
```
**Solutions**:
- Check Google API credentials
- Verify calendar API is enabled
- Test network connectivity

#### 3. Timezone Issues
**Symptoms**: Events appearing at wrong times
**Diagnosis**:
```typescript
// Verify timezone handling
const testTimezone = () => {
  const testDate = '2025-02-01T14:30:00';
  const parsed = DateTime.fromISO(testDate, { zone: 'Asia/Bangkok' });
  console.log('Local time:', parsed.toString());
  console.log('UTC time:', parsed.toUTC().toString());
};
```
**Solutions**:
- Ensure consistent timezone usage ('Asia/Bangkok')
- Verify date/time parsing logic
- Check Google Calendar timezone settings

### Debugging Tools
```typescript
// Calendar operation debugger
const debugCalendarOperation = async (operation: string, data: any) => {
  console.log(`🗓️ Calendar ${operation} starting:`, data);
  
  const startTime = Date.now();
  try {
    const result = await executeCalendarOperation(operation, data);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Calendar ${operation} completed in ${duration}ms:`, result);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ Calendar ${operation} failed after ${duration}ms:`, error);
    throw error;
  }
};
```

### Health Checks
```typescript
// Calendar integration health check
export const checkCalendarHealth = async (): Promise<HealthCheck> => {
  const checks = {
    authentication: false,
    calendarAccess: false,
    eventCreation: false
  };
  
  try {
    // Test authentication
    const auth = await getServiceAccountAuth();
    checks.authentication = true;
    
    // Test calendar access
    const calendar = google.calendar({ version: 'v3', auth });
    await calendar.calendarList.list();
    checks.calendarAccess = true;
    
    // Test event creation (dry run)
    // ... test logic
    checks.eventCreation = true;
    
  } catch (error) {
    console.error('Calendar health check failed:', error);
  }
  
  return {
    status: Object.values(checks).every(Boolean) ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString()
  };
};
```

## Future Roadmap

### Planned Improvements
1. **Database-First Architecture**: Move away from Google Calendar dependency
2. **Enhanced Conflict Resolution**: Smarter conflict detection and resolution
3. **Calendar Templates**: Predefined event templates for different booking types
4. **Bulk Operations**: Batch create/update/delete operations
5. **Calendar Sharing**: Public calendar views for customers
6. **Advanced Reporting**: Calendar utilization analytics

### Migration Strategy
The system is planning to migrate from Google Calendar-dependent architecture to a database-first approach:

1. **Phase 1**: Implement database-based availability checking
2. **Phase 2**: Create native calendar display components
3. **Phase 3**: Reduce Google Calendar dependency to backup/sync only
4. **Phase 4**: Complete migration to database-only architecture

### Deprecation Notice
Some Google Calendar features may be deprecated in future versions:
- Direct calendar API calls for availability checking
- Real-time Google Calendar synchronization
- Google Calendar as primary data source

---

**Last Updated**: February 2025  
**Version**: 2.0  
**Maintainer**: Lengolf Development Team 