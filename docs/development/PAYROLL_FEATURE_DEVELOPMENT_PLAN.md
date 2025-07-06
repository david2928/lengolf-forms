# Run Payroll Feature Development Plan

## Overview

This document outlines the development plan for implementing a "Run Payroll" feature within the existing admin/time-clock page. The feature will provide comprehensive payroll processing capabilities including time entry review, overtime calculations, holiday pay, and service charge distribution.

## Table of Contents
1. [Database Schema Extensions](#database-schema-extensions)
2. [API Endpoints Architecture](#api-endpoints-architecture)
3. [UI Component Structure](#ui-component-structure)
4. [Business Logic Implementation](#business-logic-implementation)
5. [Integration with Existing System](#integration-with-existing-system)
6. [Data Flow Architecture](#data-flow-architecture)
7. [Implementation Phases](#implementation-phases)
8. [Technical Considerations](#technical-considerations)

## Database Schema Extensions

### 1.1 New Tables Required

#### Public Holidays Table
```sql
-- Public holidays table
CREATE TABLE backoffice.public_holidays (
  id SERIAL PRIMARY KEY,
  holiday_date DATE NOT NULL UNIQUE,
  holiday_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Staff Compensation Settings
```sql
-- Staff compensation settings
CREATE TABLE backoffice.staff_compensation (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id),
  base_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  ot_rate_per_hour DECIMAL(8,2) NOT NULL DEFAULT 0,
  holiday_rate_per_hour DECIMAL(8,2) NOT NULL DEFAULT 0,
  is_service_charge_eligible BOOLEAN DEFAULT false,
  effective_from DATE NOT NULL,
  effective_to DATE, -- NULL means currently active
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll system settings
CREATE TABLE backoffice.payroll_settings (
  id SERIAL PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default allowance setting
INSERT INTO backoffice.payroll_settings (setting_key, setting_value, description) 
VALUES ('daily_allowance_thb', '0', 'Daily allowance in THB for working days (>=6 hours)');
```

#### Monthly Payroll Runs
```sql
-- Monthly payroll runs
CREATE TABLE backoffice.payroll_runs (
  id SERIAL PRIMARY KEY,
  month_year TEXT NOT NULL, -- Format: "2024-06"
  total_service_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_charge_per_eligible_staff DECIMAL(10,2) GENERATED ALWAYS AS (
    CASE 
      WHEN eligible_staff_count > 0 THEN total_service_charge / eligible_staff_count
      ELSE 0
    END
  ) STORED,
  eligible_staff_count INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'review', 'finalized')) DEFAULT 'draft',
  created_by TEXT NOT NULL, -- Admin email
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  UNIQUE(month_year)
);
```

#### Payroll Entries (Calculated Results)
```sql
-- Payroll entries (calculated results)
CREATE TABLE backoffice.payroll_entries (
  id SERIAL PRIMARY KEY,
  payroll_run_id INTEGER NOT NULL REFERENCES backoffice.payroll_runs(id),
  staff_id INTEGER NOT NULL REFERENCES backoffice.staff(id),
  base_salary DECIMAL(10,2) NOT NULL,
  working_days INTEGER NOT NULL DEFAULT 0,
  total_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
  ot_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  ot_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  holiday_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  holiday_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  service_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_payout DECIMAL(10,2) GENERATED ALWAYS AS (
    base_salary + total_allowance + ot_pay + holiday_pay + service_charge
  ) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(payroll_run_id, staff_id)
);
```

### 1.2 Table Modifications

```sql
-- Add service charge eligibility to existing staff table
ALTER TABLE backoffice.staff 
ADD COLUMN is_service_charge_eligible BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX idx_time_entries_month_staff ON backoffice.time_entries(
  DATE_TRUNC('month', timestamp), staff_id
);
CREATE INDEX idx_public_holidays_date ON backoffice.public_holidays(holiday_date);
CREATE INDEX idx_staff_compensation_staff_effective ON backoffice.staff_compensation(
  staff_id, effective_from, effective_to
);
```

## API Endpoints Architecture

### 2.1 Core Payroll APIs

```typescript
// GET /api/admin/payroll/months
// Returns available months for payroll processing

// GET /api/admin/payroll/[month]/review-entries
// Returns time entries that need review for specified month

// GET /api/admin/payroll/[month]/calculations
// Returns calculated payroll data (OT, holiday pay, etc.)

// POST /api/admin/payroll/[month]/service-charge
// Updates service charge amount for the month

// POST /api/admin/payroll/[month]/finalize
// Finalizes payroll for the month

// PUT /api/admin/payroll/time-entry/[entryId]
// Updates a specific time entry (clock-in/clock-out times)

// POST /api/admin/payroll/[month]/refresh-calculations
// Refreshes payroll calculations after time entry modifications

// GET /api/admin/payroll/public-holidays
// Returns list of public holidays
// POST /api/admin/payroll/public-holidays
// Adds/updates public holidays

// GET /api/admin/payroll/staff-compensation
// Returns staff compensation settings
// POST /api/admin/payroll/staff-compensation
// Updates staff compensation settings

// GET /api/admin/payroll/settings
// Returns payroll settings (daily allowance, etc.)
// POST /api/admin/payroll/settings
// Updates payroll settings
```

### 2.2 Business Logic Components

```typescript
// Core payroll calculation functions
export interface PayrollCalculator {
  calculateDailyHours(staffId: number, date: string): Promise<DailyHours>;
  identifyReviewEntries(month: string): Promise<ReviewEntry[]>;
  calculateOvertimeHours(staffId: number, month: string): Promise<number>;
  calculateHolidayHours(staffId: number, month: string): Promise<number>;
  calculateWorkingDays(staffId: number, month: string): Promise<number>;
  calculateAllowance(workingDays: number, baseSalary: number): Promise<number>;
}

// Review criteria detection
export interface ReviewCriteria {
  shortDay: boolean; // < 3 hours
  longDay: boolean; // > 9 hours
  shortSession: boolean; // < 1 hour
  longSession: boolean; // > 8 hours
}
```

## UI Component Structure

### 3.1 Page Architecture

```
app/admin/time-clock/page.tsx
├── PayrollTab Component
    ├── MonthSelector (Filter buttons)
    ├── ReviewEntriesTable
    ├── OtherCompTable
    ├── PayrollPayoutTable
    └── ServiceChargeInput
```

### 3.2 Component Specifications

```typescript
// Month selector component
interface MonthSelectorProps {
  selectedMonth: string;
  onMonthSelect: (month: string) => void;
  availableMonths: string[]; // Previous 3 months
}

// Review entries table
interface ReviewEntriesTableProps {
  entries: ReviewEntry[];
  month: string;
  onEditEntry: (entryId: number) => void;
}

interface ReviewEntry {
  entry_id: number;
  date: string;
  staff_id: number;
  staff_name: string;
  clock_in_time: string;
  clock_out_time: string;
  note: 'Short duration shift' | 'Long duration shift' | 'Short session' | 'Long session' | 'Missing clock-out' | 'Other';
  hours_worked: number;
  session_duration: number;
  has_missing_clockout: boolean;
}

// Edit time entry modal
interface EditTimeEntryModalProps {
  entry: ReviewEntry;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: TimeEntryUpdate) => void;
}

interface TimeEntryUpdate {
  entry_id: number;
  clock_in_time?: string;
  clock_out_time?: string;
  notes?: string;
}

// Other comp table
interface OtherCompTableProps {
  data: StaffCompensation[];
  month: string;
}

interface StaffCompensation {
  staff_name: string;
  ot_hours: number;
  ot_pay: number;
  holiday_hours: number;
  holiday_pay: number;
  working_days: number;
  total_allowance: number;
}

// Payroll payout table
interface PayrollPayoutTableProps {
  data: PayrollPayout[];
  month: string;
  onRefreshCalculation: () => void;
  isRefreshing: boolean;
}

interface PayrollPayout {
  staff_name: string;
  salary: number;
  allowance: number;
  ot_pay: number;
  holiday_pay: number;
  service_charge: number;
  total: number;
}
```

## Business Logic Implementation

### 4.1 Review Criteria Logic

```typescript
async function identifyReviewEntries(month: string): Promise<ReviewEntry[]> {
  // 1. Get all time entries for the month
  // 2. Group by staff and date
  // 3. Calculate daily hours and session durations
  // 4. Apply review criteria:
  //    - Daily hours < 3 or > 9
  //    - Session duration < 1 hour or > 8 hours
  // 5. Generate appropriate notes
}

async function calculateSessionDuration(
  clockIn: string, 
  clockOut: string
): Promise<number> {
  // Calculate time between clock-in and clock-out
  // Handle timezone (Bangkok)
  // Return duration in hours
}
```

### 4.2 Compensation Calculations

```typescript
async function calculateOvertimeHours(
  staffId: number, 
  month: string
): Promise<number> {
  // 1. Get all time entries for the month
  // 2. Group by week (Monday-Sunday)
  // 3. Calculate total hours per week
  // 4. OT = hours > 48 per week
  // 5. Sum all OT hours across weeks
}

async function calculateHolidayHours(
  staffId: number, 
  month: string
): Promise<number> {
  // 1. Get public holidays in month
  // 2. Check if staff worked on holidays
  // 3. Calculate total hours worked on holidays
  // 4. Return total holiday hours (all hours on holidays get premium rate)
}

async function calculateWorkingDays(
  staffId: number, 
  month: string
): Promise<number> {
  // 1. Get all dates staff worked in the month
  // 2. For each date, calculate total hours worked
  // 3. Count days with >= 6 hours as working days
  // 4. Cross-midnight shifts count towards the day the shift started
}

async function calculateAllowance(
  workingDays: number
): Promise<number> {
  // 1. Get daily allowance amount from payroll_settings
  // 2. Multiply by number of working days (days with >= 6 hours)
  // 3. Return total allowance
}

async function calculateDailyHours(
  staffId: number, 
  date: string
): Promise<DailyHours> {
  // 1. Get all time entries for the specific date
  // 2. Handle cross-midnight shifts (assign to start date)
  // 3. Calculate total hours worked that day
  // 4. Return hours and session information
}

// Cross-day shift handling
async function assignShiftToStartDate(
  clockIn: string, 
  clockOut: string
): Promise<{ date: string; hours: number }> {
  // 1. Parse clock-in timestamp (Bangkok timezone)
  // 2. Extract date from clock-in time
  // 3. Calculate total hours between clock-in and clock-out
  // 4. Assign all hours to the start date
}
```

## Integration with Existing System

### 5.1 Navigation Integration

```typescript
// Add to existing admin time-clock page
const timeClockTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'staff', label: 'Staff Management' },
  { id: 'reports', label: 'Time Reports' },
  { id: 'photos', label: 'Photo Management' },
  { id: 'payroll', label: 'Run Payroll' }, // New tab
];
```

### 5.2 Permission Integration

```typescript
// Extend existing admin authentication
async function checkPayrollPermissions(session: Session): Promise<boolean> {
  // Use existing admin authentication system
  // Potentially add specific payroll permissions
}
```

## Data Flow Architecture

```
Frontend (Payroll Tab)
    ↓
API Routes (/api/admin/payroll/*)
    ↓
Business Logic (PayrollCalculator)
    ↓
Database Queries (time_entries, staff, compensation)
    ↓
Calculations (OT, holidays, allowances)
    ↓
Response (formatted payroll data)
```

## Implementation Phases

### Phase 1: Database & Core APIs
- Create new database tables
- Implement basic API endpoints
- Set up payroll calculation functions

### Phase 2: Review Entries Feature
- Build review criteria detection
- Implement review entries table
- Add month selector component

### Phase 3: Compensation Calculations
- Implement OT and holiday calculations
- Build other comp table
- Add staff compensation management

### Phase 4: Payroll Finalization
- Build payroll payout table
- Implement service charge distribution
- Add payroll run management

### Phase 5: Admin Features
- Add public holidays management
- Implement staff compensation settings
- Build payroll history/audit trail

## Technical Considerations

### 8.1 Performance Optimizations
- Database indexing for month-based queries
- Caching for compensation calculations
- Batch processing for large datasets

### 8.2 Security Measures
- Admin-only access to payroll features
- Audit logging for all payroll operations
- Data encryption for sensitive compensation data

### 8.3 Error Handling
- Graceful handling of incomplete time entries
- Validation for payroll calculations
- Rollback capabilities for payroll runs

## Feature Requirements Summary

### Core Features
1. **Month Filter**: Buttons for previous 3 months (April, May, June for July 5th)
2. **Review Entries Table**: Time entries requiring review based on criteria
3. **Other Comp Table**: OT and holiday pay calculations by staff
4. **Payroll Payout Table**: Final payroll calculations with service charge distribution

### Review Criteria
- Daily hours < 3 hours (Short duration shift)
- Daily hours > 9 hours (Long duration shift)
- Session duration < 1 hour (Short session)
- Session duration > 8 hours (Long session)

### Compensation Components
- Base salary
- Overtime pay (hours > 48 per week)
- Holiday pay (incremental rate for all hours worked on public holidays)
- Allowance (configurable THB amount per working day, working day = ≥ 6 hours)
- Service charge (distributed equally among eligible staff)

### Data Management
- Public holidays calendar
- Staff compensation settings (salary, OT rate, holiday rate)
- Service charge eligibility per staff member
- Monthly service charge total input
- Configurable daily allowance amount (stored in payroll_settings table)

### Key Implementation Clarifications
- **Compensation Settings**: Use end-of-month settings for entire month calculations (no partial month averages)
- **Cross-Day Shifts**: All hours assigned to the day the shift started (e.g., Jan 1 11pm - Jan 2 2am = 3 hours on Jan 1)
- **Weekly Overtime**: Calculated as hours > 48 per week (Monday-Sunday)
- **Working Day Definition**: Any day with ≥ 6 hours worked (eligible for daily allowance)
- **Holiday Pay**: Incremental rate applied to all hours worked on public holidays
- **Service Charge**: Distributed equally among all eligible staff members
- **Time Entry Editing**: Modal-based editing for missing clock-outs and corrections
- **No Approval Workflow**: Display flagged entries for review, but no explicit approval/rejection required
- **Refresh Calculations**: Button to recalculate payroll after time entry modifications

## Future Considerations

### Potential Enhancements
- Payroll history and audit trail
- Export to accounting software
- Email notifications for payroll completion
- Mobile-responsive design for payroll review
- Advanced reporting and analytics

### Scalability Considerations
- Handling large datasets with thousands of time entries
- Efficient query optimization for payroll calculations
- Caching strategies for frequently accessed data
- Background job processing for complex calculations

## Recommendations & Implementation Details

### Caching Strategy
Since payroll calculations only happen sporadically when the page is launched:
- **No persistent caching needed** - calculate fresh each time
- **Session-based caching** - cache calculations during the user's session to avoid recalculation on tab switches
- **Memory-based caching** - store calculated results in component state until page refresh

### Audit Trail Implementation
Extend the existing audit logging system:
```typescript
// Add payroll-specific audit actions
const PAYROLL_AUDIT_ACTIONS = {
  PAYROLL_CALCULATION_RUN: 'payroll_calculation_run',
  TIME_ENTRY_EDITED: 'time_entry_edited',
  SERVICE_CHARGE_UPDATED: 'service_charge_updated',
  PAYROLL_FINALIZED: 'payroll_finalized',
  COMPENSATION_SETTINGS_UPDATED: 'compensation_settings_updated'
};

// Example audit log entry
await createAuditLog({
  action_type: PAYROLL_AUDIT_ACTIONS.TIME_ENTRY_EDITED,
  changed_by_type: 'admin',
  changed_by_identifier: session.user.email,
  changes_summary: `Edited time entry ${entryId}: clock-out time updated`,
  old_data_snapshot: { clock_out_time: oldValue },
  new_data_snapshot: { clock_out_time: newValue },
  reason: 'Missing clock-out correction for payroll processing'
});
```

### Error Handling Strategy
```typescript
// Graceful error handling with user feedback
try {
  const payrollData = await calculatePayroll(month);
  return payrollData;
} catch (error) {
  console.error('Payroll calculation failed:', error);
  
  // Return partial results with error indicators
  return {
    success: false,
    error: 'Payroll calculation failed. Please check time entry data.',
    partial_results: null,
    affected_staff: getAffectedStaff(error)
  };
}

// Specific error types
const PAYROLL_ERRORS = {
  MISSING_COMPENSATION_SETTINGS: 'Some staff members are missing compensation settings',
  INCOMPLETE_TIME_ENTRIES: 'Some time entries are incomplete (missing clock-out)',
  CALCULATION_OVERFLOW: 'Calculation resulted in unusually large values',
  DATABASE_ERROR: 'Database connection error during calculation'
};
```

### Data Entry Validation
```typescript
// Compensation settings validation
const validateCompensationSettings = (settings: CompensationSettings) => {
  const errors: string[] = [];
  
  if (!settings.base_salary || settings.base_salary < 0) {
    errors.push('Base salary must be a positive number');
  }
  
  if (!settings.ot_rate_per_hour || settings.ot_rate_per_hour < 0) {
    errors.push('OT rate must be a positive number');
  }
  
  if (!settings.holiday_rate_per_hour || settings.holiday_rate_per_hour < 0) {
    errors.push('Holiday rate must be a positive number');
  }
  
  return { isValid: errors.length === 0, errors };
};

// Time entry validation
const validateTimeEntry = (entry: TimeEntryUpdate) => {
  const errors: string[] = [];
  
  if (entry.clock_in_time && entry.clock_out_time) {
    const clockIn = new Date(entry.clock_in_time);
    const clockOut = new Date(entry.clock_out_time);
    
    if (clockOut <= clockIn) {
      errors.push('Clock-out time must be after clock-in time');
    }
    
    const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);
    if (hoursWorked > 16) {
      errors.push('Shift duration cannot exceed 16 hours');
    }
  }
  
  return { isValid: errors.length === 0, errors };
};
```

### Testing Strategy
Since payroll calculations are read-only operations on production data:
- **Unit tests** for calculation functions with mock data
- **Integration tests** using a test database with sample time entries
- **Validation tests** to ensure calculations match expected business rules
- **Performance tests** with large datasets to ensure scalability

```typescript
// Example test case
describe('Payroll Calculations', () => {
  test('should calculate weekly overtime correctly', async () => {
    const mockTimeEntries = [
      // 50 hours in one week
      { staff_id: 1, timestamp: '2024-06-03T08:00:00Z', action: 'clock_in' },
      { staff_id: 1, timestamp: '2024-06-03T18:00:00Z', action: 'clock_out' },
      // ... more entries
    ];
    
    const otHours = await calculateOvertimeHours(1, '2024-06');
    expect(otHours).toBe(2); // 50 - 48 = 2 OT hours
  });
});
```

### Database Connection & Error Handling
```typescript
// Robust database operations with retry logic
const executePayrollQuery = async (query: string, params: any[]) => {
  const maxRetries = 3;
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await refacSupabaseAdmin.query(query, params);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Database query attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw new Error(`Database operation failed after ${maxRetries} attempts: ${lastError.message}`);
};
```

### Tab Integration Approach
The existing admin time-clock page appears to use a tab-based layout. Adding the payroll tab should be straightforward:

```typescript
// No significant refactoring needed - just add new tab
const adminTimeClockTabs = [
  { id: 'overview', label: 'Overview', component: OverviewTab },
  { id: 'staff', label: 'Staff Management', component: StaffManagementTab },
  { id: 'reports', label: 'Time Reports', component: TimeReportsTab },
  { id: 'photos', label: 'Photo Management', component: PhotoManagementTab },
  { id: 'payroll', label: 'Run Payroll', component: PayrollTab } // New tab
];
```

This development plan provides a comprehensive roadmap for implementing the Run Payroll feature while maintaining integration with the existing Staff Time Clock system.