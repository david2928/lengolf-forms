# Dynamic Pricing Migration Guide

The forms app now serves a **shared pricing API** at `GET /api/pricing` that returns all current prices from the POS product catalog. This document describes what the **website** and **booking app** need to change to consume it.

## API Endpoint

```
GET https://lengolf-forms.vercel.app/api/pricing
```

- **No authentication required** (prices are public)
- **Cached 5 minutes** (server-side + `Cache-Control: public, max-age=300`)
- **Optional filter**: `?category=bayRates,packages` (comma-separated)

### Response Shape

```typescript
interface PricingCatalog {
  bayRates: {
    morning: Array<{ name: string; price: number }>;   // "Weekday 1H (Morning)" → 500
    afternoon: Array<{ name: string; price: number }>; // "Weekday 1H (Afternoon)" → 700
    evening: Array<{ name: string; price: number }>;   // "Weekend 1H (Evening)" → 900
  };
  packages: Array<{ name: string; price: number }>;    // "Bronze (5)" → 3000
  coaching: Array<{ name: string; price: number }>;     // "1 Golf Lesson" → 1800
  clubRental: {
    indoor: Array<{ name: string; price: number; modifiers?: Array<{ name: string; price: number }> }>;
    course: Array<{ name: string; price: number; modifiers?: Array<{ name: string; price: number }> }>;
    addons: Array<{ name: string; price: number }>;
  };
  mixedPackages: Array<{ name: string; price: number }>;  // "Food & Play: Set A" → 1200
  drinksAndGolf: Array<{ name: string; price: number }>;  // "Free Flow Beer" → 499
  events: Array<{ name: string; price: number }>;          // "Small Package (S)" → 9999
  fetchedAt: string;  // ISO timestamp
}
```

---

## Website App (`lengolf-website`)

### Priority 1: Core Pricing Data Files

#### `data/pricing.ts` (424 lines) — MAIN SOURCE
All structured pricing arrays/objects. **Replace with API fetch.**

```typescript
// BEFORE: hardcoded
export const bayRates = [
  { label: 'Before 14:00', weekday: 500, weekend: 700 },
  { label: '14:00-23:00', weekday: 700, weekend: 900 },
];

// AFTER: fetch from API
export async function getBayRates() {
  const res = await fetch('https://lengolf-forms.vercel.app/api/pricing?category=bayRates', {
    next: { revalidate: 300 } // ISR: revalidate every 5 min
  });
  const data = await res.json();
  return data.bayRates;
}
```

**What to replace:**
- Bay rates (weekday/weekend × morning/afternoon/evening)
- Monthly package prices (Bronze through Diamond+)
- Lesson pricing (1-50 hour packages, 1-3+ golfer tiers)
- Event package prices (Small, Medium)
- Club rental prices (hourly tiers)

#### `data/price-guide-pages.ts` (455 lines)
Detailed pricing guide with LENGOLF rates embedded in content.

**What to replace:**
- `SIMULATOR_VENUES.lengolf` object — bay rates (`cheapest_rate`, `peak_rate`)
- Package pricing in narrative content
- Lesson pricing breakdowns

**Note:** Competitor rates (Front 9, Fairway Golf, Topgolf) stay hardcoded — they're not in our DB.

### Priority 2: Content Files with Scattered Prices

These have prices embedded in narrative text. Lower priority but should be updated:

| File | Price References | Approach |
|------|-----------------|----------|
| `data/faq-pages.ts` | FAQ answers mention ฿500, ฿1,800, etc. | Template literals with fetched data |
| `data/activity-occasions.ts` | 50+ price references in activity comparisons | Template literals or keep static with periodic review |
| `data/explainer-pages.ts` | Educational content with pricing examples | Template literals |
| `data/hotel-pages.ts` | Hotel concierge pricing references | Template literals |
| `components/location/*.tsx` | 7 location components with price references | Template literals |

### Implementation Approach for Website

Since the website uses Next.js with SSG/ISR, the recommended pattern is:

```typescript
// lib/pricing.ts — shared fetch helper
const PRICING_API = process.env.NEXT_PUBLIC_PRICING_API_URL || 'https://lengolf-forms.vercel.app/api/pricing';

export async function getPricingCatalog(): Promise<PricingCatalog> {
  const res = await fetch(PRICING_API, {
    next: { revalidate: 300 } // Revalidate every 5 min
  });
  if (!res.ok) throw new Error('Failed to fetch pricing');
  return res.json();
}
```

Then in page components:
```typescript
// app/[locale]/golf/page.tsx
export default async function GolfPage() {
  const pricing = await getPricingCatalog();
  // Use pricing.bayRates, pricing.packages, etc.
}
```

---

## Booking App (`lengolf-booking-new`)

### Priority 1: Pricing Data Files (43+ hardcoded values)

#### `lib/liff/bay-rates-data.ts` (lines 61-79)
Bay rates for the booking flow.

| Current Hardcoded | API Source |
|---|---|
| Morning weekday: ฿500 | `bayRates.morning` → find "Weekday" |
| Morning weekend: ฿700 | `bayRates.morning` → find "Weekend" |
| Afternoon weekday: ฿700 | `bayRates.afternoon` → find "Weekday" |
| Afternoon weekend: ฿900 | `bayRates.afternoon` → find "Weekend" |
| Evening weekday: ฿700 | `bayRates.evening` → find "Weekday" |
| Evening weekend: ฿900 | `bayRates.evening` → find "Weekend" |

