# OB Calling Queue - Auto-Generation Implementation

## Overview

Replace the manual audience selection system with an automatically generated calling queue based on predefined business rules.

**Status:** Implemented
**Created:** 2026-01-26
**Last Updated:** 2026-01-26

---

## Business Requirements

### Queue Eligibility Rules

A customer appears in the calling queue if ALL conditions are met:

| Rule | Condition | Data Source |
|------|-----------|-------------|
| Thai Phone | Has valid Thai phone number pattern | `customer_marketing_analytics.contact_number` |
| No Future Booking | No confirmed booking with date >= today | `bookings` table |
| No Recent Visit | `last_visit_date < today - 90 days` OR `last_visit_date IS NULL` | `customer_marketing_analytics.last_visit_date` |
| Not Excluded by Call History | See call history rules below | `marketing.ob_sales_notes` |

### Call History Exclusion Rules

Based on the **most recent** call record per customer:

| Last Call Outcome | Condition | Exclusion Period |
|-------------------|-----------|------------------|
| Unreachable | `reachable = false` | 30 days from `call_date` |
| Positive/Neutral + No Follow-up | `response IN ('positive', 'neutral')` AND (`follow_up_required = false` OR `follow_up_date IS NULL`) | 90 days from `call_date` |
| Positive/Neutral + Follow-up Scheduled | `response IN ('positive', 'neutral')` AND `follow_up_required = true` AND `follow_up_date IS NOT NULL` | Excluded until follow-up completed (shows in Follow-ups view only) |
| Negative | `response = 'negative'` | 6 months (180 days) from `call_date` |
| Never Called | No record in `ob_sales_notes` | Not excluded |

### Follow-ups View

Customers appear in Follow-ups view if:
- Have a call record with `follow_up_required = true` AND `follow_up_date IS NOT NULL`
- Stay in Follow-ups until a new call record is created

### Sorting

- Primary: `lifetime_spending` DESC (highest value first)
- Nulls last

---

## Implementation Steps

### Phase 1: Database Changes

#### Step 1.1: Create RPC Function for Queue Generation
- [x] **Status:** Complete
- **File:** `supabase/migrations/20260126000000_ob_calling_queue_functions.sql`

Create `get_ob_calling_queue(p_offset, p_limit)` function that:
1. Starts with all customers from `customer_marketing_analytics`
2. Filters for Thai phone numbers
3. Excludes customers with future bookings (join to `bookings`)
4. Excludes customers with `last_visit_date >= CURRENT_DATE - 90`
5. Applies call history exclusion logic using lateral join to get most recent call
6. Orders by `lifetime_spending DESC NULLS LAST`
7. Returns paginated results

