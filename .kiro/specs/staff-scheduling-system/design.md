# Staff Scheduling System Design

## Overview

The Staff Scheduling System provides a dual-interface solution: a mobile-first staff interface for schedule viewing and a desktop admin interface for schedule management. The system follows established patterns from the coaching system while being simplified for general staff operations.

## Architecture

### System Components

#### 1. Staff Interface (`/staff-schedule`)
- **Target Users**: All 4 staff members using shared account
- **Primary Device**: Mobile phones and tablets
- **Authentication**: Shared staff account with name selection
- **Key Features**: Personal and team schedule viewing, shift details, time clock integration

#### 2. Admin Interface (`/admin/staff-scheduling`)
- **Target Users**: Administrators only
- **Primary Device**: Desktop computers
- **Authentication**: Admin privileges required
- **Key Features**: Schedule creation, staff assignment, coverage analysis, reporting

### Database Design

#### Core Tables

```sql
-- Main schedule table - stores individual shift assignments
CREATE TABLE backoffice.staff_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id),
  schedule_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  UNIQUE(staff_id, schedule_date, start_time)
);

-- Optional: Weekly recurring patterns for admin convenience
CREATE TABLE backoffice.staff_weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id),
  day_of_week INTEGER NOT NULL,  -- 0-6 (Sunday-Saturday)
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  UNIQUE(staff_id, day_of_week, start_time)
);

-- Indexes for performance
CREATE INDEX idx_staff_schedules_date ON backoffice.staff_schedules(schedule_date);
CREATE INDEX idx_staff_schedules_staff_date ON backoffice.staff_schedules(staff_id, schedule_date);
CREATE INDEX idx_staff_weekly_schedules_staff ON backoffice.staff_weekly_schedules(staff_id, day_of_week);
```

#### Database Functions

```sql
-- Get staff schedule for a specific date range
CREATE OR REPLACE FUNCTION get_staff_schedule(
  p_staff_id INTEGER DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS TABLE (
  schedule_id UUID,
  staff_id INTEGER,
  staff_name TEXT,
  schedule_date DATE,
  start_time TIME,
  end_time TIME,
  location TEXT,
  notes TEXT,
  shift_color TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.staff_id,
    st.staff_name,
    s.schedule_date,
    s.start_time,
    s.end_time,
    s.location,
    s.notes,
    CASE 
      WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 6 AND 11 THEN '#06B6D4'  -- Morning
      WHEN EXTRACT(HOUR FROM s.start_time) BETWEEN 12 AND 17 THEN '#F59E0B' -- Afternoon
      ELSE '#EC4899'  -- Evening
    END as shift_color
  FROM backoffice.staff_schedules s
  JOIN backoffice.staff st ON s.staff_id = st.id
  WHERE (p_staff_id IS NULL OR s.staff_id = p_staff_id)
    AND s.schedule_date BETWEEN p_start_date AND p_end_date
    AND st.is_active = true
  ORDER BY s.schedule_date, s.start_time;
END;
$$ LANGUAGE plpgsql;
```

## Components and Interfaces

### Staff Interface Components

#### 1. Staff Name Selection (`StaffNameSelector`)
```typescript
interface StaffNameSelectorProps {
  onStaffSelect: (staffId: number, staffName: string) => void;
}

interface Staff {
  id: number;
  staff_name: string;
  profile_photo?: string;
}
```

**Features**:
- Displays all 4 active staff members
- Large touch-friendly selection cards
- Profile photos if available
- Stores selection in local state/session storage

#### 2. Horizontal Date Picker (`HorizontalDatePicker`)
```typescript
interface HorizontalDatePickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  scheduleIndicators: Record<string, 'single' | 'multiple'>;
}
```

**Features**:
- Shows 7 consecutive days
- Swipe navigation between weeks
- Visual indicators for scheduled days
- Current date highlighting
- Touch-friendly date selection

#### 3. Schedule Cards (`ScheduleCard`)
```typescript
interface ScheduleCardProps {
  schedule: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
    location: string;
    staffNames?: string[];
    notes?: string;
    color: string;
  };
  onCardTap: (scheduleId: string) => void;
  viewMode: 'personal' | 'team';
}
```

**Features**:
- Color coding based on start time
- Responsive card layout
- Staff photos for team view
- Touch interaction for details

#### 4. Shift Detail Modal (`ShiftDetailModal`)
```typescript
interface ShiftDetailModalProps {
  schedule: ScheduleDetail;
  isOpen: boolean;
  onClose: () => void;
  onClockInOut: () => void;
}

interface ScheduleDetail {
  date: Date;
  startTime: string;
  endTime: string;
  duration: string;
  location: string;
  teamMembers: Staff[];
  notes?: string;
}
```

**Features**:
- Comprehensive shift information
- Team member list
- Time clock integration button
- Notes display
- Modal overlay with close action

#### 5. Bottom Navigation (`BottomNavigation`)
```typescript
interface BottomNavigationProps {
  activeTab: 'personal' | 'team' | 'availability' | 'replacements';
  onTabChange: (tab: string) => void;
}
```

**Features**:
- Four navigation tabs
- Active state indication
- Smooth transitions
- Badge notifications (future)

### Admin Interface Components

#### 1. Schedule Dashboard (`ScheduleDashboard`)
```typescript
interface ScheduleDashboardProps {
  weekStart: Date;
  onWeekChange: (date: Date) => void;
}

interface ScheduleKPIs {
  totalStaff: number;
  scheduledShifts: number;
  openShifts: number;
  coveragePercentage: number;
}
```

**Features**:
- KPI cards display
- Weekly calendar grid
- Staff assignment overview
- Quick action buttons

