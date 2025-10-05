# Adding a New Coach to LENGOLF System

**Last Updated**: January 2025
**Version**: 2.0 (Updated for current architecture)

This document provides a complete step-by-step guide for adding a new coach to the LENGOLF Forms system.

## Overview

Adding a new coach requires updates across multiple system components:
- Database configuration (user authentication)
- Booking form UI (coach selection)
- LINE notifications (optional coaching groups)
- POS reconciliation system (earnings tracking)

**Estimated Time**: 30-45 minutes

---

## Prerequisites

Before starting, ensure you have:
- ✅ Admin access to Supabase database
- ✅ Coach's Google account email address
- ✅ Access to the codebase for editing
- ✅ LINE group ID (optional - if separate notifications needed)
- ✅ Understanding of coach display name vs internal name

---

## Step 1: Database Setup

### Add Coach to `backoffice.allowed_users` Table

Execute this SQL in Supabase SQL Editor:

```sql
INSERT INTO backoffice.allowed_users (
  email,
  is_admin,
  is_coach,
  coach_name,
  coach_display_name
) VALUES (
  'coach.email@example.com',  -- Coach's Google OAuth email
  false,                       -- Set to true if coach should also have admin access
  true,                        -- Required for coach access
  'Coach Full Name',           -- Used in backend queries (e.g., "Coach Min")
  'DisplayName'                -- Shown in UI (e.g., "Min")
);
```

**Important Notes**:
- `email` must match the coach's Google account exactly
- `coach_display_name` is what appears in the UI
- `coach_name` is used in database queries and can be more descriptive

### Verify Database Insert

```sql
SELECT id, email, is_admin, is_coach, coach_name, coach_display_name
FROM backoffice.allowed_users
WHERE email = 'coach.email@example.com';
```

---

## Step 2: Update Frontend Code

### 2.1 Update LINE Messaging Configuration

**File**: `src/lib/constants.ts`

Add the coach's LINE group to the configuration:

```typescript
export const LINE_MESSAGING = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
  groups: {
    default: process.env.LINE_GROUP_ID || "",
    ratchavin: process.env.LINE_GROUP_RATCHAVIN_ID || "",
    coaching: process.env.LINE_GROUP_COACHING_ID || "",
    noon: process.env.LINE_GROUP_NOON_ID || "",
    min: process.env.LINE_GROUP_MIN_ID || "",
    [coachkey]: process.env.LINE_GROUP_[COACHKEY]_ID || ""  // Add new coach here
  }
} as const;
```

**Example**:
```typescript
newcoach: process.env.LINE_GROUP_NEWCOACH_ID || ""
```

### 2.2 Update Booking Type Selector

**File**: `src/components/booking-form/selectors/booking-type-selector.tsx`

Add the coaching option to the booking types array:

```typescript
const bookingTypes = [
  { value: 'Package', label: 'Package', icon: Package },
  { value: 'Coaching (Boss)', label: 'Coaching (Boss)', icon: Users },
  { value: 'Coaching (Boss - Ratchavin)', label: 'Coaching (Boss - Ratchavin)', icon: Users },
  { value: 'Coaching (Noon)', label: 'Coaching (Noon)', icon: Users },
  { value: 'Coaching (Min)', label: 'Coaching (Min)', icon: Users },
  { value: 'Coaching ([CoachName])', label: 'Coaching ([CoachName])', icon: Users }, // Add here
  { value: 'Normal Bay Rate', label: 'Normal Bay Rate', icon: Calendar },
  { value: 'ClassPass', label: 'ClassPass', icon: Calendar },
  { value: 'Others (e.g. Events)', label: 'Others (e.g. Events)', icon: PenSquare },
]
```

### 2.3 Update Package Types Filter

**File**: `src/components/booking-form/steps/customer-step.tsx`

Add to the PACKAGE_TYPES array:

```typescript
const PACKAGE_TYPES = [
  'Package',
  'Coaching (Boss)',
  'Coaching (Boss - Ratchavin)',
  'Coaching (Noon)',
  'Coaching (Min)',
  'Coaching ([CoachName])'  // Add here
]
```

### 2.4 Update Enhanced Coach Selector (2 files)

**Files**:
- `src/components/booking-form/selectors/enhanced-coach-selector.tsx`
- `src/components/booking-form-new/selectors/enhanced-coach-selector.tsx`

Add the coach to the `allCoaches` array in **both files**:

