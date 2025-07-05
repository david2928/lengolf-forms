# Google Calendar Replacement Planning Document

## Executive Summary

This document outlines a comprehensive plan to replace the Google Calendar integration in the Lengolf Forms application with a native, self-contained calendar solution. The replacement will eliminate external dependencies, improve mobile experience, and provide better control over booking management while maintaining all current functionality.

## Current State Analysis

### Architecture Understanding

**Source of Truth:**
- **`public.bookings` table** - Contains ALL booking data (id, name, email, phone_number, date, start_time, duration, bay, status, number_of_people, customer_notes, booking_type, package_name, etc.)
- **`calendar_events` JSONB field** - Stores Google Calendar event references for sync purposes
- **manage-bookings** - Fetches directly from database via `/api/bookings/list-by-date`
- **bookings-calendar** - Unnecessarily fetches from Google Calendar API instead of database

**Current Google Calendar Usage:**
- **Display Only**: bookings-calendar fetches from Google Calendar for visual display
- **External Sync**: Staff can view bookings in Google Calendar apps
- **Redundant Data Flow**: Creating bookings → Database → Google Calendar → bookings-calendar display
- **Availability Checking**: Uses Google Calendar API instead of database queries

**Current Architecture Issues:**
- **Unnecessary Complexity**: bookings-calendar could use same data source as manage-bookings
- **Performance**: Multiple Google API calls instead of simple database queries
- **Dependency**: External API dependency for internal calendar view
- **Inconsistency**: Two different data flows for similar functionality (manage vs calendar view)
- **Maintenance**: Complex Google Calendar integration for what's essentially a display preference

### Current Bookings Calendar Implementation

**Desktop View Features:**
- 3-column layout showing all bays simultaneously
- Time slots from 10:00 AM to 12:00 AM (14-hour view)
- Real-time booking display with customer information
- Bay-specific color coding
- Booking type icons (coaching, packages, vouchers)
- Date navigation with previous/next day buttons

**Mobile View Features:**
- Stacked bay cards with individual time grids
- Simplified bay names for space efficiency
- Smaller time slots with condensed information
- Same functionality but vertical layout

**Integration Points:**
- `/api/bookings/calendar/events` - Fetches events from Google Calendar (UNNECESSARY)
- `/api/bookings/list-by-date` - Direct database access (USED BY MANAGE-BOOKINGS)
- `src/lib/google-calendar.ts` - Core Google Calendar integration
- `src/lib/constants.ts` - Calendar IDs and color mappings

## Proposed Native Calendar Solution

### Phase 1: Database Migration (Calendar Display)

**Objective**: Replace Google Calendar data source with direct database queries while keeping same UI

#### 1.1 Replace Data Source
```typescript
// OLD: bookings-calendar fetches from Google Calendar API
const response = await fetch('/api/bookings/calendar/events', {
  method: 'POST',
  body: JSON.stringify({ bayNumber: bay, date: dateString }),
});

// NEW: bookings-calendar uses same endpoint as manage-bookings
const response = await fetch(`/api/bookings/list-by-date?date=${dateString}`);
const { bookings } = await response.json();
```

#### 1.2 Data Format Conversion
```typescript
// Convert Booking objects to calendar display format
function formatBookingForCalendar(booking: Booking): CalendarEvent {
  return {
    id: booking.id,
    start: `${booking.date}T${booking.start_time}:00`,
    end: calculateEndTime(booking.date, booking.start_time, booking.duration),
    customer_name: booking.name,
    booking_type: booking.booking_type || 'Bay Rate',
    package_name: booking.package_name,
    number_of_pax: booking.number_of_people.toString(),
    bay: booking.bay,
    color: getBayColor(booking.bay),
    summary: `${booking.name} (${booking.phone_number}) (${booking.number_of_people}) - ${booking.booking_type}`
  };
}
```

#### 1.3 Keep Existing UI (For Now)
- Maintain current calendar layout and styling
- Keep existing time grid and bay columns
- Same mobile/desktop responsive behavior
- **Focus only on data source change, not UI changes**

### Phase 2: Enhanced Calendar Features (Make it Better than Google Calendar)

**Objective**: Create superior calendar experience using database data while keeping Google Calendar availability