**SQL Pseudocode:**
```sql
CREATE OR REPLACE FUNCTION get_ob_calling_queue(
    p_offset INTEGER DEFAULT 0,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    customer_code VARCHAR,
    customer_name VARCHAR,
    contact_number VARCHAR,
    email VARCHAR,
    lifetime_spending NUMERIC,
    total_bookings INTEGER,
    last_visit_date DATE,
    active_packages BIGINT,
    last_package_name VARCHAR,
    last_package_type TEXT,
    last_package_first_use_date DATE
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH latest_calls AS (
        -- Get most recent call per customer
        SELECT DISTINCT ON (customer_id)
            customer_id,
            reachable,
            response,
            follow_up_required,
            follow_up_date,
            call_date,
            created_at
        FROM marketing.ob_sales_notes
        ORDER BY customer_id, created_at DESC
    ),
    customers_with_future_bookings AS (
        -- Get customers who have any future confirmed booking
        SELECT DISTINCT customer_id
        FROM public.bookings
        WHERE date >= CURRENT_DATE
        AND status = 'confirmed'
        AND customer_id IS NOT NULL
    )
    SELECT
        cma.id,
        cma.customer_code,
        cma.customer_name,
        cma.contact_number,
        cma.email,
        cma.lifetime_spending,
        cma.total_bookings,
        cma.last_visit_date,
        cma.active_packages,
        cma.last_package_name,
        cma.last_package_type::TEXT,
        cma.last_package_first_use_date
    FROM public.customer_marketing_analytics cma
    -- Exclude customers with future bookings
    LEFT JOIN customers_with_future_bookings fb ON fb.customer_id = cma.id
    -- Get latest call info
    LEFT JOIN latest_calls lc ON lc.customer_id = cma.id
    WHERE
        -- Thai phone number filter
        cma.contact_number IS NOT NULL
        AND (
            cma.contact_number ~ '^0[0-9]{9}$'
            OR cma.contact_number ~ '^\+66[0-9]{9}$'
            OR cma.contact_number ~ '^[689][0-9]{8}$'
            OR cma.contact_number ~ '^[689][0-9]{9}$'
        )
        -- No future bookings
        AND fb.customer_id IS NULL
        -- No visit in last 90 days
        AND (cma.last_visit_date < CURRENT_DATE - INTERVAL '90 days' OR cma.last_visit_date IS NULL)
        -- Call history exclusion logic
        AND (
            -- Never called
            lc.customer_id IS NULL
            OR (
                -- Unreachable: eligible after 30 days
                lc.reachable = false
                AND lc.call_date < CURRENT_DATE - INTERVAL '30 days'
            )
            OR (
                -- Negative: eligible after 180 days
                lc.response = 'negative'
                AND lc.call_date < CURRENT_DATE - INTERVAL '180 days'
            )
            OR (
                -- Positive/Neutral without follow-up: eligible after 90 days
                lc.response IN ('positive', 'neutral')
                AND (lc.follow_up_required = false OR lc.follow_up_date IS NULL)
                AND lc.call_date < CURRENT_DATE - INTERVAL '90 days'
            )
            -- Note: Positive/Neutral WITH follow-up scheduled are excluded (handled by Follow-ups view)
        )
        -- Exclude those with pending follow-ups (they go to Follow-ups view)
        AND NOT (
            lc.follow_up_required = true
            AND lc.follow_up_date IS NOT NULL
        )
    ORDER BY cma.lifetime_spending DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
```

**Notes/Progress:**
-

---

#### Step 1.2: Create Queue Count Function
- [x] **Status:** Complete
- **File:** Same migration file as Step 1.1

Create `count_ob_calling_queue()` function:
```sql
CREATE OR REPLACE FUNCTION count_ob_calling_queue()
RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
    queue_count INTEGER;
BEGIN
    -- Same logic as get_ob_calling_queue but just COUNT(*)
    -- ... (copy WHERE clause from above)
    RETURN queue_count;
END;
$$;
```

**Notes/Progress:**
-

---

#### Step 1.3: Create/Update Follow-ups Query Function
- [x] **Status:** Complete
- **File:** Same migration file

Create `get_ob_followups()` function that returns customers where:
- `follow_up_required = true` AND `follow_up_date IS NOT NULL` in their most recent call

**Notes/Progress:**
- Created `get_ob_followups()` and `count_ob_followups()` functions
- Updated to handle legacy data (follow_up_required=true but follow_up_date=NULL)
- Returns customer info with follow-up date and last call details

---

### Phase 2: API Changes

#### Step 2.1: Create New Queue API Endpoint
- [x] **Status:** Complete
- **File:** `app/api/ob-sales/queue/route.ts`

New endpoint that calls the RPC functions:
- `GET /api/ob-sales/queue?offset=0&limit=10` - Get paginated queue
- Returns: `{ customers: [...], pagination: { total, hasMore }, queueCount }`

**Notes/Progress:**
- Created with pagination support (offset/limit params)
- Returns customer data with package info
- Includes total count and hasMore flag for UI

---

#### Step 2.2: Create Queue Metrics API
- [x] **Status:** Complete
- **File:** `app/api/ob-sales/queue/metrics/route.ts`

New endpoint for dashboard metrics:
- `GET /api/ob-sales/queue/metrics`
- Returns: `{ queueCount, followUpCount }`

**Notes/Progress:**
- Calls both count RPC functions in parallel
- Returns combined metrics for header display

---

#### Step 2.3: Update Follow-ups API
- [x] **Status:** Complete
- **File:** `app/api/ob-sales/followups/route.ts` (new file)

Modify or create endpoint for follow-ups that uses the new logic (most recent call with follow-up scheduled).

**Notes/Progress:**
- Created new dedicated endpoint for follow-ups
- Uses `get_ob_followups()` RPC function
- Returns customer info with follow-up date and last call details