```typescript
const allCoaches = [
  {
    value: 'Boss',
    label: 'Boss',
    initials: 'B',
    gradient: 'from-blue-600 to-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    value: 'Boss - Ratchavin',
    label: 'Ratchavin',
    initials: 'R',
    gradient: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200'
  },
  {
    value: 'Noon',
    label: 'Noon',
    initials: 'N',
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  },
  {
    value: 'Min',
    label: 'Min',
    initials: 'M',
    gradient: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200'
  },
  // Add new coach here with unique color scheme
  {
    value: '[CoachName]',
    label: '[CoachName]',
    initials: '[X]',  // First letter of name
    gradient: 'from-[color]-500 to-[color]-600',
    bgColor: 'bg-[color]-50',
    borderColor: 'border-[color]-200'
  },
]
```

**Available Color Schemes**:
- Blue (Boss)
- Teal (Ratchavin)
- Orange (Noon)
- Pink (Min)
- Purple, Indigo, Green, Yellow, Red, Violet, Cyan, etc.

**Also update the color logic in the same files**:

```typescript
<span className={cn(
  "text-lg font-bold transition-colors duration-200",
  isSelected
    ? "text-white"
    : isUnselected
      ? "text-gray-400"
      : coach.value === 'Boss'
        ? "text-blue-600"
        : coach.value === 'Boss - Ratchavin'
          ? "text-teal-600"
          : coach.value === 'Noon'
            ? "text-orange-600"
            : coach.value === 'Min'
              ? "text-pink-600"
              : coach.value === '[CoachName]'  // Add here
                ? "text-[color]-600"
                : "text-gray-600"  // fallback
)}>
  {coach.initials}
</span>
```

---

## Step 3: Update LINE Notification Routing

**File**: `app/api/notify/route.ts`

Add notification routing logic for the new coach:

```typescript
// Handle specific coaching notifications
if (bookingType === "Coaching (Boss - Ratchavin)" && LINE_MESSAGING.groups.ratchavin) {
  console.log('Booking is Ratchavin coaching, will send to Ratchavin group');
  groups.push(LINE_MESSAGING.groups.ratchavin);
} else if (bookingType === "Coaching (Boss)" && LINE_MESSAGING.groups.coaching) {
  console.log('Booking is regular coaching, will send to coaching group');
  groups.push(LINE_MESSAGING.groups.coaching);
} else if (bookingType === "Coaching (Noon)" && LINE_MESSAGING.groups.noon) {
  console.log('Booking is Noon coaching, will send to Noon group');
  groups.push(LINE_MESSAGING.groups.noon);
} else if (bookingType === "Coaching (Min)" && LINE_MESSAGING.groups.min) {
  console.log('Booking is Min coaching, will send to Min group');
  groups.push(LINE_MESSAGING.groups.min);
} else if (bookingType === "Coaching ([CoachName])" && LINE_MESSAGING.groups.[coachkey]) {
  console.log('Booking is [CoachName] coaching, will send to [CoachName] group');
  groups.push(LINE_MESSAGING.groups.[coachkey]);
}
```

---

## Step 4: Update POS Reconciliation System

### 4.1 Update Reconciliation Type Definition

**File**: `app/admin/reconciliation/types/reconciliation.ts`

Add to the ReconciliationType union:

```typescript
export type ReconciliationType =
  | 'restaurant'
  | 'golf_coaching_ratchavin'
  | 'golf_coaching_boss'
  | 'golf_coaching_noon'
  | 'golf_coaching_min'
  | 'golf_coaching_[coachname]';  // Add here in lowercase with underscores
```

### 4.2 Update Reconciliation UI Selector

**File**: `app/admin/reconciliation/components/ReconciliationTypeSelector.tsx`

Add a card for the new coach:

```typescript
const reconciliationTypes = [
  // ... existing types
  {
    id: 'golf_coaching_[coachname]',  // Must match type definition
    label: 'Golf Coaching - Pro [CoachName]',
    description: 'Match golf lesson invoices with lesson usage records for Pro [CoachName]',
    icon: Trophy,
    color: 'text-[color]-600',      // Choose unique color
    bgColor: 'bg-[color]-50',
    borderColor: 'border-[color]-200',
    selectedBorder: 'border-[color]-500',
    selectedBg: 'bg-[color]-100'
  }
];
```

**Color Assignments**:
- Green: Ratchavin
- Blue: Boss
- Purple: Noon
- Pink: Min
- Choose: Indigo, Violet, Cyan, Emerald, etc. for new coaches