#### 2.1 Dual View Toggle Implementation
```typescript
// Enhanced calendar with view options
<CalendarContainer>
  <CalendarHeader>
    <ViewToggle>
      <ViewOption value="side-by-side">Side by Side</ViewOption>
      <ViewOption value="traditional">Traditional</ViewOption>
    </ViewToggle>
    <DateNavigation />
  </CalendarHeader>
  <CalendarGrid viewMode={viewMode} />
</CalendarContainer>
```

**Side-by-Side View Features:**
- Compress bay columns for mobile landscape
- Horizontal scrolling for additional bays
- Space-efficient time axis
- Better bay utilization visibility
- Optimized for tablet/desktop use

**Traditional View Features:**
- Enhanced mobile portrait experience
- Larger booking cards with more details
- Swipe gestures for day navigation
- Pull-to-refresh functionality

#### 2.2 Click-to-Edit Integration
```typescript
// Integrate manage-bookings functionality directly in calendar
<CalendarEvent 
  booking={booking}
  onClick={() => openQuickEditModal(booking)}
  onLongPress={() => showContextMenu(booking)}
>
  <BookingCard booking={booking} />
</CalendarEvent>

// Quick edit modal (reuse manage-bookings components)
<QuickEditModal>
  <EditBookingForm booking={selectedBooking} />
  <CancelBookingOption />
  <DuplicateBookingOption />
  <ViewCustomerHistory />
</QuickEditModal>
```

#### 2.3 Enhanced Mobile Experience
```typescript
// Better mobile interactions and space efficiency
const MobileOptimizedCalendar = () => (
  <ResponsiveCalendar>
    {/* Portrait: Traditional stacked view */}
    <PortraitView>
      <TimeSlots orientation="vertical" />
      <BookingCards size="large" showDetails />
    </PortraitView>
    
    {/* Landscape: Side-by-side view */}
    <LandscapeView>
      <CompactTimeAxis />
      <BayColumns compressed showMore />
    </LandscapeView>
  </ResponsiveCalendar>
)
```

**Mobile Features:**
- Gesture navigation (swipe for days, pinch for zoom)
- Touch-optimized booking interactions
- Context menus for quick actions
- Haptic feedback for confirmations
- Offline-first with data caching

### Phase 3: Native Availability Logic

**Objective**: Replace Google Calendar availability checking with database-based logic

#### 3.1 Database Availability Checking
```typescript
// Replace Google Calendar API availability checks
async function checkSlotAvailability(
  date: string,
  bay: string, 
  startTime: string,
  duration: number,
  excludeBookingId?: string
): Promise<boolean> {
  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('start_time, duration')
    .eq('date', date)
    .eq('bay', bay)
    .eq('status', 'confirmed')
    .neq('id', excludeBookingId || ''); // Exclude current booking when editing

  return !hasTimeConflict(startTime, duration, conflictingBookings);
}

function hasTimeConflict(
  newStart: string, 
  newDuration: number, 
  existingBookings: Array<{start_time: string, duration: number}>
): boolean {
  const newStartMinutes = timeToMinutes(newStart);
  const newEndMinutes = newStartMinutes + (newDuration * 60);
  
  return existingBookings.some(booking => {
    const existingStart = timeToMinutes(booking.start_time);
    const existingEnd = existingStart + (booking.duration * 60);
    
    // Check for overlap
    return newStartMinutes < existingEnd && newEndMinutes > existingStart;
  });
}
```

#### 3.2 Update Booking Forms
```typescript
// Update availability checking in:
// - create-booking form
// - manage-bookings edit modal
// - any other availability checks

// Replace this Google Calendar call:
const response = await fetch('/api/bookings/check-slot-for-all-bays', {...});

// With this database call:
const isAvailable = await checkSlotAvailability(date, bay, startTime, duration);
```

#### 3.3 Enhanced Availability Features
```typescript
// New database-only features we can easily add:
class AvailabilityService {
  // Get all available time slots for a bay on a date
  async getAvailableSlots(date: string, bay: string): Promise<TimeSlot[]>
  
  // Check availability across all bays
  async getAllBayAvailability(date: string, startTime: string, duration: number): Promise<BayAvailability[]>
  
  // Get suggested alternative times if slot is unavailable
  async getSuggestedAlternatives(date: string, bay: string, startTime: string, duration: number): Promise<TimeSlot[]>
}
```

### Phase 4: Complete Google Calendar Removal

**Objective**: Remove all Google Calendar code and dependencies

