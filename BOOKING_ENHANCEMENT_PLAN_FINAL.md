# Booking Enhancement Implementation Plan - Final

## Overview
This document outlines the implementation plan for enhancing the booking system with package linking, referral source tracking, booking information updates, and new customer highlighting.

## Requirements Summary

### 1. **Package ID Integration**
- Add `package_id` column to bookings table
- Save package selection from booking form to database
- Allow editing package selection in manage bookings

### 2. **Referral Source Tracking**
- Add `referral_source` field for staff to fill out post-booking
- Options: Instagram, Facebook, Google, TikTok, Friends, Mall Advertisement, Other
- Accessible via manage bookings and calendar edit modals

### 3. **Booking Information Updates**
- Edit phone numbers in manage bookings
- Edit package selection in manage bookings
- Edit booking type in manage bookings
- Edit referral source in manage bookings

### 4. **New Customer Detection & Highlighting**
- Database trigger to identify first-time bookers by phone number
- Visual indicators in calendar and manage bookings views
- Replace form-based `isNewCustomer` with database-driven detection

## Technical Implementation Plan

### Phase 1: Database Schema & Triggers

#### 1.1 Database Schema Updates
```sql
-- Add new columns to bookings table
ALTER TABLE public.bookings 
ADD COLUMN package_id uuid REFERENCES backoffice.packages(id);

ALTER TABLE public.bookings 
ADD COLUMN referral_source text;

ALTER TABLE public.bookings 
ADD COLUMN is_new_customer boolean DEFAULT false;

-- Add indexes for performance
CREATE INDEX idx_bookings_package_id ON public.bookings(package_id);
CREATE INDEX idx_bookings_referral_source ON public.bookings(referral_source);
CREATE INDEX idx_bookings_is_new_customer ON public.bookings(is_new_customer);
```

#### 1.2 New Customer Detection Trigger
```sql
-- Function to normalize phone numbers for comparison
CREATE OR REPLACE FUNCTION normalize_phone_number(phone_number text)
RETURNS text AS $$
BEGIN
    -- Remove spaces, hyphens, parentheses, and plus signs
    -- Keep only digits
    RETURN regexp_replace(phone_number, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql;

-- Function to identify new customers by phone number
CREATE OR REPLACE FUNCTION check_new_customer()
RETURNS TRIGGER AS $$
DECLARE
    normalized_phone text;
BEGIN
    -- Only process if phone number is valid (basic validation)
    IF NEW.phone_number IS NOT NULL 
       AND LENGTH(TRIM(NEW.phone_number)) >= 8 
       AND NEW.phone_number ~ '^[0-9+\-\s\(\)]+$' 
       AND NEW.phone_number != '-'
       AND NEW.phone_number NOT LIKE '0000%' THEN
        
        -- Normalize the phone number
        normalized_phone := normalize_phone_number(NEW.phone_number);
        
        -- Skip if normalized phone is too short or invalid
        IF LENGTH(normalized_phone) < 8 THEN
            RETURN NEW;
        END IF;
        
        -- Check if this customer exists in either bookings or POS sales
        IF NOT EXISTS (
            -- Check previous bookings with normalized phone comparison
            SELECT 1 FROM public.bookings 
            WHERE normalize_phone_number(phone_number) = normalized_phone
            AND id != NEW.id
            AND phone_number IS NOT NULL
            AND LENGTH(TRIM(phone_number)) >= 8
            AND phone_number != '-'
            AND phone_number NOT LIKE '0000%'
        ) AND NOT EXISTS (
            -- Check POS sales history with normalized phone comparison
            SELECT 1 FROM pos.lengolf_sales
            WHERE normalize_phone_number(customer_phone_number) = normalized_phone
            AND customer_phone_number IS NOT NULL
            AND LENGTH(TRIM(customer_phone_number)) >= 8
            AND customer_phone_number != '-'
            AND customer_phone_number NOT LIKE '0000%'
        ) THEN
            NEW.is_new_customer := true;
        ELSE
            NEW.is_new_customer := false;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_check_new_customer
    BEFORE INSERT OR UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION check_new_customer();
```

#### 1.3 TypeScript Type Updates
```typescript
// Update booking types to include new fields
interface BookingRecord {
  id: string;
  // ... existing fields
  package_id: string | null;
  referral_source: string | null;
  is_new_customer: boolean;
}

// Referral source constants
export const REFERRAL_SOURCES = [
  'Instagram',
  'Facebook', 
  'Google',
  'TikTok',
  'Friends',
  'Mall Advertisement',
  'Other'
] as const;

export type ReferralSource = typeof REFERRAL_SOURCES[number];
```

### Phase 2: Booking Creation Updates

#### 2.1 Update Booking Creation API
**File**: `/app/api/bookings/create/route.ts`

