# Booking System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Core Features](#core-features)
3. [Booking Creation](#booking-creation)
4. [Booking Management](#booking-management)
5. [Calendar Integration](#calendar-integration)
6. [Database Schema](#database-schema)
7. [API Endpoints](#api-endpoints)
8. [User Interface](#user-interface)
9. [Business Logic](#business-logic)
10. [Integration Points](#integration-points)

## Overview

The Booking System is the core module of the Lengolf Forms application, providing comprehensive booking management for golf bay reservations, coaching sessions, and package-based bookings. The system handles the complete booking lifecycle from creation to cancellation, with integrated calendar management and notification systems.

### System Capabilities
- **Multi-Bay Management**: Support for multiple golf bays and coaching sessions
- **Package Integration**: Seamless integration with customer package system
- **Calendar Synchronization**: Google Calendar integration for staff coordination
- **Real-time Updates**: Live booking status and availability checking
- **Mobile Optimization**: Responsive design for mobile and desktop usage
- **Audit Trail**: Complete booking history and change tracking

## Core Features

### 1. Booking Creation (`/create-booking`)
Multi-step booking creation process with comprehensive validation and integration.

#### Features
- **3-Step Process**: Employee details → Customer selection → Booking details
- **Customer Management**: Search existing customers or add new ones
- **Package Integration**: Automatic package detection and usage tracking
- **Bay Selection**: Visual bay selection with availability checking
- **Time Management**: Flexible time selection with duration calculation
- **Validation**: Real-time form validation and error handling

#### Supported Booking Types
```typescript
type BookingType = 
  | 'Normal Bay Rate'   // Standard bay rental
  | 'Package'          // Using customer package
  | 'Event'            // Special events
  | 'Class'            // Group classes
  | 'Coaching (Boss)'  // Boss coaching sessions
  | 'Coaching (Boss - Ratchavin)'  // Ratchavin coaching
```

### 2. Booking Management (`/manage-bookings`)
Comprehensive interface for managing existing bookings with enhanced edit capabilities.

#### Features
- **Search & Filter**: Advanced search by customer, date, status
- **Visual Indicators**: New customer badges and package displays
- **Edit Bookings**: Tabbed interface for editing booking details
- **Past Booking Management**: Limited editing for past bookings
- **Status Management**: Confirm, cancel, modify bookings
- **History Tracking**: Complete audit trail of changes
- **Employee Tracking**: Track which staff member makes changes

#### Edit Booking Modal
Multi-tab interface for comprehensive booking editing:

**Main Information Tab**:
- Date, time, duration, and bay selection
- Real-time availability checking
- Disabled for past bookings

**Additional Details Tab**:
- Booking type and package selection
- Referral source (for new customers only)
- Internal notes and employee name
- Available for all bookings including past ones

### 3. Bookings Calendar (`/bookings-calendar`)
Visual calendar interface for day-to-day booking management.

#### Features
- **Daily View**: Time-slot based daily calendar view
- **Bay Visualization**: All bays displayed in single view
- **Booking Consolidation**: Adjacent bookings automatically merged
- **Real-time Updates**: Automatic refresh and live data
- **Mobile Responsive**: Optimized mobile calendar interface
- **Quick Actions**: Click to view, edit, or cancel bookings

## Booking Creation

### Multi-Step Process

#### Step 1: Employee & Booking Details
```typescript
interface Step1Data {
  employeeName: string;           // Staff member creating booking
  customerContactedVia: string;   // Contact method (phone, walk-in, etc.)
  bookingType: BookingType;       // Type of booking
}
```

#### Step 2: Customer Selection
```typescript
interface Step2Data {
  isNewCustomer: boolean;         // New vs existing customer
  customerId?: string;            // Existing customer ID
  customerName?: string;          // Customer name
  customerPhone?: string;         // Contact number
  packageId?: string;             // Selected package (if applicable)
  packageName?: string;           // Package name
  referralSource?: string;        // How customer found us (new customers only)
}
```

#### Step 3: Booking Details
```typescript
interface Step3Data {
  bookingDate: Date;              // Booking date
  startTime: string;              // Start time (HH:mm)
  endTime: string;                // End time (calculated)
  duration: number;               // Duration in hours
  bayNumber: string;              // Selected bay
  numberOfPax: number;            // Number of people
  notes?: string;                 // Additional notes
}
```

### Form Validation
The system implements comprehensive validation at each step:

```typescript
// Step 1 Validation
const validateStep1 = (data: FormData) => {
  const errors: FormErrors = {};
  if (!data.employeeName) errors.employeeName = 'Employee name is required';
  if (!data.customerContactedVia) errors.customerContactedVia = 'Contact method is required';
  if (!data.bookingType) errors.bookingType = 'Booking type is required';
  return errors;
};

// Step 2 Validation
const validateStep2 = (data: FormData) => {
  const errors: FormErrors = {};
  if (!data.isNewCustomer && !data.customerId) {
    errors.customerId = 'Please select a customer';
  }
  if (data.bookingType === 'Package' && !data.packageId) {
    errors.packageId = 'Please select a package';
  }
  return errors;
};
```

### Package Integration
When booking type is "Package", the system:
1. Fetches available packages for the selected customer
2. Displays package details (remaining hours, expiration)
3. Validates package availability
4. Records package usage upon booking confirmation

```typescript
// Package Selection Interface
interface PackageOption {
  id: string;
  label: string;
  details: {
    customerName: string;
    packageTypeName: string;
    remainingHours: number;
    expirationDate: string;
    isActivated: boolean;
  };
}
```

## Booking Management

### Advanced Search & Filtering
The manage bookings interface provides powerful search capabilities:

```typescript
interface BookingFilters {
  dateRange: {
    start: Date;
    end: Date;
  };
  customerName?: string;
  status?: 'confirmed' | 'cancelled' | 'all';
  bay?: string;
  bookingType?: string;
  employeeName?: string;
}
```

### Booking Operations
Available operations on bookings:

#### View Booking Details
```typescript
interface BookingDetails {
  basic: BookingInfo;
  customer: CustomerInfo;
  package?: PackageInfo;
  history: BookingHistory[];
  calendar: CalendarEvents[];
}
```

#### Cancel Booking
```typescript
interface CancellationRequest {
  employee_name: string;              // Required for audit
  cancellation_reason?: string;       // Optional reason
}
```

#### Update Booking
```typescript
interface BookingUpdateRequest {
  // Main information (only for future bookings)
  date?: string;
  start_time?: string;
  duration?: number;
  bay?: string;
  number_of_people?: number;
  
  // Additional details (available for all bookings)
  booking_type?: string;
  package_id?: string;
  referral_source?: string;  // Only for new customer bookings
  customer_notes?: string;
  employee_name: string;     // Required for audit
}
```

The system supports partial updates with automatic change tracking and LINE notifications.

### Audit Trail
Every booking change is tracked with complete audit information:

```typescript
interface BookingHistoryEntry {
  booking_id: string;
  action_type: 'CREATE' | 'CANCEL' | 'UPDATE';
  changed_by_type: 'staff' | 'system';
  changed_by_identifier: string;
  changes_summary: string;
  old_booking_snapshot: Booking;
  new_booking_snapshot: Booking;
  notes?: string;
  timestamp: string;
}
```

## Calendar Integration

### Google Calendar Sync
The system maintains automatic synchronization with Google Calendar:

#### Calendar Configuration
```typescript
interface CalendarConfig {
  BAY_1_CALENDAR_ID: string;
  BAY_2_CALENDAR_ID: string;
  BAY_3_CALENDAR_ID: string;
  COACHING_BOSS_CALENDAR_ID: string;
  COACHING_RATCHAVIN_CALENDAR_ID: string;
}
```

#### Event Creation
When a booking is created, the system:
1. Determines appropriate calendar based on bay/type
2. Creates Google Calendar event with booking details
3. Stores event ID for future reference
4. Updates booking sync status

```typescript
interface CalendarEvent {
  eventId: string;
  calendarId: string;
  status: 'created' | 'updated' | 'deleted';
}
```

### Booking Consolidation
The calendar view implements intelligent booking consolidation:

```typescript
// Merge adjacent bookings from same customer
const consolidateBookings = (bookings: Booking[]) => {
  return bookings.reduce((consolidated, booking) => {
    const lastBooking = consolidated[consolidated.length - 1];
    
    if (lastBooking && 
        lastBooking.customer_name === booking.customer_name &&
        lastBooking.bay === booking.bay &&
        isAdjacent(lastBooking.endTime, booking.startTime)) {
      // Merge bookings
      lastBooking.endTime = booking.endTime;
      lastBooking.duration += booking.duration;
    } else {
      consolidated.push(booking);
    }
    
    return consolidated;
  }, []);
};
```

## Database Schema

### Main Booking Table
```sql
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,                    -- Customer name
  email TEXT NOT NULL,                   -- Customer email (placeholder)
  phone_number TEXT NOT NULL,            -- Customer phone (normalized)
  date DATE NOT NULL,                    -- Booking date (YYYY-MM-DD)
  start_time TEXT NOT NULL,              -- Start time (HH:mm)
  duration INTEGER NOT NULL,             -- Duration in hours
  number_of_people INTEGER NOT NULL,     -- Number of people
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  bay TEXT,                              -- Bay assignment
  customer_notes TEXT,                   -- Customer notes
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Enhancement fields (Phase 3)
  package_id TEXT,                       -- Selected package ID
  booking_type TEXT DEFAULT 'Walk In',   -- Type of booking
  referral_source TEXT,                  -- How customer found us
  is_new_customer BOOLEAN DEFAULT FALSE, -- New customer flag
  
  -- Audit fields
  updated_by_type TEXT,
  updated_by_identifier TEXT,
  cancelled_by_type TEXT,
  cancelled_by_identifier TEXT,
  cancellation_reason TEXT,
  
  -- Integration fields
  google_calendar_sync_status TEXT,
  calendar_event_id TEXT,               -- Deprecated
  calendar_events JSONB,                -- Current: array of events
  package_name TEXT,                    -- Deprecated: use package_id
  stable_hash_id TEXT                   -- CRM customer ID
);
```

#### Enhancement Features
- **Phone Normalization**: Automatic phone number formatting via `normalize_phone_number()` function
- **New Customer Detection**: Automatic detection via `check_new_customer()` trigger
- **Package Integration**: Direct link to package system via `package_id`
- **Referral Tracking**: Source attribution for marketing analytics

### Booking History Table
```sql
CREATE TABLE booking_history (
  id SERIAL PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
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

### Related Tables
- `backoffice.customers`: Customer information
- `backoffice.packages`: Customer packages
- `backoffice.package_types`: Package definitions

## API Endpoints

### Booking Creation
```
POST /api/bookings/create
Content-Type: application/json

{
  "id": "booking_uuid",
  "user_id": "staff_uuid",
  "name": "Customer Name",
  "email": "info@len.golf",
  "phone_number": "+66123456789",
  "date": "2025-06-15",
  "start_time": "14:00",
  "duration": 2,
  "number_of_people": 2,
  "status": "confirmed",
  "bay": "Bay 1",
  "customer_notes": "Special requirements",
  "booking_type": "Package",
  "package_name": "Premium Package",
  "stable_hash_id": "customer_crm_id"
}
```

### Booking Retrieval
```
GET /api/bookings/list-by-date?date=2025-06-15

Response:
{
  "bookings": [
    {
      "id": "booking_id",
      "name": "Customer Name",
      "phone_number": "+66123456789",
      "date": "2025-06-15",
      "start_time": "14:00",
      "duration": 2,
      "bay": "Bay 1",
      "status": "confirmed",
      "booking_type": "Package",
      "package_name": "Premium Package"
    }
  ]
}
```

### Booking Update
```
PUT /api/bookings/{bookingId}
Content-Type: application/json

{
  "date": "2025-06-16",           // Optional: only for future bookings
  "start_time": "15:00",          // Optional: only for future bookings
  "duration": 2,                  // Optional: only for future bookings
  "bay": "Bay 2",                 // Optional: only for future bookings
  "number_of_people": 3,          // Optional: only for future bookings
  "booking_type": "Package",      // Optional: all bookings
  "package_id": "pkg_123",        // Optional: all bookings
  "referral_source": "Google",    // Optional: new customers only
  "customer_notes": "Updated",    // Optional: all bookings
  "employee_name": "Staff Member" // Required: for audit trail
}
```

### Booking Cancellation
```
POST /api/bookings/{bookingId}/cancel
Content-Type: application/json

{
  "employee_name": "Staff Member",
  "cancellation_reason": "Customer requested cancellation"
}
```

### Bay Availability
```
GET /api/bookings/availability?bay=Bay1&date=2025-06-15

Response:
{
  "available_slots": [
    { "start": "09:00", "end": "10:00" },
    { "start": "16:00", "end": "18:00" }
  ],
  "busy_slots": [
    { "start": "10:00", "end": "14:00" },
    { "start": "18:00", "end": "21:00" }
  ]
}
```

## User Interface

### Design Patterns

#### Responsive Design
```tsx
// Mobile-first responsive components
const BookingCard = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {bookings.map(booking => (
      <Card key={booking.id} className="w-full">
        <CardContent>{booking.details}</CardContent>
      </Card>
    ))}
  </div>
);
```

#### Loading States
```tsx
// Skeleton loading for better UX
{loading ? (
  <div className="space-y-4">
    {[...Array(5)].map((_, i) => (
      <Skeleton key={i} className="h-20 w-full" />
    ))}
  </div>
) : (
  <BookingList bookings={bookings} />
)}
```

#### Error Handling
```tsx
// Comprehensive error boundaries
<ErrorBoundary fallback={<BookingErrorFallback />}>
  <BookingForm />
</ErrorBoundary>
```

### Key Components

#### BookingForm
Multi-step form with context management and validation.

#### BookingCalendar
Daily calendar view with bay visualization and booking consolidation.

#### BookingManagement
Advanced table with filtering, search, and bulk operations.

#### ViewBookingModal
Detailed booking view with action buttons and history.

#### EditBookingModal
Tabbed interface for comprehensive booking editing:
- **Tabs Component**: Separates main information from additional details
- **Conditional Editing**: Restricts main info editing for past bookings
- **Real-time Validation**: Bay availability checking during edits
- **Package Integration**: EditPackageSelector for simplified package selection
- **Referral Source Tracking**: Only available for new customer bookings

#### New Selector Components
- **SimpleBookingTypeSelector**: Streamlined booking type selection
- **SimpleReferralSourceSelector**: Referral source options with "Other" input
- **EditPackageSelector**: Shows current package + available alternatives

## Business Logic

### Booking Rules
1. **Minimum Duration**: 1 hour minimum booking
2. **Maximum Duration**: 8 hours maximum booking
3. **Operating Hours**: 09:00 - 21:00 daily
4. **Advance Booking**: Up to 30 days in advance
5. **Cancellation**: Minimum 2 hours notice

### Package Validation
```typescript
const validatePackageUsage = (package: Package, booking: BookingRequest) => {
  // Check if package is active
  if (!package.isActivated) {
    throw new Error('Package is not activated');
  }
  
  // Check remaining hours
  if (package.remainingHours < booking.duration) {
    throw new Error('Insufficient package hours');
  }
  
  // Check expiration
  if (new Date(package.expirationDate) < new Date(booking.date)) {
    throw new Error('Package has expired');
  }
  
  return true;
};
```

### Time Slot Management
```typescript
const checkAvailability = async (bay: string, date: string, startTime: string, duration: number) => {
  // Get existing bookings for bay and date
  const existingBookings = await getBookingsByBayAndDate(bay, date);
  
  // Calculate requested time slot
  const requestedStart = parseTime(startTime);
  const requestedEnd = addHours(requestedStart, duration);
  
  // Check for conflicts
  return !existingBookings.some(booking => {
    const bookingStart = parseTime(booking.start_time);
    const bookingEnd = addHours(bookingStart, booking.duration);
    
    return (requestedStart < bookingEnd && requestedEnd > bookingStart);
  });
};
```

## Integration Points

### External Systems
1. **Google Calendar**: Event synchronization
2. **LINE Messaging**: Booking notifications
3. **CRM System**: Customer data synchronization
4. **Package System**: Usage tracking and validation

### Internal Systems
1. **Customer Management**: Customer search and creation
2. **Package Management**: Package selection and usage
3. **Notification System**: Real-time updates
4. **Audit System**: Change tracking and history

### Data Flow
```
Booking Creation → Validation → Database Insert → Calendar Sync → Notification → Package Update
```

### Error Recovery
The system implements comprehensive error recovery:
1. **Database Rollback**: Transaction-based operations
2. **Calendar Sync Recovery**: Retry mechanisms for failed syncs
3. **Notification Recovery**: Queue-based notification system
4. **User Feedback**: Clear error messages and recovery options

---

For calendar integration details, see [Calendar Integration](./CALENDAR_INTEGRATION.md).  
For package integration, see [Package Management](./PACKAGE_MANAGEMENT.md).

**Last Updated**: June 2025  
**Version**: 2.0  
**Maintainer**: Lengolf Development Team 