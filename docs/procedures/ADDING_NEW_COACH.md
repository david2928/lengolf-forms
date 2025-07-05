# Adding New Coach to LENGOLF System

This document outlines the complete process for adding a new coach/pro to the LENGOLF Forms golf academy management system.

## Overview

The LENGOLF system supports multiple coaches with individual calendar integration, LINE messaging notifications, and POS data reconciliation. Each coach requires configuration across multiple system components.

## Prerequisites

Before adding a new coach, ensure you have:
- **Google Calendar API Access**: Service account with calendar permissions
- **Google Calendar ID**: Dedicated calendar for the new coach
- **LINE Group ID**: Optional LINE group for coach-specific notifications
- **Admin Access**: System administrator privileges to modify code and environment variables

## Step-by-Step Process

### Phase 1: Environment Configuration

#### 1.1 Add Environment Variables
Add the following variables to your `.env` file:

```bash
# Coaching Calendar ID (required)
COACHING_[COACH_NAME]_CALENDAR_ID=your-google-calendar-id

# LINE Group ID (optional - for notifications)
LINE_GROUP_[COACH_NAME]_ID=your-line-group-id
```

**Example for Coach "Noon":**
```bash
COACHING_NOON_CALENDAR_ID=d68c902c67aad24ac15bc3a76732363aff0859850a0405e1b090351253d6d49d@group.calendar.google.com
LINE_GROUP_NOON_ID=noon-line-group-id
```

### Phase 2: Code Updates

#### 2.1 Update Type Definitions (`src/lib/constants.ts`)

**Add to BookingType union:**
```typescript
export type BookingType = "Coaching (Boss)" | "Coaching (Boss - Ratchavin)" | "Coaching ([Coach Name])";
```

**Add to COACHING_CALENDARS:**
```typescript
export const COACHING_CALENDARS: Record<BookingType, string> = {
  "Coaching (Boss)": process.env.COACHING_BOSS_CALENDAR_ID || "",
  "Coaching (Boss - Ratchavin)": process.env.COACHING_RATCHAVIN_CALENDAR_ID || "",
  "Coaching ([Coach Name])": process.env.COACHING_[COACH_NAME]_CALENDAR_ID || ""
};
```

**Add to LINE_MESSAGING groups:**
```typescript
export const LINE_MESSAGING = {
  // ... existing configuration
  groups: {
    default: process.env.LINE_GROUP_ID || "",
    ratchavin: process.env.LINE_GROUP_RATCHAVIN_ID || "",
    coaching: process.env.LINE_GROUP_COACHING_ID || "",
    [coachName]: process.env.LINE_GROUP_[COACH_NAME]_ID || ""
  }
} as const;
```

#### 2.2 Update Booking Form Components

**Booking Type Selector (`src/components/booking-form/selectors/booking-type-selector.tsx`):**
```typescript
const bookingTypes = [
  // ... existing types
  { value: 'Coaching ([Coach Name])', label: 'Coaching ([Coach Name])', icon: Users },
]
```

**Customer Step (`src/components/booking-form/steps/customer-step.tsx`):**
```typescript
const PACKAGE_TYPES = ['Package', 'Coaching (Boss)', 'Coaching (Boss - Ratchavin)', 'Coaching ([Coach Name])']
```

#### 2.3 Update LINE Messaging (`app/api/notify/route.ts`)

Add notification logic for the new coach:
```typescript
// Handle specific coaching notifications
if (bookingType === "Coaching (Boss - Ratchavin)" && LINE_MESSAGING.groups.ratchavin) {
  console.log('Booking is Ratchavin coaching, will send to Ratchavin group');
  groups.push(LINE_MESSAGING.groups.ratchavin);
} else if (bookingType === "Coaching (Boss)" && LINE_MESSAGING.groups.coaching) {
  console.log('Booking is regular coaching, will send to coaching group');
  groups.push(LINE_MESSAGING.groups.coaching);
} else if (bookingType === "Coaching ([Coach Name])" && LINE_MESSAGING.groups.[coachName]) {
  console.log('Booking is [Coach Name] coaching, will send to [Coach Name] group');
  groups.push(LINE_MESSAGING.groups.[coachName]);
}
```

#### 2.4 Update POS Data Reconciliation

**Backend API (`app/api/admin/reconciliation/pos-data/route.ts`):**

Add to valid types:
```typescript
const validTypes = ['restaurant', 'golf_coaching_ratchavin', 'golf_coaching_boss', 'golf_coaching_[coach_name]'];
```

Add product name filtering:
```typescript
const productNames = reconciliationType === 'golf_coaching_ratchavin'
  ? ['1 Golf Lesson Used', '1 Golf Lesson Used (Ratchavin)']
  : reconciliationType === 'golf_coaching_boss'
    ? ['1 Golf Lesson Used', '1 Golf Lesson Used (Boss)']
    : reconciliationType === 'golf_coaching_[coach_name]'
      ? ['1 Golf Lesson Used', '1 Golf Lesson Used ([Coach Name])']
      : ['1 Golf Lesson Used']; // fallback
```

