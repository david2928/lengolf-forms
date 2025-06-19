# Staff Time Clock - Development Plan

## Project Overview
Implement a PIN-based staff time clock system with photo capture for the Lengolf Forms golf academy management platform. Staff will use a shared tablet to clock in/out using 6-digit PINs, with front-facing camera photo capture for security.

## Development Phases

### Phase 1: Core Infrastructure (MVP)
**Sprint Duration**: 2 weeks  
**Epic**: Staff Time Clock Foundation

---

## PHASE 1 STORIES

### Story 1: Database Schema & Backend Foundation
**Story ID**: STAFF-001  
**Epic**: Staff Time Clock Foundation  
**Story Points**: 8  
**Priority**: Highest  
**Assignee**: Backend Developer

#### Description
Create the database schema and core backend infrastructure for staff management and time tracking.

#### Acceptance Criteria
- [ ] Create `backoffice.staff` table with proper RLS policies
- [ ] Create `backoffice.time_entries` table with foreign key relationships
- [ ] Create `backoffice.staff_audit_log` table for audit trail
- [ ] Create `backoffice.staff_status` view for current status checking
- [ ] Implement PIN hashing using bcrypt
- [ ] Create database functions for time entry operations
- [ ] Add proper indexes for performance
- [ ] Test database schema with sample data

#### Technical Requirements
```sql
-- Database tables as specified in requirements
-- RLS policies for backoffice schema security
-- Proper foreign key constraints
-- Indexes on frequently queried columns (pin_hash, staff_id, timestamp)
```

#### Definition of Done
- All tables created with proper constraints
- RLS policies implemented and tested
- Database functions work correctly
- Performance tested with sample data
- Code reviewed and approved

---

### Story 2: Staff Management API Endpoints
**Story ID**: STAFF-002  
**Epic**: Staff Time Clock Foundation  
**Story Points**: 5  
**Priority**: High  
**Dependencies**: STAFF-001  
**Assignee**: Backend Developer

#### Description
Implement API endpoints for staff CRUD operations following existing API patterns.

#### Acceptance Criteria
- [ ] `GET /api/staff` - List all staff members
- [ ] `POST /api/staff` - Create new staff member
- [ ] `GET /api/staff/[staffId]` - Get individual staff details
- [ ] `PUT /api/staff/[staffId]` - Update staff information
- [ ] `DELETE /api/staff/[staffId]` - Deactivate staff member
- [ ] `POST /api/staff/reset-pin` - Admin PIN reset functionality
- [ ] Proper error handling and validation
- [ ] Admin authentication required for all endpoints

#### Technical Requirements
- Follow existing API patterns from `/api/customers/` and `/api/packages/`
- Use `refacSupabaseAdmin` for admin operations
- Implement proper TypeScript interfaces
- Add audit logging for all PIN changes
- Hash PINs before storing in database

#### Definition of Done
- All endpoints implemented and tested
- Error handling covers edge cases
- Admin authentication enforced
- Audit logging working
- API documentation updated

---

### Story 3: Time Clock API Endpoints
**Story ID**: STAFF-003  
**Epic**: Staff Time Clock Foundation  
**Story Points**: 8  
**Priority**: High  
**Dependencies**: STAFF-001, STAFF-002  
**Assignee**: Backend Developer

#### Description
Implement the core time clock functionality with PIN verification and automatic clock in/out logic.

#### Acceptance Criteria
- [ ] `POST /api/time-clock/punch` - Handle PIN input and determine clock in/out
- [ ] `GET /api/time-clock/status/[pin]` - Check staff current status
- [ ] `GET /api/time-clock/entries` - Get time entries for reporting
- [ ] Implement single PIN logic (auto-determines clock in vs out)
- [ ] Handle failed attempt tracking and 60-second lockout
- [ ] Support photo upload with graceful camera failure
- [ ] Return proper success/error messages

#### Business Logic Requirements
```typescript
// Core punch logic
if (currently_clocked_in) {
  action = 'clock_out';
  message = `Goodbye ${staff_name}! Clocked out at ${time}`;
} else {
  action = 'clock_in';
  message = `Welcome ${staff_name}! Clocked in at ${time}`;
}
```

#### Lockout Logic
- Track failed attempts per staff member
- Warning message on 9th failed attempt
- 60-second lockout after 10th failed attempt
- Auto-reset after 60 seconds
- Clear failed attempts counter on successful PIN entry

