# April 1, 2026 — Opening Hours + Bay Rate Changes

## Overview

Two changes effective **April 1, 2026**:

1. **Opening hours:** 10:00 AM → **9:00 AM** daily
2. **Bay rate increase:** +50 THB across all tiers

**Deployment strategy:** Deploy code changes on **March 27** with date-gated logic so customers can immediately book 9am slots for April 1st onwards. Bay rate increase applied on April 1 via POS database update.

---

## Deployment Phases

### Phase 1 — Deploy March 27 (date-gated, safe for immediate deployment)

These changes use a date gate: `startHour = date >= '2026-04-01' ? 9 : 10`

#### Helper Function

Add a shared utility used by all callers:

```typescript
// src/lib/opening-hours.ts
const NEW_OPENING_HOUR = 9;
const OLD_OPENING_HOUR = 10;
const TRANSITION_DATE = '2026-04-01';

export function getOpeningHour(date: string): number {
  return date >= TRANSITION_DATE ? NEW_OPENING_HOUR : OLD_OPENING_HOUR;
}
```

#### 1.1 — Availability APIs (lengolf-forms)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `app/api/bookings/available-slots/route.ts` | 18 | `startHour \|\| '10'` | `startHour \|\| getOpeningHour(date)` |
| `app/api/bookings/available-slots/route.ts` | 88 | `startHour = 10` | `startHour = getOpeningHour(date)` |
| `app/api/availability/get-slots/route.ts` | 23 | `p_start_hour: startHour \|\| 10` | `p_start_hour: startHour \|\| getOpeningHour(date)` |

#### 1.2 — Frontend Hooks & Components (lengolf-forms)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `src/hooks/useAvailability.ts` | 34 | `startHour = 10` | `startHour = 9` (hook callers pass the date, slots are date-specific anyway) |
| `src/hooks/useAvailability.ts` | 59 | `'10:00'` default time | `'09:00'` |
| `src/components/booking-form/booking-time-selector/index.tsx` | 54 | `startHour: 10` | `startHour: 9` |
| `src/components/booking-form/booking-time-selector/index.tsx` | 77 | `.set({ hour: 10, ... })` | `.set({ hour: 9, ... })` |
| `src/components/booking-form-new/bay-blocking-modal.tsx` | 49, 67 | `'10:00'` default | `'09:00'` |

> **Note:** Frontend defaults can go straight to 9 since booking forms only allow future dates. By the time a user books for today (March 27), the API still enforces the date-gated startHour.

#### 1.3 — AI Chat System (lengolf-forms)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `src/lib/ai/function-executor.ts` | 121-122 | `Math.max(currentHour + 1, 10)` | `Math.max(currentHour + 1, getOpeningHour(targetDate))` |
| `src/lib/ai/skills/facility-skill.ts` | 12 | `"10:00 AM to 11:00 PM"` | `"9:00 AM to 11:00 PM"` |

#### 1.4 — Customer Booking App (lengolf-booking-new)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `app/api/availability/route.ts` | 48-49 | `p_start_hour: 10` | `p_start_hour: getOpeningHour(date)` |
| `lib/businessHours.ts` | 22 | `currentHour >= 10` | `currentHour >= 9` |
| `lib/businessHours.ts` | 27 | Display: "10 AM - 11 PM" | "9 AM - 11 PM" |
| `lib/businessHours.ts` | 33 | `setHours(10, 0, 0, 0)` | `setHours(9, 0, 0, 0)` |
| `app/(features)/bookings/.../DateSelection.tsx` | 117, 199 | `"10:00 AM - 11:00 PM"` | `"9:00 AM - 11:00 PM"` |
| `app/(features)/bookings/.../TimeSlots.tsx` | 152 | `'(10:00 - 13:00)'` | `'(09:00 - 13:00)'` |
| `app/course-rental/page.tsx` | 39 | TIME_OPTIONS starts at `'10:00'` | Add `'09:00'` |
| `app/layout.tsx` | 181 | JSON-LD `opens: '10:00'` | `opens: '09:00'` |
| `app/course-rental/layout.tsx` | 52 | JSON-LD `opens: '10:00'` | `opens: '09:00'` |

#### 1.5 — Coaching Schedule (lengolf-forms)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `src/components/coaching/availability/WeeklyScheduleManager.tsx` | 68 | Default `start_time: '10:00'` | `'09:00'` |
| `src/components/coaching/availability/WeeklyScheduleManager.tsx` | 183-184 | Validation: `< '10:00'` error | `< '09:00'` error |
| `src/components/coaching/availability/WeeklyScheduleManager.tsx` | 292 | `min="10:00"` | `min="09:00"` |
| `src/components/coaching/availability/AvailabilityCalendar.tsx` | 45 | Time slots start `'10:00'` | Add `'09:00'` to array |