### 4.3 Update Reconciliation Upload Configuration

**File**: `app/api/admin/reconciliation/upload/route.ts`

Add column mapping configuration:

```typescript
const RECONCILIATION_CONFIGS = {
  // ... existing configs
  golf_coaching_[coachname]: {
    expectedColumns: {
      date: ['Date', 'Lesson Date', 'Class Date', 'date', 'วันที่', 'เวลา', 'Date/Time'],
      customer: ['Name', 'Student', 'Student Name', 'Customer', 'customer_name', 'ชื่อ', 'ลูกค้า'],
      quantity: ['QTY', 'Qty', 'Lessons', 'Lesson Count', 'Sessions', 'quantity', 'จำนวน', 'จำนวนครั้ง', 'Count'],
      amount: ['AMOUNT', 'Amount', 'Total', 'Fee', 'Price', 'total_amount', 'ราคา', 'จำนวนเงิน'],
      unitPrice: ['UNIT PRICE', 'Unit Price', 'Per Lesson', 'Lesson Fee', 'Rate', 'unit_price', 'ราคาต่อครั้ง'],
      product: ['Type', 'Service', 'Lesson Type', 'Product', 'บริการ', 'ประเภท']
    },
    dateFormats: ['M/D/YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD', 'DD-MM-YYYY'],
    currencySymbols: ['฿', 'THB', '$', 'บาท']
  }
};
```

### 4.4 Update POS Data Retrieval

**File**: `app/api/admin/reconciliation/pos-data/route.ts`

**Add to validation array**:
```typescript
const validTypes = [
  'restaurant',
  'golf_coaching_ratchavin',
  'golf_coaching_boss',
  'golf_coaching_noon',
  'golf_coaching_min',
  'golf_coaching_[coachname]',  // Add here
  'smith_and_co_restaurant'
];
```

**Add to coach name mapping** (around line 144):
```typescript
const coachName = reconciliationType === 'golf_coaching_ratchavin'
  ? 'RATCHAVIN'
  : reconciliationType === 'golf_coaching_boss'
    ? 'BOSS'
    : reconciliationType === 'golf_coaching_noon'
      ? 'NOON'
      : reconciliationType === 'golf_coaching_min'
        ? 'MIN'
        : reconciliationType === 'golf_coaching_[coachname]'
          ? '[COACHNAME_UPPERCASE]'  // Add here - must match coach_earnings.coach column
          : null;
```

**Important**: The coach name must match exactly how it appears in the `backoffice.coach_earnings` table.

### 4.5 Update Reconciliation Logic

**File**: `app/api/admin/reconciliation/reconcile/route.ts`

**Add to validation array** (around line 95):
```typescript
if (!reconciliationType || ![
  'golf_coaching_ratchavin',
  'golf_coaching_boss',
  'golf_coaching_noon',
  'golf_coaching_min',
  'golf_coaching_[coachname]',  // Add here
  'smith_and_co_restaurant'
].includes(reconciliationType)) {
  return NextResponse.json({ error: 'Invalid reconciliation type' }, { status: 400 });
}
```

**Add to case statement** (around line 159):
```typescript
case 'golf_coaching_ratchavin':
case 'golf_coaching_boss':
case 'golf_coaching_noon':
case 'golf_coaching_min':
case 'golf_coaching_[coachname]':  // Add here
  const coachName = reconciliationType === 'golf_coaching_ratchavin'
    ? 'RATCHAVIN'
    : reconciliationType === 'golf_coaching_boss'
      ? 'BOSS'
      : reconciliationType === 'golf_coaching_noon'
        ? 'NOON'
        : reconciliationType === 'golf_coaching_min'
          ? 'MIN'
          : '[COACHNAME_UPPERCASE]';  // Add here
```

---

## Step 5: Environment Variables (Optional)

If setting up a separate LINE notification group, add to `.env.local`:

```bash
LINE_GROUP_[COACHKEY]_ID=your-line-group-id
```

**Example**:
```bash
LINE_GROUP_MIN_ID=C1234567890abcdef
```

Then add to Vercel environment variables for production deployment.

---

## Step 6: Validation & Testing

### Run Quality Checks

```bash
# TypeScript type checking
npm run typecheck

# ESLint validation
npm run lint

# Build test (optional but recommended)
npm run build
```

All checks should pass with no errors.

### Manual Testing Checklist