**Changes**:
```typescript
// Ensure package_id is saved from form data
const bookingData = {
  // ... existing fields
  package_id: formData.packageId || null,
  referral_source: null, // Staff fills this later
  // Remove is_new_customer - handled by trigger
};
```

#### 2.2 Update Submit Handler
**File**: `/src/components/booking-form/submit/submit-handler.ts`

**Changes**:
```typescript
// Ensure packageId is included in API call
const bookingPayload = {
  // ... existing fields
  packageId: formData.packageId,
};
```

### Phase 3: Manage Bookings Enhancements

#### 3.1 Update Edit Booking Modal
**File**: `/app/manage-bookings/edit-booking-modal.tsx` (or similar)

**New Fields to Add**:
```typescript
interface EditBookingFormData {
  // ... existing fields
  phone_number: string;
  package_id: string | null;
  booking_type: string;
  referral_source: ReferralSource | null;
}
```

**UI Components**:
```typescript
// Phone number input
<Input
  type="tel"
  value={formData.phone_number}
  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
  placeholder="Phone number"
/>

// Package selector (reuse existing component)
<PackageSelector
  value={formData.package_id || ''}
  customerName={booking.name}
  customerPhone={booking.phone_number}
  bookingType={formData.booking_type}
  onChange={(packageId, packageName) => {
    setFormData({
      ...formData, 
      package_id: packageId,
      package_name: packageName
    });
  }}
  error={validationErrors.package_id}
/>

// Booking type selector
<BookingTypeSelector
  value={formData.booking_type}
  onChange={(type) => setFormData({...formData, booking_type: type})}
/>

// Referral source selector
<ReferralSourceSelector
  value={formData.referral_source}
  onChange={(source) => setFormData({...formData, referral_source: source})}
/>
```

#### 3.2 Create Referral Source Selector Component
**File**: `/src/components/booking-form/selectors/referral-source-selector.tsx`

