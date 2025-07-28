# Staff Scheduling System Requirements

## Introduction

The Staff Scheduling System provides a mobile-first interface for staff to view their schedules and a desktop admin interface for schedule management. The system supports 4 staff members using a shared account with individual name selection, simple shift scheduling with color coding based on start time, and integration with the existing time clock system.

## Requirements

### Requirement 1: Staff Name Selection

**User Story:** As a staff member, I want to select my name from a list when accessing the schedule app, so that I can view my personal schedule using a shared device.

#### Acceptance Criteria

1. WHEN a staff member navigates to `/staff-schedule` THEN the system SHALL display a name selection screen with all 4 staff members
2. WHEN a staff member taps their name THEN the system SHALL navigate to their personal schedule view
3. WHEN the name is selected THEN the header SHALL display "[Name]'s Schedule" to indicate the selected staff member
4. IF no name is selected THEN the system SHALL remain on the selection screen

### Requirement 2: Personal Schedule Viewing

**User Story:** As a staff member, I want to view my personal schedule with a horizontal date picker, so that I can see my shifts for any day of the week.

#### Acceptance Criteria

1. WHEN a staff member selects their name THEN the system SHALL display their personal schedule for the current date
2. WHEN viewing the schedule THEN the system SHALL show a horizontal date picker with 7 consecutive days
3. WHEN the current date is displayed THEN it SHALL be highlighted with a blue circle
4. WHEN dates have scheduled shifts THEN they SHALL show indicator dots (solid dot for multiple shifts, small dot for single shift)
5. WHEN a staff member swipes left/right or taps arrows THEN the system SHALL navigate between weeks
6. WHEN a staff member taps a specific date THEN the system SHALL show shifts for that date only
7. WHEN no shifts are scheduled for a date THEN the system SHALL display "No shifts scheduled" with a friendly message

### Requirement 3: Shift Display and Color Coding

**User Story:** As a staff member, I want to see my shifts displayed as color-coded cards based on start time, so that I can quickly identify morning, afternoon, and evening shifts.

#### Acceptance Criteria

1. WHEN displaying shifts THEN the system SHALL use color coding based on start time:
   - Morning (6AM-11AM): Cyan/light blue (#06B6D4)
   - Afternoon (12PM-5PM): Amber/yellow (#F59E0B)  
   - Evening (6PM+): Pink/red (#EC4899)
2. WHEN showing a shift card THEN it SHALL display date, day abbreviation, start time, end time, and location
3. WHEN a staff member taps a shift card THEN the system SHALL open a detailed modal with shift information
4. WHEN viewing shift details THEN the modal SHALL show time, duration, location, team members, notes, and clock in/out button

### Requirement 4: Team Schedule Overview

**User Story:** As a staff member, I want to view everyone's schedule when I tap "Everyone", so that I can see who else is working and coordinate with my team.

#### Acceptance Criteria

1. WHEN a staff member taps "Everyone" in the bottom navigation THEN the system SHALL display all 4 staff members' shifts for the selected date
2. WHEN viewing team schedule THEN each shift card SHALL show the staff member's name and photo
3. WHEN multiple staff work the same shift THEN the system SHALL display multiple names/photos on the same card
4. WHEN viewing team schedule THEN the horizontal date picker SHALL show team-wide activity indicators
5. WHEN switching between "Only me" and "Everyone" THEN the system SHALL maintain the selected date

### Requirement 5: Admin Schedule Management

**User Story:** As an administrator, I want to create and manage staff schedules through a desktop interface, so that I can efficiently assign shifts and manage coverage.

#### Acceptance Criteria

1. WHEN an admin navigates to `/admin/staff-scheduling` THEN the system SHALL display a desktop-optimized scheduling dashboard
2. WHEN viewing the admin dashboard THEN it SHALL show KPI cards for total staff, scheduled shifts, open shifts, and coverage percentage
3. WHEN managing schedules THEN the admin SHALL be able to create, edit, and delete staff shifts
4. WHEN creating a shift THEN the admin SHALL specify staff member, date, start time, end time, location, and notes
5. WHEN there are scheduling conflicts THEN the system SHALL display warnings and prevent double-booking
6. WHEN viewing the weekly grid THEN the admin SHALL see all staff assignments organized by day and time slot

### Requirement 6: Database Integration

**User Story:** As a system administrator, I want staff schedules to be stored in the database with proper relationships, so that data is persistent and can integrate with existing systems.

#### Acceptance Criteria

1. WHEN a schedule is created THEN it SHALL be stored in the `backoffice.staff_schedules` table
2. WHEN storing schedule data THEN it SHALL reference the existing `backoffice.staff` table via `staff_id`
3. WHEN creating recurring schedules THEN the system SHALL use the `backoffice.staff_weekly_schedules` table for admin convenience
4. WHEN schedule data is modified THEN the system SHALL update `created_at` and `updated_at` timestamps
5. WHEN querying schedules THEN the system SHALL enforce unique constraints on staff_id, schedule_date, and start_time

### Requirement 7: Time Clock Integration

**User Story:** As a staff member, I want to clock in/out directly from my schedule, so that I can easily track my time when starting or ending a shift.

#### Acceptance Criteria

1. WHEN viewing shift details THEN the system SHALL display a "Clock In/Out" button
2. WHEN a staff member taps "Clock In/Out" THEN the system SHALL integrate with the existing time clock system
3. WHEN clocking in/out THEN the system SHALL use the same PIN authentication as the standalone time clock
4. WHEN time entries are created THEN they SHALL be linked to the scheduled shift for tracking compliance

### Requirement 8: Mobile Responsiveness

**User Story:** As a staff member using a mobile device, I want the schedule interface to be optimized for touch interaction, so that I can easily navigate and view schedules on my phone.

#### Acceptance Criteria

1. WHEN using the staff interface on mobile THEN all touch targets SHALL be at least 44px for easy tapping
2. WHEN swiping on the date picker THEN the system SHALL respond smoothly to horizontal swipe gestures
3. WHEN viewing on mobile THEN the interface SHALL use a single-column layout with appropriate spacing
4. WHEN rotating the device THEN the interface SHALL adapt to both portrait and landscape orientations
5. WHEN loading on mobile THEN the interface SHALL load quickly and cache data for offline viewing

### Requirement 9: Access Control and Security

**User Story:** As a system administrator, I want proper access controls for the scheduling system, so that staff can view schedules while only admins can modify them.

#### Acceptance Criteria

1. WHEN staff access `/staff-schedule` THEN they SHALL be able to view schedules without admin privileges
2. WHEN staff attempt to access `/admin/staff-scheduling` THEN the system SHALL redirect them to the staff interface
3. WHEN admins access either interface THEN they SHALL have full access to both staff and admin features
4. WHEN accessing schedule data THEN the system SHALL enforce proper authentication and session management
5. WHEN viewing team schedules THEN staff SHALL see limited information (names, times, locations) without sensitive details

### Requirement 10: System Integration

**User Story:** As a system administrator, I want the scheduling system to integrate with existing staff management and time clock systems, so that data remains consistent across all platforms.

#### Acceptance Criteria

1. WHEN displaying staff names THEN the system SHALL use data from the existing `backoffice.staff` table
2. WHEN staff clock in/out THEN the system SHALL create entries in the existing time clock tables
3. WHEN schedules are created THEN they SHALL be available for payroll and attendance reporting
4. WHEN staff status changes (active/inactive) THEN the scheduling system SHALL reflect these changes
5. WHEN integrating with admin panel THEN scheduling tools SHALL be accessible through the existing admin navigation