#### Definition of Done
- PIN verification working correctly
- Clock in/out logic functioning
- Lockout mechanism implemented
- Photo upload handling (with graceful failure)
- Error messages user-friendly
- All edge cases covered

---

### Story 4: Staff Management Admin Interface
**Story ID**: STAFF-004  
**Epic**: Staff Time Clock Foundation  
**Story Points**: 5  
**Priority**: Medium  
**Dependencies**: STAFF-002  
**Assignee**: Frontend Developer

#### Description
Create admin interface for managing staff members within the existing admin panel.

#### Acceptance Criteria
- [ ] Add "Staff Management" card to admin dashboard
- [ ] Create `/admin/staff-management` page
- [ ] List all staff members with status (active/inactive)
- [ ] Add new staff form with name and PIN
- [ ] Edit staff details (name, PIN reset)
- [ ] Deactivate/reactivate staff members
- [ ] Show lockout status and ability to unlock
- [ ] Responsive design matching existing admin pages

#### UI Requirements
- Follow existing admin panel design patterns
- Use existing UI components (Card, Button, Input, etc.)
- Table layout for staff list
- Modal for add/edit forms
- Confirmation dialogs for destructive actions

#### Definition of Done
- Staff management page fully functional
- CRUD operations working
- UI matches existing admin design
- Responsive on tablet/desktop
- Error handling with user feedback

---

### Story 5: Time Clock User Interface
**Story ID**: STAFF-005  
**Epic**: Staff Time Clock Foundation  
**Story Points**: 8  
**Priority**: High  
**Dependencies**: STAFF-003  
**Assignee**: Frontend Developer

#### Description
Create the main time clock interface for staff to clock in/out using PINs.

#### Acceptance Criteria
- [ ] Create `/time-clock` page accessible from main navigation
- [ ] Large numeric keypad (0-9) for tablet use
- [ ] PIN input field with masked display (dots)
- [ ] Submit and Clear buttons
- [ ] Camera consent notice
- [ ] Success/error message display
- [ ] Auto-clear PIN input after 10 seconds of inactivity
- [ ] Front-facing camera photo capture
- [ ] Graceful camera failure handling

#### UI Specifications
```
┌─────────────────────────────────────┐
│        Staff Time Clock             │
│                                     │
│ Enter your PIN to clock in or out   │
│                                     │
│         ● ● ● ● ● ●                 │
│                                     │
│   ┌───┐ ┌───┐ ┌───┐                │
│   │ 1 │ │ 2 │ │ 3 │                │
│   └───┘ └───┘ └───┘                │
│   ┌───┐ ┌───┐ ┌───┐                │
│   │ 4 │ │ 5 │ │ 6 │                │
│   └───┘ └───┘ └───┘                │
│   ┌───┐ ┌───┐ ┌───┐                │
│   │ 7 │ │ 8 │ │ 9 │                │
│   └───┘ └───┘ └───┘                │
│   ┌───┐ ┌───┐ ┌───┐                │
│   │CLR│ │ 0 │ │SUB│                │
│   └───┘ └───┘ └───┘                │
│                                     │
│ By clicking Submit, you consent to  │
│ your photo being captured for       │
│ security purposes.                  │
└─────────────────────────────────────┘
```

#### Camera Integration
- Request camera permission on first use
- Capture photo on submit (front-facing camera)
- Show visual confirmation of photo capture
- Continue with clock-in even if camera fails
- Store camera error in database for reporting

#### Definition of Done
- Time clock interface fully functional
- PIN input and keypad working
- Camera capture implemented
- Auto-clear functionality working
- Success/error messages displayed
- Mobile/tablet optimized

---

### Story 6: Add Time Clock to Main Navigation
**Story ID**: STAFF-006  
**Epic**: Staff Time Clock Foundation  
**Story Points**: 2  
**Priority**: Medium  
**Dependencies**: STAFF-005  
**Assignee**: Frontend Developer

#### Description
Add Staff Time Clock option to the main application navigation and homepage.

#### Acceptance Criteria
- [ ] Add "Staff Time Clock" to `src/config/menu-items.ts`
- [ ] Update main page (`app/page.tsx`) to include time clock card
- [ ] Add appropriate icon (Clock icon)
- [ ] Ensure navigation works on mobile/tablet
- [ ] Update navigation component if needed

#### UI Requirements
- Follow existing card design on main page
- Use Clock icon from Lucide React
- Card description: "Clock in/out for staff members"
- Position logically with other operational features