```typescript
interface ReferralSourceSelectorProps {
  value: ReferralSource | null;
  onChange: (source: ReferralSource | null) => void;
  error?: string;
}

export function ReferralSourceSelector({ value, onChange, error }: ReferralSourceSelectorProps) {
  const [otherText, setOtherText] = useState('');

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Where did they hear about us?</label>
      
      <div className="grid grid-cols-2 gap-3">
        {REFERRAL_SOURCES.filter(source => source !== 'Other').map((source) => (
          <button
            key={source}
            type="button"
            onClick={() => onChange(source)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              value === source
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {source}
          </button>
        ))}
      </div>

      {/* Other option with text input */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onChange('Other')}
          className={`w-full p-3 rounded-lg border text-left transition-colors ${
            value === 'Other'
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          Other
        </button>
        
        {value === 'Other' && (
          <input
            type="text"
            placeholder="Please specify..."
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md"
          />
        )}
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
    </div>
  );
}
```

#### 3.3 Update Booking Edit API
**File**: `/app/api/bookings/[bookingId]/update/route.ts`

```typescript
export async function PUT(request: NextRequest, { params }: { params: { bookingId: string } }) {
  const session = await getDevSession(authOptions, request);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookingId } = params;
  const updates = await request.json();

  // Validate allowed updates
  const allowedFields = [
    'phone_number',
    'package_id',
    'booking_type',
    'referral_source'
  ];

  const filteredUpdates = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .reduce((obj, key) => {
      obj[key] = updates[key];
      return obj;
    }, {} as Record<string, any>);

  try {
    const { data, error } = await supabase
      .from('bookings')
      .update(filteredUpdates)
      .eq('id', bookingId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
```

### Phase 4: Visual Highlighting Implementation

#### 4.1 Update Manage Bookings View
**File**: `/app/manage-bookings/page.tsx`

**Changes**:
```typescript
// Add new customer badge to booking cards
function BookingCard({ booking }: { booking: BookingRecord }) {
  return (
    <div className="relative p-4 border rounded-lg">
      {booking.is_new_customer && (
        <div className="absolute top-2 right-2">
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
            New Customer
          </span>
        </div>
      )}
      
      {/* Rest of booking card content */}
      <div className="space-y-2">
        <h3 className="font-medium">{booking.name}</h3>
        <p className="text-sm text-gray-600">{booking.phone_number}</p>
        
        {booking.package_id && (
          <div className="flex items-center gap-2">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              Package Booking
            </span>
          </div>
        )}
        
        {booking.referral_source && (
          <p className="text-xs text-gray-500">
            Source: {booking.referral_source}
          </p>
        )}
      </div>
    </div>
  );
}
```

#### 4.2 Update Calendar View
**File**: `/app/bookings-calendar/page.tsx`

**Changes**:
```typescript
// Add new customer styling to calendar events
function CalendarEvent({ booking }: { booking: BookingRecord }) {
  const baseClasses = "p-2 rounded text-sm";
  const newCustomerClasses = booking.is_new_customer 
    ? "bg-green-100 border-l-4 border-green-500" 
    : "bg-blue-100";

  return (
    <div className={`${baseClasses} ${newCustomerClasses}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{booking.name}</span>
        {booking.is_new_customer && (
          <span className="text-xs bg-green-200 text-green-800 px-1 rounded">
            NEW
          </span>
        )}
      </div>
      
      <div className="text-xs text-gray-600 mt-1">
        {booking.phone_number}
        {booking.package_id && (
          <span className="ml-2 text-blue-600">📦 Package</span>
        )}
      </div>
    </div>
  );
}
```

### Phase 5: Data Migration & Testing

#### 5.1 Data Migration Script
```sql
-- Backfill is_new_customer for existing bookings
WITH first_bookings AS (
  SELECT b.id, b.phone_number
  FROM public.bookings b
  WHERE b.phone_number IS NOT NULL
    AND LENGTH(TRIM(b.phone_number)) >= 8
    AND b.phone_number ~ '^[0-9+\-\s\(\)]+$'
    AND b.phone_number != '-'
    AND b.phone_number NOT LIKE '0000%'
    -- This is their first booking (earliest created_at for this normalized phone)
    AND b.created_at = (
      SELECT MIN(b2.created_at)
      FROM public.bookings b2
      WHERE normalize_phone_number(b2.phone_number) = normalize_phone_number(b.phone_number)
      AND b2.phone_number IS NOT NULL
      AND LENGTH(TRIM(b2.phone_number)) >= 8
      AND b2.phone_number != '-'
      AND b2.phone_number NOT LIKE '0000%'
    )
    -- AND they don't exist in POS sales before this booking
    AND NOT EXISTS (
      SELECT 1 FROM pos.lengolf_sales s
      WHERE normalize_phone_number(s.customer_phone_number) = normalize_phone_number(b.phone_number)
      AND s.customer_phone_number IS NOT NULL
      AND LENGTH(TRIM(s.customer_phone_number)) >= 8
      AND s.customer_phone_number != '-'
      AND s.customer_phone_number NOT LIKE '0000%'
      AND s.sales_timestamp < b.created_at
    )
)
UPDATE public.bookings 
SET is_new_customer = true 
WHERE id IN (SELECT id FROM first_bookings);
```

#### 5.2 Testing Checklist
- [ ] Database trigger correctly identifies new customers
- [ ] Package ID is saved during booking creation
- [ ] Edit modal allows updating all required fields
- [ ] Referral source selector works with "Other" option
- [ ] Visual highlighting appears in calendar and manage bookings
- [ ] Phone number validation works correctly
- [ ] API endpoints handle updates properly

## Implementation Timeline

### Phase 1: Database (1-2 days)
- Schema updates
- Trigger creation
- Type definitions
- Data migration

### Phase 2: Booking Creation (1 day)
- API updates
- Form submission updates

### Phase 3: Management Interface (2-3 days)
- Edit modal enhancements
- Referral source selector
- API endpoints for updates

### Phase 4: Visual Highlighting (1-2 days)
- Calendar view updates
- Manage bookings view updates
- Styling and badges

### Phase 5: Testing & Deployment (1-2 days)
- Comprehensive testing
- Bug fixes
- Production deployment

**Total Estimated Time**: 6-10 days

## Success Criteria

✅ **Package Integration**: Bookings properly linked to packages during creation and editable in manage bookings  
✅ **Referral Source Tracking**: Staff can add referral sources via manage bookings interface  
✅ **Booking Updates**: Phone numbers, package selection, and booking types editable in manage bookings  
✅ **New Customer Detection**: Database automatically identifies first-time bookers by phone number  
✅ **Visual Highlighting**: New customer bookings clearly indicated in calendar and manage bookings views  
✅ **Data Integrity**: All updates properly validated and persisted  

## Technical Notes

### Database Considerations
- Use proper foreign key constraints for package_id
- Index new columns for query performance
- Handle phone number validation carefully in trigger
- Consider case sensitivity for phone number matching

### Frontend Considerations
- Maintain existing UI patterns and styling
- Add proper loading states for edit operations
- Implement client-side validation
- Handle error states gracefully

### Package Selector Implementation
- **Reuse existing component**: The current `PackageSelector` component from the booking form is perfect for the edit modal
- **Visual consistency**: Same card-based UI with radio buttons, package details, and expiration info
- **Smart filtering**: Automatically filters packages based on booking type (coaching vs package bookings)
- **Activation handling**: Shows "Not Activated" badges for unused packages that will be activated on first use
- **No changes needed**: The existing component already handles all the required functionality

### API Considerations
- Use proper authentication for all update endpoints
- Validate all input data server-side
- Return appropriate error messages
- Log important operations for debugging

---

*This plan provides a comprehensive roadmap for implementing all requested booking enhancements while maintaining system stability and user experience.*