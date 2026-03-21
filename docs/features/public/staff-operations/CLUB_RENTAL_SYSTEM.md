# Club Rental & Course Rental System

## Table of Contents
1. [Overview](#overview)
2. [Business Context](#business-context)
3. [Rental Types](#rental-types)
4. [Club Set Inventory](#club-set-inventory)
5. [Pricing](#pricing)
6. [User Workflows](#user-workflows)
7. [Rental Lifecycle](#rental-lifecycle)
8. [API Endpoints](#api-endpoints)
9. [Database Schema](#database-schema)
10. [Components](#components)
11. [Integrations](#integrations)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The Club Rental System manages premium golf club set rentals for two distinct use cases: **indoor simulator sessions** at LENGOLF and **off-site course play**. It provides real-time availability tracking, automated pricing, staff workflow management, and integrations with LINE notifications, email confirmations, POS products, and Google Ads offline conversions.

### Key Pages
| Page | Path | Purpose |
|------|------|---------|
| Create Course Rental | `/create-course-rental` | Staff form to book clubs for course use |
| Manage Club Rentals | `/manage-club-rentals` | Dashboard to track, edit, and process rentals |

### System Capabilities
- **Real-time availability**: Quantity-based tracking with time-overlap detection for indoor and date-range conflict detection for course rentals
- **Optimal pricing**: Dynamic pricing algorithm that finds the cheapest combination of duration tiers
- **TOCTOU protection**: Post-insert availability re-check prevents overbooking from concurrent requests
- **Staff accountability**: All status changes require employee identification
- **Multi-channel notifications**: LINE group alerts on create, edit, and cancel; email confirmation for course rentals

---

## Business Context

LENGOLF is a golf simulator facility in Bangkok. Club rentals are a **paid add-on service** distinct from the complimentary standard clubs provided with every bay booking.

### Important Distinction
- **Standard clubs** (free): Basic clubs always available at no cost for indoor bay sessions
- **Premium/Premium+ rentals** (paid): Higher-quality club sets available for both indoor use and off-site course play

### Revenue Model
Club rentals generate direct revenue through:
- Per-hour indoor rental fees (added on top of bay booking cost)
- Per-day course rental fees (standalone bookings, not tied to a bay)
- Delivery service charges (course rentals only)
- Equipment add-on sales (gloves, balls)

---

## Rental Types

### Indoor Rentals
- **Context**: Customer is playing at a LENGOLF simulator bay
- **Linked to**: Bay booking via `booking_id`
- **Duration**: Measured in hours (0.5, 1, 2, 4)
- **Availability**: Time-overlap aware; clubs are returned after the session ends, so only concurrent sessions conflict
- **Fulfillment**: Pickup and return happen at the LENGOLF facility

### Course Rentals
- **Context**: Customer takes clubs off-site to play at an actual golf course
- **Standalone**: Not linked to a bay booking (`booking_id` is NULL)
- **Duration**: Measured in days (1, 3, 7, 14, or any custom range)
- **Availability**: Date-range based with a 1-hour transportation buffer between consecutive rentals
- **Fulfillment**: Pickup at LENGOLF or delivery within Bangkok (500 THB)
- **Payment**: Full prepayment required before confirmation

### Availability Conflict Rules
| Checking for... | Indoor rentals block? | Course rentals block? |
|-----------------|----------------------|----------------------|
| Indoor availability | Yes (time overlap only) | Yes (clubs are off-site) |
| Course availability | No (clubs returned after session) | Yes (date range overlap) |

---

## Club Set Inventory

Three club sets are currently available:

### Premium Tier

| Set | Gender | Brand/Model | Clubs Included |
|-----|--------|-------------|----------------|
| Premium Men's | Men's | Callaway Warbird | Driver, 5-Wood, Irons 5-9, PW, SW, Odyssey Putter |
| Premium Women's | Women's | Majesty Shuttle 2023 | Driver, TaylorMade Gloire 5W, Irons 7-9, PW, 56deg Wedge, Putter |

### Premium+ Tier

| Set | Gender | Brand/Model | Clubs Included |
|-----|--------|-------------|----------------|
| Premium+ Men's | Men's | Callaway Paradym Forged Carbon | Driver 10.5deg, 3W, 5W, 4H (Ventus TR shafts), Irons 5-PW, Jaws Raw 52deg/56deg, Odyssey Putter. Includes Callaway camo bag. |

Each set has `quantity = 1`, meaning only one physical set exists per entry. Availability is tracked by counting active (non-cancelled, non-returned) rentals against this quantity.

---

## Pricing

### Indoor Pricing (per session)

| Duration | Premium | Premium+ |
|----------|---------|----------|
| 30 min | 75 THB | 125 THB |
| 1 hour | 150 THB | 250 THB |
| 2 hours | 250 THB | 450 THB |
| 4 hours | 400 THB | 800 THB |

### Course Pricing (per rental period)

| Duration | Premium | Premium+ | Effective Daily Rate (Premium) |
|----------|---------|----------|-------------------------------|
| 1 day | 1,200 THB | 1,800 THB | 1,200 THB/day |
| 3 days | 2,400 THB | 3,600 THB | 800 THB/day (pay for 2) |
| 7 days | 4,800 THB | 7,200 THB | ~686 THB/day (pay for 4) |
| 14 days | 8,400 THB | 12,600 THB | 600 THB/day (pay for 7) |

### Optimal Combo Pricing
The course rental form uses a dynamic programming algorithm to find the cheapest combination of pricing tiers for any arbitrary number of days. For example, a 5-day rental is priced as 3-day + 1-day + 1-day packs, not 7-day.

### Add-ons

| Item | Price | Notes |
|------|-------|-------|
| Delivery (Bangkok) | 500 THB | Includes both delivery and pickup; course rentals only |
| Golf Glove | 600 THB | Premium leather |
| Golf Balls (6-pack / 1 bucket) | 400 THB | |

### Server-Side Price Enforcement
All add-on and rental prices are validated server-side in the `/api/clubs/reserve` and `/api/club-rentals/[id]` endpoints. Client-submitted prices are overridden with the canonical values defined in `VALID_ADD_ONS`.

---

## User Workflows

### Creating a Course Rental (Staff)

The Create Course Rental page (`/create-course-rental`) follows a progressive disclosure pattern with 6 sequential sections:

1. **Staff Selection** -- Employee identifies themselves via `EnhancedEmployeeSelector`
2. **Club Set Selection** -- Available sets loaded from `/api/clubs/availability?type=course`; unavailable sets are greyed out
3. **Dates & Duration** -- Start date, end date, optional pickup/return times; duration computed automatically; price updates live
4. **Delivery & Add-ons** -- Toggle between pickup (free) and delivery (500 THB); optional gloves and balls
5. **Customer** -- Existing customer search or new customer creation (reuses booking form components)
6. **Summary & Submit** -- Price breakdown and confirmation

**On successful submission:**
- Rental record created with status `reserved`
- Unique rental code generated (format: `CR-YYYYMMDD-XXXX`)
- LINE notification sent to staff group chat
- Confirmation email sent (if customer email provided)
- Success screen displayed with rental code

### Managing Rentals (Staff)

The Manage Club Rentals page (`/manage-club-rentals`) provides:

- **Status filter pills**: Active (default), All, Reserved, Paid, Checked Out, Returned, Cancelled
- **Search**: By rental code, customer name, or phone number
- **Rental cards**: Each card shows customer info, club set, dates, delivery method, add-ons, and total price
- **Action buttons**: Context-dependent based on current status (see Lifecycle below)

### Checkout / Return Flow

Physical handoff operations require staff identification:

1. Staff clicks "Check Out" or "Return" button on a rental card
2. `StaffConfirmModal` opens, prompting for staff name selection
3. On confirmation, status updates and timestamp + staff name recorded

---

## Rental Lifecycle

```
reserved --> confirmed --> checked_out --> returned
    |            |
    v            v
 cancelled    cancelled
```

### Status Definitions

| Status | Meaning | Available Actions |
|--------|---------|-------------------|
| `reserved` | Booked, awaiting payment | Edit, Mark Paid, Cancel |
| `confirmed` | Payment received/arranged | Edit, Check Out, Cancel |
| `checked_out` | Customer has the clubs | Return |
| `returned` | Clubs returned (terminal) | None |
| `cancelled` | Cancelled before checkout (terminal) | None |
| `no_show` | Reserved but never picked up (terminal) | None |

### Valid Status Transitions

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  reserved: ['confirmed', 'cancelled'],
  confirmed: ['checked_out', 'cancelled'],
  checked_out: ['returned'],
}
```

### Editing Rules
- Only rentals in `reserved` or `confirmed` status can be edited
- Editing recalculates pricing based on new parameters
- Availability is re-checked when set or dates change (excluding the current rental from conflict count)
- LINE notification sent with change summary

---

## API Endpoints

### GET `/api/clubs/availability`

Returns available club sets with real-time availability counts.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `'indoor' \| 'course'` | Yes | Rental type context |
| `date` | `YYYY-MM-DD` | Yes | Start date |
| `end_date` | `YYYY-MM-DD` | No | End date (defaults to `date`) |
| `start_time` | `HH:mm` | No | Start time (indoor only) |
| `duration` | `number` | No | Duration in hours (indoor only) |

**Response:**
```json
{
  "sets": [
    {
      "id": "uuid",
      "name": "Premium Men's - Callaway Warbird",
      "slug": "premium-mens-warbird",
      "tier": "premium",
      "gender": "mens",
      "brand": "Callaway",
      "model": "Warbird",
      "indoor_price_1h": 150,
      "course_price_1d": 1200,
      "quantity": 1,
      "rented_count": 0,
      "available_count": 1
    }
  ],
  "date": "2026-03-25",
  "rental_type": "course"
}
```

---

### POST `/api/clubs/reserve`

Creates a new club rental reservation.

**Request Body:**
```json
{
  "rental_club_set_id": "uuid",
  "rental_type": "course",
  "start_date": "2026-03-25",
  "end_date": "2026-03-28",
  "start_time": "10:00",
  "return_time": "18:00",
  "customer_name": "John Smith",
  "customer_phone": "0812345678",
  "customer_email": "john@example.com",
  "customer_id": "uuid (optional)",
  "add_ons": [{ "key": "gloves", "label": "Golf Glove", "price": 600 }],
  "delivery_requested": true,
  "delivery_address": "Marriott Marquis, Sukhumvit",
  "notes": "Left-handed request",
  "source": "staff"
}
```

**Response (201):**
```json
{
  "success": true,
  "rental": { "...full rental object..." },
  "rental_code": "CR-20260325-A1B2",
  "club_set": { "name": "...", "tier": "premium", "gender": "mens" },
  "pricing": {
    "rental_price": 2400,
    "add_ons_total": 600,
    "delivery_fee": 500,
    "total_price": 3500
  }
}
```

**Error Responses:**
- `400` -- Missing required fields or invalid rental type
- `401` -- Unauthorized
- `404` -- Club set not found
- `409` -- Set unavailable for selected dates/time (including TOCTOU rollback)

---

### GET `/api/club-rentals`

Lists course club rentals with filtering and search.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | `'active'` (reserved+confirmed+checked_out), specific status, or omit for all |
| `search` | string | Search by rental code, customer name, or phone |

**Response:**
```json
{
  "rentals": [
    {
      "id": "uuid",
      "rental_code": "CR-20260325-A1B2",
      "customer_name": "John Smith",
      "status": "reserved",
      "rental_club_sets": { "name": "...", "tier": "premium", "gender": "mens" },
      "...other fields..."
    }
  ]
}
```

**Note:** This endpoint only returns `rental_type = 'course'` rentals.

---

### PATCH `/api/club-rentals/[id]`

Updates the status of a rental (status transitions).

**Request Body:**
```json
{
  "status": "confirmed",
  "employee_name": "Net",
  "cancelled_by": "Dolly",
  "cancellation_reason": "Customer changed plans"
}
```

Fields `cancelled_by` and `cancellation_reason` are only used for cancellations. The `employee_name` field is recorded for checkout and return operations.

---

### PUT `/api/club-rentals/[id]`

Edits a rental's details (set, dates, delivery, add-ons, notes). Only allowed for `reserved` or `confirmed` rentals.

**Request Body:**
```json
{
  "rental_club_set_id": "uuid",
  "start_date": "2026-03-26",
  "duration_days": 3,
  "start_time": "11:00",
  "return_time": "17:00",
  "delivery_requested": false,
  "add_ons": [],
  "notes": "Updated notes",
  "employee_name": "Ashley"
}
```

**Response** includes both the updated rental and the `previous` state for change tracking / LINE notification.

---

## Database Schema

### `public.rental_club_sets`

Defines the available club set inventory (what can be rented).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `name` | text | Display name (e.g., "Premium Men's - Callaway Warbird") |
| `slug` | text (unique) | URL-safe identifier |
| `tier` | text | `'premium'` or `'premium-plus'` |
| `gender` | text | `'mens'` or `'womens'` |
| `brand` | text | Brand name |
| `model` | text | Model name |
| `description` | text | Full description |
| `specifications` | jsonb | Array of club names in the set |
| `image_url` | text | Product image URL |
| `rental_type` | text | `'indoor'`, `'course'`, or `'both'` |
| `indoor_price_1h` | numeric(10,2) | Indoor 1-hour price |
| `indoor_price_2h` | numeric(10,2) | Indoor 2-hour price |
| `indoor_price_4h` | numeric(10,2) | Indoor 4-hour price |
| `course_price_1d` | numeric(10,2) | Course 1-day price |
| `course_price_3d` | numeric(10,2) | Course 3-day price |
| `course_price_7d` | numeric(10,2) | Course 7-day price |
| `course_price_14d` | numeric(10,2) | Course 14-day price |
| `quantity` | int | Number of physical sets available |
| `is_active` | boolean | Whether currently offered |
| `display_order` | int | Sort order in UI |

**RLS:** Public read access; service role write access.

---

### `public.club_rentals`

Tracks all rental reservations (both indoor and course).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | |
| `rental_code` | text (unique) | Human-readable code (`CR-YYYYMMDD-XXXX`) |
| `rental_club_set_id` | uuid (FK) | References `rental_club_sets.id` |
| `booking_id` | text (FK) | References `bookings.id`; NULL for course rentals |
| `customer_id` | uuid (FK) | References `customers.id` |
| `customer_name` | text | Required |
| `customer_email` | text | Optional |
| `customer_phone` | text | Optional |
| `user_id` | uuid | Booking app profile ID (for user-facing read access) |
| `rental_type` | text | `'indoor'` or `'course'` |
| `status` | text | See [Rental Lifecycle](#rental-lifecycle) |
| `start_date` | date | |
| `end_date` | date | |
| `start_time` | time | Indoor: session start; Course: pickup time |
| `return_time` | time | Course: expected return time |
| `duration_hours` | numeric(4,1) | Indoor only (0.5, 1, 2, 4) |
| `duration_days` | int | Course only (1, 3, 7, 14, or custom) |
| `rental_price` | numeric(10,2) | Base club rental price |
| `add_ons` | jsonb | Array of `{ key, label, price }` objects |
| `add_ons_total` | numeric(10,2) | Sum of add-on prices |
| `delivery_requested` | boolean | |
| `delivery_address` | text | |
| `delivery_fee` | numeric(10,2) | 500 THB if delivery requested |
| `total_price` | numeric(10,2) | rental_price + add_ons_total + delivery_fee |
| `pos_order_id` | uuid | Link to POS order (when charged via POS) |
| `checked_out_at` | timestamptz | When clubs were handed to customer |
| `checked_out_by` | text | Staff name |
| `returned_at` | timestamptz | When clubs were returned |
| `returned_by` | text | Staff name |
| `notes` | text | Free-text notes (cancellation reasons appended here) |
| `source` | text | `'website'`, `'booking_app'`, `'liff'`, `'staff'`, or `'line'` |

**Indexes:**
- `idx_club_rentals_availability` -- Availability queries (set + date range, excluding terminal statuses)
- `idx_club_rentals_booking` -- Fast lookup by bay booking ID
- `idx_club_rentals_status_date` -- Dashboard queries by status and date
- `idx_club_rentals_customer` -- Customer lookup

**RLS Policies:**
- Users can read their own rentals (by `user_id`)
- Service role has full access
- Anon can insert (guest course bookings from booking app)

---

### Database Functions

#### `check_club_set_availability()`
Checks how many units of a specific set are available for a given date/time window.

```sql
check_club_set_availability(
  p_set_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL,
  p_exclude_rental_id uuid DEFAULT NULL,  -- for edit operations
  p_rental_type text DEFAULT NULL,         -- context for conflict rules
  p_return_time time DEFAULT NULL          -- course rental end time
) RETURNS int
```

Returns 0 or positive integer (available count). Course-to-course conflicts include a 1-hour transportation buffer.

#### `get_available_club_sets()`
Returns all active sets with real-time availability counts for a given rental type and date range.

```sql
get_available_club_sets(
  p_rental_type text,
  p_start_date date,
  p_end_date date DEFAULT NULL,
  p_start_time time DEFAULT NULL,
  p_duration_hours numeric DEFAULT NULL
) RETURNS TABLE (id, name, ..., rented_count, available_count)
```

#### `generate_rental_code()`
Generates a unique human-readable code in format `CR-YYYYMMDD-XXXX` where XXXX is a random hex suffix.

---

### POS Integration

Club rentals are also represented as products in the `products` schema for POS charging:

**Categories:**
- Clubs (parent)
  - Indoor Rental (subcategory)
  - Course Rental (subcategory)

**Products:**
| Product | Base Price | Has Modifiers |
|---------|-----------|---------------|
| Premium Indoor Club Rental | 150 THB | Yes (30min, 1h, 2h, 4h) |
| Premium+ Indoor Club Rental | 250 THB | Yes (30min, 1h, 2h, 4h) |
| Premium Course Club Rental | 1,200 THB | Yes (1d, 3d, 7d, 14d) |
| Premium+ Course Club Rental | 1,800 THB | Yes (1d, 3d, 7d, 14d) |
| Club Delivery (Bangkok) | 500 THB | No |

---

## Components

### Pages

| File | Description |
|------|-------------|
| `app/create-course-rental/page.tsx` | Server component wrapper with metadata |
| `app/create-course-rental/course-rental-client.tsx` | Full course rental creation form (progressive disclosure) |
| `app/manage-club-rentals/page.tsx` | Server component wrapper with metadata |
| `app/manage-club-rentals/manage-rentals-client.tsx` | Rental management dashboard with filters, search, action buttons |

### Modal Components

| Component | Path | Purpose |
|-----------|------|---------|
| `CancelRentalModal` | `src/components/manage-club-rentals/CancelRentalModal.tsx` | Cancellation with employee name and optional reason |
| `EditRentalModal` | `src/components/manage-club-rentals/EditRentalModal.tsx` | Full edit form (set, dates, delivery, add-ons, notes) |
| `StaffConfirmModal` | `src/components/manage-club-rentals/StaffConfirmModal.tsx` | Staff identification for checkout and return operations |

### Shared Components (reused from booking system)

| Component | Usage |
|-----------|-------|
| `EnhancedEmployeeSelector` | Staff name selection |
| `EnhancedCustomerTypeSelector` | New vs existing customer toggle |
| `CustomerDetails` | Customer search, selection, and creation |

---

## Integrations

### LINE Notifications
All significant events send a message to the staff LINE group via `/api/notify`:
- **Rental created**: Customer info, set details, dates, delivery method, total price, staff name
- **Rental edited**: Full change summary (what changed from -> to)
- **Rental cancelled**: Rental details, cancelling staff member, and reason

### Email Confirmation
Course rentals with a customer email trigger `sendCourseRentalConfirmationEmail()` (non-blocking). Defined in `src/lib/email-service.ts`.

### Google Ads Offline Conversions
Course rentals are included in the `public.google_ads_offline_conversions` view for upload to Google Ads. Conversion name: `'Course Rental Confirmed'`, value: the `total_price`.

### Bay Booking Link
Indoor rentals can be linked to a bay booking via `booking_id`. This allows the system to track which bookings had premium club add-ons.

### FAQ Knowledge Base
Club rental FAQs are stored in `faq_knowledge_base` under the `club_rental` and `equipment` categories, enabling the chatbot/LINE bot to answer customer questions about pricing, availability, and delivery.

---

## Troubleshooting

### Common Issues

**"This club set is not available for the selected dates"**
- All physical sets are rented out for the requested period
- For course rentals, remember the 1-hour transportation buffer blocks adjacent time slots
- Check the manage page for overlapping rentals that might need to be returned or cancelled

**Rental form does not show any club sets**
- Verify the `/api/clubs/availability` endpoint is returning data
- Check that `rental_club_sets` has records with `is_active = true`
- Ensure the `get_available_club_sets` database function exists (migration `20260307100002`)

**TOCTOU rollback ("This set was just booked by someone else")**
- Two users tried to book the same set simultaneously
- The system detected the conflict after insert and rolled back
- The user should retry; the form will show updated availability

**Edit button not appearing**
- Only `reserved` and `confirmed` rentals can be edited
- `checked_out`, `returned`, `cancelled`, and `no_show` rentals are locked

**LINE notification not sending**
- LINE notifications are fire-and-forget (non-blocking)
- Check server logs for `[CourseRental] LINE notification failed` messages
- Verify `LINE_CHANNEL_ACCESS_TOKEN` and `LINE_GROUP_ID` environment variables

### Migration Files

Listed in chronological order:
| Migration | Description |
|-----------|-------------|
| `20260223160000_add_club_rental_products.sql` | POS product catalog entries with time modifiers |
| `20260307100000_create_rental_club_sets.sql` | Club set inventory table with seed data |
| `20260307100001_create_club_rentals.sql` | Main rentals table with indexes and RLS |
| `20260307100002_club_rental_availability_functions.sql` | Availability check and listing functions |
| `20260307120000_fix_club_rental_availability_fractional_hours.sql` | Fix for fractional hour durations (0.5h) |
| `20260307150000_add_club_rentals_to_offline_conversions.sql` | Google Ads offline conversion view update |
| `20260307160000_fix_course_availability_exclude_indoor_rentals.sql` | Indoor sessions no longer block course availability |
| `20260309100000_add_club_rental_faq_entries.sql` | Chatbot FAQ entries for club rental questions |
| `20260316100000_add_indoor_club_rental_30min_modifier.sql` | 30-minute indoor rental option (75/125 THB) |
| `20260316100000_add_course_rental_1hr_transportation_buffer.sql` | 1-hour buffer between consecutive course rentals |

---

*Last updated: 2026-03-21*