**Note:** Evening promo pricing (original ฿1,200/฿1,400) — check if promo prices are in the API or need separate handling.

#### `lib/liff/coaching-data.ts` (lines 193-235)
All coaching lesson package prices (18 values + 3 special packages).

| Current Hardcoded | API Source |
|---|---|
| 1 Golf Lesson: ฿1,800 | `coaching` → "1 Golf Lesson" |
| 1 Golf Lesson (2 PAX): ฿2,400 | `coaching` → "1 Golf Lesson (2 PAX)" |
| 5 Golf Lessons Package: ฿8,500 | `coaching` → "5 Golf Lessons Package" |
| Starter Package: ฿11,000 | `mixedPackages` → "Starter Package" |
| Sim to Fairway: ฿13,000 | `mixedPackages` → "Sim to Fairway Package" |
| ...etc for all 21 coaching prices | |

#### `types/golf-club-rental.ts` (lines 84-98)
Club rental hourly pricing tiers + gear-up add-ons.

| Current Hardcoded | API Source |
|---|---|
| Premium 1h: ฿150 | `clubRental.indoor` → "Premium Indoor" → `modifiers` |
| Premium 2h: ฿250 | Same → modifier "2 Hours" |
| Premium+ 1h: ฿250 | `clubRental.indoor` → "Premium+ Indoor" → `modifiers` |
| Gloves: ฿600 | `clubRental.addons` → "Golf Gloves" (or check `events`/`other`) |
| Golf Balls: ฿400 | Find in products |
| Delivery: ฿500 | `clubRental.addons` → "Club Delivery (Bangkok)" |

#### `types/play-food-packages.ts` (lines 26-83)
Food & Play set prices.

| Current Hardcoded | API Source |
|---|---|
| Set A: ฿1,200 | `mixedPackages` → "Food & Play: Set A" |
| Set B: ฿2,100 | `mixedPackages` → "Food & Play: Set B" |
| Set C: ฿2,975 | `mixedPackages` → "Food & Play: Set C" |

### Implementation Approach for Booking App

The booking app runs as a LIFF (LINE Front-end Framework) app. Recommended pattern:

```typescript
// lib/pricing.ts
const PRICING_API = 'https://lengolf-forms.vercel.app/api/pricing';

let cachedPricing: PricingCatalog | null = null;

export async function loadPricing(): Promise<PricingCatalog> {
  if (cachedPricing) return cachedPricing;
  const res = await fetch(PRICING_API);
  cachedPricing = await res.json();
  return cachedPricing;
}

// Helper to find a product price by name
export function findPrice(products: Array<{ name: string; price: number }>, namePattern: RegExp): number | null {
  const match = products.find(p => namePattern.test(p.name));
  return match?.price ?? null;
}
```

Then update data files to be async:
```typescript
// lib/liff/bay-rates-data.ts
export async function getBayRatesData() {
  const pricing = await loadPricing();
  const morningWD = findPrice(pricing.bayRates.morning, /weekday/i) ?? 500;
  const morningWE = findPrice(pricing.bayRates.morning, /weekend/i) ?? 700;
  // ... build the same structure, with DB prices + fallback defaults
}
```

### `lib/cost-calculator.ts` — No Changes Needed
This file is already data-driven — it reads from the data files above. Once those files return dynamic data, the calculator automatically uses current prices.

---

## Migration Checklist

### Website (`lengolf-website`)
- [ ] Create `lib/pricing.ts` fetch helper with ISR revalidation
- [ ] Replace `data/pricing.ts` exports with async functions using API
- [ ] Update `data/price-guide-pages.ts` LENGOLF rates section
- [ ] Update page components (`golf/page.tsx`, `lessons/page.tsx`, `events/page.tsx`, `golf-club-rental/page.tsx`) to await pricing data
- [ ] Update FAQ and content files with template literals (lower priority)
- [ ] Add `NEXT_PUBLIC_PRICING_API_URL` env var

### Booking App (`lengolf-booking-new`)
- [ ] Create `lib/pricing.ts` fetch helper with client-side cache
- [ ] Replace `lib/liff/bay-rates-data.ts` with async API fetch
- [ ] Replace `lib/liff/coaching-data.ts` pricing with async API fetch
- [ ] Replace `types/golf-club-rental.ts` pricing tiers with async API fetch
- [ ] Replace `types/play-food-packages.ts` prices with async API fetch
- [ ] Update components that consume these data files to handle async loading
- [ ] Add fallback defaults in case API is unavailable
- [ ] Test cost calculator still works with dynamic data

### Forms App (DONE)
- [x] Created `src/lib/pricing-service.ts` — shared service
- [x] Created `GET /api/pricing` — public endpoint
- [x] Updated AI skills to use `{DYNAMIC_PRICING}` / `{DYNAMIC_CLUB_PRICING}` placeholders
- [x] Wired `getBusinessContext()` to fetch product catalog
- [x] Removed hardcoded `bayPricing` from BusinessContext
