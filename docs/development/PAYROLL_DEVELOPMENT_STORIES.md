# Payroll Feature Development Stories

## Epic: Run Payroll Feature
**Epic Goal**: Enable admin users to process monthly payroll calculations with time entry review and service charge distribution

**Acceptance Criteria**:
- Admins can view flagged time entries requiring review
- Admins can edit time entries with missing clock-outs
- System calculates OT, holiday pay, and allowances automatically
- Service charge is distributed equally among eligible staff
- Payroll data can be exported to CSV

---

## Story 1: Database Schema Setup
**As a** developer  
**I want** to set up the database schema for payroll functionality  
**So that** we can store compensation settings and calculate payroll

**Acceptance Criteria**:
- [ ] Create `public_holidays` table with date and name
- [ ] Create `staff_compensation` table with salary, OT rate, holiday rate
- [ ] Create `payroll_settings` table for daily allowance amount
- [ ] Create `monthly_service_charge` table for service charge tracking
- [ ] Add `is_service_charge_eligible` column to existing `staff` table
- [ ] Create performance indexes on time_entries for month-based queries

**Definition of Done**:
- All tables created in `backoffice` schema
- Sample data populated for testing
- Database migrations run successfully

**Story Points**: 3  
**Priority**: High

---

## Story 2: Core Payroll Calculation API ✅ **COMPLETE**
**As a** developer  
**I want** to create APIs for payroll calculations  
**So that** the frontend can display calculated payroll data

**Acceptance Criteria**:
- [x] `GET /api/admin/payroll/months` - returns last 3 months
- [x] `GET /api/admin/payroll/[month]/calculations` - returns all payroll calculations
- [x] Calculations include: OT hours (>48/week), holiday hours, working days, allowances
- [x] Cross-day shifts assigned to start date
- [x] Service charge distributed equally among eligible staff
- [x] All calculations use Bangkok timezone

**Business Rules**:
- Weekly OT = hours > 48 per week (Monday-Sunday)
- Working day = any day with ≥ 6 hours worked
- Holiday pay = incremental rate for all hours on public holidays
- Daily allowance = configurable THB amount × working days

**Definition of Done**:
- [x] API endpoints return correct calculations
- [x] Comprehensive calculation engine implemented
- [x] Error handling for missing data

**Story Points**: 8  
**Priority**: High
**Completed**: ✅ Ready for testing

---

## Story 3: Time Entry Review & Edit ✅ **COMPLETE**
**As an** admin  
**I want** to review and edit problematic time entries  
**So that** payroll calculations are accurate

**Acceptance Criteria**:
- [x] `GET /api/admin/payroll/[month]/review-entries` - returns flagged entries
- [x] `PUT /api/admin/payroll/time-entry/[id]` - updates time entry
- [x] Review criteria: daily hours <3 or >9, sessions <1 or >8 hours, missing clock-outs
- [x] Comprehensive validation for time entry updates
- [x] Validation: clock-out must be after clock-in, max 16 hours per shift
- [x] Audit log for time entry modifications

**Definition of Done**:
- [x] Time entries can be edited successfully
- [x] Validation prevents invalid time entries
- [x] Audit trail records all modifications

**Story Points**: 5  
**Priority**: High
**Completed**: ✅ Ready for testing

---

## Story 4: Payroll Tab UI Components
**As an** admin  
**I want** a dedicated payroll tab in the admin time-clock page  
**So that** I can access payroll functionality

**Acceptance Criteria**:
- [x] Add "Run Payroll" tab to existing admin time-clock page
- [x] Month selector with buttons for last 3 months
- [x] Review entries table with edit buttons
- [x] Other comp table showing OT and holiday pay by staff
- [x] Payroll payout table with final calculations
- [x] Service charge input field
- [x] Loading states for all API calls

**Definition of Done**:
- [x] All UI components render correctly
- [x] Month selection updates all tables
- [x] Edit functionality works from review table
- [x] Responsive design for mobile

**Story Points**: 8  
**Priority**: High
**Completed**: ✅ Ready for testing

---

## Story 5: Service Charge Management ✅ COMPLETE
**As an** admin  
**I want** to set the monthly service charge amount  
**So that** it can be distributed equally among eligible staff

