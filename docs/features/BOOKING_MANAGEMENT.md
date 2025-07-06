# Booking Management Interface Documentation

## Table of Contents
1. [Overview](#overview)
2. [Manage Bookings Page](#manage-bookings-page)
3. [Visual Enhancement Features](#visual-enhancement-features)
4. [Search and Filtering](#search-and-filtering)
5. [Booking Operations](#booking-operations)
6. [Responsive Design](#responsive-design)
7. [Integration Features](#integration-features)
8. [User Interface Components](#user-interface-components)
9. [Performance Optimizations](#performance-optimizations)

## Overview

The Booking Management Interface provides a comprehensive view and management system for all bookings. It serves as the central hub for staff to view, search, edit, cancel, and analyze bookings with enhanced visual indicators and streamlined operations.

### Key Features
- **Enhanced Visual Indicators**: New customer badges and package displays
- **Advanced Search & Filtering**: Multi-criteria search with real-time filtering
- **Tabbed Edit Interface**: Comprehensive booking editing with conditional permissions
- **Responsive Design**: Optimized for both desktop and mobile devices
- **Real-time Updates**: Live data refresh and status updates
- **Bulk Operations**: Multi-select actions for efficiency
- **Audit Trail**: Complete history tracking for all booking changes

## Manage Bookings Page

### Page Structure (`/manage-bookings`)

#### Header Section
```typescript
interface HeaderControls {
  dateSelector: DatePicker;           // Select booking date
  searchInput: SearchField;           // Customer/phone/ID search
  statusFilter: StatusDropdown;       // Filter by booking status
  pastBookingsToggle: Checkbox;       // Show/hide past bookings (today only)
}
```

#### Main Content Areas
- **Control Panel**: Date selection, search, and filters
- **Legend Section**: Dynamic legend for visual indicators (shows only when relevant)
- **Booking Table**: Responsive table/card layout
- **Action Modals**: Edit, cancel, and history modals

### Enhanced Features

#### Visual Indicators System
The interface includes sophisticated visual indicators to enhance user experience:

##### New Customer Badges
```typescript
const renderNewCustomerBadge = (isNewCustomer: boolean | undefined) => {
  if (!isNewCustomer) return null;
  return (
    <span 
      className="inline-block w-2 h-2 rounded-full bg-green-400 ml-2" 
      title="New Customer"
    />
  );
};
```

**Design Principles:**
- **Subtle Styling**: Small green dot that doesn't overwhelm the interface
- **Contextual Legend**: Legend appears only when new customers are present
- **Accessibility**: Tooltip provides context for screen readers

##### Package Display System
```typescript
const renderPackageBadge = (packageName: string | null) => {
  if (!packageName) return null;
  return (
    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-2">
      <Package className="w-3 h-3 mr-1" />
      {packageName}
    </span>
  );
};
```

**Features:**
- **Package Information**: Shows package name when applicable
- **Visual Distinction**: Blue badges for package bookings
- **Icon Integration**: Package icon for immediate recognition

## Visual Enhancement Features

### New Customer Detection
The system automatically detects and highlights new customers:

#### Detection Logic
- **Phone Number Matching**: Compares against existing booking history
- **Status Consideration**: Only counts confirmed bookings
- **Real-time Updates**: Updates as new bookings are created

#### Visual Implementation
- **Subtle Green Dot**: 2px circular indicator next to customer name
- **Contextual Legend**: Shows explanation when new customers are present
- **Consistent Styling**: Matches across all booking interfaces

### Bay Color Coding
```typescript
const getBayBadgeClasses = (simpleBayName: string | null): string => {
  if (!simpleBayName) return 'bg-gray-100 text-gray-500';
  switch(simpleBayName) {
    case 'Bay 1': return 'bg-[#009ae1]/10 text-[#009ae1]';
    case 'Bay 2': return 'bg-[#fc5228]/10 text-[#fc5228]';
    case 'Bay 3': return 'bg-[#ec7c74]/10 text-[#ec7c74]';
    default: return 'bg-gray-100 text-gray-500';
  }
};
```

### Customer Notes Integration
- **Info Icon**: Visual indicator when customer notes exist
- **Tooltip Display**: Hover to view notes content
- **Mobile Optimization**: Expandable notes section on mobile

## Search and Filtering

### Search Capabilities
```typescript
interface SearchCriteria {
  customerName: string;     // Partial name matching
  phoneNumber: string;      // Phone number search
  bookingId: string;        // Booking ID lookup
}
```

#### Search Features
- **Real-time Search**: Instant filtering as user types
- **Multi-field Search**: Searches across name, phone, and booking ID
- **Case Insensitive**: Flexible matching for user convenience
- **Partial Matching**: Finds results with partial information

### Filtering System
```typescript
interface FilterOptions {
  status: 'all' | 'confirmed' | 'cancelled';
  showPastBookings: boolean;  // Today only
  dateRange: DateRange;       // Future implementation
}
```

#### Filter Logic
- **Status Filter**: Show confirmed, cancelled, or all bookings
- **Past Bookings Toggle**: Hide/show past bookings for current day
- **Automatic Defaults**: Smart defaults based on current date

### Smart Date Handling
```typescript
const isToday = selectedDate ? 
  format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd') : 
  false;

// Auto-hide past bookings for today, show all for other dates
useEffect(() => {
  if (isToday) {
    setShowPastBookings(false);
  } else {
    setShowPastBookings(true);
  }
}, [selectedDate]);
```

## Booking Operations

### Available Actions

#### Edit Booking
- **Access**: Edit button for all bookings (including past)
- **Interface**: Tabbed modal with conditional permissions
- **Validation**: Real-time validation and availability checking
- **Tracking**: Employee accountability for all changes

#### Cancel Booking
- **Restrictions**: Cannot cancel past bookings
- **Confirmation**: Modal with cancellation reason
- **Audit Trail**: Complete tracking of cancellation details
- **Notifications**: Automatic LINE message notifications

#### View History
- **Complete Audit**: Full change history for any booking
- **Change Tracking**: Shows what changed, when, and by whom
- **Snapshot Comparison**: Before/after booking state comparison

### Permission Matrix
```typescript
interface BookingPermissions {
  edit: {
    future: true,
    past: true,      // Limited to additional details
    cancelled: false
  },
  cancel: {
    future: true,
    past: false,
    cancelled: false
  },
  history: {
    all: true        // Always available
  }
}
```

## Responsive Design

### Desktop Layout
- **Table View**: Comprehensive table with all booking information
- **Fixed Header**: Sticky controls for easy access
- **Hover States**: Interactive elements with clear hover feedback
- **Bulk Selection**: Checkbox selection for bulk operations

### Mobile Layout
```typescript
// Mobile: Card-based layout
<div className="block md:hidden space-y-4">
  {bookingsForDisplay.map((booking) => (
    <BookingCard 
      key={booking.id} 
      booking={booking}
      onEdit={handleOpenEditModal}
      onCancel={handleOpenCancelModal}
      onHistory={handleOpenHistoryModal}
    />
  ))}
</div>

// Desktop: Table layout
<div className="hidden md:block overflow-x-auto">
  <BookingTable 
    bookings={bookingsForDisplay}
    actions={{ onEdit, onCancel, onHistory }}
  />
</div>
```

### Mobile Optimizations
- **Card Layout**: Stacked cards instead of table rows
- **Touch Targets**: Large, touch-friendly action buttons
- **Collapsed Information**: Expandable sections for detailed information
- **Gesture Support**: Swipe actions for common operations

## Integration Features

### Real-time Data
- **Automatic Refresh**: Periodic data updates
- **Live Status Updates**: Real-time booking status changes
- **Conflict Detection**: Immediate notification of scheduling conflicts

### Calendar Integration
- **Sync Status**: Visual indicators for calendar synchronization
- **Event Management**: Direct calendar event operations
- **Conflict Resolution**: Handle calendar sync issues

### Package System Integration
- **Package Status**: Real-time package information display
- **Usage Tracking**: Immediate package hour updates
- **Expiration Alerts**: Visual warnings for expiring packages

### Notification Integration
- **LINE Messaging**: Automatic notifications for booking changes
- **Staff Alerts**: Internal notification system
- **Success Feedback**: Confirmation messages for user actions

## User Interface Components

### Core Components

#### BookingTable
```typescript
interface BookingTableProps {
  bookings: BookingWithDisplayInfo[];
  onEdit: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onHistory: (bookingId: string) => void;
}
```

#### BookingCard (Mobile)
```typescript
interface BookingCardProps {
  booking: BookingWithDisplayInfo;
  onEdit: (booking: Booking) => void;
  onCancel: (booking: Booking) => void;
  onHistory: (bookingId: string) => void;
}
```

#### SearchAndFilter
```typescript
interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  showPastBookings: boolean;
  onPastBookingsToggle: (show: boolean) => void;
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}
```

### Modal Components

#### EditBookingModal
- **Tabbed Interface**: Main Information and Additional Details
- **Conditional Permissions**: Based on booking timing
- **Real-time Validation**: Availability and form validation
- **Change Tracking**: Automatic audit trail

#### CancelBookingModal
- **Confirmation Interface**: Reason selection and confirmation
- **Employee Tracking**: Required employee identification
- **Audit Integration**: Complete cancellation tracking

#### BookingHistoryModal
- **Change Timeline**: Chronological change history
- **Detail Comparison**: Before/after state comparison
- **Employee Attribution**: Track who made each change

## Performance Optimizations

### Data Management
```typescript
// Memoized booking processing
const bookingsForDisplay = useMemo(() => {
  return bookings
    .map(booking => ({
      ...booking,
      display_end_time: calculateEndTime(booking.date, booking.start_time, booking.duration)
    }))
    .filter(booking => {
      // Apply search and filter criteria
      return applyFilters(booking, { searchTerm, statusFilter, showPastBookings });
    });
}, [bookings, searchTerm, statusFilter, isToday, showPastBookings]);
```

### Rendering Optimizations
- **Virtual Scrolling**: For large booking lists
- **Lazy Loading**: Load booking details on demand
- **Memoization**: Prevent unnecessary re-renders
- **Debounced Search**: Optimize search performance

### API Optimizations
- **Pagination**: Load bookings in batches
- **Caching**: Cache frequently accessed data
- **Optimistic Updates**: Immediate UI feedback
- **Background Sync**: Update data in background

### Mobile Performance
- **Touch Optimization**: Optimized touch event handling
- **Memory Management**: Efficient memory usage on mobile
- **Network Awareness**: Adapt to network conditions
- **Battery Optimization**: Minimize battery usage

---

## Business Rules and Logic

### Booking Status Logic
```typescript
const isBookingInPast = (booking: Booking): boolean => {
  // Calculate booking end time including duration and date
  const bookingEndDateTime = calculateBookingEndDateTime(booking);
  return bookingEndDateTime < new Date();
};
```

### Action Availability
- **Edit Actions**: Available for all bookings with conditional permissions
- **Cancel Actions**: Only for future bookings
- **History Actions**: Always available

### Data Integrity
- **Validation**: Client-side and server-side validation
- **Conflict Detection**: Real-time scheduling conflict detection
- **Audit Trail**: Complete change tracking for compliance

---

**Last Updated**: July 2025  
**Version**: 1.0  
**Related Documentation**: 
- [Booking Editing](./BOOKING_EDITING.md)
- [Booking System](./BOOKING_SYSTEM.md)
- [Calendar Integration](./CALENDAR_INTEGRATION.md)