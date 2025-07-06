# Story #3: Time Entry Review & Edit - Testing Guide

## Overview
This document provides testing instructions for the Time Entry Review & Edit functionality created in Story #3.

## Features Implemented

### ✅ Review Criteria Detection
The system automatically identifies problematic time entries based on:
- **Daily hours < 3 hours** (Short duration shift)
- **Daily hours > 9 hours** (Long duration shift)  
- **Session duration < 1 hour** (Short session)
- **Session duration > 8 hours** (Long session)
- **Missing clock-out** entries

### ✅ Time Entry Validation
- Clock-out must be after clock-in
- Maximum shift duration: 16 hours
- Valid timestamp formats required
- Notes limited to 500 characters

### ✅ Audit Trail
- All modifications logged with admin email
- Before/after data snapshots
- Reason for changes captured

## API Endpoints Created

### 1. GET /api/admin/payroll/[month]/review-entries
**Purpose**: Returns flagged time entries that need review for a specific month
**Authentication**: Required (Admin only)

**Expected Response Structure**:
```json
{
  "month": "2024-06",
  "summary": {
    "total_entries": 15,
    "missing_clockouts": 3,
    "short_shifts": 2,
    "long_shifts": 1,
    "short_sessions": 4,
    "long_sessions": 0,
    "by_staff": {
      "John Doe": 5,
      "Jane Smith": 3,
      "Mike Johnson": 7
    }
  },
  "entries": [
    {
      "entry_id": 1234,
      "date": "2024-06-15",
      "staff_id": 1,
      "staff_name": "John Doe",
      "clock_in_time": "2024-06-15T08:00:00Z",
      "clock_out_time": null,
      "note": "Missing clock-out",
      "hours_worked": 0,
      "session_duration": 0,
      "has_missing_clockout": true,
      "total_daily_hours": 0,
      "flagged_reasons": ["Missing clock-out"],
      "clock_in_time_formatted": "15/06/2024 08:00",
      "clock_out_time_formatted": null,
      "date_formatted": "Sat, Jun 15, 2024"
    }
  ],
  "generated_at": "2024-07-05T10:30:00Z"
}
```

### 2. PUT /api/admin/payroll/time-entry/[id]
**Purpose**: Update a specific time entry with validation
**Authentication**: Required (Admin only)

**Request Body**:
```json
{
  "clock_in_time": "2024-06-15T08:00:00Z",
  "clock_out_time": "2024-06-15T17:00:00Z",
  "notes": "Corrected missing clock-out for payroll processing"
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Time entry updated successfully",
  "entry_id": 1234,
  "updated_by": "admin@example.com",
  "updated_at": "2024-07-05T10:30:00Z"
}
```

## Review Criteria Logic

### Missing Clock-out Detection
- Identifies clock-in entries without matching clock-out
- Flags the last unmatched clock-in for each day/staff
- Allows creating new clock-out entries

### Daily Hours Analysis
- **Short Shift**: Total daily hours < 3 (but > 0)
- **Long Shift**: Total daily hours > 9
- Accounts for cross-day shifts (assigned to start date)

### Session Duration Analysis
- **Short Session**: Individual clock-in/clock-out < 1 hour
- **Long Session**: Individual clock-in/clock-out > 8 hours
- Handles multiple sessions per day

## Testing Prerequisites

1. **Database Setup**: Stories #1 and #2 completed
2. **Time Entry Data**: Sample time entries with various patterns
3. **Staff Data**: Active staff members with time entries
4. **Authentication**: Valid admin session

## Manual Testing Steps

### Step 1: Test Review Entries Endpoint

```bash
# Test with authentication (will return 401 without session)
curl http://localhost:3000/api/admin/payroll/2024-06/review-entries
```

**Browser Testing**:
```javascript
// Test in browser console (after admin login)
fetch('/api/admin/payroll/2024-06/review-entries')
  .then(response => response.json())
  .then(data => {
    console.log('Review entries:', data);
    console.log('Total flagged:', data.summary.total_entries);
    console.log('Missing clockouts:', data.summary.missing_clockouts);
  });
```

### Step 2: Test Time Entry Update