**Frontend Component (`app/admin/reconciliation/components/ReconciliationTypeSelector.tsx`):**
```typescript
const reconciliationTypes = [
  // ... existing types
  {
    id: 'golf_coaching_[coach_name]',
    label: 'Golf Coaching - Pro [Coach Name]',
    description: 'Match golf lesson invoices with lesson usage records for Pro [Coach Name]',
    icon: Trophy,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    selectedBorder: 'border-purple-500',
    selectedBg: 'bg-purple-100'
  }
];
```

### Phase 3: Google Calendar Setup

#### 3.1 Create Dedicated Calendar
1. Log into Google Calendar with your service account
2. Create a new calendar for the coach
3. Set appropriate sharing permissions
4. Copy the calendar ID from calendar settings
5. Ensure the service account has access to the calendar

#### 3.2 Calendar Configuration
- **Event Colors**: Calendar events will automatically inherit system colors
- **Permissions**: Ensure service account has "Make changes to events" permission
- **Time Zone**: Configure calendar to match business time zone

### Phase 4: LINE Messaging Setup (Optional)

#### 4.1 Create LINE Group
1. Create a new LINE group for coach-specific notifications
2. Add the LINE bot to the group
3. Note the group ID for environment configuration

#### 4.2 Notification Categories
Coach-specific notifications will be sent for:
- New booking creation
- Booking modifications
- Booking cancellations
- Package usage updates

### Phase 5: POS Integration

#### 5.1 Product Name Configuration
Ensure POS system uses consistent product naming:
- Generic: `"1 Golf Lesson Used"`
- Coach-specific: `"1 Golf Lesson Used ([Coach Name])"`

#### 5.2 Reconciliation Reports
New coach will appear in admin reconciliation with dedicated filtering and reporting.

## Verification Checklist

After implementation, verify the following:

### ✅ Calendar Integration
- [ ] New coaching type appears in booking form
- [ ] Calendar events are created for new coach bookings
- [ ] Calendar availability is checked correctly
- [ ] Events sync properly with Google Calendar

### ✅ LINE Messaging
- [ ] Notifications are sent to correct groups
- [ ] Coach-specific notifications work properly
- [ ] Message formatting includes coach information

### ✅ POS Reconciliation
- [ ] New coach appears in reconciliation dropdown
- [ ] Product filtering works correctly
- [ ] Reports generate accurate data
- [ ] Aggregation logic functions properly

### ✅ User Interface
- [ ] Booking form displays new coach option
- [ ] Package selector includes new coach type
- [ ] Admin panels show new coach data
- [ ] Calendar views render correctly

## Common Issues and Solutions

### Issue: Calendar ID Not Working
**Solution**: Verify calendar sharing permissions and service account access

### Issue: LINE Notifications Not Sending
**Solution**: Check group ID configuration and bot permissions

### Issue: POS Reconciliation Missing Data
**Solution**: Verify product name consistency between POS and system configuration

### Issue: TypeScript Compilation Errors
**Solution**: Ensure all type definitions are updated consistently across files

## Environment Variables Reference

Complete list of environment variables for coach configuration:

```bash
# Core System
COACHING_BOSS_CALENDAR_ID=boss-calendar-id
COACHING_RATCHAVIN_CALENDAR_ID=ratchavin-calendar-id
COACHING_NOON_CALENDAR_ID=noon-calendar-id

# LINE Messaging
LINE_GROUP_COACHING_ID=general-coaching-group-id
LINE_GROUP_RATCHAVIN_ID=ratchavin-group-id  
LINE_GROUP_NOON_ID=noon-group-id

# Google Calendar Service Account
GOOGLE_CLIENT_EMAIL=service-account-email
GOOGLE_PRIVATE_KEY=service-account-private-key
GOOGLE_PROJECT_ID=google-project-id
```

## Code Files Modified

Summary of files that require modification when adding a new coach:

1. **`src/lib/constants.ts`** - Type definitions and calendar/LINE configuration
2. **`src/components/booking-form/selectors/booking-type-selector.tsx`** - Booking form options
3. **`src/components/booking-form/steps/customer-step.tsx`** - Package type filtering
4. **`app/api/notify/route.ts`** - LINE messaging notification logic
5. **`app/api/admin/reconciliation/pos-data/route.ts`** - POS data reconciliation backend
6. **`app/admin/reconciliation/components/ReconciliationTypeSelector.tsx`** - Admin reconciliation UI

## Testing Procedures

### Manual Testing
1. Create a test booking with new coach type
2. Verify calendar event creation
3. Test LINE notification delivery
4. Check POS reconciliation functionality
5. Validate UI components display correctly

### Automated Testing
Consider adding unit tests for:
- Type safety validation
- Calendar integration functions
- LINE messaging logic
- POS reconciliation algorithms

---

**Last Updated**: January 2025  
**Version**: 1.0  
**Author**: System Documentation  

For technical support or questions about this process, consult the main [Documentation Index](../DOCUMENTATION_INDEX.md) or contact the development team. 