#### 1.6 — Marketing Website (lengolf-website)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `app/[locale]/activities/page.tsx` | 160 | `"open daily 10am-11pm"` | `"open daily 9am-11pm"` |
| `app/[locale]/golf-in-thailand-guide/page.tsx` | 189 | Same | Same |
| `app/[locale]/hotels/page.tsx` | 133 | `"Open Daily 10am-11pm"` | `"Open Daily 9am-11pm"` |

---

### Phase 2 — Deploy April 1 (must not activate before April 1)

These affect real-time operations (SLA, coverage) and must reflect **current** business hours.

#### 2.1 — Database Functions (Supabase migration)

| Function | Schema | Current | Change |
|----------|--------|---------|--------|
| `is_within_business_hours(ts)` | public | `hour_of_day >= 10` | `hour_of_day >= 9` |
| `calculate_business_hours_interval(start_ts, end_ts)` | public | `business_start_hour := 10`, `'10:00:00'` | `9`, `'09:00:00'` |

**Migration file:** `supabase/migrations/20260401000000_update_business_hours_9am.sql`

```sql
-- Update business hours from 10am to 9am (effective April 1, 2026)

CREATE OR REPLACE FUNCTION is_within_business_hours(ts TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  bangkok_ts TIMESTAMPTZ;
  hour_of_day INTEGER;
BEGIN
  bangkok_ts := ts AT TIME ZONE 'Asia/Bangkok';
  hour_of_day := EXTRACT(HOUR FROM bangkok_ts);
  -- Business hours: 9am to 10pm (9-22)
  RETURN hour_of_day >= 9 AND hour_of_day < 22;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_business_hours_interval(start_ts TIMESTAMPTZ, end_ts TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  start_of_business TIMESTAMPTZ;
  end_of_business TIMESTAMPTZ;
  overlap_start TIMESTAMPTZ;
  overlap_end TIMESTAMPTZ;
  total_seconds INTEGER := 0;
  loop_date DATE;
  business_start_hour INTEGER := 9;
  business_end_hour INTEGER := 22;
BEGIN
  IF start_ts >= end_ts THEN
    RETURN 0;
  END IF;
  loop_date := DATE(start_ts AT TIME ZONE 'Asia/Bangkok');
  WHILE loop_date <= DATE(end_ts AT TIME ZONE 'Asia/Bangkok') LOOP
    start_of_business := (loop_date || ' 09:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';
    end_of_business := (loop_date || ' 22:00:00')::TIMESTAMP AT TIME ZONE 'Asia/Bangkok';
    overlap_start := GREATEST(start_ts, start_of_business);
    overlap_end := LEAST(end_ts, end_of_business);
    IF overlap_start < overlap_end THEN
      total_seconds := total_seconds + EXTRACT(EPOCH FROM (overlap_end - overlap_start))::INTEGER;
    END IF;
    loop_date := loop_date + 1;
  END LOOP;
  RETURN total_seconds;
END;
$$;
```

#### 2.2 — Staff Coverage Analysis (lengolf-forms)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `src/lib/coverage-analysis.ts` | 27 | `BUSINESS_START = '10:00'` | `'09:00'` |
| `src/lib/coverage-analysis.ts` | 29 | `BUSINESS_HOURS_MINUTES = 13 * 60` | `14 * 60` (840 min) |

#### 2.3 — Schedule Visualization (lengolf-forms)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `src/types/schedule-visualization.ts` | 34, 160 | `start: 10` | `start: 9` |

#### 2.4 — Edge Function (lengolf-forms)

| File | Line(s) | Current | Change |
|------|---------|---------|--------|
| `supabase/functions/chat-opportunity-scan/index.ts` | 14 | `"10:00 AM - 10:00 PM"` | `"9:00 AM - 10:00 PM"` |

---

### Phase 3 — Post-April 1 Cleanup

After April 1st, remove the date gate and simplify:

1. Remove `getOpeningHour()` helper — replace all calls with hardcoded `9`
2. Delete the transition date constant
3. Update or remove the LINE survey question asking about 9am interest (`src/lib/line/flex-templates.ts` line 1067)

---

## External / Non-Code Changes

| Item | Owner | When |
|------|-------|------|
| **Google Business Profile** — update opening hours to 9am | Admin | April 1 |
| **LINE Rich Menu** — update if hours are displayed | Admin | April 1 |
| **Facebook page** — update business hours | Admin | March 27 (announce) |
| **Instagram bio** — update if hours mentioned | Admin | March 27 (announce) |
| **Physical signage** at venue | Operations | April 1 |
| **Staff scheduling** — ensure coverage from 9am | Operations | Before April 1 |
| **Parking validation** — confirm 3hr free parking applies from 9am | Operations | Before April 1 |

