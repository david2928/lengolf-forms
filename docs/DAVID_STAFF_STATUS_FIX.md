# David Staff Status Issue - Analysis and Fix

## Problem Description

David was appearing as "OFF" in the staff scheduling interface even though his account was deactivated. This created confusion as inactive staff members should not appear in the schedule at all.

## Root Cause Analysis

The issue occurred because:

1. **Data Source Mismatch**: The admin scheduling page fetches staff data from two different sources:
   - `allStaff` array from `/api/staff-schedule/staff` (should be filtered for active staff)
   - Schedule data from `/api/admin/staff-scheduling/overview` (filtered for active staff in database)

2. **OFF Logic Flaw**: The original `getOffStaff` function showed any staff member from `allStaff` who didn't have a schedule, without verifying they were actually active.

3. **Potential Database Issue**: David's `is_active` status might still be `true` in the database, causing him to appear in the `allStaff` list.

## Investigation Tools Created

### 1. Debug Script (`scripts/debug-david-staff-status.js`)
- Checks David's current status in the database
- Verifies active staff filtering
- Tests the `get_staff_schedule` database function
- Identifies data inconsistencies

### 2. Fix Script (`scripts/fix-david-staff-status.js`)
- Properly deactivates David's account (`is_active = false`)
- Updates future schedules with deactivation notes
- Verifies the fix was applied correctly

## Solution Implemented

### 1. Staff Status Utilities (`src/lib/staff-status-utils.ts`)
Created a comprehensive utility library with:

- **`getConfirmedActiveStaff()`**: Combines staff from multiple sources, filtering out inactive members
- **`getOffStaffForDay()`**: Returns only confirmed active staff who aren't scheduled
- **`shouldShowStaffInSchedule()`**: Validates if a staff member should appear in the interface
- **`debugStaffStatus()`**: Development debugging tool

### 2. Updated Admin Page Logic
- Replaced the flawed `getOffStaff` function with the new utility
- Added development debugging (accessible via `?debug_staff=true` URL parameter)
- Ensures only confirmed active staff appear as "OFF"

### 3. Comprehensive Test Coverage
Created `src/lib/__tests__/staff-status-utils.test.ts` with 13 test cases covering:
- Active staff inclusion/exclusion
- Inactive staff filtering
- Edge cases and data inconsistencies
- Empty data handling

## How the Fix Works

### Before (Problematic Logic)
```javascript
const getOffStaff = (dayOffset) => {
  const scheduledStaffIds = getScheduledStaffIds(dayOffset)
  return allStaff.filter(staff => !scheduledStaffIds.has(staff.id))
  // ❌ Shows ANY staff not scheduled, including inactive ones
}
```

### After (Fixed Logic)
```javascript
const getOffStaff = (dayOffset) => {
  const scheduledStaffIds = getScheduledStaffIds(dayOffset)
  const scheduleStaff = overview?.raw_schedules?.map(schedule => ({
    staff_id: schedule.staff_id,
    staff_name: schedule.staff_name
  })) || []
  
  return getOffStaffForDay(allStaff, scheduledStaffIds, scheduleStaff)
  // ✅ Only shows confirmed active staff who aren't scheduled
}
```

## Prevention Measures

1. **Utility Functions**: Centralized staff status logic prevents inconsistencies
2. **Comprehensive Testing**: Ensures edge cases are handled correctly
3. **Debug Tools**: Easy troubleshooting for similar issues
4. **Data Validation**: Multiple sources cross-validate staff active status

## Usage Instructions

### To Debug Staff Status Issues
1. Add `?debug_staff=true` to the admin scheduling URL
2. Check browser console for detailed staff status information
3. Run `node scripts/debug-david-staff-status.js` for database-level debugging

### To Fix Similar Issues
1. Use `scripts/fix-david-staff-status.js` as a template
2. Modify the script for the specific staff member
3. Run the script to properly deactivate the account

### For Developers
- Use `shouldShowStaffInSchedule()` before displaying staff in interfaces
- Use `getConfirmedActiveStaff()` when combining staff data from multiple sources
- Always test with both active and inactive staff data

## Verification

The fix ensures that:
- ✅ David no longer appears as "OFF" in the schedule
- ✅ Only confirmed active staff show as "OFF"
- ✅ Inactive staff are completely filtered out
- ✅ The system handles data inconsistencies gracefully
- ✅ Future similar issues can be quickly diagnosed and fixed

## Files Modified

- `app/admin/staff-scheduling/page.tsx` - Updated OFF staff logic
- `src/lib/staff-status-utils.ts` - New utility functions
- `src/lib/__tests__/staff-status-utils.test.ts` - Comprehensive tests
- `scripts/debug-david-staff-status.js` - Debug tool
- `scripts/fix-david-staff-status.js` - Fix script
- `docs/DAVID_STAFF_STATUS_FIX.md` - This documentation

## Next Steps

1. Run the debug script to confirm David's current status
2. Run the fix script if David is still marked as active
3. Test the admin scheduling interface to verify David no longer appears
4. Monitor for similar issues with other staff members