#### 4.1 Remove Google Calendar Integration
```typescript
// Remove these files/functions:
- src/lib/google-calendar.ts (entire file)
- Google Calendar authentication setup
- calendar_events JSONB field references
- Any remaining Google Calendar API calls

// Update these APIs:
- Remove /api/bookings/calendar/events
- Update /api/bookings/create to remove Google Calendar sync
- Update /api/bookings/[bookingId]/route to remove Google Calendar updates
```

#### 4.2 Clean Up Authentication
```typescript
// Remove from NextAuth configuration:
- Google Calendar OAuth scopes
- Google Calendar client credentials
- Calendar-related session data

// Remove environment variables:
- GOOGLE_CALENDAR_*
- Any calendar-related config
```

#### 4.3 Optional: Staff Export Features
```typescript
// For staff who want personal calendar sync:
class PersonalCalendarExport {
  // One-way export to ICS files
  async exportToICS(dateRange: DateRange): Promise<string>
  
  // PDF schedule reports
  async generatePDFSchedule(date: string): Promise<Buffer>
  
  // Email schedule notifications
  async emailDailySchedule(staffEmail: string): Promise<void>
}
```

## Technical Implementation Details

### New Component Architecture

```
src/components/calendar/
├── CalendarContainer.tsx          # Main calendar wrapper
├── CalendarHeader.tsx             # Date navigation and view toggle
├── CalendarGrid.tsx               # Time slot grid layout
├── CalendarEvent.tsx              # Individual booking display
├── QuickEditModal.tsx             # Inline booking editing
├── AvailabilityIndicator.tsx      # Slot availability display
├── BayColumn.tsx                  # Individual bay display
├── TimeAxis.tsx                   # Time labels and grid lines
├── ViewToggle.tsx                 # Side-by-side/traditional toggle
└── hooks/
    ├── useCalendarData.ts         # Calendar data fetching
    ├── useCalendarView.ts         # View state management
    ├── useBookingActions.ts       # Booking CRUD operations
    └── useAvailability.ts         # Availability checking
```

### Database Performance Optimizations

```sql
-- Optimized indexes for calendar queries
CREATE INDEX idx_bookings_date_bay ON public.bookings(date, bay);
CREATE INDEX idx_bookings_start_time ON public.bookings(start_time);
CREATE INDEX idx_calendar_events_datetime ON public.calendar_events(start_datetime, end_datetime);
CREATE INDEX idx_calendar_events_bay_date ON public.calendar_events(bay, start_datetime);

-- Materialized view for complex calendar queries
CREATE MATERIALIZED VIEW calendar_summary AS
SELECT 
  date,
  bay,
  COUNT(*) as booking_count,
  ARRAY_AGG(booking_id) as booking_ids,
  MIN(start_time) as first_booking,
  MAX(start_time) as last_booking
FROM public.bookings 
WHERE status = 'confirmed'
GROUP BY date, bay;

-- Refresh strategy for materialized view
CREATE OR REPLACE FUNCTION refresh_calendar_summary()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY calendar_summary;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
```

### Caching Strategy

```typescript
// Multi-level caching approach
class CalendarCache {
  // In-memory cache for current day
  private memoryCache: Map<string, CalendarEvent[]>
  
  // Redis cache for frequently accessed dates
  private redisCache: RedisClient
  
  // Browser cache for client-side optimization
  private browserCache: Map<string, CachedData>
  
  async getEvents(date: string, bays: string[]): Promise<CalendarEvent[]> {
    // 1. Check memory cache first
    // 2. Check Redis cache
    // 3. Query database
    // 4. Cache results at all levels
  }
  
  async invalidateCache(bookingId: string): Promise<void> {
    // Invalidate all caches for affected dates/bays
  }
}
```

## Migration Strategy

### Phase 1: Parallel Development (4-6 weeks)
**Week 1-2:**
- Implement enhanced calendar views with toggle
- Create QuickEditModal component
- Add mobile gesture support

**Week 3-4:**
- Implement side-by-side view optimization
- Add touch interactions and animations
- Performance testing and optimization

**Week 5-6:**
- User testing and feedback integration
- Bug fixes and refinements
- Documentation updates

### Phase 2: Database Integration (1-2 weeks)
**Week 1:**
- Modify bookings-calendar to use `/api/bookings/list-by-date` instead of Google Calendar API
- Add simple database-based availability checking
- Update calendar formatting to work with Booking objects

**Week 2:**
- Performance testing and optimization
- Bug fixes and integration testing
- Deploy and monitor