---

## Documentation Updates

| File | Change |
|------|--------|
| `docs/features/public/staff-operations/STAFF_MESSAGE_TEMPLATES.md` | Update hours text |
| `docs/features/admin/analytics/CHAT_SLA_TRACKING_SYSTEM.md` | Update "10am-10pm" references |
| `docs/research/ai-full-system-prompt-snapshot.md` | Update hours reference |
| `CLAUDE.md` (project) | Update "Operating hours" in business rules |
| `~/.claude/skills/lengolf-business/SKILL.md` | Update "Hours: 10am-11pm" |

---

## Bay Rate Increase: +50 THB (Effective April 1, 2026)

### New Pricing

| Time Slot | Weekday (Mon-Thu) | Weekend (Fri-Sun & Holidays) |
|-----------|-------------------|------------------------------|
| Before 14:00 | ~~500~~ → **550 THB** | ~~700~~ → **750 THB** |
| 14:00-17:00 | ~~700~~ → **750 THB** | ~~900~~ → **950 THB** |
| 17:00-23:00 (Promo) | ~~700~~ → **750 THB** | ~~900~~ → **950 THB** |
| 17:00-23:00 (Original/Strikethrough) | ~~1,200~~ → **1,250 THB** | ~~1,400~~ → **1,450 THB** |

### How Pricing Flows

```
products.products table (POS database — source of truth)
        ↓ queried by
pricing-service.ts (lengolf-forms, 5-min server cache)
        ↓ served via
GET /api/pricing (5-min HTTP cache header)
        ↓ fetched by
lib/pricing.ts (lengolf-booking-new, 30-min client cache)
        ↓ used by
cost-calculator.ts → getRateForTime() → customer sees price
```

**After updating POS prices, the booking website picks up new rates within ~35 minutes automatically.**

### Primary Change: POS Database (April 1)

Update the 6 bay rate products in `products.products`:

```sql
-- Bay rate increase: +50 THB (effective April 1, 2026)
UPDATE products.products SET price = 550 WHERE name = 'Weekday 1H (Morning)';
UPDATE products.products SET price = 750 WHERE name = 'Weekend 1H (Morning)';
UPDATE products.products SET price = 750 WHERE name = 'Weekday 1H (Afternoon)';
UPDATE products.products SET price = 950 WHERE name = 'Weekend 1H (Afternoon)';
UPDATE products.products SET price = 750 WHERE name = 'Weekday 1H (Evening)';
UPDATE products.products SET price = 950 WHERE name = 'Weekend 1H (Evening)';
```

### Hardcoded Fallbacks to Update (code changes, deploy April 1)

These are fallback values used when the pricing API is unavailable. They don't affect normal operation but should match the real prices.

#### lengolf-booking-new

| File | What | Old | New |
|------|------|-----|-----|
| `lib/liff/bay-rates-data.ts:68` | DEFAULT_RATES morning weekday | 500 | 550 |
| `lib/liff/bay-rates-data.ts:69` | DEFAULT_RATES morning weekend | 700 | 750 |
| `lib/liff/bay-rates-data.ts:73` | DEFAULT_RATES afternoon weekday | 700 | 750 |
| `lib/liff/bay-rates-data.ts:74` | DEFAULT_RATES afternoon weekend | 900 | 950 |
| `lib/liff/bay-rates-data.ts:78` | DEFAULT_RATES evening weekday | 700 | 750 |
| `lib/liff/bay-rates-data.ts:79` | DEFAULT_RATES evening weekend | 900 | 950 |
| `lib/liff/bay-rates-data.ts:80` | DEFAULT_RATES evening original weekday | 1200 | 1250 |
| `lib/liff/bay-rates-data.ts:81` | DEFAULT_RATES evening original weekend | 1400 | 1450 |
| `lib/liff/bay-rates-data.ts:99` | `findPrice()` fallback morning weekday | 500 | 550 |
| `lib/liff/bay-rates-data.ts:100` | `findPrice()` fallback morning weekend | 700 | 750 |
| `lib/liff/bay-rates-data.ts:104` | `findPrice()` fallback afternoon weekday | 700 | 750 |
| `lib/liff/bay-rates-data.ts:105` | `findPrice()` fallback afternoon weekend | 900 | 950 |
| `lib/liff/bay-rates-data.ts:109` | `findPrice()` fallback evening weekday | 700 | 750 |
| `lib/liff/bay-rates-data.ts:110` | `findPrice()` fallback evening weekend | 900 | 950 |

#### lengolf-website