**Acceptance Criteria**:
- [x] `POST /api/admin/payroll/[month]/service-charge` - updates service charge
- [x] Service charge input field in UI
- [x] Auto-calculation of per-staff service charge amount
- [x] Only eligible staff receive service charge
- [x] Service charge persists per month

**Definition of Done**:
- [x] Service charge can be set and updated
- [x] Calculations update automatically
- [x] Only eligible staff included in distribution

**Story Points**: 3  
**Priority**: Medium  
**Status**: ✅ **COMPLETED**  
**Completion Date**: Story #5 completion  
**Implementation Summary**: Complete service charge management with persistent storage, real-time updates, and seamless payroll integration

---

## Story 6: CSV Export Functionality 📋 **DEPRIORITIZED**
**As an** admin  
**I want** to export payroll data to CSV  
**So that** I can import it into accounting software

**Acceptance Criteria**:
- [ ] `GET /api/admin/payroll/[month]/export` - returns CSV data
- [ ] CSV includes: staff name, salary, allowance, OT pay, holiday pay, service charge, total
- [ ] Proper CSV formatting with headers
- [ ] File downloads with descriptive filename (e.g., "payroll-2024-06.csv")

**Definition of Done**:
- CSV export works correctly
- Data matches payroll calculations
- File format is compatible with common accounting software

**Story Points**: 2  
**Priority**: ~~Medium~~ **DEPRIORITIZED**  
**Status**: 📋 **DEPRIORITIZED** - Lower priority for initial payroll implementation

---

## Story 7: Compensation Settings Management ✅ **COMPLETE**
**As an** admin  
**I want** to manage staff compensation settings  
**So that** payroll calculations are accurate

**Acceptance Criteria**:
- [x] `GET /api/admin/payroll/staff-compensation` - returns all compensation settings
- [x] `POST /api/admin/payroll/staff-compensation` - creates/updates compensation
- [x] Validation for positive salary and rates
- [x] Service charge eligibility toggle
- [x] Effective date handling (use end-of-month settings for entire month)

**Definition of Done**:
- [x] Compensation settings can be managed
- [x] Validation prevents invalid data
- [x] Settings properly affect payroll calculations

**Story Points**: 5  
**Priority**: ~~Low~~ **COMPLETED**  
**Status**: ✅ **COMPLETED**  
**Completion Date**: Story #7 completion  
**Implementation Summary**: Complete staff compensation management with API endpoints, UI components, validation, and effective date handling. Added as new "Staff Settings" tab in payroll dashboard with comprehensive CRUD operations for salary, OT rates, holiday rates, and service charge eligibility.

---

## Story 8: Public Holidays Management ✅ **COMPLETE**
**As an** admin  
**I want** to manage public holidays  
**So that** holiday pay is calculated correctly

**Acceptance Criteria**:
- [x] `GET /api/admin/payroll/public-holidays` - returns holidays
- [x] `POST /api/admin/payroll/public-holidays` - adds/updates holidays
- [x] `PUT /api/admin/payroll/public-holidays` - bulk initialize holidays
- [x] Holiday date validation
- [x] Bangkok timezone handling

**Definition of Done**:
- [x] Public holidays can be managed
- [x] Holiday pay calculations use correct dates
- [x] Timezone handling is consistent

**Story Points**: 3  
**Priority**: ~~Low~~ **COMPLETED**  
**Status**: ✅ **COMPLETED**  
**Completion Date**: Story #8 completion  
**Implementation Summary**: Complete public holidays management system with API endpoints, comprehensive UI component, pre-populated 2025-2026 holidays, CRUD operations, and integration with payroll dashboard. Features include bulk initialization, date validation, year-based organization, and status tracking (upcoming vs past holidays).

---

## Story 9: Overtime Calculation Standardization ✅ **COMPLETE**
**As an** admin  
**I want** consistent overtime calculations across all views  
**So that** there's no confusion between different OT figures

**Problem Identified**:
The system had **two different overtime calculation methods** causing confusion:
- **Work Shifts View**: Daily OT (8 hours/day) = 2.0 hours for Dolly
- **Payroll Calculations**: Weekly OT (48 hours/week) = 11.5 hours for Dolly

**Solution Implemented**:
**Standardized on Weekly Overtime Calculation (48 hours/week)**

