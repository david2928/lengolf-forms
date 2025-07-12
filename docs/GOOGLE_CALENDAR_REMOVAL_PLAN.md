# Google Calendar Integration Removal Plan

## Overview

This document outlines the precise files and components to remove Google Calendar integration from the Lengolf Forms booking system while preserving the external calendar sync for third-party integration.

## Key Findings

**✅ Keep:** The `trigger_calendar_sync()` function and related calendar sync infrastructure to maintain external integration  
**❌ Remove:** Google Calendar event creation/updates/deletion from booking operations  
**✅ Keep:** All native Supabase availability functions (already migrated)

## External Integration Requirement

The system uses a pgcron job (`SELECT public.trigger_calendar_sync();`) that runs every 15 minutes to sync booking data to Google Calendar for external third-party access. This integration must be preserved.

## Files to Remove (Complete Removal)

### 1. Manual Calendar Operations API
- **File**: `/app/api/bookings/calendar/route.ts`
  - **Action**: Remove entirely
  - **Reason**: Manual calendar event operations no longer needed

### 2. Calendar Event Linking API
- **File**: `/app/api/bookings/[bookingId]/link-calendar-events/route.ts`
  - **Action**: Remove entirely
  - **Reason**: No longer linking individual events to bookings

### 3. Calendar Diagnostic APIs
- **File**: `/app/api/bookings/diagnose-calendar-sync/route.ts`
  - **Action**: Remove entirely

- **File**: `/app/api/bookings/update-calendar-id/route.ts`
  - **Action**: Remove entirely

## Files to Modify (Partial Updates)

### 1. Core Google Calendar Library Functions
- **File**: `/src/lib/google-calendar.ts`
- **Keep (needed for sync)**:
  - `initializeCalendar(auth)` function
- **Remove (booking operations only)**:
  - `formatCalendarEvent()` 
  - `createCalendarEvents()`
  - `getRelevantCalendarIds()`
  - `getBayAvailability()`
  - `isTimeSlotAvailable()`
  - `getAvailableTimeSlots()`
  - `fetchBayEvents()`
  - `findCalendarEventsByBookingId()`
  - `updateCalendarEvent()`
  - `deleteCalendarEvent()`
  - `getCalendarEventDetails()`

### 2. Calendar Configuration Constants
- **File**: `/src/lib/constants.ts`
- **Keep (needed for sync)**:
  - `BAY_CALENDARS` mapping (used by sync system)
  - `BayName` type definition
- **Remove (not used by sync)**:
  - `COACHING_CALENDARS` mapping
  - `BAY_COLORS` configuration
  - `BookingType` type definition (if only used for coaching calendars)

### 3. Booking Form Submit Handler
- **File**: `/src/components/booking-form/submit/submit-handler.ts`
- **Remove sections**:
  - Lines 271-417: Calendar event creation and linking logic
  - Import of `CalendarFormatInput` type
  - All calendar API calls in `handleFormSubmit()`
- **Keep**: All booking creation logic

### 4. Booking Update API
- **File**: `/app/api/bookings/[bookingId]/route.ts`
- **Remove sections**:
  - Google Calendar imports
  - Calendar event update logic (extensive sections handling calendar sync)
  - Calendar event creation for time/bay changes
- **Keep**: All booking update logic and database operations

### 5. Booking Cancellation API
- **File**: `/app/api/bookings/[bookingId]/cancel/route.ts`
- **Remove sections**:
  - Lines 133-184: Google Calendar event deletion logic
  - Google Calendar imports
- **Keep**: All cancellation logic and database operations

### 6. Booking Investigation API
- **File**: `/app/api/bookings/investigate-booking/route.ts`
- **Remove sections**: Google Calendar event checking logic
- **Keep**: Database investigation features

## Database Schema Changes

### 1. Remove Calendar Tracking Fields
- **Table**: `public.bookings`
- **Fields to remove**:
  - `calendar_events` (JSONB) - Individual event tracking
  - `google_calendar_sync_status` (TEXT) - Sync status tracking
  - `calendar_event_id` (TEXT) - Legacy single event ID