| File | What | Old | New |
|------|------|-----|-----|
| `data/pricing.ts:193` | bayRates morning | `'500 THB'`, `'700 THB'` | `'550 THB'`, `'750 THB'` |
| `data/pricing.ts:194` | bayRates afternoon | `'700 THB'`, `'900 THB'` | `'750 THB'`, `'950 THB'` |
| `data/pricing.ts:195` | bayRates evening | `'700 THB'`, `'900 THB'` | `'750 THB'`, `'950 THB'` |
| `data/pricing.ts:234` | FAQ answer text | `"500 THB...900 THB"` | `"550 THB...950 THB"` |
| `data/pricing.ts:399` | FAQ answer text | `"500 THB...900 THB"` | `"550 THB...950 THB"` |
| `data/pricing.ts:446` | Dynamic fallback morning | `500`, `700` | `550`, `750` |
| `data/pricing.ts:447` | Dynamic fallback afternoon | `700`, `900` | `750`, `950` |
| `data/pricing.ts:448` | Dynamic fallback evening | `700`, `900` | `750`, `950` |
| `app/[locale]/golf/page.tsx:177` | Image alt text | `"500–700 THB...700–900 THB"` | `"550–750 THB...750–950 THB"` |

#### lengolf-forms

| File | What | Old | New |
|------|------|-----|-----|
| `app/api/ob-sales/stats/route.ts:67` | `BAY_RATE_PER_HOUR` average estimate | 700 | 750 |

### Things That Auto-Update (no code change needed)

These pull prices dynamically from the `products.products` table via the pricing API:

- **Booking app cost calculator** — `getRateForTime()` uses dynamic `getRates()` which fetches from API
- **AI chat pricing responses** — `formatPricingForAI()` in `pricing-service.ts` reads from DB
- **Bay rates LIFF page** — displays dynamic prices from API
- **Website golf page pricing table** — fetches from API with fallbacks (fallbacks listed above)

### Things NOT Changing

- Club rental prices (free standard, 150/200/400 THB premium tiers)
- Coaching/lesson package prices
- Monthly package prices
- Food & drink prices
- Event package prices
- Delivery fees (500 THB)

---

## Implementation Status

### Opening Hours (deployed March 27)

| Item | Status |
|------|--------|
| `src/lib/opening-hours.ts` helper | ✅ Deployed |
| Availability APIs (forms) | ✅ Deployed |
| Frontend hooks & time selector (forms) | ✅ Deployed |
| AI function executor + facility skill | ✅ Deployed |
| Coaching schedule constraints | ✅ Deployed |
| Bay blocking, coverage, schedule config | ✅ Deployed |
| Edge function + LINE template | ✅ Deployed |
| Customer booking app (booking-new) | ✅ Deployed |
| Marketing website pages | ✅ Deployed |
| Bay rates morning time slot `startHour: 10 → 9` | ✅ Hotfixed (pricing was showing ₿0 for 9am) |
| Bay rates config `open: '10:00' → '09:00'` | ✅ Hotfixed |
| DB functions (SLA) | ✅ Applied March 27 |
| DB migration file saved | ✅ `supabase/migrations/20260401000000_update_business_hours_9am.sql` |

### Bay Rate Increase (applied March 31)

| Item | Status |
|------|--------|
| POS database `products.products` | ✅ Applied March 31 |
| Booking app fallback rates (`bay-rates-data.ts`) | ✅ Updated March 31 |
| Website fallback rates (`data/pricing.ts`) | ✅ Updated March 31 |
| Website FAQ text | ✅ Updated March 31 |
| Website golf page alt text | ✅ Updated March 31 |
| Forms app OB sales average rate | ✅ Updated March 31 (700→750) |

### External (April 1)

| Item | Status |
|------|--------|
| Google Business Profile — hours + if prices shown | ⬜ |
| Facebook / Instagram | ⬜ |
| LINE Rich Menu | ⬜ |
| Physical signage | ⬜ |
| Staff scheduling (9am coverage) | ⬜ |

---

## Verification Checklist

### Opening Hours (verify now)
- [x] Customer booking app, April 1 date — 9:00 AM slot appears
- [x] 9:00 AM slot shows correct price (550 THB weekday after rate increase)
- [ ] Staff booking form shows 9am slots for April 1+
- [ ] AI chat suggests 9am availability when asked about April 1+
- [ ] Coaching schedule allows setting 9am start
- [x] Website pages show "9am-11pm"
- [x] JSON-LD structured data shows `opens: '09:00'`
- [x] DB `is_within_business_hours()` returns true for 9am Bangkok time

### Bay Rate Increase (verify April 1)
- [ ] POS database updated — all 6 products show new prices
- [ ] Booking app shows 550 THB for weekday morning within ~35 min
- [ ] Website pricing table shows new rates within ~35 min
- [ ] AI chat quotes new prices when asked
