# Fix Package Display Bugs in Package Monitor

## Overview
Fix two critical display bugs in the package monitor component where:
1. **Inactive/expired packages show incorrect status badges and dates**
2. **Unlimited packages (Early Bird+, Diamond) display hour counts incorrectly**

## Root Cause Analysis

### Bug #1: Expired packages showing "ACTIVE" badge with invalid dates
**Screenshot Evidence:** Package shows "ACTIVE" badge but displays "Expires: 1/1/1970" and "Days Remaining: Expired"

**Root Cause:**
- When `expiration_date` is `null` or invalid, line 23 creates Unix epoch date:
  ```typescript
  const expirationDate = new Date(pkg.expiration_date);  // null becomes 1/1/1970
  ```
- `new Date(null)` creates 1/1/1970 instead of an invalid date
- The badge logic doesn't properly validate dates before display

**Affected Code:** `src/components/package-monitor/package-card.tsx` lines 20-27, 86-92, 136-148

### Bug #2: Unlimited packages showing "5.0 hours remaining"
**Screenshot Evidence:** Early Bird+ package shows "First Used: 5.0 hours remaining" when it should show date or "Not used"

**Root Cause:**
- The `isUnlimited` check (line 28) is incomplete:
  ```typescript
  const isUnlimited = pkg.package_type === 'Unlimited' || pkg.remaining_hours === 'Unlimited';
  ```
- Early Bird+ and Diamond packages have names containing "early bird" or "diamond"
- But their `package_type` field is NOT the exact string "Unlimited"
- Result: These packages fail the unlimited check and incorrectly show hour counts

**Inconsistency Found:**
- Page-level component (`app/package-monitor/page.tsx` lines 73-75) has the CORRECT logic:
  ```typescript
  const isUnlimited = pkg.package_type === 'Unlimited' ||
                     pkg.package_type_name.toLowerCase().includes('diamond') ||
                     pkg.package_type_name.toLowerCase().includes('early bird');
  ```
- PackageCard uses incomplete check → causing the bug

**Affected Code:** `src/components/package-monitor/package-card.tsx` lines 28, 130-133, 149-160

## Implementation Plan

### Single File to Modify
**File:** `src/components/package-monitor/package-card.tsx`

### Change #1: Fix Unlimited Package Detection (Line 28)

**Before:**
```typescript
const isUnlimited = pkg.package_type === 'Unlimited' || pkg.remaining_hours === 'Unlimited';
```

**After:**
```typescript
const isUnlimited = pkg.package_type === 'Unlimited' ||
                   pkg.remaining_hours === 'Unlimited' ||
                   pkg.package_type_name?.toLowerCase().includes('diamond') ||
                   pkg.package_type_name?.toLowerCase().includes('early bird');
```

**Why:**
- Matches the page-level unlimited detection logic
- Uses optional chaining (`?.`) for safety
- Covers all unlimited package types: "Unlimited", "Diamond", "Early Bird+"

### Change #2: Add Date Validation (Lines 20-27)

**Before:**
```typescript
// Fix days remaining calculation - ensure we're comparing dates without time components
const today = new Date();
today.setHours(0, 0, 0, 0);
const expirationDate = new Date(pkg.expiration_date);
expirationDate.setHours(0, 0, 0, 0);
const daysRemaining = differenceInDays(expirationDate, today);
const isExpiring = !isInactive && daysRemaining <= 7;
const isExpired = !isInactive && daysRemaining < 0;
```

**After:**
```typescript
// Fix days remaining calculation - ensure we're comparing dates without time components
const today = new Date();
today.setHours(0, 0, 0, 0);

// Validate expiration date before calculations
const hasValidExpirationDate = pkg.expiration_date &&
                               !isNaN(new Date(pkg.expiration_date).getTime());

const expirationDate = hasValidExpirationDate
  ? new Date(pkg.expiration_date)
  : new Date(0); // Use epoch as fallback
expirationDate.setHours(0, 0, 0, 0);

const daysRemaining = hasValidExpirationDate
  ? differenceInDays(expirationDate, today)
  : -999999; // Large negative number for invalid dates

const isExpiring = !isInactive && hasValidExpirationDate && daysRemaining <= 7;
const isExpired = !isInactive && (!hasValidExpirationDate || daysRemaining < 0);
```

**Why:**
- Validates expiration date exists and is valid before calculations
- Invalid/null dates are treated as expired
- Prevents 1/1/1970 from being displayed
- Large negative number ensures "Expired" status for invalid dates

### Change #3: Update formatDaysRemaining (Lines 52-59)

