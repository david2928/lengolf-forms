# Booking Editing System Documentation

## Table of Contents
1. [Overview](#overview)
2. [Edit Booking Modal Interface](#edit-booking-modal-interface)
3. [Tabbed Architecture](#tabbed-architecture)
4. [Permission System](#permission-system)
5. [Real-time Validation](#real-time-validation)
6. [Component Architecture](#component-architecture)
7. [API Integration](#api-integration)
8. [User Experience Features](#user-experience-features)
9. [Technical Implementation](#technical-implementation)
10. [Business Rules](#business-rules)

## Overview

The Booking Editing System provides comprehensive functionality for modifying existing bookings through an intuitive tabbed interface. The system supports both full editing for future bookings and limited editing for past bookings, with real-time validation and automatic change tracking.

### Key Capabilities
- **Tabbed Interface**: Separates main booking information from additional details
- **Conditional Editing**: Restricts certain fields for past bookings
- **Real-time Validation**: Live availability checking and form validation
- **Package Integration**: Direct package selection and management
- **Referral Tracking**: Source attribution for new customers
- **Employee Accountability**: Track which staff member makes changes
- **Automatic Notifications**: LINE messaging integration for booking updates

## Edit Booking Modal Interface

### Access Points
The edit booking modal can be accessed from:
- **Manage Bookings Page**: Edit button for each booking
- **Calendar View**: Click on booking events (future implementation)
- **Booking Details View**: Edit action button

### Modal Structure
```typescript
interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onSuccess: (updatedBooking: Booking) => void;
}
```

### Visual Design
- **Header**: Customer name with contact information
- **Package Display**: Current package information (if applicable)
- **Customer Notes**: Existing notes display
- **Tab Navigation**: Switch between Main Information and Additional Details
- **Footer**: Cancel and Save Changes buttons with validation states

## Tabbed Architecture

### Tab 1: Main Information
Contains core booking details that affect scheduling and availability:

#### Fields (Future Bookings Only)
- **Date Selection**: Date picker with validation
- **Start Time**: Time input with format validation
- **Duration**: Duration selector (hours)
- **Bay Selection**: Visual bay selector with real-time availability
- **Number of People**: Numeric input

#### Fields (All Bookings)
- **Employee Name**: Required dropdown for accountability

#### Restrictions
- **Past Bookings**: All main information fields are disabled
- **Visual Feedback**: Clear indication when fields are locked
- **Alternative Actions**: Guidance for past booking modifications

### Tab 2: Additional Details
Contains supplementary information that can be edited for all bookings:

#### Fields (All Bookings)
- **Booking Type**: Dropdown selector for booking classification
- **Package Selection**: Package selector (when booking type involves packages)
- **Internal Notes**: Text area for staff notes
- **Employee Name**: Duplicate field for tab convenience

#### Fields (New Customer Bookings Only)
- **Referral Source**: How the customer found the business
- **Marketing Attribution**: Tracking for business analytics

#### Conditional Display
- **Package Selector**: Only shown when booking type includes "package"
- **Referral Source**: Only editable for bookings marked as new customers
- **Read-only Display**: Shows referral source for existing customers

## Permission System

### Editing Rules by Booking Status

#### Future Bookings
```typescript
interface FutureBookingPermissions {
  mainInformation: {
    date: true,
    startTime: true,
    duration: true,
    bay: true,
    numberOfPeople: true
  },
  additionalDetails: {
    bookingType: true,
    packageSelection: true,
    referralSource: boolean, // Only for new customers
    internalNotes: true,
    employeeName: true
  }
}
```

#### Past Bookings
```typescript
interface PastBookingPermissions {
  mainInformation: {
    date: false,
    startTime: false,
    duration: false,
    bay: false,
    numberOfPeople: false
  },
  additionalDetails: {
    bookingType: true,
    packageSelection: true,
    referralSource: false, // Cannot modify attribution
    internalNotes: true,
    employeeName: true
  }
}
```

### Determination Logic
```typescript
const isBookingInPast = (booking: Booking): boolean => {
  const bookingEndTime = calculateBookingEndTime(booking);
  return bookingEndTime < new Date();
};
```

## Real-time Validation

### Availability Checking
The system implements intelligent availability checking that:

#### Smart Triggering
- **Only on Relevant Changes**: Triggers when date, time, or duration changes
- **Prevents Redundant Calls**: Tracks last checked parameters
- **Bay Selection Optimization**: No availability check when selecting from existing results
- **Initial Bay Availability**: Checks all bays on modal open to enable bay switching

#### Visual Feedback
```typescript
interface AvailabilityStates {
  'idle': 'No check needed',
  'checking': 'Loading availability...',
  'available': 'Bay available',
  'unavailable': 'Bay not available',
  'overridden': 'Manually overridden',
  'error': 'Check failed'
}
```

#### Bay Selection Interface
- **Color Coding**: Green (available), Red (unavailable), Gray (checking)
- **Override Capability**: Admin can force selection of unavailable bays
- **Conflict Resolution**: Clear messaging about scheduling conflicts

### Form Validation
Comprehensive validation includes:

#### Required Fields
- **Employee Name**: Always required for audit trail
- **Main Information**: Required when editable
- **Package Selection**: Required when booking type includes packages

#### Business Rules
- **Time Format**: HH:mm validation
- **Duration Limits**: Minimum and maximum booking duration
- **Date Constraints**: Cannot book in the past (for new bookings)
- **Bay Availability**: Real-time conflict checking

## Component Architecture

### Core Components

#### EditBookingModal
Main container component managing state and tab navigation:
```typescript
const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  onClose,
  booking,
  onSuccess
}) => {
  // State management
  // Tab switching logic
  // Form validation
  // API integration
  // Success handling
};
```

#### Specialized Selectors

##### EditPackageSelector
Simplified package selection for editing:
```typescript
interface EditPackageSelectorProps {
  value: string | null;
  customerName: string;
  customerPhone?: string;
  currentPackageName?: string | null;
  onChange: (packageId: string | null) => void;
  disabled?: boolean;
}
```

Features:
- **Current Package Display**: Shows selected package prominently
- **Alternative Options**: Dropdown with other customer packages
- **Package Status**: Visual indicators for package health

##### SimpleBookingTypeSelector
Streamlined booking type selection:
```typescript
const bookingTypes = [
  'Walk In',
  'Call',
  'Package',
  'Coaching',
  'Event'
];
```

##### SimpleReferralSourceSelector
Referral source tracking with custom options:
```typescript
const referralSources = [
  'Google Search',
  'Facebook',
  'Instagram',
  'Walk By',
  'Friend Referral',
  'Repeat Customer',
  'Other'
];
```

## API Integration

### Update Endpoint
```
PUT /api/bookings/{bookingId}
Content-Type: application/json

{
  // Main information (conditional)
  "date": "2025-07-15",
  "start_time": "14:00",
  "duration": 2,
  "bay": "Bay 2",
  "number_of_people": 3,
  
  // Additional details (always available)
  "booking_type": "Package",
  "package_id": "pkg_123",
  "referral_source": "Google Search",
  "customer_notes": "Updated requirements",
  
  // Required audit field
  "employee_name": "Staff Member"
}
```

### Response Handling
```typescript
interface UpdateResponse {
  success: boolean;
  booking: Booking;
  changes: string[];
  notifications: {
    line: boolean;
    calendar: boolean;
  };
}
```

### Error Management
- **Validation Errors**: Field-specific error messages
- **Availability Conflicts**: Clear conflict resolution options
- **Network Errors**: Retry mechanisms and offline support
- **Permission Errors**: Clear messaging about restricted actions

## User Experience Features

### Visual Indicators

#### New Customer Badges
- **Subtle Green Dot**: Indicates new customer status
- **Legend**: Contextual legend when new customers are present
- **Consistent Styling**: Matches across all booking interfaces

#### Package Information
- **Package Badges**: Visual indication of package bookings
- **Package Details**: Hover/click for package status information
- **Expiration Warnings**: Visual alerts for expiring packages

### Accessibility Features
- **Keyboard Navigation**: Full tab navigation support
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **High Contrast**: Support for high contrast mode
- **Focus Management**: Logical focus flow through form elements

### Mobile Optimization
- **Responsive Tabs**: Stack vertically on small screens
- **Touch-Friendly**: Larger touch targets for mobile devices
- **Keyboard Support**: Virtual keyboard optimization
- **Gesture Support**: Swipe between tabs on touch devices

## Technical Implementation

### State Management
```typescript
interface EditBookingFormData {
  bay: string;
  date: Date;
  start_time: string;
  duration: number;
  number_of_people: number;
  customer_notes: string;
  employee_name: string;
  package_id: string | null;
  booking_type: string;
  referral_source: string | null;
}
```

### Availability Optimization
```typescript
// Prevent redundant availability checks
const [lastAvailabilityCheck, setLastAvailabilityCheck] = useState<string | null>(null);
const [isBaySelectionInProgress, setIsBaySelectionInProgress] = useState(false);

// Smart availability checking
const needsNewAvailabilityCheck = hasAvailabilityRelevantChanges && 
  currentCheckKey !== lastAvailabilityCheck;
```

### Performance Features
- **Debounced API Calls**: Prevents excessive availability checking
- **Optimistic Updates**: Immediate UI feedback with rollback on errors
- **Caching**: Availability results cached for repeated checks
- **Lazy Loading**: Package data loaded only when needed
- **Proper Unit Conversion**: Consistent duration handling between minutes (frontend) and hours (database)

## Business Rules

### Editing Constraints

#### Time-Based Rules
- **Future Bookings**: Full editing capability
- **Past Bookings**: Limited to additional details only
- **Same-Day Bookings**: Full editing until booking start time

#### Package Integration Rules
- **Package Changes**: Must validate package availability
- **Package Expiration**: Warnings for expired packages
- **Package Hours**: Must have sufficient hours remaining

#### Referral Source Rules
- **New Customers Only**: Can set referral source
- **Existing Customers**: Read-only referral source display
- **Historical Accuracy**: Cannot modify past attribution

### Audit Requirements
- **Employee Identification**: All changes must include employee name
- **Change Tracking**: Automatic logging of all modifications
- **Notification Triggers**: LINE messages for significant changes
- **Calendar Sync**: Automatic calendar event updates

### Conflict Resolution
- **Bay Conflicts**: Override capability with confirmation
- **Package Conflicts**: Clear error messages and alternatives
- **Time Conflicts**: Visual conflict indicators and suggestions

---

## Integration Points

### Calendar System
- **Google Calendar**: Automatic event updates for time/date changes
- **Event Management**: Create/update/delete calendar events as needed
- **Multi-Calendar**: Proper calendar selection based on bay assignment

### Notification System
- **LINE Messaging**: Automated notifications for booking changes
- **Staff Notifications**: Internal notifications for important changes
- **Customer Notifications**: Optional customer notification system

### Package System
- **Usage Tracking**: Automatic package hour adjustments
- **Expiration Monitoring**: Integration with package expiration alerts
- **Customer Packages**: Real-time package availability checking

### CRM Integration
- **Customer Data**: Sync with customer management system
- **Booking History**: Integration with customer booking patterns
- **Referral Tracking**: Marketing attribution and analytics

---

**Last Updated**: July 2025  
**Version**: 1.0  
**Related Documentation**: 
- [Booking System](./BOOKING_SYSTEM.md)
- [Package Management](./PACKAGE_MANAGEMENT.md)
- [Calendar Integration](./CALENDAR_INTEGRATION.md)