#### Definition of Done
- Time clock accessible from main page
- Navigation working correctly
- Icon and styling consistent
- Mobile navigation updated

---

## PHASE 2 STORIES

### Phase 2: Reporting & Notifications
**Sprint Duration**: 1.5 weeks  
**Epic**: Staff Time Clock Enhanced Features

---

### Story 7: Time Reports Admin Interface
**Story ID**: STAFF-007  
**Epic**: Staff Time Clock Enhanced Features  
**Story Points**: 8  
**Priority**: Medium  
**Dependencies**: STAFF-004, STAFF-003  
**Assignee**: Frontend Developer

#### Description
Create comprehensive time reporting interface for administrators.

#### Acceptance Criteria
- [ ] Create `/admin/time-reports` page
- [ ] Date range filtering (start/end date)
- [ ] Staff member filtering (dropdown/multi-select)
- [ ] Display time entries in table format
- [ ] Show daily/weekly hour totals per staff
- [ ] Highlight overtime entries (>8 hours/day, >48 hours/week)
- [ ] Export to CSV functionality
- [ ] Show camera failure incidents
- [ ] Pagination for large datasets

#### Reporting Features
- Daily view: Show all entries for selected date
- Weekly view: Show weekly summaries with totals
- Staff view: Show all entries for specific staff member
- Export formats: CSV with all relevant data
- Overtime alerts: Visual highlighting of overtime entries

#### Definition of Done
- Reporting page fully functional
- All filtering options working
- Export functionality implemented
- Overtime calculation correct
- Performance optimized for large datasets

---

### Story 8: Weekly LINE Notifications
**Story ID**: STAFF-008  
**Epic**: Staff Time Clock Enhanced Features  
**Story Points**: 5  
**Priority**: Medium  
**Dependencies**: STAFF-003, existing LINE integration  
**Assignee**: Backend Developer

#### Description
Implement weekly staff summary reports sent via LINE messaging system.

#### Acceptance Criteria
- [ ] Create `/api/time-clock/weekly-report` endpoint
- [ ] Generate weekly summary data (hours per staff, overtime, issues)
- [ ] Integrate with existing LINE messaging system
- [ ] Schedule weekly reports (configurable day/time)
- [ ] Include overtime alerts in reports
- [ ] Track camera failures and PIN lockouts
- [ ] Format report for readability

#### Report Content
```
📊 Weekly Staff Report (Jan 13-19, 2025)

👥 Staff Hours:
• John Smith: 42.5h
• Jane Doe: 38.0h  
• Bob Wilson: 45.5h

⚠️ Overtime Alerts:
• John Smith: 9.5h on Jan 15
• Bob Wilson: 10h on Jan 17

📷 Camera Issues: 3 incidents
🔒 PIN Lockouts: 1 account

Total Hours: 126h
```

#### Definition of Done
- Weekly report generation working
- LINE integration functional
- Report format user-friendly
- Scheduling mechanism implemented
- Error handling for notification failures

---

### Story 9: Photo Management & Cleanup
**Story ID**: STAFF-009  
**Epic**: Staff Time Clock Enhanced Features  
**Story Points**: 5  
**Priority**: Medium  
**Dependencies**: STAFF-005  
**Assignee**: Backend Developer

#### Description
Implement photo storage, management, and automated cleanup system.

#### Acceptance Criteria
- [ ] Store photos in Supabase Storage with organized folder structure
- [ ] Create database function for monthly photo cleanup
- [ ] Implement cleanup job (30-day retention)
- [ ] Add photo viewing capability in admin interface
- [ ] Handle photo upload errors gracefully
- [ ] Implement photo access controls (admin only)
- [ ] Create manual cleanup endpoint for admin

#### Photo Management Requirements
- Folder structure: `time-clock-photos/YYYY/MM/`
- File naming: `{staff_id}_{timestamp}_{action}.jpg`
- Automatic cleanup after 30 days
- Admin-only access to photos
- Graceful handling of storage errors

#### Definition of Done
- Photo storage working correctly
- Cleanup automation implemented
- Admin photo viewing functional
- Error handling comprehensive
- Storage access controls enforced

---

## PHASE 3 STORIES (Future Enhancements)

### Story 10: Advanced Analytics Dashboard
**Story ID**: STAFF-010  
**Story Points**: 13  
**Priority**: Low

#### Description
Create advanced analytics dashboard for staff time tracking with charts and insights.