#### 2. Schedule Grid (`ScheduleGrid`)
```typescript
interface ScheduleGridProps {
  weekStart: Date;
  schedules: ScheduleData[];
  onCellClick: (date: Date, timeSlot: string) => void;
  onScheduleEdit: (scheduleId: string) => void;
}
```

**Features**:
- 7-day weekly view
- Time slot organization
- Drag-and-drop functionality (future)
- Conflict highlighting
- Empty slot identification

#### 3. Schedule Form (`ScheduleForm`)
```typescript
interface ScheduleFormProps {
  schedule?: ScheduleData;
  staffList: Staff[];
  onSave: (schedule: ScheduleFormData) => void;
  onCancel: () => void;
}

interface ScheduleFormData {
  staffId: number;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  notes?: string;
}
```

**Features**:
- Staff selection dropdown
- Date and time pickers
- Location input
- Notes field
- Validation and conflict checking

## Data Models

### Core Data Structures

```typescript
// Staff schedule data model
interface StaffSchedule {
  id: string;
  staffId: number;
  staffName: string;
  scheduleDate: Date;
  startTime: string;
  endTime: string;
  location: string;
  notes?: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// Weekly schedule pattern
interface WeeklySchedule {
  id: string;
  staffId: number;
  dayOfWeek: number; // 0-6
  startTime: string;
  endTime: string;
  location: string;
  isActive: boolean;
}

// Schedule view data for UI
interface ScheduleViewData {
  date: Date;
  schedules: StaffSchedule[];
  hasMultipleShifts: boolean;
  totalStaffScheduled: number;
}

// Team schedule overview
interface TeamScheduleData {
  date: Date;
  staffSchedules: {
    staffId: number;
    staffName: string;
    shifts: StaffSchedule[];
    profilePhoto?: string;
  }[];
}
```

## Error Handling

### Client-Side Error Handling

```typescript
// Error boundary for schedule components
class ScheduleErrorBoundary extends React.Component {
  // Handle component errors gracefully
  // Show fallback UI for schedule failures
  // Log errors for debugging
}

// API error handling
interface ScheduleApiError {
  code: string;
  message: string;
  details?: any;
}

// Common error scenarios
enum ScheduleErrorCodes {
  SCHEDULE_CONFLICT = 'SCHEDULE_CONFLICT',
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  INVALID_TIME_RANGE = 'INVALID_TIME_RANGE',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DATABASE_ERROR = 'DATABASE_ERROR'
}
```

### Server-Side Error Handling

```typescript
// API error responses
interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
  path: string;
}

// Validation errors
interface ValidationError {
  field: string;
  message: string;
  value?: any;
}
```

## Testing Strategy

### Unit Testing

**Components to Test**:
- `StaffNameSelector` - Staff selection logic
- `HorizontalDatePicker` - Date navigation and indicators
- `ScheduleCard` - Display logic and color coding
- `ScheduleForm` - Validation and submission
- `ScheduleGrid` - Grid layout and data display

**Test Scenarios**:
- Staff name selection and state management
- Date picker navigation and week transitions
- Schedule card color coding based on start time
- Form validation for schedule creation
- Error handling for API failures

### Integration Testing

**API Endpoints**:
- `GET /api/staff-schedule/schedules` - Schedule retrieval
- `POST /api/admin/staff-scheduling/schedules` - Schedule creation
- `PUT /api/admin/staff-scheduling/schedules/[id]` - Schedule updates
- `DELETE /api/admin/staff-scheduling/schedules/[id]` - Schedule deletion

**Database Operations**:
- Schedule CRUD operations
- Conflict detection queries
- Date range filtering
- Staff relationship joins

### End-to-End Testing

**User Workflows**:
1. Staff selects name and views personal schedule
2. Staff switches to team view and sees all schedules
3. Staff taps shift card and views details
4. Admin creates new schedule assignment
5. Admin resolves scheduling conflicts
6. Time clock integration from schedule

## Performance Considerations

### Database Optimization

- **Indexing**: Proper indexes on frequently queried columns
- **Query Optimization**: Efficient date range queries
- **Connection Pooling**: Manage database connections effectively
- **Caching**: Cache frequently accessed schedule data

### Frontend Performance

- **Code Splitting**: Lazy load admin components
- **Data Caching**: Cache schedule data with SWR
- **Image Optimization**: Optimize staff profile photos
- **Bundle Size**: Minimize JavaScript bundle size

### Mobile Performance

- **Touch Response**: Optimize touch interactions
- **Offline Support**: Cache critical schedule data
- **Network Efficiency**: Minimize API calls
- **Battery Usage**: Efficient rendering and updates

## Security Considerations

### Access Control

- **Route Protection**: Middleware-based access control
- **API Security**: Proper authentication for all endpoints
- **Data Validation**: Server-side input validation
- **SQL Injection**: Parameterized queries only

### Data Privacy

- **Personal Information**: Limit access to personal schedule data
- **Audit Logging**: Log all schedule modifications
- **Session Management**: Secure session handling
- **HTTPS**: Enforce encrypted communications

## Integration Points

### Existing Systems

#### Staff Management System
- **Staff Data**: Use existing staff records and status
- **Authentication**: Integrate with current auth system
- **Profile Photos**: Use existing staff profile images

#### Time Clock System
- **Clock In/Out**: Direct integration with time clock APIs
- **PIN Authentication**: Use existing PIN system
- **Time Entries**: Create time entries linked to schedules

#### Admin Panel
- **Navigation**: Add scheduling to admin menu
- **Permissions**: Use existing admin role system
- **UI Consistency**: Match existing admin interface design

### Future Integrations

- **Payroll System**: Schedule data for payroll calculations
- **Notification System**: Schedule change notifications
- **Mobile App**: Native mobile application
- **Third-party Tools**: External scheduling integrations