### 2. TypeScript Type Updates
- **File**: `/src/types/booking.ts`
- **Remove fields**:
  - `google_calendar_sync_status?: string | null`
  - `calendar_event_id?: string | null`
  - `calendar_events?: { eventId: string; calendarId: string; status: string }[] | null`
  - `CalendarEvent` interface

## Environment Variables Changes

**Keep (needed for sync system)**:
- `GOOGLE_CLIENT_EMAIL` - Service account authentication
- `GOOGLE_PRIVATE_KEY` - Service account authentication  
- `BAY_1_CALENDAR_ID` - Bay calendar sync
- `BAY_2_CALENDAR_ID` - Bay calendar sync
- `BAY_3_CALENDAR_ID` - Bay calendar sync

**Remove from production and `.env.local`**:
- `COACHING_BOSS_CALENDAR_ID` - Not used by sync system
- `COACHING_RATCHAVIN_CALENDAR_ID` - Not used by sync system  
- `COACHING_NOON_CALENDAR_ID` - Not used by sync system

## Dependencies to Keep

**Keep in `package.json`**:
- `googleapis` - Still needed for sync system service account authentication

## Files to KEEP (External Integration)

### 1. Calendar Sync Service
- **File**: `/app/api/admin/calendar-sync/route.ts`
- **Reason**: Required for external third-party integration
- **Function**: Pushes booking data to Google Calendar for external consumption

### 2. Manual Calendar Sync Trigger
- **File**: `/app/api/admin/calendar-sync/trigger/route.ts`
- **Reason**: Allows manual triggering of sync for admin users
- **Function**: Authenticated endpoint for manual sync triggering

### 3. Google Authentication Module
- **File**: `/src/lib/google-auth.ts`
- **Reason**: Required for service account authentication in sync system
- **Function**: Provides `getServiceAccountAuth()` for calendar access

### 4. Database Sync Function
- **Database Function**: `public.trigger_calendar_sync()`
- **Reason**: Required for pgcron job external integration
- **Schedule**: Every 15 minutes via `SELECT public.trigger_calendar_sync();`

### 5. Calendar Sync Database Script
- **File**: `/scripts/setup-calendar-sync-cron.sql`
- **Reason**: Sets up the external integration infrastructure

### 6. All Native Availability Functions
- **Files**: All availability-related APIs and database functions
- **Reason**: Already fully migrated to native Supabase, no Google Calendar dependencies

## Migration Steps

### Phase 1: Remove Booking Integration
1. Remove calendar event creation from booking forms
2. Remove calendar updates from booking edit operations
3. Remove calendar deletion from booking cancellation
4. Update database schema to remove calendar tracking fields

### Phase 2: Clean Up Legacy Code
1. Remove unused Google Calendar library functions
2. Remove manual calendar operation APIs
3. Remove diagnostic and utility functions
4. Update TypeScript types

### Phase 3: Environment Cleanup
1. Remove unused environment variables
2. Remove googleapis dependency
3. Update configuration files

### Phase 4: Testing
1. Verify booking operations work without calendar integration
2. Confirm external calendar sync still functions
3. Test availability checking remains functional
4. Validate no broken imports or dependencies

## Validation Checklist

**✅ Booking Creation**: Works without calendar event creation  
**✅ Booking Updates**: Works without calendar event updates  
**✅ Booking Cancellation**: Works without calendar event deletion  
**✅ Availability Checking**: Uses native Supabase functions only  
**✅ External Calendar Sync**: Continues to function via pgcron job  
**✅ Third-party Integration**: External system still receives calendar data  

## Risk Assessment

**Low Risk**:
- Native availability system already in place
- External sync maintained separately
- No business logic dependencies on removed components

**Mitigation**:
- Staged rollout with feature flags
- Database backup before schema changes
- Rollback plan for each phase

---

**Created**: January 2025  
**Status**: Ready for Implementation  
**Estimated Effort**: 2-3 development days