#### Features
- Staff productivity metrics
- Peak hours analysis
- Attendance patterns
- Cost analysis (if hourly rates added)
- Trend analysis over time

---

### Story 11: Shift Scheduling Integration
**Story ID**: STAFF-011  
**Story Points**: 21  
**Priority**: Low

#### Description
Integrate staff time tracking with shift scheduling system.

#### Features
- Scheduled vs. actual hours comparison
- Early/late arrival tracking
- Shift change notifications
- Schedule adherence reporting

---

## Technical Implementation Notes

### Database Indexes
```sql
-- Performance indexes
CREATE INDEX idx_time_entries_staff_timestamp ON backoffice.time_entries(staff_id, timestamp DESC);
CREATE INDEX idx_time_entries_timestamp ON backoffice.time_entries(timestamp DESC);
CREATE INDEX idx_staff_pin_hash ON backoffice.staff(pin_hash);
CREATE INDEX idx_staff_active ON backoffice.staff(is_active);
```

### TypeScript Interfaces
```typescript
interface Staff {
  id: number;
  staff_name: string;
  staff_id?: string;
  is_active: boolean;
  failed_attempts: number;
  locked_until?: string;
  created_at: string;
  updated_at: string;
}

interface TimeEntry {
  id: number;
  staff_id: number;
  action: 'clock_in' | 'clock_out';
  timestamp: string;
  photo_url?: string;
  photo_captured: boolean;
  camera_error?: string;
  device_info?: any;
}

interface StaffStatus {
  id: number;
  staff_name: string;
  staff_id?: string;
  last_action_time?: string;
  last_action?: 'clock_in' | 'clock_out';
  currently_clocked_in: boolean;
}
```

### Error Handling Standards
- Invalid PIN: "PIN not recognized. Please try again."
- 9th failed attempt: "⚠️ WARNING: Account will be locked after 1 more failed attempt"
- Account locked: "Account temporarily locked. Please try again in 60 seconds."
- Camera failure: "Camera unavailable - clocking in without photo"
- Network error: "Connection error - please try again"

### Security Considerations
- PIN hashing using bcrypt with salt rounds >= 10
- Admin-only access to staff management
- Photo access restricted to admin users
- Audit logging for all sensitive operations
- RLS policies on all backoffice tables
- Input validation on all endpoints

---

## Sprint Planning Summary

### Sprint 1 (Week 1-2): Foundation
- STAFF-001: Database Schema & Backend Foundation (8 pts)
- STAFF-002: Staff Management API Endpoints (5 pts)
- STAFF-003: Time Clock API Endpoints (8 pts)
- **Sprint Total**: 21 points

### Sprint 2 (Week 3-4): User Interfaces  
- STAFF-004: Staff Management Admin Interface (5 pts)
- STAFF-005: Time Clock User Interface (8 pts)
- STAFF-006: Add Time Clock to Main Navigation (2 pts)
- **Sprint Total**: 15 points

### Sprint 3 (Week 5-6): Enhanced Features
- STAFF-007: Time Reports Admin Interface (8 pts)
- STAFF-008: Weekly LINE Notifications (5 pts)
- STAFF-009: Photo Management & Cleanup (5 pts)
- **Sprint Total**: 18 points

**Total Project Estimate**: 54 story points (6 weeks)

---

## Risk Assessment & Mitigation

### High Risk Items
1. **Camera Permission Issues**: Browser compatibility and permission persistence
   - **Mitigation**: Graceful fallback, clear user instructions, fallback to clock-in without photo

2. **PIN Security**: 6-digit PINs may be guessable
   - **Mitigation**: Lockout mechanism, audit logging, admin monitoring

3. **Tablet Hardware Reliability**: Shared device wear and tear
   - **Mitigation**: Error handling, offline capabilities (future), device monitoring

### Medium Risk Items
1. **Photo Storage Costs**: Large number of photos over time
   - **Mitigation**: Automated cleanup, compressed images, retention policies

2. **Network Connectivity**: Tablet connectivity issues
   - **Mitigation**: Error handling, retry mechanisms, clear user feedback

## Success Criteria
- [ ] Staff can successfully clock in/out using 6-digit PINs
- [ ] Photos captured successfully >90% of the time
- [ ] Admin can manage staff and view reports
- [ ] System handles 50+ clock-ins per day without performance issues
- [ ] Photo cleanup automation working correctly
- [ ] Weekly LINE reports delivered successfully 