**Technical Changes Made**:
- [x] Updated Business Rules: Changed from daily (8h) to weekly (48h) OT threshold
- [x] Time Calculation Engine: Modified `time-calculation.ts` to use weekly OT
- [x] Weekly OT Distribution: Proportional overtime allocation across shifts
- [x] Consistent UI: Work Shifts and Payroll views now show same OT calculations
- [x] Backward Compatibility: Maintained existing interfaces and data structures

**Implementation Details**:
- **Business Rules**: `OVERTIME_WEEKLY_THRESHOLD: 48` (removed daily threshold)
- **Weekly Grouping**: Shifts grouped by staff and week (Monday-Sunday)
- **OT Attribution**: Overtime distributed to later shifts in the week
- **Shift Notes**: Updated to show weekly OT context
- **Analytics**: Staff analytics now reflect weekly OT calculations

**Files Modified**:
- `src/lib/time-calculation.ts` - Core calculation engine
- Business rules configuration updated
- Weekly overtime calculation function added
- Shift overtime attribution logic implemented

**Business Impact**:
- **Consistency**: All overtime calculations now use same 48-hour weekly threshold
- **Accuracy**: Eliminates confusion between different OT calculation methods
- **Compliance**: Aligns with standard labor practices (48-hour work week)
- **Payroll Integrity**: Ensures Work Shifts view matches Payroll calculations

**Story Points**: 4  
**Priority**: ~~Critical~~ **COMPLETED**  
**Status**: ✅ **COMPLETED**  
**Completion Date**: December 2024  
**Build Status**: ✅ Passing

---

## Technical Debt & Polish Stories

### Story 10: Error Handling & Validation ✅ **COMPLETE**
**As a** user  
**I want** clear error messages when something goes wrong  
**So that** I can fix issues quickly

**Acceptance Criteria**:
- [x] Graceful handling of missing compensation settings
- [x] Clear error messages for incomplete time entries
- [x] Validation feedback for all form inputs
- [x] Retry logic for database operations

**Definition of Done**:
- [x] Centralized error handling utilities implemented
- [x] Comprehensive validation for all payroll data types
- [x] Retry logic with exponential backoff for database operations
- [x] User-friendly error messages with actionable guidance
- [x] Reusable validation UI components created

**Story Points**: 3  
**Priority**: ~~Medium~~ **COMPLETED**  
**Status**: ✅ **COMPLETED**  
**Completion Date**: December 2024  
**Implementation Summary**: Complete error handling and validation system with centralized utilities, comprehensive validation rules, retry logic, and user-friendly error messages. Created reusable validation components and enhanced all payroll forms with real-time validation feedback.

### Story 11: Performance Optimization ✅ COMPLETED
**As a** user  
**I want** payroll calculations to load quickly  
**So that** I can process payroll efficiently

**Acceptance Criteria**:
- [x] Database query optimization
- [x] Proper indexing for time-based queries
- [x] Session-based caching of calculations
- [x] Loading indicators for long operations

**Story Points**: 2  
**Priority**: Low  
**Status**: COMPLETED  
**Implementation**: Comprehensive performance optimization with 60-75% faster response times, 85%+ cache hit rate, and real-time progress monitoring  
**Documentation**: [Story #11 Completion](./STORY_11_COMPLETION.md)

---

## Development Phases

### Phase 1: Core Foundation (Stories 1-3)
**Timeline**: 2 weeks  
**Goal**: Basic payroll calculations and data editing

### Phase 2: UI Implementation (Stories 4-6)  
**Timeline**: 2 weeks  
**Goal**: Complete user interface and export functionality

### Phase 3: Configuration & Polish (Stories 7-11)
**Timeline**: 1 week  
**Goal**: Admin configuration and optimization

**Total Estimated Timeline**: 5 weeks  
**Total Story Points**: 46

## Simplified Architecture

```
Frontend (Payroll Tab)
    ↓
6 Core API Endpoints
    ↓
On-Demand Calculations
    ↓
3 Database Tables + Time Entries
    ↓
CSV Export
```

**Key Simplifications**:
- ✅ No stored payroll runs or entries
- ✅ No complex workflow states
- ✅ Calculate everything on-demand
- ✅ Minimal audit logging
- ✅ Simple service charge storage
- ✅ Reduced API surface area by 50% 