---

### Phase 3: Frontend - Lead Feedback Page

#### Step 3.1: Remove Audience Dependency
- [x] **Status:** Complete
- **File:** `app/lead-feedback/page.tsx`

Changes:
1. Remove `loadSelectedAudience()` function
2. Remove `obAudienceInfo` state (or repurpose for queue info)
3. Update `OBCallingInterface` to use new queue API
4. Update `loadFollowUpCustomers` to use new follow-ups logic

**Notes/Progress:**
- Removed all audience-related code and state
- Updated OBCallingInterface to use `/api/ob-sales/queue`
- Updated OBFollowUps to use `/api/ob-sales/followups`

---

#### Step 3.2: Add Queue Count Display
- [x] **Status:** Complete
- **File:** `app/lead-feedback/page.tsx`

Add subtle gray text in header showing queue count:
```tsx
<p className="text-sm text-gray-400">{queueCount} customers in queue</p>
```

Location: In the KPIMetrics header area or just below it.

**Notes/Progress:**
- Added queue count display below KPI metrics
- Shows "X customers in queue" in gray text
- Loads from metrics endpoint on page load

---

#### Step 3.3: Update OBCallingInterface Component
- [x] **Status:** Complete
- **File:** `app/lead-feedback/page.tsx`

Update the `loadCustomers` function to call new `/api/ob-sales/queue` endpoint instead of `/api/customer-outreach/audience/customers`.

Remove dependency on `audienceInfo?.audienceId`.

**Notes/Progress:**
- Updated loadCustomers to use new queue API
- Simplified logic - no longer needs audience selection
- Progressive loading works with pagination

---

#### Step 3.4: Update OBDashboard Component
- [x] **Status:** Complete
- **File:** `app/lead-feedback/page.tsx`

Update to show queue count from new metrics endpoint.
Remove "No audience selected" message logic.

**Notes/Progress:**
- OBDashboard now always shows Start Calling button (no audience check)
- Queue count and follow-up count loaded from metrics API
- Removed "No audience selected" message

---

### Phase 4: Frontend - Customer Outreach Page

#### Step 4.1: Add Disabled Banner
- [x] **Status:** Complete
- **File:** `app/admin/customer-outreach/page.tsx`

Add a banner at the top of the page:
```tsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
  <p className="text-amber-800 font-medium">
    This page is currently not in use. The OB calling queue is now auto-generated.
  </p>
</div>
```

Optionally disable interactions (buttons, inputs) but keep the UI visible.

**Notes/Progress:**
- Added amber warning banner at top of page
- Explains that queue is now auto-generated
- UI remains functional for reference purposes

---

### Phase 5: Testing & Validation

#### Step 5.1: Test Queue Generation (Unit Tests)
- [ ] **Status:** Not Started

**Core Eligibility Test Cases:**

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 1 | Customer with Thai phone (0812345678), no bookings, no calls | IN queue |
| 2 | Customer with Thai phone (+66812345678), no bookings, no calls | IN queue |
| 3 | Customer with non-Thai phone (+1234567890) | NOT in queue |
| 4 | Customer with NULL phone | NOT in queue |
| 5 | Customer with future confirmed booking (date >= today) | NOT in queue |
| 6 | Customer with future cancelled booking (status != confirmed) | IN queue |
| 7 | Customer with past booking only | IN queue (if other conditions met) |
| 8 | Customer visited 30 days ago | NOT in queue |
| 9 | Customer visited 89 days ago | NOT in queue |
| 10 | Customer visited 90 days ago | NOT in queue (boundary) |
| 11 | Customer visited 91 days ago | IN queue |
| 12 | Customer with NULL last_visit_date | IN queue |

