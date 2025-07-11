# Holiday Pay Diagnosis for May 2025

## Issue: Holiday pay showing as 0 for all employees in May 2025

## Step-by-Step Diagnosis

### Step 1: Check if holidays exist in database ✅ **START HERE**

1. **Go to Admin Panel**
   - Navigate to: Admin → Payroll Dashboard
   - Click on the **"Holidays"** tab

2. **Check for May 2025 holidays**
   - Look for these dates in the holidays list:
     - `2025-05-01` - Labour Day
     - `2025-05-04` - Coronation Day  
     - `2025-05-12` - Visakha Bucha Day

3. **If holidays are missing:**
   - Click **"Load Default Holidays"** button
   - This will add all 2025 holidays including May dates
   - ✅ This is the most likely fix!

### Step 2: Check if staff worked on holiday dates

1. **Go to Admin → Time Reports**
   - Filter for May 2025
   - Check if any staff have time entries on:
     - May 1, 2025 (Labour Day)
     - May 4, 2025 (Coronation Day)
     - May 12, 2025 (Visakha Bucha Day)

2. **If no one worked on holidays:**
   - ✅ This explains zero holiday pay - it's correct!
   - Holiday pay only applies to hours actually worked on holiday dates

### Step 3: Check staff compensation settings

1. **Go to Admin → Payroll Dashboard → Service Charge tab**
   - Or check if there's a staff compensation section
   - Verify staff have `holiday_rate_per_hour` set (not 0)

2. **Expected rates:**
   - Should be something like ฿100-150/hour for holiday premium
   - If rates are 0, no holiday pay will be calculated

### Step 4: Verify the calculation logic

**How holiday pay works:**
1. System finds all holidays in the month (from `public_holidays` table)
2. Gets all staff time entries for the month
3. Groups time entries by staff and date using: `entryDate.toISOString().split('T')[0]`
4. Checks if any daily dates match holiday dates exactly
5. Calculates: `holiday_hours × holiday_rate_per_hour = holiday_pay`

**Date format must match exactly:**
- Holiday dates stored as: `"2025-05-01"`
- Time entry dates formatted as: `"2025-05-01"` (UTC date)

## Most Likely Solutions

### Solution 1: Load Missing Holidays (90% chance this fixes it)
```
1. Admin → Payroll → Holidays tab
2. Click "Load Default Holidays"  
3. Verify May 2025 holidays are now listed
4. Go back to Payroll Overview → May 2025
5. Holiday pay should now calculate correctly
```

### Solution 2: No Staff Worked on Holidays (Expected behavior)
```
If no staff actually worked on May 1, 4, or 12, 2025:
- Holiday pay = 0 is CORRECT
- Only staff who work on actual holiday dates get holiday pay
```

### Solution 3: Missing Compensation Settings
```
1. Check staff compensation settings
2. Ensure holiday_rate_per_hour > 0
3. Verify effective dates cover May 2025
```

## Technical Details

**Holiday Calculation Logic:**
```typescript
// 1. Get holidays for month
const holidays = await getHolidays('2025-05');  // May 1, 4, 12

// 2. Get daily hours for all staff
const dailyHours = await calculateDailyHours('2025-05');

// 3. Match dates
for (const daily of dailyHours) {
  if (holidayDates.has(daily.date)) {  // e.g., "2025-05-01"
    holidayHours += daily.total_hours;
  }
}

// 4. Calculate pay
const holidayPay = holidayHours * staff.holiday_rate_per_hour;
```

**Critical:** Date formats must match exactly between holidays table and time entries processing.

## Next Steps

1. **First** - Load default holidays using admin panel
2. **Then** - Check if anyone actually worked on May 1, 4, or 12
3. **Finally** - Verify staff have holiday rates configured

The most common cause is missing holidays in the database! 🎯 