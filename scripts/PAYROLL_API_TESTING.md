# Story #2: Core Payroll Calculation API - Testing Guide

## Overview
This document provides testing instructions for the Core Payroll Calculation API endpoints created in Story #2.

## API Endpoints Created

### 1. GET /api/admin/payroll/months
**Purpose**: Returns the last 3 months available for payroll processing
**Authentication**: Required (Admin only)

**Expected Response**:
```json
{
  "months": [
    {
      "month_year": "2024-06",
      "display_name": "June 2024",
      "is_current_month": true
    },
    {
      "month_year": "2024-05",
      "display_name": "May 2024",
      "is_current_month": false
    },
    {
      "month_year": "2024-04",
      "display_name": "April 2024",
      "is_current_month": false
    }
  ]
}
```

### 2. GET /api/admin/payroll/[month]/calculations
**Purpose**: Returns complete payroll calculations for a specific month
**Authentication**: Required (Admin only)
**Parameters**: `month` in YYYY-MM format (e.g., 2024-06)

**Expected Response Structure**:
```json
{
  "month": "2024-06",
  "summary": {
    "total_staff": 5,
    "total_payout": 125000.00,
    "total_overtime_hours": 12.5,
    "total_holiday_hours": 8.0,
    "total_working_days": 25,
    "total_service_charge": 2500.00
  },
  "staff_calculations": [
    {
      "staff_id": 1,
      "staff_name": "John Doe",
      "working_days": 22,
      "total_hours": 176.5,
      "overtime_hours": 2.5,
      "holiday_hours": 8.0,
      "base_salary": 15000.00,
      "daily_allowance": 2200.00,
      "overtime_pay": 187.50,
      "holiday_pay": 800.00,
      "service_charge": 500.00,
      "total_payout": 18687.50
    }
  ],
  "other_comp": [
    {
      "staff_name": "John Doe",
      "ot_hours": 2.5,
      "ot_pay": 187.50,
      "holiday_hours": 8.0,
      "holiday_pay": 800.00,
      "working_days": 22,
      "total_allowance": 2200.00
    }
  ],
  "payroll_payout": [
    {
      "staff_name": "John Doe",
      "salary": 15000.00,
      "allowance": 2200.00,
      "ot_pay": 187.50,
      "holiday_pay": 800.00,
      "service_charge": 500.00,
      "total": 18687.50
    }
  ],
  "calculated_at": "2024-07-05T10:30:00Z"
}
```

### 3. POST /api/admin/payroll/[month]/calculations
**Purpose**: Refresh/recalculate payroll for a specific month
**Authentication**: Required (Admin only)
**Response**: Same as GET endpoint

## Business Logic Implemented

### ✅ Overtime Calculation
- **Rule**: Hours > 48 per week (Monday-Sunday)
- **Implementation**: Groups daily hours by week, calculates OT per week
- **Rate**: Uses `staff_compensation.ot_rate_per_hour`

### ✅ Holiday Pay Calculation
- **Rule**: Incremental rate for ALL hours worked on public holidays
- **Implementation**: Checks `public_holidays` table, applies premium rate
- **Rate**: Uses `staff_compensation.holiday_rate_per_hour`

### ✅ Working Days Calculation
- **Rule**: Any day with ≥ 6 hours worked
- **Implementation**: Counts days meeting the 6-hour threshold
- **Allowance**: Daily allowance from `payroll_settings.daily_allowance_thb`

### ✅ Service Charge Distribution
- **Rule**: Distributed equally among eligible staff
- **Implementation**: Divides total service charge by eligible staff count
- **Eligibility**: Based on `staff_compensation.is_service_charge_eligible`

### ✅ Cross-Day Shift Handling
- **Rule**: All hours assigned to the day the shift started
- **Implementation**: Uses clock-in date for shift assignment
- **Example**: Jan 1 11pm - Jan 2 2am = 3 hours on Jan 1

### ✅ Bangkok Timezone
- **Rule**: All calculations use Bangkok timezone
- **Implementation**: Consistent timezone handling throughout

## Testing Prerequisites

1. **Database Setup**: Story #1 migration completed
2. **Staff Data**: At least one active staff member with compensation settings
3. **Time Entries**: Sample time entries in the database
4. **Authentication**: Valid admin session for API testing

## Manual Testing Steps

### Step 1: Test Months Endpoint
```bash
# This will return 401 (expected without auth)
curl http://localhost:3000/api/admin/payroll/months
```

### Step 2: Test Calculations Endpoint
```bash
# This will also return 401 (expected without auth)
curl http://localhost:3000/api/admin/payroll/2024-06/calculations
```

### Step 3: Test with Authentication
1. Log in to the admin panel at `http://localhost:3000/admin`
2. Use browser developer tools to test APIs:
```javascript
// Test months endpoint
fetch('/api/admin/payroll/months')
  .then(response => response.json())
  .then(data => console.log(data));

// Test calculations endpoint
fetch('/api/admin/payroll/2024-06/calculations')
  .then(response => response.json())
  .then(data => console.log(data));
```

## Expected Behavior

### With No Time Entries
- APIs should return empty arrays but not error
- Summary totals should be 0
- Response structure should remain consistent

### With Sample Time Entries
- Calculations should reflect actual work patterns
- Overtime should only appear for weeks >48 hours
- Holiday pay should only appear for work on public holidays
- Working days should only count days with ≥6 hours

### Error Handling
- Invalid month format returns 400 error
- Database connection issues return 500 error
- Missing staff compensation logs warnings but continues

## Validation Checklist

- [ ] Months endpoint returns last 3 months
- [ ] Calculations endpoint accepts YYYY-MM format
- [ ] Overtime calculated correctly (>48 hours/week)
- [ ] Holiday hours calculated for public holidays only
- [ ] Working days count only days with ≥6 hours
- [ ] Service charge distributed equally among eligible staff
- [ ] Cross-day shifts assigned to start date
- [ ] Bangkok timezone used consistently
- [ ] Authentication required for all endpoints
- [ ] Error handling works for invalid inputs

## Next Steps

Once Story #2 is validated:
- ✅ Core calculation engine working
- 🚀 Ready for Story #3: Time Entry Review & Edit
- 🚀 Ready for Story #4: Payroll Tab UI Components

## Files Created

- `app/api/admin/payroll/months/route.ts` - Months endpoint
- `app/api/admin/payroll/[month]/calculations/route.ts` - Calculations endpoint
- `src/lib/payroll-calculations.ts` - Core calculation logic (400+ lines)
- `scripts/PAYROLL_API_TESTING.md` - This testing guide 