**Call History Test Cases:**

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 13 | Never called (no ob_sales_notes record) | IN queue |
| 14 | Called unreachable 15 days ago | NOT in queue |
| 15 | Called unreachable 29 days ago | NOT in queue (boundary) |
| 16 | Called unreachable 30 days ago | NOT in queue (boundary) |
| 17 | Called unreachable 31 days ago | IN queue |
| 18 | Called positive, no follow-up, 60 days ago | NOT in queue |
| 19 | Called positive, no follow-up, 89 days ago | NOT in queue (boundary) |
| 20 | Called positive, no follow-up, 90 days ago | NOT in queue (boundary) |
| 21 | Called positive, no follow-up, 91 days ago | IN queue |
| 22 | Called neutral, no follow-up, 91 days ago | IN queue |
| 23 | Called positive WITH follow-up scheduled | NOT in queue, IN follow-ups |
| 24 | Called neutral WITH follow-up scheduled | NOT in queue, IN follow-ups |
| 25 | Called negative 90 days ago | NOT in queue |
| 26 | Called negative 179 days ago | NOT in queue (boundary) |
| 27 | Called negative 180 days ago | NOT in queue (boundary) |
| 28 | Called negative 181 days ago | IN queue |

**Multiple Call History Test Cases:**

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 29 | Customer with 2 calls: old=negative (200 days), recent=positive (10 days) | NOT in queue (use most recent) |
| 30 | Customer with 2 calls: old=positive (10 days), recent=negative (200 days) | IN queue (use most recent) |
| 31 | Customer with old follow-up completed, new call without follow-up | IN queue (based on new call timing) |

**Sorting Test Cases:**

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 32 | Customer A: lifetime_spending=50000, Customer B: lifetime_spending=30000 | A appears before B |
| 33 | Customer A: lifetime_spending=NULL, Customer B: lifetime_spending=10000 | B appears before A |
| 34 | Multiple customers with NULL lifetime_spending | All appear at end, order consistent |

**Follow-ups View Test Cases:**

| # | Scenario | Expected Result |
|---|----------|-----------------|
| 35 | Customer with follow_up_required=true, follow_up_date=NOT NULL | IN follow-ups view |
| 36 | Customer with follow_up_required=true, follow_up_date=NULL | NOT in follow-ups view |
| 37 | Customer with follow_up_required=false | NOT in follow-ups view |
| 38 | Customer in follow-ups gets new call record added | REMOVED from follow-ups |

**SQL Validation Queries:**
```sql
-- Test 1: Verify Thai phone filter works
SELECT COUNT(*) FROM get_ob_calling_queue(0, 1000)
WHERE contact_number NOT SIMILAR TO '(0[0-9]{9}|\+66[0-9]{9}|[689][0-9]{8,9})';
-- Expected: 0

-- Test 2: Verify no future bookings in queue
SELECT q.id, q.customer_name
FROM get_ob_calling_queue(0, 1000) q
JOIN public.bookings b ON b.customer_id = q.id
WHERE b.date >= CURRENT_DATE AND b.status = 'confirmed';
-- Expected: 0 rows

-- Test 3: Verify no recent visits in queue
SELECT id, customer_name, last_visit_date
FROM get_ob_calling_queue(0, 1000)
WHERE last_visit_date >= CURRENT_DATE - INTERVAL '90 days';
-- Expected: 0 rows

-- Test 4: Verify queue count matches paginated total
SELECT COUNT(*) FROM get_ob_calling_queue(0, 100000);
SELECT count_ob_calling_queue();
-- Expected: Both return same number

-- Test 5: Verify follow-ups are excluded from main queue
SELECT q.id
FROM get_ob_calling_queue(0, 100000) q
WHERE EXISTS (
  SELECT 1 FROM (
    SELECT DISTINCT ON (customer_id) customer_id, follow_up_required, follow_up_date
    FROM marketing.ob_sales_notes
    ORDER BY customer_id, created_at DESC
  ) lc
  WHERE lc.customer_id = q.id
  AND lc.follow_up_required = true
  AND lc.follow_up_date IS NOT NULL
);
-- Expected: 0 rows

-- Test 6: Verify sorting by lifetime_spending DESC
SELECT id, lifetime_spending
FROM get_ob_calling_queue(0, 100)
ORDER BY lifetime_spending DESC NULLS LAST;
-- Verify output order matches function output
```

**Notes/Progress:**
-

---

#### Step 5.2: Test API Endpoints
- [ ] **Status:** Not Started

**API Test Cases:**