- [ ] Coach can log in with their Google account email
- [ ] Coach appears in coaching portal (`/coaching`)
- [ ] Coach appears in enhanced coach selector (booking form)
- [ ] "Coaching ([CoachName])" appears in booking type selector
- [ ] Package selector filters correctly for coach bookings
- [ ] LINE notifications route to correct group (if configured)
- [ ] Coach appears in reconciliation dropdown
- [ ] Coach's earnings data loads in reconciliation system
- [ ] Calendar integration works automatically (no manual config needed)

---

## What Works Automatically

Once the above steps are complete, these features work automatically:

✅ **Calendar Integration** - Handled by automated sync system
✅ **Coaching Portal Access** - Via database role
✅ **Booking System Pattern Matching** - Dynamic coach name handling
✅ **Availability Management** - Works via `/coaching/availability`
✅ **Dashboard Analytics** - Coach earnings and student tracking
✅ **Package Integration** - Automatic package filtering

---

## Post-Addition Steps for Coach

After adding the coach to the system, they should:

1. **Log in** via Google OAuth at the main application URL
2. **Navigate to** `/coaching` portal (auto-redirected if coach-only role)
3. **Set up schedule** at `/coaching/availability`:
   - Configure weekly schedule
   - Add recurring blocks (meetings, breaks)
   - Set date-specific overrides (vacations)
4. **Start receiving bookings** with type "Coaching ([CoachName])"

---

## Files Modified Summary

### Frontend (7 files)
1. `src/lib/constants.ts` - LINE configuration
2. `src/components/booking-form/selectors/booking-type-selector.tsx` - Booking types
3. `src/components/booking-form/steps/customer-step.tsx` - Package types
4. `src/components/booking-form/selectors/enhanced-coach-selector.tsx` - Coach cards
5. `src/components/booking-form-new/selectors/enhanced-coach-selector.tsx` - Coach cards (duplicate)
6. `app/api/notify/route.ts` - LINE routing

### Reconciliation System (4 files)
7. `app/admin/reconciliation/types/reconciliation.ts` - Type definitions
8. `app/admin/reconciliation/components/ReconciliationTypeSelector.tsx` - UI selector
9. `app/api/admin/reconciliation/upload/route.ts` - Column mappings
10. `app/api/admin/reconciliation/pos-data/route.ts` - Data retrieval
11. `app/api/admin/reconciliation/reconcile/route.ts` - Reconciliation logic

### Database (1 table)
12. `backoffice.allowed_users` - User authentication

---

## Troubleshooting

### Coach Cannot Log In
- Verify email in `allowed_users` matches Google account exactly
- Check `is_coach` is set to `true`
- Clear browser cache and try again

### Coach Not Appearing in UI
- Verify all enhanced-coach-selector files updated (2 files)
- Check TypeScript compilation passed
- Hard refresh browser (Ctrl+Shift+R)

### LINE Notifications Not Working
- Verify LINE_GROUP_[COACH]_ID in environment variables
- Check notification routing logic in `app/api/notify/route.ts`
- Confirm LINE bot is added to the group

### Reconciliation Not Working
- Verify coach name in `coach_earnings` table matches exactly
- Check all reconciliation files updated (4 files)
- Review case-sensitive matching in pos-data and reconcile routes

---

## Example: Adding Coach "Sarah"

Here's a complete example of adding a coach named "Sarah":

### Database
```sql
INSERT INTO backoffice.allowed_users (email, is_admin, is_coach, coach_name, coach_display_name)
VALUES ('sarah.coach@lengolf.com', false, true, 'Coach Sarah', 'Sarah');
```

### Frontend Updates
- LINE key: `sarah`
- Booking type: `'Coaching (Sarah)'`
- Coach card: `{ value: 'Sarah', label: 'Sarah', initials: 'S', gradient: 'from-purple-500 to-purple-600', ... }`

### Reconciliation Updates
- Type: `'golf_coaching_sarah'`
- Coach name mapping: `'SARAH'` (must match coach_earnings table)
- Color scheme: Purple

---

## Related Documentation

- [Coaching System Documentation](../features/public/coaching/COACHING_SYSTEM.md)
- [Authentication System](../technical/AUTHENTICATION_SYSTEM.md)
- [LINE Messaging Integration](../integrations/LINE_MESSAGING_INTEGRATION.md)
- [Database Documentation](../database/DATABASE_DOCUMENTATION_INDEX.md)

---

**Last Updated**: January 2025
**Maintained By**: Development Team
**For Support**: Contact system administrators or development team