**Before:**
```typescript
const formatDaysRemaining = () => {
  if (isInactive) return 'Not activated';
  if (daysRemaining < 0) return 'Expired';
  if (daysRemaining === 0) return 'Expires today';
  if (daysRemaining === 1) return 'Expires tomorrow';
  if (daysRemaining === 2) return '2 days left';
  return `${daysRemaining} days left`;
};
```

**After:**
```typescript
const formatDaysRemaining = () => {
  if (isInactive) return 'Not activated';
  if (!hasValidExpirationDate) return 'Invalid date';
  if (daysRemaining < 0) return 'Expired';
  if (daysRemaining === 0) return 'Expires today';
  if (daysRemaining === 1) return 'Expires tomorrow';
  if (daysRemaining === 2) return '2 days left';
  return `${daysRemaining} days left`;
};
```

**Why:**
- Shows "Invalid date" for null/invalid expiration dates
- Provides clear feedback instead of confusing "Expired" or "1/1/1970"

### Change #4: Fix Expiration Date Display (Lines 136-148)

**Before:**
```typescript
<div>
  <div className="text-sm text-muted-foreground">
    {isInactive ? "Purchase Date" : "Expiration Date"}
  </div>
  <div>
    {isInactive && pkg.purchase_date
      ? formatDate(pkg.purchase_date)
      : pkg.expiration_date
      ? formatDate(pkg.expiration_date)
      : 'N/A'
    }
  </div>
</div>
```

**After:**
```typescript
<div>
  <div className="text-sm text-muted-foreground">
    {isInactive ? "Purchase Date" : "Expiration Date"}
  </div>
  <div>
    {isInactive && pkg.purchase_date
      ? formatDate(pkg.purchase_date)
      : hasValidExpirationDate
      ? formatDate(pkg.expiration_date)
      : 'No expiration date'
    }
  </div>
</div>
```

**Why:**
- Only displays expiration date if it's valid
- Shows "No expiration date" instead of "N/A" or "1/1/1970"
- More user-friendly and clear

## Cascading Fixes

### "First Used" Display (Lines 130-133)
**No code changes needed** - The fix to `isUnlimited` automatically corrects this:
- Unlimited packages will now pass the `!isUnlimited` check as false
- They'll show the date if `first_use_date` exists, or "Not used" if it doesn't
- They'll NO LONGER show "X hours remaining"

### Hours Display Section (Lines 149-160)
**No code changes needed** - The fix to `isUnlimited` automatically corrects this:
- The condition `!isUnlimited` will now be false for Early Bird+ and Diamond
- These packages won't display "Hours Used" / "Remaining Hours" section

## Testing Checklist

### ✅ Test Case 1: Inactive Package with Null Expiration Date
- **Before:** "ACTIVE" badge, "Expires: 1/1/1970", "Days Remaining: Expired"
- **After:** "INACTIVE" badge, "No expiration date", "Days Remaining: Not activated"

### ✅ Test Case 2: Expired Regular Package
- **Before:** May show "ACTIVE" badge incorrectly
- **After:** "EXPIRED" badge (red/destructive variant)

### ✅ Test Case 3: Early Bird+ Package (Not Activated)
- **Before:** "First Used: 5.0 hours remaining"
- **After:** "First Used: Not used"

### ✅ Test Case 4: Early Bird+ Package (Activated)
- **Before:** Shows hour counts in detail view
- **After:** "First Used: [date]", NO hours section displayed

### ✅ Test Case 5: Diamond Unlimited Package
- **Before:** Shows hour counts
- **After:** No hour displays, shows unlimited status

### ✅ Test Case 6: Regular Limited Package
- **Before/After:** Should work the same - shows hours correctly

## Summary

**Single File Modified:** `src/components/package-monitor/package-card.tsx`

**4 Code Changes:**
1. Line 28: Enhanced unlimited detection (add package name checks)
2. Lines 20-27: Added date validation before calculations
3. Lines 52-59: Added invalid date handling in formatDaysRemaining
4. Lines 136-148: Use validated date for expiration display

**Automatic Fixes (no code changes needed):**
- Lines 130-133: "First Used" display
- Lines 149-160: Hours section display

**Expected Results:**
- ✅ Inactive packages show "INACTIVE" badge
- ✅ Expired packages show "EXPIRED" badge
- ✅ Invalid dates handled gracefully (no more 1/1/1970)
- ✅ Early Bird+ recognized as unlimited
- ✅ Diamond packages recognized as unlimited
- ✅ Unlimited packages don't show hours in detail view