```bash
# Test 1: Queue endpoint returns valid pagination
curl -s "http://localhost:3000/api/ob-sales/queue?offset=0&limit=10" | jq '.pagination'
# Expected: { "offset": 0, "limit": 10, "total": N, "hasMore": true/false }

# Test 2: Queue offset works correctly
curl -s "http://localhost:3000/api/ob-sales/queue?offset=0&limit=5" | jq '.customers[0].id'
curl -s "http://localhost:3000/api/ob-sales/queue?offset=5&limit=5" | jq '.customers[0].id'
# Expected: Different customer IDs

# Test 3: Metrics endpoint returns both counts
curl -s "http://localhost:3000/api/ob-sales/queue/metrics" | jq '.'
# Expected: { "queueCount": N, "followUpCount": M }

# Test 4: Follow-ups endpoint returns correct customers
curl -s "http://localhost:3000/api/ob-sales/followups?offset=0&limit=10" | jq '.customers | length'
# Expected: Same as followUpCount from metrics

# Test 5: Unauthorized without session
curl -s "http://localhost:3000/api/ob-sales/queue" | jq '.error'
# Expected: "Unauthorized" (in production mode)
```

**Notes/Progress:**
-

---

#### Step 5.3: Test UI Flow
- [ ] **Status:** Not Started

**Manual UI Test Cases:**

| # | Action | Expected Result |
|---|--------|-----------------|
| 1 | Load lead-feedback page | Queue count shown in header (gray text) |
| 2 | Click "Start Calling" button | First batch of customers loads |
| 3 | Scroll/load more | Additional customers load progressively |
| 4 | Complete a call (any disposition) | Success message, move to next customer |
| 5 | Schedule follow-up | Customer should appear in Follow-ups tab on next visit |
| 6 | Switch to Follow-ups tab | Shows customers with scheduled follow-ups |
| 7 | Complete follow-up call | Customer removed from Follow-ups |
| 8 | Visit /admin/customer-outreach | Disabled banner is visible |

**Notes/Progress:**
-

---

#### Step 5.4: Performance Testing
- [ ] **Status:** Not Started

**Performance Benchmarks:**

| Query | Target | Method |
|-------|--------|--------|
| `get_ob_calling_queue(0, 10)` | < 500ms | `EXPLAIN ANALYZE` |
| `count_ob_calling_queue()` | < 1000ms | `EXPLAIN ANALYZE` |
| `get_ob_followups(0, 10)` | < 500ms | `EXPLAIN ANALYZE` |
| API `/api/ob-sales/queue` | < 1000ms | Network timing |

**SQL Performance Test:**
```sql
EXPLAIN ANALYZE SELECT * FROM get_ob_calling_queue(0, 10);
EXPLAIN ANALYZE SELECT count_ob_calling_queue();
EXPLAIN ANALYZE SELECT * FROM get_ob_followups(0, 10);
```

**Notes/Progress:**
-

---

### Phase 6: Cleanup (Optional)

#### Step 6.1: Remove Unused Code
- [ ] **Status:** Not Started

After validation, consider removing:
- Old audience-related API calls from lead-feedback page
- `selected_audience` table references (keep table for potential future use)

**Notes/Progress:**
-

---

## Files Affected

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/YYYYMMDD_ob_calling_queue_functions.sql` | New | RPC functions for queue |
| `app/api/ob-sales/queue/route.ts` | New | Queue API endpoint |
| `app/api/ob-sales/queue/metrics/route.ts` | New | Queue metrics endpoint |
| `app/lead-feedback/page.tsx` | Modify | Remove audience dependency, add queue count |
| `app/admin/customer-outreach/page.tsx` | Modify | Add disabled banner |
| `app/api/marketing/ob-sales-notes/route.ts` | Modify | Update follow-ups query (maybe) |

---

## Rollback Plan

If issues arise:
1. Revert frontend changes to use audience-based system
2. Keep RPC functions (they don't affect existing functionality)
3. Re-enable customer outreach page

The existing `marketing.audiences`, `marketing.audience_members`, and `marketing.selected_audience` tables remain unchanged and can be reactivated.

---

## Open Questions

1. ~~Should we cache the queue count?~~ No, real-time is fine for now
2. Performance testing needed for large customer base

---

## Progress Log

| Date | Step | Status | Notes |
|------|------|--------|-------|
| 2026-01-26 | Planning | Complete | Document created |
| | | | |