### Phase 3: Complete Google Calendar Removal
**Week 1:**
- Remove all Google Calendar API calls from booking creation
- Implement native database availability checking
- Update booking flow to be database-only

**Week 2:**
- Remove Google Calendar authentication and related code
- Clean up calendar_events JSONB field usage
- Update availability checking in booking forms

**Week 3:**
- Final testing of Google-Calendar-free system
- Staff training on new native calendar
- Performance validation

### Phase 4: Advanced Features (2-3 weeks)
**Week 1:**
- Implement ICS export functionality
- Add drag & drop calendar features
- Create advanced availability checking

**Week 2-3:**
- Add booking templates and productivity features
- Bay utilization analytics
- Final polish and staff training

## Risk Mitigation

### Technical Risks
1. **Performance Issues with Database Queries**
   - Mitigation: Proper indexing, query optimization, caching with SWR
   - Rollback: Google Calendar still works during Phase 1-2 if needed

2. **Availability Logic Complexity**
   - Mitigation: Start with simple time conflict detection, iterate improvements
   - Rollback: Temporary manual availability checking if automated fails

3. **Staff Adoption of New Interface**
   - Mitigation: Maintain familiar calendar layout, gradual feature introduction
   - Rollback: Previous calendar interface can be restored quickly

### Business Risks
1. **Operational Disruption**
   - Mitigation: Keep manage-bookings working (same data source), phased migration
   - Rollback: Database is still intact, can revert calendar display logic

2. **Loss of External Calendar Access**
   - Mitigation: Provide ICS export for staff personal calendars
   - Alternative: Staff can use native calendar + periodic PDF/ICS exports

## Success Metrics

### Performance Metrics
- Page load time improvement: Target 50% faster than current
- Mobile responsiveness: < 100ms interaction response time
- Database query performance: < 50ms average response time
- Cache hit ratio: > 90% for frequently accessed data

### User Experience Metrics
- Staff satisfaction score: > 8/10
- Booking creation time: < 30 seconds average
- Error rate: < 1% of operations
- Mobile usage increase: Target 40% increase in mobile bookings

### Business Metrics
- Reduced operational costs: Eliminate Google Calendar API costs
- Increased booking efficiency: 25% faster booking management
- Enhanced reliability: 99.9% uptime target
- Feature utilization: > 80% staff using new features within 30 days

## Resource Requirements

### Development Team
- **Frontend Developer**: 1 FTE for 8-10 weeks
- **Backend Developer**: 0.5 FTE for 6-8 weeks
- **UI/UX Designer**: 0.25 FTE for 2-3 weeks
- **QA Tester**: 0.5 FTE for 4-5 weeks

### Infrastructure
- Database optimization and additional indexes
- Redis cache implementation (optional)
- Additional monitoring tools for performance tracking
- Backup and disaster recovery enhancements

### Training and Documentation
- Staff training materials and sessions
- Updated user documentation
- Technical documentation for maintenance
- Video tutorials for new features

## Conclusion

The replacement of Google Calendar with a native solution will provide Lengolf Forms with better control, improved performance, enhanced mobile experience, and reduced external dependencies. The phased approach ensures minimal disruption while delivering immediate value through enhanced calendar views and integrated booking management.

The implementation will transform the calendar from a simple viewing tool into a comprehensive booking management interface, significantly improving operational efficiency for the golf academy staff while maintaining all current functionality and adding powerful new capabilities.

**Estimated Total Timeline**: 6-8 weeks (significantly reduced due to reusing existing database architecture)
**Estimated Development Cost**: Low-Medium (equivalent to 0.5-1 FTE months)
**Risk Level**: Low (minimal changes to existing working system)
**Business Impact**: High (improved efficiency, reduced costs, better user experience)

## Key Insight: Simplified Architecture

The major realization is that **the calendar should use the same data source as manage-bookings** - the `public.bookings` table is already the complete source of truth. The Google Calendar integration is only needed for external staff synchronization, not for the internal calendar display.

**Immediate Benefits of This Approach:**
- **90% Less Code**: Reuse existing `/api/bookings/list-by-date` endpoint
- **Better Performance**: Direct database queries instead of Google API calls  
- **Consistent Data**: Same source as manage-bookings ensures consistency
- **Simplified Maintenance**: Remove complex Google Calendar display logic
- **Enhanced Features**: Easy to add click-to-edit since data structure already supports it 