```javascript
// Update a time entry (replace ID with actual entry_id from review)
const entryId = 1234; // From review entries response
const updateData = {
  clock_in_time: "2024-06-15T08:00:00Z",
  clock_out_time: "2024-06-15T17:00:00Z", 
  notes: "Added missing clock-out"
};

fetch(`/api/admin/payroll/time-entry/${entryId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updateData)
})
  .then(response => response.json())
  .then(data => console.log('Update result:', data));
```

### Step 3: Test Validation

```javascript
// Test invalid data (should return validation errors)
const invalidUpdate = {
  clock_in_time: "2024-06-15T17:00:00Z",
  clock_out_time: "2024-06-15T08:00:00Z", // Clock-out before clock-in
  notes: "This should fail validation"
};

fetch(`/api/admin/payroll/time-entry/1234`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(invalidUpdate)
})
  .then(response => response.json())
  .then(data => {
    console.log('Validation response:', data);
    // Should show: { error: "Validation failed", details: [...] }
  });
```

## Expected Behavior

### With No Problematic Entries
- Review endpoint returns empty entries array
- Summary shows all counts as 0
- Response structure remains consistent

### With Various Time Entry Issues
- **Missing Clock-outs**: Flagged with specific note
- **Short/Long Shifts**: Identified by daily hour totals
- **Short/Long Sessions**: Identified by individual session duration
- **Multiple Issues**: Same entry can have multiple flagged reasons

### Validation Testing
- **Valid Updates**: Successfully applied with audit log
- **Invalid Times**: Rejected with specific error messages
- **Missing Data**: Handles partial updates correctly

## Validation Rules

### Time Constraints
- Clock-out must be after clock-in
- Maximum shift duration: 16 hours
- Valid ISO 8601 timestamp format required

### Data Constraints
- Entry ID must be valid number
- Notes limited to 500 characters
- At least one field must be provided for update

### Business Logic
- Missing clock-out creates new clock-out entry
- Cross-day shifts handled correctly
- Bangkok timezone used for all calculations

## Audit Trail Verification

Check audit logs for:
- **Action Type**: `time_entry_edited` or `time_entry_created`
- **Changed By**: Admin email address
- **Old/New Data**: JSON snapshots of changes
- **Reason**: Notes provided by admin

## Error Scenarios

### Expected Errors
- **401 Unauthorized**: No admin session
- **400 Bad Request**: Invalid month format or entry ID
- **404 Not Found**: Non-existent time entry
- **400 Validation Failed**: Invalid time entry data
- **500 Server Error**: Database connection issues

### Error Response Format
```json
{
  "error": "Validation failed",
  "details": [
    "Clock-out time must be after clock-in time",
    "Shift duration cannot exceed 16 hours"
  ]
}
```

## Integration with Payroll Calculations

After time entries are edited:
1. **Refresh Calculations**: Re-run payroll calculations
2. **Updated Results**: Review entries should decrease
3. **Accurate Payroll**: Hours/overtime/allowances recalculated

## Next Steps

Once Story #3 is validated:
- ✅ Time entry review and editing working
- 🚀 Ready for Story #4: Payroll Tab UI Components
- 🚀 Ready for Story #5: Service Charge Management

## Files Created

- `src/lib/payroll-review.ts` - Core review logic (400+ lines)
- `app/api/admin/payroll/[month]/review-entries/route.ts` - Review entries endpoint
- `app/api/admin/payroll/time-entry/[id]/route.ts` - Time entry update endpoint
- `scripts/PAYROLL_STORY3_TESTING.md` - This testing guide

## Validation Checklist

- [ ] Review entries endpoint identifies problematic time entries
- [ ] Missing clock-outs are detected and flagged
- [ ] Short/long shifts flagged based on daily hours
- [ ] Short/long sessions flagged based on session duration
- [ ] Time entry updates work with validation
- [ ] Clock-out must be after clock-in validation
- [ ] Maximum 16-hour shift validation
- [ ] Missing clock-out entries can be corrected
- [ ] Audit trail records all modifications
- [ ] Bangkok timezone used consistently
- [ ] Authentication required for all endpoints
- [ ] Error handling for invalid inputs 